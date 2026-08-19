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
  type GapId,
} from "@/config/program-guidance";
import {
  LAWFIRM_TOOLS,
  LAWFIRM_POLICY_PACK,
  LAWFIRM_TOOL_CATEGORIES,
  type ContentLocale,
} from "@/config/lawfirm-ai-toolkit";
import { computeMarkingDeadline } from "@/config/transparency-rules";

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
  riskClassification: { select: { riskLevel: true } },
  transparencyProfile: { select: { id: true } },
  oversightGates: {
    select: { gateType: true, status: true, nextReviewDate: true },
  },
  _count: { select: { policyLinks: true } },
} as const;

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
  riskClassification: { riskLevel: string } | null;
  transparencyProfile: { id: string } | null;
  oversightGates: {
    gateType: string;
    status: string;
    nextReviewDate: Date | null;
  }[];
  _count: { policyLinks: number };
};

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

const CORE_POLICY_TYPES = new Set(LAWFIRM_POLICY_PACK.map((p) => p.type));
const ACTIVE_POLICY_STATUSES = new Set(["APPROVED", "PUBLISHED"]);

const SEVERITY_BUCKET: Record<GapSeverity, "1-30" | "31-60" | "61-90"> = {
  critical: "1-30",
  high: "31-60",
  medium: "61-90",
};

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
    markingRequiredRows,
    vendors,
    shadowTotal,
    shadowTriaged,
    organization,
  ] = await Promise.all([
    prisma.aISystem.findMany({
      where: { organizationId },
      select: PROGRAM_SYSTEM_SELECT,
    }),
    prisma.aIPolicy.findMany({
      where: { organizationId },
      select: { title: true, type: true, status: true },
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
  ]);

  const systems = (records as SystemRecord[]).filter(
    (s) => s.status !== "RETIRED",
  );
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
  const relevant = systems.filter((s) => s.technique === "GENERATIVE_AI");

  const complianceCounts = { assessed: 0, compliant: 0, partial: 0, total: 0 };
  for (const row of complianceByStatus) {
    complianceCounts.total += row._count._all;
    if (row.status !== "NOT_ASSESSED")
      complianceCounts.assessed += row._count._all;
    if (row.status === "COMPLIANT") complianceCounts.compliant += row._count._all;
    if (row.status === "PARTIALLY_COMPLIANT")
      complianceCounts.partial += row._count._all;
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
        policies
          .filter((p) => CORE_POLICY_TYPES.has(p.type))
          .map((p) => p.type),
      ).size,
      active: policies.filter((p) => ACTIVE_POLICY_STATUSES.has(p.status))
        .length,
      total: policies.length,
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
  };

  const maturity = computeMaturity(snapshot);

  // 90-day plan: gaps → localized action templates, severity-bucketed
  const plan = (["1-30", "31-60", "61-90"] as const).map((bucket) => ({
    bucket,
    items: maturity.gaps
      .filter((gap) => SEVERITY_BUCKET[gap.severity] === bucket)
      .map((gap) => {
        const template = getActionTemplate(gap.id as GapId);
        return {
          gapId: gap.id,
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
    reviewMarker: PROGRAM_GUIDANCE_REVIEW_MARKER[locale],
  };
}
