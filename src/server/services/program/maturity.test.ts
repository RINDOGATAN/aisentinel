// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  computeMaturity,
  type ProgramSnapshot,
  type DimensionId,
} from "./maturity";

/** All-zero baseline; tests override the slices they exercise. */
function snapshot(overrides: Partial<ProgramSnapshot> = {}): ProgramSnapshot {
  return {
    systems: { total: 0, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 },
    classification: { classified: 0, high: 0, unacceptable: 0 },
    oversight: {
      systemsNeedingGate: 0,
      systemsWithGate: 0,
      gatesPassed: 0,
      gatesTotal: 0,
      overdue: 0,
    },
    policies: { coreTypesPresent: 0, active: 0, total: 0, systemsLinked: 0 },
    compliance: { assessed: 0, compliant: 0, partial: 0, totalMappings: 0 },
    transparency: { relevantSystems: 0, withProfile: 0, markingOverdue: 0 },
    vendors: { systemsWithVendor: 0, vendorsTotal: 0, vendorsAssessed: 0 },
    shadowAi: { reports: 0, triaged: 0 },
    ...overrides,
  };
}

function dim(result: ReturnType<typeof computeMaturity>, id: DimensionId): number {
  const d = result.dimensions.find((x) => x.id === id);
  if (!d) throw new Error(`missing dimension ${id}`);
  return d.score;
}

/**
 * A fresh law-firm quickstart org: 30 systems all LIMITED-classified with
 * purposes but no owners; 19 gates all PENDING; 6 core policies all DRAFT
 * and unlinked; large compliance surface entirely NOT_ASSESSED; Art. 50
 * relevant systems without profiles; vendors linked and assessed (quickstart
 * sets vendor riskLevel); no shadow reports.
 */
const FRESH_QUICKSTART = snapshot({
  systems: { total: 30, deployed: 0, withOwner: 0, withPurpose: 30, retired: 0 },
  classification: { classified: 30, high: 0, unacceptable: 0 },
  oversight: {
    systemsNeedingGate: 19,
    systemsWithGate: 19,
    gatesPassed: 0,
    gatesTotal: 19,
    overdue: 0,
  },
  policies: { coreTypesPresent: 6, active: 0, total: 6, systemsLinked: 0 },
  compliance: { assessed: 0, compliant: 0, partial: 0, totalMappings: 2430 },
  transparency: { relevantSystems: 25, withProfile: 0, markingOverdue: 0 },
  vendors: { systemsWithVendor: 30, vendorsTotal: 28, vendorsAssessed: 28 },
  shadowAi: { reports: 0, triaged: 0 },
});

describe("computeMaturity — dimension formulas", () => {
  it("empty org: zero-denominator rules give the documented defaults", () => {
    const r = computeMaturity(snapshot());
    expect(dim(r, "inventory")).toBe(0);
    expect(dim(r, "classification")).toBe(0);
    expect(dim(r, "oversight")).toBe(100); // no need & no gates
    expect(dim(r, "policies")).toBe(0);
    expect(dim(r, "compliance")).toBe(0);
    expect(dim(r, "transparency")).toBe(100); // nothing Art. 50-relevant
    expect(dim(r, "vendorRisk")).toBe(0);
    expect(dim(r, "shadowAi")).toBe(100); // absence of reports is not a gap
  });

  it("fresh law-firm quickstart org scores honestly", () => {
    const r = computeMaturity(FRESH_QUICKSTART);
    expect(dim(r, "inventory")).toBe(70); // 40 + 0 owners + 30 purposes
    expect(dim(r, "classification")).toBe(100);
    expect(dim(r, "oversight")).toBe(60); // full coverage, nothing passed yet
    expect(dim(r, "policies")).toBe(50); // 6 core types, all DRAFT, unlinked
    expect(dim(r, "compliance")).toBe(0);
    expect(dim(r, "transparency")).toBe(0);
    expect(dim(r, "vendorRisk")).toBe(100);
    expect(dim(r, "shadowAi")).toBe(100);
  });

  it("inventory: 40 base + owner and purpose thirds", () => {
    const r = computeMaturity(
      snapshot({
        systems: { total: 10, deployed: 0, withOwner: 5, withPurpose: 10, retired: 0 },
      }),
    );
    expect(dim(r, "inventory")).toBe(85); // 40 + 15 + 30
  });

  it("oversight: overdue penalty applies, caps at 3, floors at 0", () => {
    const base = {
      systemsNeedingGate: 10,
      systemsWithGate: 10,
      gatesPassed: 10,
      gatesTotal: 10,
    };
    const at = (overdue: number) =>
      dim(computeMaturity(snapshot({ systems: { total: 1, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 }, oversight: { ...base, overdue } })), "oversight");
    expect(at(0)).toBe(100);
    expect(at(1)).toBe(90);
    expect(at(3)).toBe(70);
    expect(at(50)).toBe(70); // penalty capped at 3 overdue
    const floored = computeMaturity(
      snapshot({
        systems: { total: 1, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 },
        oversight: {
          systemsNeedingGate: 10,
          systemsWithGate: 0,
          gatesPassed: 0,
          gatesTotal: 1,
          overdue: 3,
        },
      }),
    );
    expect(dim(floored, "oversight")).toBe(0);
  });

  it("oversight: voluntary gates with zero needing systems stay clamped", () => {
    const r = computeMaturity(
      snapshot({
        systems: { total: 5, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 },
        oversight: {
          systemsNeedingGate: 0,
          systemsWithGate: 4,
          gatesPassed: 4,
          gatesTotal: 4,
          overdue: 0,
        },
      }),
    );
    expect(dim(r, "oversight")).toBe(100); // ratios clamp to 1, never exceed
  });

  it("compliance: partial counts half", () => {
    const r = computeMaturity(
      snapshot({
        systems: { total: 1, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 },
        compliance: { assessed: 100, compliant: 40, partial: 20, totalMappings: 100 },
      }),
    );
    expect(dim(r, "compliance")).toBe(75); // 50·1 + 50·(0.5)
  });

  it("transparency: marking-overdue penalty caps at 3", () => {
    const at = (markingOverdue: number) =>
      dim(
        computeMaturity(
          snapshot({
            systems: { total: 1, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 },
            transparency: { relevantSystems: 4, withProfile: 4, markingOverdue },
          }),
        ),
        "transparency",
      );
    expect(at(0)).toBe(100);
    expect(at(2)).toBe(70);
    expect(at(9)).toBe(55);
  });

  it("shadowAi: triage ratio once reports exist", () => {
    const r = computeMaturity(
      snapshot({
        systems: { total: 1, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 },
        shadowAi: { reports: 8, triaged: 6 },
      }),
    );
    expect(dim(r, "shadowAi")).toBe(75);
  });
});

describe("computeMaturity — NIST axes and overall", () => {
  it("fresh quickstart axis math matches the documented weights", () => {
    const r = computeMaturity(FRESH_QUICKSTART);
    const axis = (id: string) => r.nist.find((a) => a.id === id)!;
    expect(axis("GOVERN").score).toBe(70); // .6·50 + .4·100
    expect(axis("MAP").score).toBe(88); // .4·70 + .35·100 + .25·100
    expect(axis("MEASURE").score).toBe(0);
    expect(axis("MANAGE").score).toBe(60);
    expect(r.overall).toBe(55); // round(mean(70,88,0,60))
    expect(axis("GOVERN").target).toBe(80);
    expect(axis("MAP").target).toBe(85);
    expect(axis("MEASURE").target).toBe(75);
    expect(axis("MANAGE").target).toBe(75);
  });

  it("raising a numerator never lowers any score (monotonicity spot-checks)", () => {
    const before = computeMaturity(FRESH_QUICKSTART);
    const after = computeMaturity({
      ...FRESH_QUICKSTART,
      oversight: { ...FRESH_QUICKSTART.oversight, gatesPassed: 10 },
      compliance: { ...FRESH_QUICKSTART.compliance, assessed: 500, compliant: 200 },
      policies: { ...FRESH_QUICKSTART.policies, active: 6, systemsLinked: 30 },
    });
    for (const d of after.dimensions) {
      const prev = before.dimensions.find((x) => x.id === d.id)!;
      expect(d.score, d.id).toBeGreaterThanOrEqual(prev.score);
    }
    expect(after.overall).toBeGreaterThan(before.overall);
  });
});

describe("computeMaturity — gaps", () => {
  it("zero systems yields exactly the no-systems gap", () => {
    const r = computeMaturity(snapshot());
    expect(r.gaps).toEqual([{ id: "no-systems", severity: "critical", count: 1 }]);
  });

  it("fresh quickstart gaps: present, absent, and ordered", () => {
    const { gaps } = computeMaturity(FRESH_QUICKSTART);
    expect(gaps.map((g) => g.id)).toEqual([
      "unassessed-compliance", // high, 2430
      "missing-transparency-profiles", // high, 25
      "unlinked-policies", // medium, 30
      "draft-policies", // medium, 6
    ]);
    expect(gaps.find((g) => g.id === "unassessed-compliance")!.count).toBe(2430);
    expect(gaps.find((g) => g.id === "missing-transparency-profiles")!.count).toBe(25);
    // Absent: everything already satisfied
    for (const absent of [
      "no-systems",
      "unclassified-systems",
      "high-risk-without-gate",
      "overdue-gates",
      "marking-overdue",
      "unassessed-vendors",
      "untriaged-shadow-reports",
    ]) {
      expect(gaps.some((g) => g.id === absent), absent).toBe(false);
    }
  });

  it("critical gaps sort before high before medium", () => {
    const { gaps } = computeMaturity(
      snapshot({
        systems: { total: 10, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 },
        classification: { classified: 4, high: 3, unacceptable: 0 },
        oversight: {
          systemsNeedingGate: 3,
          systemsWithGate: 1,
          gatesPassed: 0,
          gatesTotal: 1,
          overdue: 2,
        },
        shadowAi: { reports: 5, triaged: 1 },
      }),
    );
    const severities = gaps.map((g) => g.severity);
    const firstHigh = severities.indexOf("high");
    const firstMedium = severities.indexOf("medium");
    expect(severities[0]).toBe("critical");
    expect(firstHigh).toBeGreaterThan(severities.lastIndexOf("critical"));
    if (firstMedium !== -1) {
      expect(firstMedium).toBeGreaterThan(severities.lastIndexOf("high"));
    }
    expect(gaps.some((g) => g.id === "high-risk-without-gate" && g.count === 2)).toBe(true);
    expect(gaps.some((g) => g.id === "overdue-gates" && g.count === 2)).toBe(true);
  });

  it("unlinked-policies only counts when policies exist", () => {
    const r = computeMaturity(
      snapshot({
        systems: { total: 5, deployed: 0, withOwner: 0, withPurpose: 0, retired: 0 },
      }),
    );
    expect(r.gaps.some((g) => g.id === "unlinked-policies")).toBe(false);
  });
});
