// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Obligations calendar assembly — the single source consumed by BOTH the
 * tRPC router and the PDF report, mirroring program-data.ts, so the page and
 * the export cannot drift apart.
 *
 * The honesty rule this module exists to enforce: a missing fact is
 * "undetermined", never "does not apply". An organisation that has not
 * declared where it operates must not be told California is irrelevant to it.
 */

import type { PrismaClient } from "@prisma/client";
import {
  REGULATORY_MILESTONES,
  REGULATORY_MILESTONES_VERSION,
  REGULATORY_MILESTONES_REVIEW_MARKER,
  evaluateMilestones,
  type MilestoneOrgContext,
  type MilestoneSystemContext,
  type MilestoneEvaluation,
  type UndeterminedReason,
  type JurisdictionCode,
} from "@/config/regulatory-milestones";
import type { ContentLocale } from "@/config/lawfirm-ai-toolkit";

export interface ObligationRow {
  id: string;
  instrument: string;
  citation: string;
  provision: string;
  title: string;
  whatItMeans: string;
  dateIso: string;
  daysRemaining: number;
  phase: MilestoneEvaluation["phase"];
  tone: TimelineTone;
  countUnit: "systems" | "organization";
  inScope: { id: string; name: string }[];
  undetermined: { id: string; name: string; reason: UndeterminedReason }[];
  satisfiedCount: number;
  outOfScopeCount: number;
  overdue: boolean;
  applicability: MilestoneEvaluation["applicability"];
  href: string | null;
  requirementIds: string[];
}

export type TimelineTone =
  | "overdue"
  | "imminent"
  | "upcoming"
  | "past-satisfied"
  | "not-applicable"
  | "unknown";

export interface ObligationsData {
  locale: ContentLocale;
  generatedAt: string;
  assumedJurisdictions: JurisdictionCode[];
  jurisdictionsDeclared: boolean;
  rows: ObligationRow[];
  next: ObligationRow | null;
  counts: {
    overdue: number;
    imminent: number;
    upcoming: number;
    notApplicable: number;
    undetermined: number;
  };
  rulePackVersion: string;
  reviewMarker: string;
}

/** Map an evaluation onto the timeline's visual vocabulary. */
function toneFor(evaluation: MilestoneEvaluation): TimelineTone {
  if (evaluation.overdue) return "overdue";
  if (evaluation.applicability === "unknown") return "unknown";
  if (evaluation.applicability === "does-not-apply") return "not-applicable";
  if (evaluation.phase === "past") return "past-satisfied";
  if (evaluation.phase === "imminent") return "imminent";
  return "upcoming";
}

/**
 * Which row deserves the countdown. Overdue pre-empts everything; then the
 * nearest milestone that actually applies; then the nearest one whose scope
 * we cannot determine (phrased as such, never as a zero).
 */
function pickNext(rows: ObligationRow[]): ObligationRow | null {
  return (
    rows.find((r) => r.overdue) ??
    rows.find((r) => r.phase !== "past" && r.inScope.length > 0) ??
    rows.find((r) => r.phase !== "past" && r.undetermined.length > 0) ??
    rows.find((r) => r.phase !== "past") ??
    null
  );
}

export async function getObligationsData(
  prisma: PrismaClient,
  organizationId: string,
  locale: ContentLocale,
  now: Date = new Date(),
): Promise<ObligationsData> {
  const [org, systems, requirementRows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        operatingJurisdictions: true,
        jurisdictionsReviewedAt: true,
        settings: true,
      },
    }),
    prisma.aISystem.findMany({
      where: { organizationId, status: { not: "RETIRED" } },
      select: {
        id: true,
        name: true,
        technique: true,
        role: true,
        status: true,
        processesPersonalData: true,
        riskClassification: {
          select: { riskLevel: true, annexIIICategory: true },
        },
        transparencyProfile: {
          select: {
            art50InteractionStatus: true,
            art50MarkingStatus: true,
            art50EmotionStatus: true,
            art50DeepfakeStatus: true,
            placedOnMarketBefore2Aug2026: true,
          },
        },
      },
    }),
    // Resolve the seeded requirement rows a milestone points at, so the UI can
    // deep-link into the compliance matrix rather than restating the law.
    prisma.complianceRequirement.findMany({
      where: {
        code: {
          in: REGULATORY_MILESTONES.flatMap((m) => m.requirementCodes ?? []),
        },
      },
      select: { id: true, code: true },
    }),
  ]);

  const requirementIdByCode = new Map(
    requirementRows.map((r) => [r.code, r.id]),
  );

  const jurisdictions = (org?.operatingJurisdictions ??
    []) as unknown as JurisdictionCode[];
  const jurisdictionsDeclared =
    jurisdictions.length > 0 && org?.jurisdictionsReviewedAt != null;

  const orgContext: MilestoneOrgContext = {
    jurisdictions,
    jurisdictionsDeclared,
    // Screening facts nobody has been asked for yet. They stay null so every
    // milestone that depends on them reports "undetermined" rather than
    // silently assuming the org is out of scope.
    revenueTier: null,
    sellsOrSharesPersonalInfo: null,
    isLargeOnlinePlatform: null,
    isGenerativeAiDeveloper: null,
    hasEmployees: null,
  };

  const systemContexts: MilestoneSystemContext[] = systems.map((s) => ({
    id: s.id,
    name: s.name,
    riskLevel: (s.riskClassification?.riskLevel ??
      null) as MilestoneSystemContext["riskLevel"],
    annexIiiCategory: s.riskClassification?.annexIIICategory ?? null,
    // Nobody has been asked whether a system is an Annex I embedded product;
    // null keeps the 2027-vs-2028 question honestly open.
    isAnnexIProduct: null,
    technique: s.technique,
    role: s.role,
    status: s.status,
    processesPersonalData: s.processesPersonalData,
    placedOnMarketBefore2Aug2026:
      s.transparencyProfile?.placedOnMarketBefore2Aug2026 ?? null,
    art50: s.transparencyProfile
      ? {
          interaction: s.transparencyProfile.art50InteractionStatus,
          marking: s.transparencyProfile.art50MarkingStatus,
          emotion: s.transparencyProfile.art50EmotionStatus,
          deepfake: s.transparencyProfile.art50DeepfakeStatus,
        }
      : null,
    // The ADMT profile model lands with the California framework; until then
    // every CCPA milestone is undetermined for every system, which is true.
    admt: null,
  }));

  const nameById = new Map(systems.map((s) => [s.id, s.name]));
  const evaluations = evaluateMilestones({
    org: orgContext,
    systems: systemContexts,
    nowIso: now.toISOString().slice(0, 10),
  });

  const rows: ObligationRow[] = evaluations.map((e) => ({
    id: e.milestone.id,
    instrument: e.milestone.instrument,
    citation: e.milestone.citation,
    provision: e.milestone.provision,
    title: e.milestone.title[locale],
    whatItMeans: e.milestone.whatItMeans[locale],
    dateIso: e.date.toISOString().slice(0, 10),
    daysRemaining: e.daysRemaining,
    phase: e.phase,
    tone: toneFor(e),
    countUnit: e.milestone.countUnit,
    inScope: e.inScope.map((id) => ({ id, name: nameById.get(id) ?? id })),
    undetermined: e.undetermined.map((u) => ({
      id: u.id,
      name: nameById.get(u.id) ?? u.id,
      reason: u.reason,
    })),
    satisfiedCount: e.satisfied.length,
    outOfScopeCount: e.outOfScope,
    overdue: e.overdue,
    applicability: e.applicability,
    href: e.milestone.href ?? null,
    requirementIds: (e.milestone.requirementCodes ?? [])
      .map((code) => requirementIdByCode.get(code))
      .filter((id): id is string => id !== undefined),
  }));

  return {
    locale,
    generatedAt: now.toISOString(),
    assumedJurisdictions: jurisdictions,
    jurisdictionsDeclared,
    rows,
    next: pickNext(rows),
    counts: {
      overdue: rows.filter((r) => r.overdue).length,
      imminent: rows.filter((r) => r.phase === "imminent" && !r.overdue).length,
      upcoming: rows.filter((r) => r.phase === "upcoming").length,
      notApplicable: rows.filter((r) => r.applicability === "does-not-apply")
        .length,
      undetermined: rows.filter((r) => r.applicability === "unknown").length,
    },
    rulePackVersion: REGULATORY_MILESTONES_VERSION,
    reviewMarker: REGULATORY_MILESTONES_REVIEW_MARKER[locale],
  };
}
