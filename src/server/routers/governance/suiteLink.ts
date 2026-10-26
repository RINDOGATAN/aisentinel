// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The organisation's link to DPO Central, as this application's screens see
 * it (src/server/services/suite/dpc-link.ts): read by any member, removed by
 * an owner or administrator.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { LINK_ROLES, readLink, removeLink } from "../../services/suite/dpc-link";

export const suiteLinkRouter = createTRPCRouter({
  get: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const link = readLink(ctx.organization.settings);
      const imported = await ctx.prisma.aISystem.count({
        where: {
          organizationId: ctx.organization.id,
          metadata: { path: ["importedFrom"], equals: "dpocentral" },
        },
      });
      const toConfirm = await ctx.prisma.aISystem.count({
        where: {
          organizationId: ctx.organization.id,
          provenance: "IMPORTED",
          confirmedAt: null,
        },
      });
      const vendors = await ctx.prisma.aIVendor.count({
        where: { organizationId: ctx.organization.id, provenance: "IMPORTED", sourceRef: { startsWith: "dpocentral:" } },
      });
      return {
        link,
        canManage: LINK_ROLES.includes(ctx.membership.role),
        importedSystems: imported,
        importedVendors: vendors,
        toConfirm,
      };
    }),

  unlink: orgWriteProcedure
    .meta({ pilotReadOnlyExempt: true })
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx }) => {
      if (!LINK_ROLES.includes(ctx.membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only an owner or administrator can unlink organizations." });
      }
      return removeLink(ctx.prisma, ctx.organization.id, ctx.session.user.id, "aisentinel");
    }),
});
