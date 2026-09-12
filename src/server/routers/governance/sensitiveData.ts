// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Sensitive data analyses: the record of how the organisation decided whether
 * a set of data is health data (or another sensitive category).
 *
 * The reasoning is the product. The band matters less than the fact that five
 * factors were considered, written down, owned by a named person, and dated,
 * so the same data is classified the same way twice and the analysis can be
 * produced when a regulator asks how the line was drawn.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import {
  BANDS,
  FACTOR_IDS,
  RATINGS,
  SENSITIVE_FACTORS_VERSION,
  bandFor,
  type FactorRatings,
} from "@/config/sensitive-data-factors";

const CATEGORIES = [
  "HEALTH",
  "BIOMETRIC",
  "PRECISE_LOCATION",
  "FINANCIAL",
  "OTHER",
] as const;

const factorSchema = z.object({
  rating: z.enum(RATINGS).optional(),
  reasoning: z.string().max(5000).optional(),
});

// One entry per factor, each optional: an analysis is saved as it is written,
// not only when it is finished.
const factorsSchema = z.object({
  source: factorSchema.optional(),
  content: factorSchema.optional(),
  use: factorSchema.optional(),
  expectations: factorSchema.optional(),
  harm: factorSchema.optional(),
});

type Factors = z.infer<typeof factorsSchema>;

function ratingsOf(factors: unknown): FactorRatings {
  const source = (factors ?? {}) as Record<string, { rating?: string } | undefined>;
  const out: FactorRatings = {};
  for (const id of FACTOR_IDS) {
    const rating = source[id]?.rating;
    if (rating && (RATINGS as readonly string[]).includes(rating)) {
      out[id] = rating as (typeof RATINGS)[number];
    }
  }
  return out;
}

export const sensitiveDataRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string().optional(),
        category: z.enum(CATEGORIES).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.sensitiveDataAssessment.findMany({
        where: {
          organizationId: ctx.organization.id,
          ...(input.aiSystemId ? { aiSystemId: input.aiSystemId } : {}),
          ...(input.category ? { category: input.category } : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: { aiSystem: { select: { id: true, name: true } } },
      });

      return rows.map((r) => ({
        ...r,
        derived: bandFor(ratingsOf(r.factors)),
      }));
    }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.prisma.sensitiveDataAssessment.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: { aiSystem: { select: { id: true, name: true } } },
      });
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }
      return { ...row, derived: bandFor(ratingsOf(row.factors)) };
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        subject: z.string().min(1).max(300),
        description: z.string().max(5000).optional(),
        category: z.enum(CATEGORIES).default("HEALTH"),
        dataRole: z.string().max(200).optional(),
        aiSystemId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.aiSystemId) {
        const system = await ctx.prisma.aISystem.findFirst({
          where: { id: input.aiSystemId, organizationId: ctx.organization.id },
          select: { id: true },
        });
        if (!system) {
          throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
        }
      }

      const created = await ctx.prisma.sensitiveDataAssessment.create({
        data: {
          organizationId: ctx.organization.id,
          subject: input.subject,
          description: input.description,
          category: input.category,
          dataRole: input.dataRole,
          aiSystemId: input.aiSystemId,
          factors: {},
          rulesVersion: SENSITIVE_FACTORS_VERSION,
          createdBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "SensitiveDataAssessment",
          entityId: created.id,
          action: "CREATE",
          changes: { subject: input.subject, category: input.category },
        },
      });

      return created;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        subject: z.string().min(1).max(300).optional(),
        description: z.string().max(5000).optional(),
        dataRole: z.string().max(200).optional(),
        aiSystemId: z.string().nullable().optional(),
        factors: factorsSchema.optional(),
        band: z.enum(BANDS).optional(),
        bandRationale: z.string().max(5000).optional(),
        decision: z.string().max(5000).optional(),
        owner: z.string().max(200).optional(),
        nextReviewDate: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId: _organizationId, ...data } = input;

      const existing = await ctx.prisma.sensitiveDataAssessment.findFirst({
        where: { id, organizationId: ctx.organization.id },
        select: { id: true, factors: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const factors = (data.factors ?? existing.factors) as Factors;
      const derived = bandFor(ratingsOf(factors));

      await ctx.prisma.sensitiveDataAssessment.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: {
          ...data,
          ...(data.factors ? { factors: data.factors } : {}),
          suggestedBand: derived.band,
          // The recorded band follows the rule unless a person has set one.
          ...(data.band ? { band: data.band } : {}),
          rulesVersion: SENSITIVE_FACTORS_VERSION,
        } as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "SensitiveDataAssessment",
          entityId: id,
          action: "UPDATE",
          changes: {
            fields: Object.keys(data),
            suggestedBand: derived.band,
            band: data.band ?? null,
          },
        },
      });

      return ctx.prisma.sensitiveDataAssessment.findFirst({
        where: { id, organizationId: ctx.organization.id },
      });
    }),

  /**
   * Record the analysis as complete. Requires every factor rated with its
   * reasoning, a band and a decision: an analysis that stops short of saying
   * what will be done is not evidence of anything.
   */
  complete: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.sensitiveDataAssessment.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      });
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const factors = (row.factors ?? {}) as Record<
        string,
        { rating?: string; reasoning?: string } | undefined
      >;
      const unrated = FACTOR_IDS.filter(
        (f) => !factors[f]?.rating || !factors[f]?.reasoning?.trim(),
      );
      if (unrated.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Rate every factor and give the reasoning first. Still open: ${unrated.join(", ")}.`,
        });
      }
      if (!row.band) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Record the band the organization stands behind before completing.",
        });
      }
      if (!row.decision?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Record what will be done about this data before completing.",
        });
      }

      await ctx.prisma.sensitiveDataAssessment.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id },
        data: { completedBy: ctx.session.user.id, completedAt: new Date() },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "SensitiveDataAssessment",
          entityId: input.id,
          action: "COMPLETE",
          changes: { band: row.band, suggestedBand: row.suggestedBand },
        },
      });

      return { completed: true };
    }),

  delete: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.sensitiveDataAssessment.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, subject: true, completedAt: true },
      });
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }
      if (row.completedAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "A completed analysis is a record of a decision and cannot be deleted. Supersede it with a new one instead.",
        });
      }

      await ctx.prisma.sensitiveDataAssessment.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "SensitiveDataAssessment",
          entityId: input.id,
          action: "DELETE",
          changes: { subject: row.subject },
        },
      });

      return { deleted: true };
    }),
});
