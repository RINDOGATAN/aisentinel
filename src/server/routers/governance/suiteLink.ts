// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The organisation's link to DPO Central, as this application's screens see
 * it (src/server/services/suite/dpc-link.ts): read by any member, removed by
 * an owner or administrator.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure, protectedProcedure } from "../../trpc";
import {
  LINK_ROLES,
  readLink,
  readOfferDismissedAt,
  removeLink,
  withOfferDismissed,
} from "../../services/suite/dpc-link";
import { peerKnowsPerson } from "../../services/suite/plan-state";

export const suiteLinkRouter = createTRPCRouter({
  get: organizationProcedure
    // peer: also ask DPO Central whether it knows this person (the dashboard's
    // offer at entry); only for an owner or administrator of an unlinked organisation.
    .input(z.object({ organizationId: z.string(), peer: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const link = readLink(ctx.organization.settings);
      const canManage = LINK_ROLES.includes(ctx.membership.role);
      const dpcFound =
        input.peer === true && canManage && !link ? await peerKnowsPerson(ctx.session.user.email) : false;
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
        canManage,
        dpcFound,
        offerDismissed: readOfferDismissedAt(ctx.organization.settings) !== null,
        importedSystems: imported,
        importedVendors: vendors,
        toConfirm,
      };
    }),

  /** Whether DPO Central knows the signed-in person: the offer on the first organisation's screen. */
  peerFound: protectedProcedure.query(async ({ ctx }) => ({
    found: await peerKnowsPerson(ctx.session.user.email),
  })),

  /** Set the dashboard's offer aside for this organisation (Quickstart and Settings keep it). */
  dismissOffer: orgWriteProcedure
    .meta({ pilotReadOnlyExempt: true })
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx }) => {
      if (!LINK_ROLES.includes(ctx.membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only an owner or administrator can do this." });
      }
      const org = await ctx.prisma.organization.findFirst({
        where: { id: ctx.organization.id },
        select: { settings: true },
      });
      if (readOfferDismissedAt(org?.settings)) return { changed: false };
      const at = new Date().toISOString();
      await ctx.prisma.organization.update({
        where: { id: ctx.organization.id },
        data: { settings: withOfferDismissed(org?.settings, at) },
      });
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "Organization",
          entityId: ctx.organization.id,
          action: "SUITE_LINK_OFFER_DISMISSED",
          changes: { dpoCentralOfferDismissedAt: at },
          metadata: { source: "suite-link" },
        },
      });
      return { changed: true };
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
