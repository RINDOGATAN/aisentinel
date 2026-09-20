// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The worked example: whether this organisation holds it, adding it, removing
 * it, and which records are marked as sample data in the screens.
 *
 * Writes go through orgWriteProcedure, so a viewer can neither add nor remove
 * the example, and both the creation and the removal write an audit entry.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import {
  createWorkedExample,
  getSampleIds,
  getSampleStatus,
  removeWorkedExample,
} from "@/server/services/sample/worked-example";
import { assertNotOnHold } from "@/server/services/legal-hold";
import { assertPilotRoom, pilotLocale } from "@/server/services/pilot/caps";
import { EXAMPLE_SYSTEMS, EXAMPLE_VENDORS } from "@/config/worked-example";

export const sampleRouter = createTRPCRouter({
  /** Does this organisation hold the worked example, and how much of it? */
  status: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(({ ctx }) => getSampleStatus(ctx.prisma, ctx.organization.id)),

  /** Which records are sample data, by model name, for the badges. */
  ids: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(({ ctx }) => getSampleIds(ctx.prisma, ctx.organization.id)),

  /**
   * Add the example. Idempotent: an organisation never holds two copies. The
   * pilot ceilings apply, because the example creates real records: an
   * organisation close to its limit is told so rather than pushed over it.
   */
  create: orgWriteProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx }) => {
      const locale = pilotLocale(ctx.getCookie);
      const room: [Parameters<typeof assertPilotRoom>[2], number][] = [
        ["systems", EXAMPLE_SYSTEMS.length],
        ["vendors", EXAMPLE_VENDORS.length],
        ["policies", 1],
        ["oversightGates", 1],
        ["incidents", 1],
        ["assessments", 1],
      ];
      for (const [key, adding] of room) {
        await assertPilotRoom(ctx.prisma, ctx.organization.id, key, locale, adding);
      }
      return createWorkedExample(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        locale,
      });
    }),

  /**
   * Remove every record the example created, and nothing else. Guarded by the
   * legal hold like every other delete path: a hold in force means nothing in
   * scope is removed, sample or not.
   *
   * The pilot's read-only switch does not close this door, for the same reason
   * it does not close organization.delete: getting rid of data is never the
   * thing a cap on editing should prevent.
   */
  remove: orgWriteProcedure
    .meta({ pilotReadOnlyExempt: true })
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx }) => {
      await assertNotOnHold(ctx.prisma, ctx.organization.id);
      const status = await getSampleStatus(ctx.prisma, ctx.organization.id);
      if (!status.present) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This organization holds no sample data",
        });
      }
      return removeWorkedExample(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
      });
    }),
});
