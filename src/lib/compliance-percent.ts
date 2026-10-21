// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The compliance percentage, one formula for the screens and the PDF exports:
 * a compliant requirement counts in full, a partially compliant one counts
 * half, and a not-applicable one is left out of both sides. Requirements not
 * yet assessed stay in the denominator, so nothing reads 100% before it is
 * assessed.
 */
export interface ComplianceCounts {
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
}

export function compliancePercent({ compliant, partial, nonCompliant, notAssessed }: ComplianceCounts): number {
  const applicable = compliant + partial + nonCompliant + notAssessed;
  if (applicable <= 0) return 0;
  return Math.round(((compliant + 0.5 * partial) / applicable) * 100);
}
