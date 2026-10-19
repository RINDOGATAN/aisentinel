// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The risk-level page opens on the work left: systems with no risk level
 * first, then those already classified. Order within each group is kept as
 * the list arrived (the chosen sort).
 */
export interface ClassifiableSystem {
  riskClassification?: { riskLevel: string } | null;
}

export function groupForClassification<T extends ClassifiableSystem>(
  systems: readonly T[],
): { toClassify: T[]; classified: T[] } {
  const toClassify: T[] = [];
  const classified: T[] = [];
  for (const s of systems) (s.riskClassification?.riskLevel ? classified : toClassify).push(s);
  return { toClassify, classified };
}
