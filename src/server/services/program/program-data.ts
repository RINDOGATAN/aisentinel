// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program data assembly — the single source consumed by BOTH the tRPC
 * program router and the PDF export route, so the interactive page and the
 * exported report can never diverge. Pure orchestration over the unit-tested
 * modules (graph-input, maturity) plus the guidance config.
 */

import type { PrismaClient } from "@prisma/client";
import { buildProgramGraph, type ProgramSystemRow } from "./graph-input";
import {
  computeMaturity,
  type ProgramSnapshot,
  type GapSeverity,
} from "./maturity";
import {
  LAWFIRM_ROLLOUT_RECOMMENDATIONS,
  LAWFIRM_PROFESSIONAL_DUTIES,
  getActionTemplate,
  getRolloutForCategory,
  PROGRAM_GUIDANCE_REVIEW_MARKER,
  PROGRAM_GUIDANCE_REVIEW_MARKER_GENERAL,
  type GapId,
} from "@/config/program-guidance";
import {
  LAWFIRM_TOOLS,
  LAWFIRM_POLICY_PACK,
  LAWFIRM_TOOL_CATEGORIES,
  type ContentLocale,
} from "@/config/lawfirm-ai-toolkit";
import {
  art50Relevant,
  computeMarkingDeadline,
  type Art50ProfileStatuses,
} from "@/config/transparency-rules";
import { AI_SENTINEL_PATH } from "@/components/guided/path-config";
import {
  getConfirmationCounts,
  needsConfirmation,
  UNCONFIRMED_WHERE,
} from "@/server/services/provenance/summary";

// ── Locale helpers ──────────────────────────────────────────────────

async function techniqueLabeler(
  locale: ContentLocale,
): Promise<(technique: string) => string> {
  const messages = (await import(`../../../i18n/messages/${locale}.json`))
    .default as { common: Record<string, string> };
  return (technique: string) => {
    const key =
      "technique" +
      technique
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
    return messages.common[key] ?? technique;
  };
}

// ── Shared select ───────────────────────────────────────────────────

export const PROGRAM_SYSTEM_SELECT = {
  id: true,
  name: true,
  technique: true,
  status: true,
  processesPersonalData: true,
  vendorId: true,
  metadata: true,
  businessOwner: true,
  technicalOwner: true,
  purpose: true,
  description: true,
  role: true,
  riskClassification: { select: { riskLevel: true, provenance: true, confirmedAt: true } },
  transparencyProfile: {
    select: {
      id: true,
      provenance: true,
      confirmedAt: true,
      art50InteractionStatus: true,
      art50MarkingStatus: true,
      art50EmotionStatus: true,
      art50DeepfakeStatus: true,
    },
  },
  oversightGates: {
    select: { gateType: true, status: true, nextReviewDate: true, provenance: true, confirmedAt: true },
  },
  _count: { select: { policyLinks: true } },
} as const;

type ProvenanceRow = { provenance: string; confirmedAt: Date | null };

/**
 * Whether a person stands behind a row: entered by hand, or drafted and then
 * confirmed. The scorecard counts only these, so drafted items raise it only
 * as a person confirms them (the same rule as the review queue and the path).
 */
const confirmedRow = (row: ProvenanceRow): boolean =>
  !needsConfirmation(row as Parameters<typeof needsConfirmation>[0]);

type SystemRecord = {
  id: string;
  name: string;
  technique: string;
  status: string;
  processesPersonalData: boolean;
  vendorId: string | null;
  metadata: unknown;
  businessOwner: string | null;
  technicalOwner: string | null;
  purpose: string | null;
  description: string | null;
  role: string;
  riskClassification: ({ riskLevel: string } & ProvenanceRow) | null;
  transparencyProfile: ({ id: string } & Art50ProfileStatuses & ProvenanceRow) | null;
  oversightGates: ({
    gateType: string;
    status: string;
    nextReviewDate: Date | null;
  } & ProvenanceRow)[];
  _count: { policyLinks: number };
};

/** Art. 50 relevance of a system, from what it does (see art50Relevant). */
function systemArt50Relevant(r: SystemRecord): boolean {
  return art50Relevant(
    {
      name: r.name,
      description: r.description,
      purpose: r.purpose,
      technique: r.technique,
      processesPersonalData: r.processesPersonalData,
      role: r.role,
    },
    r.transparencyProfile,
  );
}

function toProgramRows(records: SystemRecord[]): ProgramSystemRow[] {
  return records.map((r) => ({
    id: r.id,
    name: r.name,
    technique: r.technique,
    status: r.status,
    processesPersonalData: r.processesPersonalData,
    vendorId: r.vendorId,
    metadata: r.metadata,
    riskLevel: r.riskClassification?.riskLevel ?? null,
    gates: r.oversightGates,
    policyLinkCount: r._count.policyLinks,
    transparencyRelevant: systemArt50Relevant(r),
    hasTransparencyProfile: r.transparencyProfile !== null,
  }));
}

function lawfirmCategoriesPresent(records: SystemRecord[]): string[] {
  const present = new Set<string>();
  for (const r of records) {
    const meta = r.metadata as { profile?: unknown; toolId?: unknown } | null;
    if (meta?.profile === "lawfirm" && typeof meta.toolId === "string") {
      const tool = LAWFIRM_TOOLS.find((t) => t.id === meta.toolId);
      if (tool) present.add(tool.categoryId);
    }
  }
  return LAWFIRM_TOOL_CATEGORIES.filter((c) => present.has(c.id)).map(
    (c) => c.id,
  );
}

/**
 * The stage of the program path (src/components/guided/path-config.ts) that
 * each gap's action belongs to. Confirming drafted items is part of setting
 * up: the quick start drafts them on day 1.
 */
export const GAP_STAGE: Record<GapId, string> = {
  "no-systems": "setup",
  "unconfirmed-items": "setup",
  "draft-policies": "setup",
  "unlinked-policies": "setup",
  "untriaged-shadow-reports": "inventory",
  "unclassified-systems": "assess",
  "high-risk-without-assessment": "assess",
  "unassessed-vendors": "assess",
  "high-risk-without-gate": "controls",
  "overdue-gates": "controls",
  "missing-transparency-profiles": "controls",
  "marking-overdue": "controls",
  "unassessed-compliance": "controls",
};

/** Every stage named in GAP_STAGE exists on the path (checked by the tests). */
export const PATH_STAGE_IDS: readonly string[] = AI_SENTINEL_PATH.stages.map((s) => s.id);

const CORE_POLICY_TYPES = new Set(LAWFIRM_POLICY_PACK.map((p) => p.type));
const ACTIVE_POLICY_STATUSES = new Set(["APPROVED", "PUBLISHED"]);


export type DutyControlStatus =
  | "inPlace"
  | "partial"
  | "missing"
  | "recommended";

// ── Graph ───────────────────────────────────────────────────────────

export async function getProgramGraphData(
  prisma: PrismaClient,
  organizationId: string,
  locale: ContentLocale,
) {
  const [records, vendors, complianceGroups, labelTechnique] =
    await Promise.all([
      prisma.aISystem.findMany({
        where: { organizationId },
        select: PROGRAM_SYSTEM_SELECT,
      }),
      prisma.aIVendor.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          riskLevel: true,
          _count: { select: { systems: true } },
        },
      }),
      prisma.complianceMapping.groupBy({
        by: ["aiSystemId", "status"],
        where: { organizationId },
        _count: { _all: true },
      }),
      techniqueLabeler(locale),
    ]);

  const complianceBySystem = new Map<
    string,
    { assessed: number; total: number }
  >();
  for (const row of complianceGroups) {
    const entry = complianceBySystem.get(row.aiSystemId) ?? {
      assessed: 0,
      total: 0,
    };
    entry.total += row._count._all;
    if (row.status !== "NOT_ASSESSED") entry.assessed += row._count._all;
    complianceBySystem.set(row.aiSystemId, entry);
  }

  return buildProgramGraph({
    systems: toProgramRows(records as SystemRecord[]),
    vendors: vendors.map((v) => ({
      id: v.id,
      name: v.name,
      riskLevel: v.riskLevel,
      systemCount: v._count.systems,
    })),
    complianceBySystem,
    locale,
    now: new Date(),
    labels: { technique: labelTechnique },
    stageForCategory: (categoryId) => getRolloutForCategory(categoryId)?.stage,
  });
}

// ── Scorecard ───────────────────────────────────────────────────────

export type ProgramScorecardData = Awaited<
  ReturnType<typeof getProgramScorecardData>
>;

export async function getProgramScorecardData(
  prisma: PrismaClient,
  organizationId: string,
  locale: ContentLocale,
) {
  const now = new Date();

  const [
    records,
    policies,
    linkedSystems,
    complianceByStatus,
    complianceUnconfirmedByStatus,
    markingRequiredRows,
    vendors,
    shadowTotal,
    shadowTriaged,
    organization,
    approvedAssessmentSystems,
    confirmationCounts,
  ] = await Promise.all([
    prisma.aISystem.findMany({
      where: { organizationId },
      select: PROGRAM_SYSTEM_SELECT,
    }),
    prisma.aIPolicy.findMany({
      where: { organizationId },
      select: { title: true, type: true, status: true, provenance: true, confirmedAt: true },
    }),
    prisma.aIPolicySystemLink.findMany({
      where: { policy: { organizationId } },
      select: { aiSystemId: true },
      distinct: ["aiSystemId"],
    }),
    prisma.complianceMapping.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.complianceMapping.groupBy({
      by: ["status"],
      where: { organizationId, ...UNCONFIRMED_WHERE },
      _count: { _all: true },
    }),
    prisma.transparencyProfile.findMany({
      where: { organizationId, art50MarkingStatus: "REQUIRED" },
      select: { placedOnMarketBefore2Aug2026: true },
    }),
    prisma.aIVendor.findMany({
      where: { organizationId },
      select: { riskLevel: true, dueDiligenceDate: true },
    }),
    prisma.shadowAIReport.count({ where: { organizationId } }),
    prisma.shadowAIReport.count({
      where: { organizationId, status: { not: "DISCOVERED" } },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    }),
    prisma.aIAssessment.findMany({
      where: { organizationId, status: "APPROVED" },
      select: { aiSystemId: true },
      distinct: ["aiSystemId"],
    }),
    getConfirmationCounts(prisma, organizationId),
  ]);

  const allSystems = (records as SystemRecord[]).filter(
    (s) => s.status !== "RETIRED",
  );
  // Art. 50 relevance read from every row as recorded, drafts included, so
  // the relevant count does not move when a drafted profile is left out.
  const art50ById = new Map(allSystems.map((s) => [s.id, systemArt50Relevant(s)]));
  // Two readings of the same rows. The figures (scores, tiles, maturity)
  // count only what a person stands behind: drafted items (quick start,
  // templates, imports) nobody has confirmed are left out, and their number
  // is returned as draftsExcluded. The plan's actions read everything that
  // exists, so a drafted classification asks to be confirmed (unconfirmed-
  // items), not to be made again.
  const build = (excludeDrafts: boolean) => {
    const systems = allSystems.map((s) => ({
      ...s,
      riskClassification:
        s.riskClassification && (!excludeDrafts || confirmedRow(s.riskClassification)) ? s.riskClassification : null,
      transparencyProfile:
        s.transparencyProfile && (!excludeDrafts || confirmedRow(s.transparencyProfile)) ? s.transparencyProfile : null,
      oversightGates: excludeDrafts ? s.oversightGates.filter(confirmedRow) : s.oversightGates,
    }));
    const confirmedPolicies = excludeDrafts ? policies.filter(confirmedRow) : policies;
    const gates = systems.flatMap((s) => s.oversightGates);
    const highRisk = systems.filter(
      (s) =>
        s.riskClassification?.riskLevel === "HIGH" ||
        s.riskClassification?.riskLevel === "UNACCEPTABLE",
    );
    const systemsWithGate = systems.filter((s) => s.oversightGates.length > 0);
    const systemsNeedingGate = new Set([
      ...highRisk.map((s) => s.id),
      ...systemsWithGate.map((s) => s.id),
    ]);
    const relevant = systems.filter((s) => art50ById.get(s.id));

    const complianceCounts = { assessed: 0, compliant: 0, partial: 0, total: 0 };
    for (const row of complianceByStatus) {
      complianceCounts.total += row._count._all;
      if (row.status !== "NOT_ASSESSED")
        complianceCounts.assessed += row._count._all;
      if (row.status === "COMPLIANT") complianceCounts.compliant += row._count._all;
      if (row.status === "PARTIALLY_COMPLIANT")
        complianceCounts.partial += row._count._all;
    }
    // A drafted status counts as not assessed until a person confirms it.
    for (const row of excludeDrafts ? complianceUnconfirmedByStatus : []) {
      if (row.status === "NOT_ASSESSED") continue;
      complianceCounts.assessed -= row._count._all;
      if (row.status === "COMPLIANT") complianceCounts.compliant -= row._count._all;
      if (row.status === "PARTIALLY_COMPLIANT")
        complianceCounts.partial -= row._count._all;
    }

    const markingOverdue = markingRequiredRows.filter(
      (row) =>
        computeMarkingDeadline({
          placedOnMarketBefore2Aug2026: row.placedOnMarketBefore2Aug2026,
          markingStatus: "REQUIRED",
        })?.overdue,
    ).length;

    const snapshot: ProgramSnapshot = {
      systems: {
        total: systems.length,
        deployed: systems.filter((s) => s.status === "DEPLOYED").length,
        withOwner: systems.filter(
          (s) => s.businessOwner !== null || s.technicalOwner !== null,
        ).length,
        withPurpose: systems.filter(
          (s) => s.purpose !== null && s.purpose.trim() !== "",
        ).length,
        retired: (records as SystemRecord[]).length - systems.length,
      },
      classification: {
        classified: systems.filter((s) => s.riskClassification !== null).length,
        high: systems.filter((s) => s.riskClassification?.riskLevel === "HIGH")
          .length,
        unacceptable: systems.filter(
          (s) => s.riskClassification?.riskLevel === "UNACCEPTABLE",
        ).length,
      },
      oversight: {
        systemsNeedingGate: systemsNeedingGate.size,
        systemsWithGate: systemsWithGate.length,
        gatesPassed: gates.filter((g) => g.status === "PASSED").length,
        gatesTotal: gates.length,
        overdue: gates.filter(
          (g) =>
            (g.status === "PENDING" || g.status === "IN_REVIEW") &&
            g.nextReviewDate !== null &&
            g.nextReviewDate.getTime() < now.getTime(),
        ).length,
      },
      policies: {
        coreTypesPresent: new Set(
          confirmedPolicies
            .filter((p) => CORE_POLICY_TYPES.has(p.type))
            .map((p) => p.type),
        ).size,
        active: confirmedPolicies.filter((p) => ACTIVE_POLICY_STATUSES.has(p.status))
          .length,
        total: confirmedPolicies.length,
        systemsLinked: linkedSystems.length,
      },
      compliance: {
        assessed: complianceCounts.assessed,
        compliant: complianceCounts.compliant,
        partial: complianceCounts.partial,
        totalMappings: complianceCounts.total,
      },
      transparency: {
        relevantSystems: relevant.length,
        withProfile: relevant.filter((s) => s.transparencyProfile !== null)
          .length,
        markingOverdue,
      },
      vendors: {
        systemsWithVendor: systems.filter((s) => s.vendorId !== null).length,
        vendorsTotal: vendors.length,
        vendorsAssessed: vendors.filter(
          (v) => v.riskLevel !== null || v.dueDiligenceDate !== null,
        ).length,
      },
      shadowAi: { reports: shadowTotal, triaged: shadowTriaged },
      assessments: (() => {
        const approved = new Set(approvedAssessmentSystems.map((a) => a.aiSystemId));
        const high = systems.filter((s) => s.riskClassification?.riskLevel === "HIGH");
        return {
          highRiskSystems: high.length,
          highRiskWithApprovedAssessment: high.filter((s) => approved.has(s.id)).length,
        };
      })(),
      provenance: {
        unconfirmed: Object.values(confirmationCounts).reduce(
          (n, c) => n + Math.max(0, c.total - c.confirmed),
          0,
        ),
      },
    };
    return { snapshot, gates, highRisk };
  };
  const { snapshot, gates, highRisk } = build(true);
  const { snapshot: existing } = build(false);

  // Scores from what is confirmed; gaps (the plan's actions) from what exists.
  const maturity = { ...computeMaturity(snapshot), gaps: computeMaturity(existing).gaps };

  // The action plan follows the path's five phases: each gap's action is
  // shown under the phase it belongs to (GAP_STAGE), most severe first, so the
  // program page, the PDF and the Dashboard describe one plan.
  const RANK: Record<GapSeverity, number> = { critical: 0, high: 1, medium: 2 };
  const plan = AI_SENTINEL_PATH.stages.map((stage) => ({
    bucket: stage.id,
    stages: [stage.id],
    items: maturity.gaps
      .filter((gap) => GAP_STAGE[gap.id] === stage.id)
      .sort((a, b) => RANK[a.severity] - RANK[b.severity])
      .map((gap) => {
        const template = getActionTemplate(gap.id as GapId);
        return {
          gapId: gap.id,
          stage: GAP_STAGE[gap.id],
          severity: gap.severity,
          count: gap.count,
          title: template?.title[locale] ?? gap.id,
          detail: template?.detail[locale] ?? "",
          href: template?.href ?? "/governance",
          effort: template?.effort ?? "M",
        };
      }),
  }));

  // Profile-aware guidance
  const settings = organization?.settings as
    | { quickstart?: { profile?: string } }
    | null;
  const profile = settings?.quickstart?.profile ?? null;
  const categories = lawfirmCategoriesPresent(records as SystemRecord[]);

  const rollout = categories
    .map((categoryId) => {
      const rec = LAWFIRM_ROLLOUT_RECOMMENDATIONS.find(
        (r) => r.categoryId === categoryId,
      );
      const category = LAWFIRM_TOOL_CATEGORIES.find((c) => c.id === categoryId);
      if (!rec || !category) return null;
      return {
        categoryId,
        label: category.label[locale],
        stage: rec.stage,
        summary: rec.summary[locale],
        preconditions: rec.preconditions.map((p) => p[locale]),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Duties grid (lawfirm only): duty → controls with computed coverage
  const isLawfirm = profile === "lawfirm" || categories.length > 0;
  const policyByPackId = new Map(
    LAWFIRM_POLICY_PACK.map((pack) => [
      pack.id,
      policies.find(
        (p) => p.title === pack.title.en || p.title === pack.title.es,
      ) ?? null,
    ]),
  );
  const duties = !isLawfirm
    ? null
    : LAWFIRM_PROFESSIONAL_DUTIES.map((duty) => ({
        id: duty.id,
        label: duty.label[locale],
        description: duty.description[locale],
        controls: duty.controls.map((control) => {
          if (control.kind === "policy") {
            const pack = LAWFIRM_POLICY_PACK.find(
              (p) => p.id === control.policyId,
            );
            const org = policyByPackId.get(control.policyId) ?? null;
            const status: DutyControlStatus = !org
              ? "missing"
              : ACTIVE_POLICY_STATUSES.has(org.status)
                ? "inPlace"
                : "partial";
            return {
              kind: "policy" as const,
              label: pack?.title[locale] ?? control.policyId,
              status,
            };
          }
          if (control.kind === "gateType") {
            const ofType = gates.filter((g) => g.gateType === control.gateType);
            const status: DutyControlStatus =
              ofType.length === 0
                ? "missing"
                : ofType.some((g) => g.status === "PASSED")
                  ? "inPlace"
                  : "partial";
            return { kind: "gateType" as const, label: control.gateType, status };
          }
          if (control.kind === "register") {
            const status: DutyControlStatus =
              snapshot.systems.total === 0
                ? "missing"
                : snapshot.classification.classified === snapshot.systems.total
                  ? "inPlace"
                  : "partial";
            return { kind: "register" as const, label: null, status };
          }
          if (control.kind === "transparency") {
            const status: DutyControlStatus =
              snapshot.transparency.relevantSystems === 0
                ? "inPlace"
                : snapshot.transparency.withProfile >=
                    snapshot.transparency.relevantSystems
                  ? "inPlace"
                  : snapshot.transparency.withProfile > 0
                    ? "partial"
                    : "missing";
            return { kind: "transparency" as const, label: null, status };
          }
          return {
            kind: "training" as const,
            label: control.note[locale],
            status: "recommended" as DutyControlStatus,
          };
        }),
      }));

  return {
    locale,
    profile,
    generatedAt: now.toISOString(),
    snapshot,
    maturity,
    tiles: {
      overall: maturity.overall,
      systemsGoverned: {
        classified: snapshot.classification.classified,
        total: snapshot.systems.total,
      },
      highRiskUnderOversight: {
        withGate: highRisk.filter((s) => s.oversightGates.length > 0).length,
        needing: highRisk.length,
      },
      policyCoverage: {
        coreTypesPresent: snapshot.policies.coreTypesPresent,
        active: snapshot.policies.active,
      },
      complianceAssessedPct:
        snapshot.compliance.totalMappings === 0
          ? 0
          : Math.round(
              (100 * snapshot.compliance.assessed) /
                snapshot.compliance.totalMappings,
            ),
      openGaps: maturity.gaps.length,
    },
    plan,
    rollout,
    duties,
    /** Drafted items left out of the figures above until a person confirms them. */
    draftsExcluded: snapshot.provenance?.unconfirmed ?? 0,
    reviewMarker: (isLawfirm
      ? PROGRAM_GUIDANCE_REVIEW_MARKER
      : PROGRAM_GUIDANCE_REVIEW_MARKER_GENERAL)[locale],
  };
}
