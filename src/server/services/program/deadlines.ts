// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The deadlines at risk the Guided dashboard and All clients show (the
 * clarity work carried from DPO Central, owner's decision d10, 9 October
 * 2026):
 *
 * - `incidentReport`  the statutory clock of each open incident with nothing
 *                     sent yet (src/config/incident-deadlines.ts), the
 *                     earliest computed one per incident; overdue included
 * - `retest`          a threat model whose review or re-test is due within
 *                     the horizon, or overdue
 * - `obligation`      a regulatory obligation that touches this organisation
 *                     and falls within the horizon, or was measurably missed
 *                     (src/server/services/obligations/obligations-data.ts)
 *
 * The plan's next milestone is worked out where it is shown, from the plan's
 * start (src/lib/programme-overview.ts, planMilestone). Dates, a short label
 * and a link only; no content leaves the database.
 */

import type { PrismaClient } from "@prisma/client";
import { computeIncidentDeadlines } from "@/config/incident-deadlines";
import { getObligationsData } from "@/server/services/obligations/obligations-data";
import type { RecordDeadline } from "@/lib/programme-overview";

const OPEN_INCIDENT = ["REPORTED", "INVESTIGATING", "MITIGATING"] as const;
const HORIZON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const LIMIT = 6;

export async function loadDeadlines(
  prisma: PrismaClient,
  organizationId: string,
  locale: "en" | "es",
  now: Date = new Date(),
): Promise<RecordDeadline[]> {
  const horizon = new Date(now.getTime() + HORIZON_DAYS * DAY_MS);

  const [organization, incidents, threatModels, obligations] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: organizationId },
      select: { operatingJurisdictions: true },
    }),
    prisma.aIIncident.findMany({
      where: {
        organizationId,
        status: { in: [...OPEN_INCIDENT] },
        // Nothing sent yet: once a notification is sent the clock has been met.
        notifications: { none: { sentAt: { not: null } } },
      },
      orderBy: { reportedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        reportedAt: true,
        awareAt: true,
        deathOccurred: true,
        widespreadOrCriticalInfrastructure: true,
        personalDataBreach: true,
        highRiskToIndividuals: true,
        aiOfficeCompetent: true,
        aiSystem: { select: { role: true, riskClassification: { select: { riskLevel: true } } } },
      },
    }),
    prisma.threatModel.findMany({
      where: { organizationId, status: { not: "ARCHIVED" }, nextReviewDue: { lt: horizon } },
      orderBy: { nextReviewDue: "asc" },
      take: 3,
      select: { id: true, name: true, nextReviewDue: true },
    }),
    getObligationsData(prisma, organizationId, locale, now),
  ]);

  const jurisdictions = (organization?.operatingJurisdictions ?? []) as string[];
  const out: RecordDeadline[] = [];

  for (const incident of incidents) {
    const role =
      incident.aiSystem?.role === "PROVIDER"
        ? "PROVIDER"
        : incident.aiSystem?.role === "DEPLOYER"
          ? "DEPLOYER"
          : "OTHER";
    const clocks = computeIncidentDeadlines({
      awareAt: incident.awareAt ?? incident.reportedAt,
      role,
      euHighRisk: incident.aiSystem?.riskClassification?.riskLevel === "HIGH",
      death: incident.deathOccurred,
      widespreadOrCriticalInfrastructure: incident.widespreadOrCriticalInfrastructure,
      personalDataBreach: incident.personalDataBreach,
      highRiskToIndividuals: incident.highRiskToIndividuals,
      aiOfficeCompetent: incident.aiOfficeCompetent,
      jurisdictions,
    })
      .filter((c) => c.dueAt !== null)
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime());
    const first = clocks[0];
    if (!first?.dueAt) continue;
    out.push({
      kind: "incidentReport",
      at: first.dueAt.toISOString(),
      label: incident.title,
      href: `/governance/incidents/${incident.id}`,
    });
  }

  for (const model of threatModels) {
    if (!model.nextReviewDue) continue;
    out.push({
      kind: "retest",
      at: model.nextReviewDue.toISOString(),
      label: model.name,
      href: `/governance/threat-model/${model.id}`,
    });
  }

  // Obligations that touch this organisation: in scope for a system, or for
  // the organisation as a whole. An undetermined scope is not a deadline yet.
  for (const row of obligations.rows) {
    const touches =
      row.inScope.length > 0 || (row.countUnit === "organization" && row.applicability === "applies");
    if (!touches) continue;
    const at = new Date(`${row.dateIso.slice(0, 10)}T00:00:00Z`);
    const due = row.phase !== "past" && at.getTime() < horizon.getTime();
    if (!row.overdue && !due) continue;
    out.push({ kind: "obligation", at: at.toISOString(), label: row.title, href: "/governance/obligations" });
  }

  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(0, LIMIT);
}
