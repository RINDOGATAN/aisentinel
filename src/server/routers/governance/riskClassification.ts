// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { screenAnnexIii } from "@/config/annex-iii-rules";
import { chatComplete } from "../../services/ai/llm-door";
import {
  requireAi,
  assertAiRateLimit,
  recordGeneration,
  postureLane,
} from "../../services/ai/posture";
import { buildSystemContext, promptLocale } from "../../services/ai/context";
import {
  buildRiskRationaleSystemPrompt,
  buildRiskRationaleUserPrompt,
} from "../../services/ai/prompts/risk-rationale";

export const riskClassificationRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        riskLevel: z.enum(["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const systems = await ctx.prisma.aISystem.findMany({
        where: {
          organizationId: ctx.organization.id,
          ...(input.search && {
            name: { contains: input.search, mode: "insensitive" },
          }),
        },
        include: {
          riskClassification: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (input.riskLevel) {
        return systems.filter(
          (s) => s.riskClassification?.riskLevel === input.riskLevel
        );
      }

      return systems;
    }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.riskClassification.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
        include: {
          aiSystem: true,
          history: { orderBy: { changedAt: "desc" } },
        },
      });
    }),

  classify: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        riskLevel: z.enum(["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"]),
        rationale: z.string().min(1),
        annexIIICategory: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the AI system belongs to this organization
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      const existing = await ctx.prisma.riskClassification.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
      });

      if (existing) {
        // Create history entry
        await ctx.prisma.riskClassificationHistory.create({
          data: {
            riskClassificationId: existing.id,
            previousLevel: existing.riskLevel,
            newLevel: input.riskLevel,
            rationale: input.rationale,
            changedBy: ctx.session.user.id,
          },
        });

        // Update classification
        const updated = await ctx.prisma.riskClassification.update({
          where: { id: existing.id },
          data: {
            riskLevel: input.riskLevel,
            rationale: input.rationale,
            annexIIICategory: input.annexIIICategory,
            classifiedBy: ctx.session.user.id,
            classifiedAt: new Date(),
          },
          include: { aiSystem: true },
        });

        // Auto-generate compliance mappings for any new applicable requirements
        const applicableRequirements = await ctx.prisma.complianceRequirement.findMany({
          where: { applicableTo: { has: input.riskLevel } },
          select: { id: true },
        });

        const complianceMappingsCreated = applicableRequirements.length > 0
          ? (await ctx.prisma.complianceMapping.createMany({
              data: applicableRequirements.map((req) => ({
                organizationId: ctx.organization.id,
                aiSystemId: input.aiSystemId,
                requirementId: req.id,
                status: "NOT_ASSESSED" as const,
              })),
              skipDuplicates: true,
            })).count
          : 0;

        return { ...updated, complianceMappingsCreated };
      }

      // Create new classification
      const classification = await ctx.prisma.riskClassification.create({
        data: {
          aiSystemId: input.aiSystemId,
          organizationId: ctx.organization.id,
          riskLevel: input.riskLevel,
          rationale: input.rationale,
          annexIIICategory: input.annexIIICategory,
          classifiedBy: ctx.session.user.id,
        },
        include: { aiSystem: true },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "RiskClassification",
          entityId: classification.id,
          action: "CREATE",
          changes: { riskLevel: input.riskLevel, aiSystemId: input.aiSystemId },
        },
      });

      // Auto-generate compliance mappings for applicable requirements
      const applicableRequirements = await ctx.prisma.complianceRequirement.findMany({
        where: { applicableTo: { has: input.riskLevel } },
        select: { id: true },
      });

      const complianceMappingsCreated = applicableRequirements.length > 0
        ? (await ctx.prisma.complianceMapping.createMany({
            data: applicableRequirements.map((req) => ({
              organizationId: ctx.organization.id,
              aiSystemId: input.aiSystemId,
              requirementId: req.id,
              status: "NOT_ASSESSED" as const,
            })),
            skipDuplicates: true,
          })).count
        : 0;

      return { ...classification, complianceMappingsCreated };
    }),

  getHistory: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const classification = await ctx.prisma.riskClassification.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
      });

      if (!classification) return [];

      return ctx.prisma.riskClassificationHistory.findMany({
        where: { riskClassificationId: classification.id },
        orderBy: { changedAt: "desc" },
      });
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [unacceptable, high, limited, minimal, unclassified] = await Promise.all([
        ctx.prisma.riskClassification.count({
          where: { organizationId: ctx.organization.id, riskLevel: "UNACCEPTABLE" },
        }),
        ctx.prisma.riskClassification.count({
          where: { organizationId: ctx.organization.id, riskLevel: "HIGH" },
        }),
        ctx.prisma.riskClassification.count({
          where: { organizationId: ctx.organization.id, riskLevel: "LIMITED" },
        }),
        ctx.prisma.riskClassification.count({
          where: { organizationId: ctx.organization.id, riskLevel: "MINIMAL" },
        }),
        ctx.prisma.aISystem.count({
          where: {
            organizationId: ctx.organization.id,
            riskClassification: null,
          },
        }),
      ]);

      return { unacceptable, high, limited, minimal, unclassified };
    }),

  // Deterministic Annex III / Art. 5 screening of one registered system.
  // Pure rules over registry facts — NO AI involved, works with the AI
  // posture off. This is the ground truth the optional AI rationale cites.
  screen: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { facts } = await buildSystemContext(
        ctx.prisma,
        ctx.organization.id,
        input.aiSystemId,
        ctx.organization.name
      );
      return screenAnnexIii(facts);
    }),

  // Optional AI assist: draft the classification RATIONALE, grounded in the
  // deterministic screening hits. The user still picks the level — the draft
  // only ever lands in the editable rationale field via explicit Insert.
  generateAiRationale: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        chosenLevel: z.enum(["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"]),
        chosenCategory: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Posture gate FIRST — posture off/missing means zero AI calls and
      // no prompt building at all.
      const settings = await requireAi(ctx.prisma, ctx.organization.id);
      await assertAiRateLimit(ctx.prisma, ctx.organization.id);

      const { context, facts } = await buildSystemContext(
        ctx.prisma,
        ctx.organization.id,
        input.aiSystemId,
        ctx.organization.name
      );
      const screening = screenAnnexIii(facts);
      const locale = promptLocale(ctx.getCookie("locale"));

      // Route through the lane the organization acknowledged.
      const result = await chatComplete({
        system: buildRiskRationaleSystemPrompt(locale),
        user: buildRiskRationaleUserPrompt({
          context,
          screening,
          chosenLevel: input.chosenLevel,
          chosenCategory: input.chosenCategory ?? null,
        }),
        lane: postureLane(settings.posture),
      });

      const generation = await recordGeneration(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        feature: "risk_rationale",
        entityType: "AISystem",
        entityId: input.aiSystemId,
        model: result?.model ?? null,
        posture: settings.posture,
        promptTokens: result?.usage?.promptTokens ?? null,
        completionTokens: result?.usage?.completionTokens ?? null,
        totalTokens: result?.usage?.totalTokens ?? null,
        durationMs: result?.durationMs ?? null,
        status: result ? "ok" : "error",
      });

      if (!result) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "ai_failed" });
      }

      return {
        generationId: generation.id,
        model: result.model,
        content: result.content,
        screening,
      };
    }),
});
