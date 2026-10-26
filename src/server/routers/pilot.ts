// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot, as the screens see it: whether it is on and where an
 * organisation stands against its caps. Caps themselves are enforced in the
 * write middleware and the create paths.
 *
 * There is no opening statement to acknowledge any more. The earlier
 * acknowledgements stay in `pilot_disclosure_acknowledgements` as a record;
 * nothing reads or writes them here.
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, publicProcedure } from "../trpc";
import { hostedPilotActive } from "@/config/pilot";
import { getPilotStatus } from "@/server/services/pilot/caps";
import { suiteForRequest, type ApplyDb, type SuiteOrg } from "@/server/services/suite/plan-state";

export const pilotRouter = createTRPCRouter({
  /** Is this deployment the hosted pilot? Public: the sign-in screen asks before there is a session. */
  mode: publicProcedure.query(() => ({ active: hostedPilotActive() })),

  /** Day counter and ceilings for the organisation (Settings). */
  status: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const status = await getPilotStatus(ctx.prisma, ctx.organization);
      // Whether the owner also has DPO Central: the pilot bar then says one
      // plan covers the suite (src/server/services/suite/plan-state.ts).
      const suite = await suiteForRequest(
        ctx.prisma as unknown as ApplyDb,
        ctx.organization as unknown as SuiteOrg,
        ctx.membership?.role,
        ctx.session.user,
      );
      return suite.suite ? { ...status, suite: true } : status;
    }),
});
