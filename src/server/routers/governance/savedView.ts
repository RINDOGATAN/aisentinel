// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Saved list views: a named filter set a person keeps for one organization.
 *
 * These are a personal preference, not a governance record: they belong to one
 * user, are visible only to that user, and carry no audit entry. Every query is
 * scoped by both organizationId and the signed-in user's id, so one person's
 * saved views can never be read or removed by another. Viewers may save views
 * (a personal convenience is not a write to the organization's data), so these
 * use organizationProcedure rather than orgWriteProcedure.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure } from "../../trpc";
import {
  ASSESSMENT_FILTER_OPTIONS,
  REGISTRATION_FILTER_OPTIONS,
  RISK_FILTER_OPTIONS,
  STAGE_OPTIONS,
  SYSTEM_ROLE_OPTIONS,
} from "@/lib/system-views";
import { JURISDICTION_IDS } from "@/config/jurisdictions";
import { LIST_SORTS } from "@/lib/list-sort";

// The stored filter set. Kept permissive on free text and strict on the
// vocabularies, mirroring src/lib/system-views.ts. Unknown keys are dropped by
// the schema, so a saved view can never carry a value the filter cannot honour.
const filterSchema = z
  .object({
    owner: z.string().trim().max(200).optional(),
    businessUnitId: z.string().max(100).optional(),
    region: z.enum(JURISDICTION_IDS).optional(),
    stage: z.enum(STAGE_OPTIONS).optional(),
    registration: z.enum(REGISTRATION_FILTER_OPTIONS).optional(),
    risk: z.enum(RISK_FILTER_OPTIONS).optional(),
    role: z.enum(SYSTEM_ROLE_OPTIONS).optional(),
    assessment: z.enum(ASSESSMENT_FILTER_OPTIONS).optional(),
    search: z.string().trim().max(200).optional(),
    sort: z.enum(LIST_SORTS).optional(),
  })
  .strict();

export const savedViewRouter = createTRPCRouter({
  list: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.savedView.findMany({
        where: { organizationId: ctx.organization.id, userId: ctx.session.user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, filters: true, createdAt: true },
      });
    }),

  create: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().trim().min(1).max(80),
        filters: filterSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // A person keeps a handful of views, not hundreds; the cap stops a runaway
      // client and keeps the chip row readable.
      const count = await ctx.prisma.savedView.count({
        where: { organizationId: ctx.organization.id, userId: ctx.session.user.id },
      });
      if (count >= 30) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have reached the maximum number of saved views." });
      }

      return ctx.prisma.savedView.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          name: input.name,
          filters: input.filters,
        },
        select: { id: true, name: true, filters: true, createdAt: true },
      });
    }),

  remove: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.savedView.deleteMany({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
        },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Saved view not found" });
      }
      return { deleted: true };
    }),
});
