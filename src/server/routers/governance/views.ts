// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The two ready lists: "Needs action" and "Incomplete". Both are read-only and
 * open to any member, and both apply the member's department scope on top of the
 * organization guard, so a department-limited member never sees another
 * department's work. An optional businessUnitId narrows further, for a member
 * who can see the whole organization but wants one department's view.
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure } from "../../trpc";
import { loadBusinessUnitScope } from "../../services/business-units/scope";
import { collectIncompleteSystems, collectNeedsAction } from "../../services/views/queries";

export const viewsRouter = createTRPCRouter({
  needsAction: organizationProcedure
    .input(z.object({ organizationId: z.string(), businessUnitId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const scope = await loadBusinessUnitScope(ctx.prisma, ctx.membership.id);
      return collectNeedsAction(ctx.prisma, ctx.organization.id, scope, input.businessUnitId);
    }),

  incomplete: organizationProcedure
    .input(z.object({ organizationId: z.string(), businessUnitId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const scope = await loadBusinessUnitScope(ctx.prisma, ctx.membership.id);
      const systems = await collectIncompleteSystems(
        ctx.prisma,
        ctx.organization.id,
        scope,
        input.businessUnitId,
      );
      return { systems };
    }),
});
