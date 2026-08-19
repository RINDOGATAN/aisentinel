// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AI Governance Program router — feeds the program page (map + scorecard +
 * guidance). Thin wrapper: all assembly lives in
 * src/server/services/program/program-data.ts, shared verbatim with the PDF
 * export route so the two surfaces cannot diverge.
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure } from "../../trpc";
import {
  getProgramGraphData,
  getProgramScorecardData,
} from "../../services/program/program-data";

const localeInput = z.enum(["en", "es"]).default("en");

export const programRouter = createTRPCRouter({
  getProgramGraph: organizationProcedure
    .input(z.object({ organizationId: z.string(), locale: localeInput }))
    .query(({ ctx, input }) =>
      getProgramGraphData(ctx.prisma, ctx.organization.id, input.locale),
    ),

  getProgramScorecard: organizationProcedure
    .input(z.object({ organizationId: z.string(), locale: localeInput }))
    .query(({ ctx, input }) =>
      getProgramScorecardData(ctx.prisma, ctx.organization.id, input.locale),
    ),
});
