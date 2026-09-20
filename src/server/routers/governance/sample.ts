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
import { pilotLocale } from "@/server/services/pilot/caps";

export const sampleRouter = createTRPCRouter({
  /** Does this organisation hold the worked example, and how much of it? */
  status: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(({ ctx }) => getSampleStatus(ctx.prisma, ctx.organization.id)),

  /** Which records are sample data, by model name, for the badges. */
  ids: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(({ ctx }) => getSampleIds(ctx.prisma, ctx.organization.id)),

  /** Add the example. Idempotent: an organisation never holds two copies. */
  create: orgWriteProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(({ ctx }) =>
      createWorkedExample(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        locale: pilotLocale(ctx.getCookie),
      }),
    ),

  /**
   * Remove every record the example created, and nothing else. Guarded by the
   * legal hold like every other delete path: a hold in force means nothing in
   * scope is removed, sample or not.
   */
  remove: orgWriteProcedure
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
