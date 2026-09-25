// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program path router: where an organisation stands on the six-stage path the
 * Guided layout shows (src/components/guided/path-config.ts).
 *
 * Read-only. `status` is one organisation, through the usual membership
 * guard. `portfolio` is every organisation the signed-in person belongs to,
 * found from their own memberships and nothing else, for the consultant's
 * client overview, with the two "needs attention" figures the older client
 * cards showed (open incidents, oversight gates waiting for a decision), so
 * the portfolio is the one client view.
 *
 * Both carry `planStart`, day 1 of the 30/60/90-day plan
 * (src/server/services/program/plan-start.ts); the plan's state is worked out
 * where it is shown, from that date and the statuses (src/components/guided/plan.ts).
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, protectedProcedure } from "../../trpc";
import { AI_SENTINEL_PATH } from "@/components/guided/path-config";
import { evaluatePath } from "@/components/guided/path";
import { loadPathCounts } from "@/server/services/program/path-counts";
import { loadPlanStart } from "@/server/services/program/plan-start";

/** The same ceiling as the client list (clients.ts). */
const MAX_PORTFOLIO_ORGS = 50;
/** Organisations read at once, so fifty clients never open fifteen hundred queries together. */
const PORTFOLIO_BATCH = 5;
/** Open incidents, counted as the client cards count them (clients.ts). */
const OPEN_INCIDENT_STATUSES = ["REPORTED", "INVESTIGATING", "MITIGATING"] as const;

export const programPathRouter = createTRPCRouter({
  status: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const counts = await loadPathCounts(ctx.prisma, ctx.organization.id);
      const steps = evaluatePath(AI_SENTINEL_PATH, counts);
      const planStart = await loadPlanStart(
        ctx.prisma,
        ctx.organization.id,
        steps.quickstart === "done",
      );
      return { steps, planStart: planStart?.toISOString() ?? null };
    }),

  portfolio: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        role: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      take: MAX_PORTFOLIO_ORGS,
      orderBy: { organization: { name: "asc" } },
    });

    const rows: {
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
      role: string;
      steps: ReturnType<typeof evaluatePath> | null;
      /** Day 1 of the 30/60/90-day plan (ISO), or null before it starts. */
      planStart: string | null;
      /** The two "needs attention" figures the older client cards showed. */
      openIncidents: number | null;
      pendingGates: number | null;
    }[] = [];

    for (let i = 0; i < memberships.length; i += PORTFOLIO_BATCH) {
      const batch = memberships.slice(i, i + PORTFOLIO_BATCH);
      const results = await Promise.all(
        batch.map(async (m) => {
          const base = {
            organizationId: m.organization.id,
            organizationName: m.organization.name,
            organizationSlug: m.organization.slug,
            role: m.role,
          };
          try {
            const orgId = m.organization.id;
            const [counts, openIncidents, pendingGates] = await Promise.all([
              loadPathCounts(ctx.prisma, orgId),
              ctx.prisma.aIIncident.count({
                where: { organizationId: orgId, status: { in: [...OPEN_INCIDENT_STATUSES] } },
              }),
              ctx.prisma.oversightGate.count({
                where: { organizationId: orgId, status: "PENDING" },
              }),
            ]);
            const steps = evaluatePath(AI_SENTINEL_PATH, counts);
            const planStart = await loadPlanStart(ctx.prisma, orgId, steps.quickstart === "done");
            return {
              ...base,
              steps,
              planStart: planStart?.toISOString() ?? null,
              openIncidents,
              pendingGates,
            };
          } catch (error) {
            // One organisation that cannot be read shows as unknown; the rest still load.
            console.error(`Program path: could not read organization ${m.organization.id}:`, error);
            return { ...base, steps: null, planStart: null, openIncidents: null, pendingGates: null };
          }
        }),
      );
      rows.push(...results);
    }

    return rows;
  }),
});
