// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot, as the screens see it: whether it is on, and where an
 * organisation stands against its caps. Read-only; the caps themselves are
 * enforced in the write middleware and the create paths.
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, publicProcedure } from "../trpc";
import { hostedPilotActive } from "@/config/pilot";
import { getPilotStatus } from "@/server/services/pilot/caps";

export const pilotRouter = createTRPCRouter({
  /** Is this deployment the hosted pilot? Public: the sign-in screen asks before there is a session. */
  mode: publicProcedure.query(() => ({ active: hostedPilotActive() })),

  /** Day counter and ceilings for the organisation (Settings). */
  status: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(({ ctx }) => getPilotStatus(ctx.prisma, ctx.organization)),
});
