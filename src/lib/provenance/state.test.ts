// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  isConfirmed,
  needsConfirmation,
  provenanceState,
  computeConfirmationSummary,
  ASSURANCE_WEIGHTS,
} from "./state";
import {
  PROVENANCE_VALUES,
  ARTIFACT_CLASSES,
  type ProvenanceValue,
} from "./types";

const CONFIRMED_AT = new Date("2026-08-19T10:00:00Z");

describe("provenance state truth table", () => {
  // 5 provenance values × confirmedAt null/set = 10 cases, all enumerated.
  const cases: {
    provenance: ProvenanceValue;
    confirmedAt: Date | null;
    confirmed: boolean;
    state: "human" | "confirmed" | "unconfirmed";
  }[] = [
    { provenance: "USER_ENTERED", confirmedAt: null, confirmed: true, state: "human" },
    { provenance: "USER_ENTERED", confirmedAt: CONFIRMED_AT, confirmed: true, state: "human" },
    { provenance: "AUTO_CATALOG", confirmedAt: null, confirmed: false, state: "unconfirmed" },
    { provenance: "AUTO_CATALOG", confirmedAt: CONFIRMED_AT, confirmed: true, state: "confirmed" },
    { provenance: "AUTO_TEMPLATE", confirmedAt: null, confirmed: false, state: "unconfirmed" },
    { provenance: "AUTO_TEMPLATE", confirmedAt: CONFIRMED_AT, confirmed: true, state: "confirmed" },
    { provenance: "AUTO_RULE", confirmedAt: null, confirmed: false, state: "unconfirmed" },
    { provenance: "AUTO_RULE", confirmedAt: CONFIRMED_AT, confirmed: true, state: "confirmed" },
    { provenance: "IMPORTED", confirmedAt: null, confirmed: false, state: "unconfirmed" },
    { provenance: "IMPORTED", confirmedAt: CONFIRMED_AT, confirmed: true, state: "confirmed" },
  ];

  it("covers every provenance value", () => {
    expect(new Set(cases.map((c) => c.provenance)).size).toBe(PROVENANCE_VALUES.length);
  });

  for (const c of cases) {
    it(`${c.provenance} + ${c.confirmedAt ? "confirmedAt set" : "confirmedAt null"} → ${c.state}`, () => {
      const row = { provenance: c.provenance, confirmedAt: c.confirmedAt };
      expect(isConfirmed(row)).toBe(c.confirmed);
      expect(needsConfirmation(row)).toBe(!c.confirmed);
      expect(provenanceState(row)).toBe(c.state);
    });
  }

  it("isConfirmed and needsConfirmation are always exact opposites", () => {
    for (const c of cases) {
      const row = { provenance: c.provenance, confirmedAt: c.confirmedAt };
      expect(isConfirmed(row)).toBe(!needsConfirmation(row));
    }
  });

  it("a USER_ENTERED row never needs confirmation, whatever confirmedAt says", () => {
    expect(needsConfirmation({ provenance: "USER_ENTERED", confirmedAt: null })).toBe(false);
  });
});

describe("computeConfirmationSummary", () => {
  it("returns 0% of 0 items when nothing exists (never a failing score)", () => {
    const summary = computeConfirmationSummary({});
    expect(summary.weightedPct).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.confirmed).toBe(0);
    expect(summary.byClass).toHaveLength(ARTIFACT_CLASSES.length);
  });

  it("reports 100% when every populated class is fully confirmed", () => {
    const summary = computeConfirmationSummary({
      riskClassification: { confirmed: 3, total: 3 },
      compliance: { confirmed: 200, total: 200 },
    });
    expect(summary.weightedPct).toBe(100);
    expect(summary.confirmed).toBe(203);
    expect(summary.total).toBe(203);
  });

  it("drops empty classes from BOTH numerator and denominator", () => {
    // Only riskClassification is populated and fully confirmed. If empty
    // classes counted against us this would be far below 100.
    const summary = computeConfirmationSummary({
      riskClassification: { confirmed: 2, total: 2 },
      compliance: { confirmed: 0, total: 0 },
      policy: { confirmed: 0, total: 0 },
      oversight: { confirmed: 0, total: 0 },
      transparency: { confirmed: 0, total: 0 },
    });
    expect(summary.weightedPct).toBe(100);
  });

  it("weights by class rather than by raw row count", () => {
    // Compliance dominates on raw counts (200 rows vs 2) but is fully
    // unconfirmed; riskClassification is fully confirmed. An unweighted ratio
    // would be ~1%; the weighted one reflects that the load-bearing legal
    // determination is signed off.
    const summary = computeConfirmationSummary({
      riskClassification: { confirmed: 2, total: 2 },
      compliance: { confirmed: 0, total: 200 },
    });
    const expected = Math.round(
      (100 * (ASSURANCE_WEIGHTS.riskClassification * 1 + ASSURANCE_WEIGHTS.compliance * 0)) /
        (ASSURANCE_WEIGHTS.riskClassification + ASSURANCE_WEIGHTS.compliance),
    );
    expect(summary.weightedPct).toBe(expected);
    expect(summary.weightedPct).toBeGreaterThan(50);

    const rawPct = Math.round((100 * 2) / 202);
    expect(summary.weightedPct).not.toBe(rawPct);
  });

  it("computes per-class percentages independently", () => {
    const summary = computeConfirmationSummary({
      compliance: { confirmed: 50, total: 200 },
      policy: { confirmed: 3, total: 6 },
    });
    const byId = Object.fromEntries(summary.byClass.map((c) => [c.id, c]));
    expect(byId.compliance.pct).toBe(25);
    expect(byId.policy.pct).toBe(50);
    expect(byId.oversight.pct).toBe(0);
    expect(byId.oversight.total).toBe(0);
  });

  it("clamps a confirmed count that exceeds the total", () => {
    const summary = computeConfirmationSummary({
      policy: { confirmed: 99, total: 6 },
    });
    expect(summary.weightedPct).toBe(100);
    expect(summary.confirmed).toBe(6);
  });

  it("weights sum to 1 across all artifact classes", () => {
    const sum = ARTIFACT_CLASSES.reduce((acc, id) => acc + ASSURANCE_WEIGHTS[id], 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("is monotonic: confirming an item never lowers the score", () => {
    const before = computeConfirmationSummary({
      riskClassification: { confirmed: 1, total: 4 },
      compliance: { confirmed: 10, total: 40 },
    });
    const after = computeConfirmationSummary({
      riskClassification: { confirmed: 2, total: 4 },
      compliance: { confirmed: 10, total: 40 },
    });
    expect(after.weightedPct).toBeGreaterThanOrEqual(before.weightedPct);
  });
});
