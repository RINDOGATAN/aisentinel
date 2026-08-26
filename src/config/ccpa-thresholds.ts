// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * CCPA "business" thresholds and penalty amounts, versioned by effective date.
 *
 * These figures are LAW, not organization data, so they live in a pure config
 * that is byte-identical on every self-hosted install rather than in a table a
 * customer could edit and then quote in a generated legal notice.
 *
 * They are CPI-adjusted in January of every odd-numbered year (Civ. Code
 * § 1798.185(a)(5)). The epoch model exists so the next adjustment — due
 * 1 January 2027 and not yet published — surfaces as "due, not yet published"
 * instead of silently quoting a stale $26,625,000 into 2027.
 *
 * lawReviewedAsOf: see CCPA_THRESHOLDS_LAW_REVIEWED_AS_OF. California legal
 * sign-off is PENDING.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

export const CCPA_THRESHOLDS_VERSION = "2026.08.1";
export const CCPA_THRESHOLDS_LAW_REVIEWED_AS_OF = "2026-08-21";

export interface CcpaThresholdEpoch {
  /** ISO date this set became operative. */
  effectiveFrom: string;
  /** ISO date it stops applying; null means "current, until the next CPI adjustment". */
  effectiveTo: string | null;
  /** Civ. Code § 1798.140(d)(1)(A), CPI-adjusted. */
  revenueThresholdUsd: number;
  /** § 1798.140(d)(1)(B): consumers or households bought/sold/shared per year. */
  consumerHouseholdThreshold: number;
  /** § 1798.140(d)(1)(C): share of annual revenue from selling or sharing PI. */
  sellShareRevenueSharePct: number;
  /** § 1798.155(a), CPI-adjusted. */
  penaltyPerViolationUsd: number;
  /**
   * § 1798.155(a): intentional violations, or violations involving a consumer
   * the business has ACTUAL KNOWLEDGE is under 16. Not "a minor" — in
   * California that would mean under 18, a wider class than the statute.
   */
  penaltyIntentionalOrMinorUsd: number;
  citation: string;
}

/**
 * Only one epoch so far. The 2025 adjustment took effect 1 January 2025 and is
 * still the operative set through 2026.
 *
 * `effectiveTo` is the day before the next scheduled adjustment, NOT null: that
 * is what makes `resolveCcpaThresholds` return null in 2027 and forces the UI to
 * say the figure is unpublished rather than assume it carried over.
 */
export const CCPA_THRESHOLD_EPOCHS: readonly CcpaThresholdEpoch[] = [
  {
    effectiveFrom: "2025-01-01",
    effectiveTo: "2026-12-31",
    revenueThresholdUsd: 26_625_000,
    consumerHouseholdThreshold: 100_000,
    sellShareRevenueSharePct: 50,
    penaltyPerViolationUsd: 2_663,
    penaltyIntentionalOrMinorUsd: 7_988,
    citation:
      "Cal. Civ. Code § 1798.140(d)(1) and § 1798.155(a), as CPI-adjusted effective 1 January 2025",
  },
] as const;

/**
 * The next scheduled CPI adjustment. `published: false` is the flag the UI reads
 * to explain a null threshold result.
 */
export const CCPA_NEXT_ADJUSTMENT = {
  dueOn: "2027-01-01",
  published: false,
} as const;

/**
 * Thresholds operative on a given date, or null when the date falls past the
 * last known epoch.
 *
 * Null is a deliberate, load-bearing return value: quoting the 2025 figures in
 * 2027 would be stating a number that the statute has by then replaced. The
 * caller is expected to render "CPI adjustment due 1 January 2027; figure not
 * yet published by the CPPA — verify before relying on it."
 */
export function resolveCcpaThresholds(asOf: Date): CcpaThresholdEpoch | null {
  const day = asOf.toISOString().slice(0, 10);
  return (
    CCPA_THRESHOLD_EPOCHS.find(
      (epoch) =>
        day >= epoch.effectiveFrom &&
        (epoch.effectiveTo === null || day <= epoch.effectiveTo),
    ) ?? null
  );
}

/**
 * Does the organization meet a "business" threshold?
 *
 * Every input is nullable and any unanswered input yields NOT_ASSESSED — the
 * screen is a decision aid, not an assertion. Two traps this encodes:
 *
 *   * There is NO small-business exemption. The § 1798.140(d) thresholds are
 *     the carve-out, and the 100,000-consumer prong has no revenue floor, so a
 *     small but data-intensive company is fully covered.
 *   * Concluding "NO" requires all three prongs answered and all three false.
 */
export function screenCoveredBusiness(input: {
  annualRevenueUsd: number | null;
  consumersOrHouseholds: number | null;
  revenueShareFromSellingSharingPct: number | null;
  asOf: Date;
}): { answer: "YES" | "NO" | "NOT_ASSESSED"; metProngs: string[] } {
  const epoch = resolveCcpaThresholds(input.asOf);
  if (!epoch) return { answer: "NOT_ASSESSED", metProngs: [] };

  const metProngs: string[] = [];
  if (
    input.annualRevenueUsd !== null &&
    input.annualRevenueUsd > epoch.revenueThresholdUsd
  ) {
    metProngs.push("revenue");
  }
  if (
    input.consumersOrHouseholds !== null &&
    input.consumersOrHouseholds >= epoch.consumerHouseholdThreshold
  ) {
    metProngs.push("consumers");
  }
  if (
    input.revenueShareFromSellingSharingPct !== null &&
    input.revenueShareFromSellingSharingPct >= epoch.sellShareRevenueSharePct
  ) {
    metProngs.push("sellShare");
  }

  if (metProngs.length > 0) return { answer: "YES", metProngs };

  const allAnswered =
    input.annualRevenueUsd !== null &&
    input.consumersOrHouseholds !== null &&
    input.revenueShareFromSellingSharingPct !== null;

  return { answer: allAnswered ? "NO" : "NOT_ASSESSED", metProngs: [] };
}
