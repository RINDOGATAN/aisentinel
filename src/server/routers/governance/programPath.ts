// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program path router: where an organisation stands on the six-stage path the
 * Guided layout shows (src/components/guided/path-config.ts).
 *
 * Read-only. `status` is one organisation, through the usual membership
 * guard. `portfolio` is every organisation the signed-in person belongs to,
 * found from their own memberships and nothing else, for the consultant's
 * client overview.
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, protectedProcedure } from "../../trpc";
import { AI_SENTINEL_PATH } from "@/components/guided/path-config";
import { evaluatePath } from "@/components/guided/path";
import { loadPathCounts } from "@/server/services/program/path-counts";

/** The same ceiling as the client list (clients.ts). */
const MAX_PORTFOLIO_ORGS = 50;
/** Organisations read at once, so fifty clients never open fifteen hundred queries together. */
const PORTFOLIO_BATCH = 5;

export const programPathRouter = createTRPCRouter({
  status: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const counts = await loadPathCounts(ctx.prisma, ctx.organization.id);
      return { steps: evaluatePath(AI_SENTINEL_PATH, counts) };
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
            const counts = await loadPathCounts(ctx.prisma, m.organization.id);
            return { ...base, steps: evaluatePath(AI_SENTINEL_PATH, counts) };
          } catch (error) {
            // One organisation that cannot be read shows as unknown; the rest still load.
            console.error(`Program path: could not read organization ${m.organization.id}:`, error);
            return { ...base, steps: null };
          }
        }),
      );
      rows.push(...results);
    }

    return rows;
  }),
});
