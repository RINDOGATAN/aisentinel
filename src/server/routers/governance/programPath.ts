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
 *
 * `overview` (and each portfolio row) carries what the Guided dashboard, the
 * menu's document lines and All clients read (the clarity work carried from
 * DPO Central, owner's decision d10, 9 October 2026): every document of the
 * register with its state, what needs action, and the deadlines at risk.
 * Organisation-wide figures: a member limited to departments gets nothing
 * but `limited: true`, as the dashboard shows such a member no
 * organisation-wide figures.
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, protectedProcedure } from "../../trpc";
import { AI_SENTINEL_PATH, type PathCounts } from "@/components/guided/path-config";
import { evaluatePath } from "@/components/guided/path";
import { loadPathCounts } from "@/server/services/program/path-counts";
import { loadPlanStart } from "@/server/services/program/plan-start";
import { loadDocumentFacts } from "@/server/services/program/document-facts";
import { loadDeadlines } from "@/server/services/program/deadlines";
import { loadBusinessUnitScope } from "@/server/services/business-units/scope";
import { collectNeedsAction } from "@/server/services/views/queries";
import { evaluateRegister, type EvaluatedDocument } from "@/config/document-register";
import type { NeedsActionItem } from "@/lib/needs-action";
import type { RecordDeadline } from "@/lib/programme-overview";
import type { PrismaClient } from "@prisma/client";

/** The same ceiling as the client list (clients.ts). */
const MAX_PORTFOLIO_ORGS = 50;
/** Organisations read at once, so fifty clients never open fifteen hundred queries together. */
const PORTFOLIO_BATCH = 5;
/** Open incidents, counted as the client cards count them (clients.ts). */
const OPEN_INCIDENT_STATUSES = ["REPORTED", "INVESTIGATING", "MITIGATING"] as const;

const localeInput = z.enum(["en", "es"]).default("en");

export interface ProgrammeOverviewData {
  limited: boolean;
  documents: EvaluatedDocument[];
  needsAction: NeedsActionItem[];
  deadlines: RecordDeadline[];
  /** Drafted items waiting for a person to confirm them (the review queue). */
  drafts: number;
}

const LIMITED: ProgrammeOverviewData = {
  limited: true,
  documents: [],
  needsAction: [],
  deadlines: [],
  drafts: 0,
};

/** One organisation's overview, for a membership whose department scope is known. */
async function loadOverview(
  prisma: PrismaClient,
  organizationId: string,
  membershipId: string,
  locale: "en" | "es",
  counts?: PathCounts,
): Promise<ProgrammeOverviewData> {
  const scope = await loadBusinessUnitScope(prisma, membershipId);
  if (!scope.all) return LIMITED;
  const [facts, needsAction, deadlines] = await Promise.all([
    loadDocumentFacts(prisma, organizationId, counts),
    collectNeedsAction(prisma, organizationId, scope),
    loadDeadlines(prisma, organizationId, locale),
  ]);
  return {
    limited: false,
    documents: evaluateRegister(facts),
    needsAction: needsAction.items,
    deadlines,
    drafts: facts.unconfirmed,
  };
}

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

  overview: organizationProcedure
    .input(z.object({ organizationId: z.string(), locale: localeInput }))
    .query(({ ctx, input }) =>
      loadOverview(ctx.prisma, ctx.organization.id, ctx.membership.id, input.locale),
    ),

  portfolio: protectedProcedure
    .input(z.object({ locale: localeInput }).optional())
    .query(async ({ ctx, input }) => {
    const locale = input?.locale ?? "en";
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        id: true,
        role: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      take: MAX_PORTFOLIO_ORGS,
      orderBy: { organization: { name: "asc" } },
    });

    const rows: ({
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
    } & ProgrammeOverviewData)[] = [];

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
            const counts = await loadPathCounts(ctx.prisma, orgId);
            const [openIncidents, pendingGates, overview] = await Promise.all([
              ctx.prisma.aIIncident.count({
                where: { organizationId: orgId, status: { in: [...OPEN_INCIDENT_STATUSES] } },
              }),
              ctx.prisma.oversightGate.count({
                where: { organizationId: orgId, status: "PENDING" },
              }),
              // What the client's own dashboard reads, so a row never disagrees with it.
              loadOverview(ctx.prisma, orgId, m.id, locale, counts),
            ]);
            const steps = evaluatePath(AI_SENTINEL_PATH, counts);
            const planStart = await loadPlanStart(ctx.prisma, orgId, steps.quickstart === "done");
            return {
              ...base,
              steps,
              planStart: planStart?.toISOString() ?? null,
              openIncidents,
              pendingGates,
              ...overview,
            };
          } catch (error) {
            // One organisation that cannot be read shows as unknown; the rest still load.
            console.error(`Program path: could not read organization ${m.organization.id}:`, error);
            return {
              ...base,
              steps: null,
              planStart: null,
              openIncidents: null,
              pendingGates: null,
              ...LIMITED,
              limited: false,
            };
          }
        }),
      );
      rows.push(...results);
    }

    return rows;
  }),
});
