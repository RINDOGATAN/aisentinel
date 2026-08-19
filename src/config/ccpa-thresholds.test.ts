// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  CCPA_NEXT_ADJUSTMENT,
  CCPA_THRESHOLDS_LAW_REVIEWED_AS_OF,
  CCPA_THRESHOLDS_VERSION,
  CCPA_THRESHOLD_EPOCHS,
  resolveCcpaThresholds,
  screenCoveredBusiness,
} from "./ccpa-thresholds";

const CURRENT = CCPA_THRESHOLD_EPOCHS[0];

describe("CCPA threshold epochs", () => {
  it("carries the 2025 CPI-adjusted figures", () => {
    expect(CURRENT.revenueThresholdUsd).toBe(26_625_000);
    expect(CURRENT.consumerHouseholdThreshold).toBe(100_000);
    expect(CURRENT.sellShareRevenueSharePct).toBe(50);
    expect(CURRENT.penaltyPerViolationUsd).toBe(2_663);
    expect(CURRENT.penaltyIntentionalOrMinorUsd).toBe(7_988);
  });

  it("versions the pack and marks the review date", () => {
    expect(CCPA_THRESHOLDS_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(CCPA_THRESHOLDS_LAW_REVIEWED_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("resolves the operative epoch inside its window", () => {
    expect(resolveCcpaThresholds(new Date("2025-01-01"))).toBe(CURRENT);
    expect(resolveCcpaThresholds(new Date("2026-08-19"))).toBe(CURRENT);
    expect(resolveCcpaThresholds(new Date("2026-12-31"))).toBe(CURRENT);
  });

  it("returns null before the first epoch", () => {
    expect(resolveCcpaThresholds(new Date("2024-12-31"))).toBeNull();
  });

  it("returns null once the unpublished 2027 adjustment is due", () => {
    // The load-bearing case: quoting $26,625,000 in 2027 would state a figure
    // the statute has by then replaced. Null forces the UI to say so.
    expect(resolveCcpaThresholds(new Date("2027-01-01"))).toBeNull();
    expect(resolveCcpaThresholds(new Date("2027-06-01"))).toBeNull();
    expect(CCPA_NEXT_ADJUSTMENT.dueOn).toBe("2027-01-01");
    expect(CCPA_NEXT_ADJUSTMENT.published).toBe(false);
  });
});

describe("screenCoveredBusiness", () => {
  const asOf = new Date("2026-08-19");

  it("says YES on the revenue prong alone", () => {
    const result = screenCoveredBusiness({
      annualRevenueUsd: 30_000_000,
      consumersOrHouseholds: 10,
      revenueShareFromSellingSharingPct: 0,
      asOf,
    });
    expect(result.answer).toBe("YES");
    expect(result.metProngs).toContain("revenue");
  });

  it("says YES on the consumer prong with no revenue floor", () => {
    // The trap: a small but data-intensive company is fully covered.
    const result = screenCoveredBusiness({
      annualRevenueUsd: 1_000_000,
      consumersOrHouseholds: 100_000,
      revenueShareFromSellingSharingPct: 0,
      asOf,
    });
    expect(result.answer).toBe("YES");
    expect(result.metProngs).toEqual(["consumers"]);
  });

  it("says YES on the sell/share revenue prong", () => {
    const result = screenCoveredBusiness({
      annualRevenueUsd: 100_000,
      consumersOrHouseholds: 5,
      revenueShareFromSellingSharingPct: 50,
      asOf,
    });
    expect(result.answer).toBe("YES");
    expect(result.metProngs).toEqual(["sellShare"]);
  });

  it("says NO only when all three prongs are answered and all are false", () => {
    expect(
      screenCoveredBusiness({
        annualRevenueUsd: 1_000_000,
        consumersOrHouseholds: 10,
        revenueShareFromSellingSharingPct: 0,
        asOf,
      }).answer,
    ).toBe("NO");
  });

  it("stays NOT_ASSESSED while any prong is unanswered", () => {
    expect(
      screenCoveredBusiness({
        annualRevenueUsd: 1_000_000,
        consumersOrHouseholds: null,
        revenueShareFromSellingSharingPct: 0,
        asOf,
      }).answer,
    ).toBe("NOT_ASSESSED");
  });

  it("stays NOT_ASSESSED when the thresholds themselves are unpublished", () => {
    expect(
      screenCoveredBusiness({
        annualRevenueUsd: 1_000_000,
        consumersOrHouseholds: 10,
        revenueShareFromSellingSharingPct: 0,
        asOf: new Date("2027-03-01"),
      }).answer,
    ).toBe("NOT_ASSESSED");
  });

  it("treats the revenue threshold as strictly greater-than and the counts as at-least", () => {
    expect(
      screenCoveredBusiness({
        annualRevenueUsd: CURRENT.revenueThresholdUsd,
        consumersOrHouseholds: 0,
        revenueShareFromSellingSharingPct: 0,
        asOf,
      }).answer,
    ).toBe("NO");
    expect(
      screenCoveredBusiness({
        annualRevenueUsd: 0,
        consumersOrHouseholds: CURRENT.consumerHouseholdThreshold,
        revenueShareFromSellingSharingPct: 0,
        asOf,
      }).answer,
    ).toBe("YES");
  });
});
