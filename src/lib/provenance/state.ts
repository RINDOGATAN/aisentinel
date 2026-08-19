// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Provenance state and the assurance (confirmation) summary.
 *
 * Pure functions, no I/O — shared by the web UI, the tRPC routers, the
 * maturity model and the PDF renderers so all four agree on what "confirmed"
 * means and on how the headline percentage is computed.
 *
 * Assurance answers a different question from maturity: maturity is "what
 * exists", assurance is "how much of it does a human stand behind".
 */

import {
  ARTIFACT_CLASSES,
  type ArtifactClass,
  type ClassCount,
  type ClassSummary,
  type ConfirmationSummary,
  type ProvenanceBearing,
  type ProvenanceState,
} from "./types";

/**
 * Class weights for the headline percentage.
 *
 * Raw row counts are dominated by ComplianceMapping (hundreds per system), so
 * an unweighted ratio would be ~95% compliance-mapping opinion and would barely
 * move when someone confirms the load-bearing legal determination. Weighting by
 * class keeps the headline meaningful.
 */
export const ASSURANCE_WEIGHTS: Record<ArtifactClass, number> = {
  riskClassification: 0.3,
  compliance: 0.25,
  policy: 0.2,
  oversight: 0.15,
  transparency: 0.1,
};

/**
 * A row counts as confirmed when a human entered it in the first place, or
 * when a human has since taken ownership of an auto-derived row.
 */
export function isConfirmed(row: ProvenanceBearing): boolean {
  return row.provenance === "USER_ENTERED" || row.confirmedAt !== null;
}

/** Auto-derived and not yet vouched for by anyone. */
export function needsConfirmation(row: ProvenanceBearing): boolean {
  return row.provenance !== "USER_ENTERED" && row.confirmedAt === null;
}

/** The three-way state a chip renders from. */
export function provenanceState(row: ProvenanceBearing): ProvenanceState {
  if (row.provenance === "USER_ENTERED") return "human";
  return row.confirmedAt !== null ? "confirmed" : "unconfirmed";
}

function pct(confirmed: number, total: number): number {
  return total === 0 ? 0 : Math.round((100 * confirmed) / total);
}

/**
 * Class-weighted confirmation summary.
 *
 * Empty classes drop out of BOTH the numerator and the denominator — the same
 * zero-denominator convention maturity.ts uses — so an organization with no
 * policies is not penalised for policies it does not have. When every class is
 * empty the result is 0% of 0 items, which the UI renders as "nothing to
 * confirm yet" rather than a failing score.
 */
export function computeConfirmationSummary(
  byClass: Partial<Record<ArtifactClass, ClassCount>>,
): ConfirmationSummary {
  const summaries: ClassSummary[] = ARTIFACT_CLASSES.map((id) => {
    const count = byClass[id] ?? { confirmed: 0, total: 0 };
    const confirmed = Math.max(0, Math.min(count.confirmed, count.total));
    return { id, confirmed, total: count.total, pct: pct(confirmed, count.total) };
  });

  let weightSum = 0;
  let weighted = 0;
  for (const summary of summaries) {
    if (summary.total === 0) continue; // class drops out entirely
    const weight = ASSURANCE_WEIGHTS[summary.id];
    weightSum += weight;
    weighted += weight * (summary.confirmed / summary.total);
  }

  return {
    weightedPct: weightSum === 0 ? 0 : Math.round((100 * weighted) / weightSum),
    byClass: summaries,
    confirmed: summaries.reduce((sum, s) => sum + s.confirmed, 0),
    total: summaries.reduce((sum, s) => sum + s.total, 0),
  };
}
