// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot, as the screens see it: whether it is on, where an
 * organisation stands against its caps, and whether the person signed in has
 * read the disclosure. Caps themselves are enforced in the write middleware and
 * the create paths.
 */

import { z } from "zod";
import {
  createTRPCRouter,
  organizationProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { hostedPilotActive } from "@/config/pilot";
import { DISCLOSURE_VERSION } from "@/config/pilot-disclosure";
import { getPilotStatus } from "@/server/services/pilot/caps";

export const pilotRouter = createTRPCRouter({
  /** Is this deployment the hosted pilot? Public: the sign-in screen asks before there is a session. */
  mode: publicProcedure.query(() => ({ active: hostedPilotActive() })),

  /** Day counter and ceilings for the organisation (Settings). */
  status: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(({ ctx }) => getPilotStatus(ctx.prisma, ctx.organization)),

  /**
   * Has this person read the current disclosure? Off the pilot the answer is
   * always "nothing to show": the kit runs on the customer's own servers, so
   * the statement about ours does not apply to it.
   */
  disclosure: protectedProcedure.query(async ({ ctx }) => {
    if (!hostedPilotActive()) {
      return { required: false, version: DISCLOSURE_VERSION, acknowledgedAt: null };
    }
    const row = await ctx.prisma.pilotDisclosureAcknowledgement.findUnique({
      where: { userId_version: { userId: ctx.session.user.id, version: DISCLOSURE_VERSION } },
      select: { acknowledgedAt: true },
    });
    return {
      required: row === null,
      version: DISCLOSURE_VERSION,
      acknowledgedAt: row?.acknowledgedAt ?? null,
    };
  }),

  /**
   * Record the acknowledgement with its date. Idempotent: a second click keeps
   * the first date, because that is the date the person was actually told.
   */
  acknowledgeDisclosure: protectedProcedure
    .input(z.object({ locale: z.enum(["en", "es"]) }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.pilotDisclosureAcknowledgement.upsert({
        where: { userId_version: { userId: ctx.session.user.id, version: DISCLOSURE_VERSION } },
        create: {
          userId: ctx.session.user.id,
          version: DISCLOSURE_VERSION,
          locale: input.locale,
        },
        update: {},
        select: { acknowledgedAt: true },
      });
      return { acknowledgedAt: row.acknowledgedAt, version: DISCLOSURE_VERSION };
    }),
});
