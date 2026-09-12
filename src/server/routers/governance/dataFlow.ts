// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Data flow: who receives what, and the roles and retention that go with it.
 *
 * The register held what goes into a system and nothing about what comes out.
 * An impact assessment, a record of processing and a California risk assessment
 * all turn on the same facts: the recipients, the purpose of each disclosure,
 * the contract that governs it and how long it is kept. This router holds them
 * as data rather than as prose inside an answer.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import {
  DATA_ROLES,
  RECIPIENT_TYPES,
  SENSITIVE_CATEGORY_IDS,
  isBeyondOurControl,
} from "@/config/data-categories";

const sensitiveEnum = z.enum(SENSITIVE_CATEGORY_IDS);

async function assertSystem(
  prisma: PrismaClient,
  organizationId: string,
  aiSystemId: string,
) {
  const system = await prisma.aISystem.findFirst({
    where: { id: aiSystemId, organizationId },
    select: { id: true },
  });
  if (!system) {
    throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
  }
}

export const dataFlowRouter = createTRPCRouter({
  /** Everything the flow view needs for one system, in one round trip. */
  getForSystem: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: {
          id: true,
          name: true,
          dataRole: true,
          transactionRole: true,
          retentionPeriod: true,
          processesPersonalData: true,
          dataSources: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              sourceType: true,
              description: true,
              containsPersonalData: true,
              dataCategories: true,
              sensitiveCategories: true,
              origin: true,
              retentionPeriod: true,
            },
          },
          dataRecipients: {
            orderBy: { createdAt: "asc" },
            include: { vendor: { select: { id: true, name: true } } },
          },
        },
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      // The sensitive categories present anywhere in the flow, and those that
      // reach a recipient outside the organisation's control. The second list
      // is the one that decides whether a disclosure needs an opt-in.
      const inbound = new Set<string>();
      for (const source of system.dataSources) {
        for (const c of source.sensitiveCategories) inbound.add(c);
      }
      const disclosedBeyondControl = new Set<string>();
      for (const r of system.dataRecipients) {
        if (!isBeyondOurControl(r.type)) continue;
        for (const c of r.sensitiveCategories) disclosedBeyondControl.add(c);
      }

      return {
        ...system,
        summary: {
          sensitiveInbound: [...inbound],
          sensitiveDisclosedBeyondControl: [...disclosedBeyondControl],
          recipientCount: system.dataRecipients.length,
          recipientsWithoutContract: system.dataRecipients.filter((r) => !r.contractRef?.trim())
            .length,
          recipientsWithoutRetention: system.dataRecipients.filter(
            (r) => !r.retentionPeriod?.trim(),
          ).length,
        },
      };
    }),

  /** The system-level facts: the two roles and the retention statement. */
  setSystemFlowFacts: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        dataRole: z.enum(DATA_ROLES).optional(),
        transactionRole: z.string().max(200).nullable().optional(),
        retentionPeriod: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSystem(ctx.prisma, ctx.organization.id, input.aiSystemId);
      const { organizationId: _org, aiSystemId, ...data } = input;

      await ctx.prisma.aISystem.updateMany({
        where: { id: aiSystemId, organizationId: ctx.organization.id },
        data: data as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AISystem",
          entityId: aiSystemId,
          action: "UPDATE",
          changes: { ...data, scope: "data-flow" },
        },
      });

      return { ok: true };
    }),

  /** The sensitive categories, origin and retention of one data source. */
  setSourceFacts: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        dataSourceId: z.string(),
        sensitiveCategories: z.array(sensitiveEnum).optional(),
        origin: z.string().max(300).nullable().optional(),
        retentionPeriod: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.prisma.aISystemDataSource.findFirst({
        where: { id: input.dataSourceId, organizationId: ctx.organization.id },
        select: { id: true, aiSystemId: true },
      });
      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Data source not found" });
      }

      const { organizationId: _org, dataSourceId, ...data } = input;

      await ctx.prisma.aISystemDataSource.updateMany({
        where: { id: dataSourceId, organizationId: ctx.organization.id },
        data: data as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AISystemDataSource",
          entityId: dataSourceId,
          action: "UPDATE",
          changes: { ...data, aiSystemId: source.aiSystemId },
        },
      });

      return { ok: true };
    }),

  addRecipient: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        name: z.string().min(1).max(200),
        type: z.enum(RECIPIENT_TYPES).default("OTHER"),
        purpose: z.string().max(2000).optional(),
        dataCategories: z.array(z.string().max(120)).max(50).default([]),
        sensitiveCategories: z.array(sensitiveEnum).default([]),
        contractRef: z.string().max(300).optional(),
        transferMechanism: z.string().max(300).optional(),
        retentionPeriod: z.string().max(500).optional(),
        vendorId: z.string().optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSystem(ctx.prisma, ctx.organization.id, input.aiSystemId);

      if (input.vendorId) {
        const vendor = await ctx.prisma.aIVendor.findFirst({
          where: { id: input.vendorId, organizationId: ctx.organization.id },
          select: { id: true },
        });
        if (!vendor) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
        }
      }

      const { organizationId: _org, ...data } = input;

      const created = await ctx.prisma.dataRecipient.create({
        data: {
          ...data,
          organizationId: ctx.organization.id,
          createdBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "DataRecipient",
          entityId: created.id,
          action: "CREATE",
          changes: {
            name: input.name,
            type: input.type,
            aiSystemId: input.aiSystemId,
            sensitiveCategories: input.sensitiveCategories,
          },
        },
      });

      return created;
    }),

  updateRecipient: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        type: z.enum(RECIPIENT_TYPES).optional(),
        purpose: z.string().max(2000).nullable().optional(),
        dataCategories: z.array(z.string().max(120)).max(50).optional(),
        sensitiveCategories: z.array(sensitiveEnum).optional(),
        contractRef: z.string().max(300).nullable().optional(),
        transferMechanism: z.string().max(300).nullable().optional(),
        retentionPeriod: z.string().max(500).nullable().optional(),
        vendorId: z.string().nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.dataRecipient.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recipient not found" });
      }

      const { organizationId: _org, id, ...data } = input;

      await ctx.prisma.dataRecipient.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: data as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "DataRecipient",
          entityId: id,
          action: "UPDATE",
          changes: { fields: Object.keys(data) },
        },
      });

      return { ok: true };
    }),

  removeRecipient: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.dataRecipient.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, name: true, aiSystemId: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recipient not found" });
      }

      await ctx.prisma.dataRecipient.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "DataRecipient",
          entityId: input.id,
          action: "DELETE",
          changes: { name: existing.name, aiSystemId: existing.aiSystemId },
        },
      });

      return { deleted: true };
    }),
});
