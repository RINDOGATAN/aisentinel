// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program maturity model — the methodology behind the Governance Program
 * scorecard. Pure: takes a plain-counts snapshot, returns dimension scores,
 * NIST AI RMF axis scores, an overall score, and the gap list that feeds
 * the 90-day plan. No Prisma, no Next.js — unit-testable and shared verbatim
 * by the tRPC router and the PDF export route (they cannot diverge).
 *
 * ## Dimensions (0–100 each)
 *
 * | Dimension      | Formula                                                                    | Empty-denominator rule            |
 * |----------------|----------------------------------------------------------------------------|-----------------------------------|
 * | inventory      | 40·(any systems) + 30·(withOwner/total) + 30·(withPurpose/total)           | 0 systems → 0                     |
 * | classification | 100·(classified/total)                                                     | 0 systems → 0                     |
 * | oversight      | 100·(0.6·withGate/needingGate + 0.4·passed/gatesTotal) − 10·min(overdue,3) | no need & no gates → 100          |
 * | policies       | 50·(coreTypes/6) + 25·(active/policies) + 25·(systemsLinked/systems)       | 0 policies → active term 0        |
 * | compliance     | 50·(assessed/mappings) + 50·((compliant + 0.5·partial)/mappings)           | 0 mappings → 0                    |
 * | transparency   | 100·(withProfile/relevant) − 15·min(markingOverdue,3)                      | 0 relevant systems → 100          |
 * | vendorRisk     | 50·(systemsWithVendor/systems) + 50·(vendorsAssessed/vendors)              | 0 systems → 0; 0 vendors → term 0 |
 * | shadowAi       | 100·(triaged/reports)                                                      | 0 reports → 100 (no shadow signal is not a gap) |
 *
 * All ratios are clamped to [0, 1] before weighting; every score is rounded
 * and clamped to [0, 100].
 *
 * ## NIST AI RMF axis mapping (weighted mean of dimension scores)
 *
 * | Axis    | Dimensions (weights)                                        | Target |
 * |---------|-------------------------------------------------------------|--------|
 * | GOVERN  | policies 0.6 · shadowAi 0.4                                  | 80     |
 * | MAP     | inventory 0.4 · classification 0.35 · vendorRisk 0.25        | 85     |
 * | MEASURE | compliance 0.6 · transparency 0.4                            | 75     |
 * | MANAGE  | oversight 1.0                                                | 75     |
 *
 * Overall = rounded mean of the four axis scores. Targets are fixed v1
 * defaults; incident-response readiness joins MANAGE in a later version.
 */

// ── Snapshot input ──────────────────────────────────────────────────

export interface ProgramSnapshot {
  systems: {
    total: number;
    deployed: number;
    withOwner: number;
    withPurpose: number;
    retired: number;
  };
  classification: {
    classified: number;
    high: number;
    unacceptable: number;
  };
  oversight: {
    systemsNeedingGate: number;
    systemsWithGate: number;
    gatesPassed: number;
    gatesTotal: number;
    overdue: number;
  };
  policies: {
    /** how many of the 6 core PolicyType targets exist (any status) */
    coreTypesPresent: number;
    /** APPROVED or PUBLISHED */
    active: number;
    total: number;
    /** systems with at least one policy link */
    systemsLinked: number;
  };
  compliance: {
    /** mappings with status != NOT_ASSESSED */
    assessed: number;
    compliant: number;
    partial: number;
    totalMappings: number;
  };
  transparency: {
    /** Art. 50-relevant systems (GENERATIVE_AI) */
    relevantSystems: number;
    withProfile: number;
    markingOverdue: number;
  };
  vendors: {
    systemsWithVendor: number;
    vendorsTotal: number;
    /** riskLevel set or dueDiligenceDate set */
    vendorsAssessed: number;
  };
  shadowAi: {
    reports: number;
    /** status != DISCOVERED */
    triaged: number;
  };
}

// ── Output types ────────────────────────────────────────────────────

export type DimensionId =
  | "inventory"
  | "classification"
  | "oversight"
  | "policies"
  | "compliance"
  | "transparency"
  | "vendorRisk"
  | "shadowAi";

export interface DimensionScore {
  id: DimensionId;
  score: number;
  target: number;
}

export type NistAxisId = "GOVERN" | "MAP" | "MEASURE" | "MANAGE";

export interface NistAxis {
  id: NistAxisId;
  score: number;
  target: number;
}

export type GapId =
  | "no-systems"
  | "unclassified-systems"
  | "high-risk-without-gate"
  | "overdue-gates"
  | "draft-policies"
  | "unlinked-policies"
  | "missing-transparency-profiles"
  | "marking-overdue"
  | "unassessed-vendors"
  | "untriaged-shadow-reports"
  | "unassessed-compliance";

export type GapSeverity = "critical" | "high" | "medium";

export interface ProgramGap {
  id: GapId;
  severity: GapSeverity;
  count: number;
}

export interface MaturityResult {
  dimensions: DimensionScore[];
  nist: NistAxis[];
  overall: number;
  gaps: ProgramGap[];
}

// ── Fixed v1 targets ────────────────────────────────────────────────

/** Per-dimension targets (v1 defaults, shown as ticks on the dimension grid) */
export const DIMENSION_TARGETS: Record<DimensionId, number> = {
  inventory: 90,
  classification: 100,
  oversight: 80,
  policies: 85,
  compliance: 70,
  transparency: 90,
  vendorRisk: 80,
  shadowAi: 90,
};

export const NIST_TARGETS: Record<NistAxisId, number> = {
  GOVERN: 80,
  MAP: 85,
  MEASURE: 75,
  MANAGE: 75,
};

/** Weighted dimension → axis mapping (documented in the header table) */
export const NIST_AXIS_WEIGHTS: Record<
  NistAxisId,
  Partial<Record<DimensionId, number>>
> = {
  GOVERN: { policies: 0.6, shadowAi: 0.4 },
  MAP: { inventory: 0.4, classification: 0.35, vendorRisk: 0.25 },
  MEASURE: { compliance: 0.6, transparency: 0.4 },
  MANAGE: { oversight: 1.0 },
};

// ── Helpers ─────────────────────────────────────────────────────────

/** a/b clamped to [0, 1]; 0 when b is 0 */
function ratio(a: number, b: number): number {
  if (b <= 0) return 0;
  return Math.min(Math.max(a / b, 0), 1);
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

// ── Dimension formulas ──────────────────────────────────────────────

function scoreInventory(s: ProgramSnapshot): number {
  const { total, withOwner, withPurpose } = s.systems;
  if (total === 0) return 0;
  return clampScore(40 + 30 * ratio(withOwner, total) + 30 * ratio(withPurpose, total));
}

function scoreClassification(s: ProgramSnapshot): number {
  const { total } = s.systems;
  if (total === 0) return 0;
  return clampScore(100 * ratio(s.classification.classified, total));
}

function scoreOversight(s: ProgramSnapshot): number {
  const { systemsNeedingGate, systemsWithGate, gatesPassed, gatesTotal, overdue } =
    s.oversight;
  if (systemsNeedingGate === 0 && gatesTotal === 0) return 100;
  const coverage = ratio(systemsWithGate, Math.max(systemsNeedingGate, 1));
  const passed = ratio(gatesPassed, gatesTotal);
  return clampScore(100 * (0.6 * coverage + 0.4 * passed) - 10 * Math.min(overdue, 3));
}

function scorePolicies(s: ProgramSnapshot): number {
  const { coreTypesPresent, active, total } = s.policies;
  return clampScore(
    50 * ratio(coreTypesPresent, 6) +
      25 * ratio(active, total) +
      25 * ratio(s.policies.systemsLinked, s.systems.total),
  );
}

function scoreCompliance(s: ProgramSnapshot): number {
  const { assessed, compliant, partial, totalMappings } = s.compliance;
  if (totalMappings === 0) return 0;
  return clampScore(
    50 * ratio(assessed, totalMappings) +
      50 * ratio(compliant + 0.5 * partial, totalMappings),
  );
}

function scoreTransparency(s: ProgramSnapshot): number {
  const { relevantSystems, withProfile, markingOverdue } = s.transparency;
  if (relevantSystems === 0) return 100;
  return clampScore(
    100 * ratio(withProfile, relevantSystems) - 15 * Math.min(markingOverdue, 3),
  );
}

function scoreVendorRisk(s: ProgramSnapshot): number {
  if (s.systems.total === 0) return 0;
  const { systemsWithVendor, vendorsTotal, vendorsAssessed } = s.vendors;
  return clampScore(
    50 * ratio(systemsWithVendor, s.systems.total) +
      50 * ratio(vendorsAssessed, vendorsTotal),
  );
}

function scoreShadowAi(s: ProgramSnapshot): number {
  const { reports, triaged } = s.shadowAi;
  if (reports === 0) return 100;
  return clampScore(100 * ratio(triaged, reports));
}

// ── Gap derivation ──────────────────────────────────────────────────

const SEVERITY_RANK: Record<GapSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

function deriveGaps(s: ProgramSnapshot): ProgramGap[] {
  // No systems at all: the only meaningful gap is "start the program".
  if (s.systems.total === 0) {
    return [{ id: "no-systems", severity: "critical", count: 1 }];
  }

  const candidates: ProgramGap[] = [
    {
      id: "high-risk-without-gate",
      severity: "critical",
      count: Math.max(0, s.oversight.systemsNeedingGate - s.oversight.systemsWithGate),
    },
    { id: "overdue-gates", severity: "critical", count: s.oversight.overdue },
    { id: "marking-overdue", severity: "critical", count: s.transparency.markingOverdue },
    {
      id: "unclassified-systems",
      severity: "high",
      count: Math.max(0, s.systems.total - s.classification.classified),
    },
    {
      id: "missing-transparency-profiles",
      severity: "high",
      count: Math.max(0, s.transparency.relevantSystems - s.transparency.withProfile),
    },
    {
      id: "unassessed-compliance",
      severity: "high",
      count: Math.max(0, s.compliance.totalMappings - s.compliance.assessed),
    },
    {
      id: "draft-policies",
      severity: "medium",
      count: Math.max(0, s.policies.total - s.policies.active),
    },
    {
      id: "unlinked-policies",
      severity: "medium",
      count:
        s.policies.total > 0
          ? Math.max(0, s.systems.total - s.policies.systemsLinked)
          : 0,
    },
    {
      id: "unassessed-vendors",
      severity: "medium",
      count: Math.max(0, s.vendors.vendorsTotal - s.vendors.vendorsAssessed),
    },
    {
      id: "untriaged-shadow-reports",
      severity: "medium",
      count: Math.max(0, s.shadowAi.reports - s.shadowAi.triaged),
    },
  ];

  return candidates
    .filter((g) => g.count > 0)
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        b.count - a.count ||
        a.id.localeCompare(b.id),
    );
}

// ── Entry point ─────────────────────────────────────────────────────

export function computeMaturity(snapshot: ProgramSnapshot): MaturityResult {
  const scores: Record<DimensionId, number> = {
    inventory: scoreInventory(snapshot),
    classification: scoreClassification(snapshot),
    oversight: scoreOversight(snapshot),
    policies: scorePolicies(snapshot),
    compliance: scoreCompliance(snapshot),
    transparency: scoreTransparency(snapshot),
    vendorRisk: scoreVendorRisk(snapshot),
    shadowAi: scoreShadowAi(snapshot),
  };

  const dimensions: DimensionScore[] = (
    Object.keys(scores) as DimensionId[]
  ).map((id) => ({ id, score: scores[id], target: DIMENSION_TARGETS[id] }));

  const nist: NistAxis[] = (Object.keys(NIST_AXIS_WEIGHTS) as NistAxisId[]).map(
    (axis) => {
      const weights = NIST_AXIS_WEIGHTS[axis];
      let sum = 0;
      for (const [dim, weight] of Object.entries(weights) as [
        DimensionId,
        number,
      ][]) {
        sum += scores[dim] * weight;
      }
      return { id: axis, score: clampScore(sum), target: NIST_TARGETS[axis] };
    },
  );

  const overall = clampScore(
    nist.reduce((acc, a) => acc + a.score, 0) / nist.length,
  );

  return { dimensions, nist, overall, gaps: deriveGaps(snapshot) };
}
