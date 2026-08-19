// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Regulatory obligations calendar. Thin wrapper: all assembly lives in
 * src/server/services/obligations/obligations-data.ts, shared with the PDF
 * report so the page and the export cannot diverge.
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure } from "../../trpc";
import { getObligationsData } from "../../services/obligations/obligations-data";

const localeInput = z.enum(["en", "es"]).default("en");

export const obligationsRouter = createTRPCRouter({
  getObligations: organizationProcedure
    .input(z.object({ organizationId: z.string(), locale: localeInput }))
    .query(({ ctx, input }) =>
      getObligationsData(ctx.prisma, ctx.organization.id, input.locale),
    ),

  /** Slim projection for the dashboard countdown strip. */
  getNextObligation: organizationProcedure
    .input(z.object({ organizationId: z.string(), locale: localeInput }))
    .query(async ({ ctx, input }) => {
      const data = await getObligationsData(
        ctx.prisma,
        ctx.organization.id,
        input.locale,
      );
      return {
        next: data.next,
        upcoming: data.rows
          .filter((r) => r.phase !== "past")
          .slice(0, 3)
          .map((r) => ({
            id: r.id,
            title: r.title,
            dateIso: r.dateIso,
            daysRemaining: r.daysRemaining,
            tone: r.tone,
          })),
        jurisdictionsDeclared: data.jurisdictionsDeclared,
        counts: data.counts,
      };
    }),
});
