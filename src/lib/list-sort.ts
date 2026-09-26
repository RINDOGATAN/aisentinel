// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// One sort vocabulary for every list of systems (registry, risk classification,
// assessments). Newest first is the default everywhere, so a system just added
// is at the top rather than the bottom.

export const LIST_SORTS = ["newest", "oldest", "name", "risk"] as const;
export type ListSort = (typeof LIST_SORTS)[number];
export const DEFAULT_LIST_SORT: ListSort = "newest";

export function isListSort(value: unknown): value is ListSort {
  return typeof value === "string" && (LIST_SORTS as readonly string[]).includes(value);
}

/**
 * orderBy for a query over AI systems. Risk uses the related classification's
 * riskLevel, whose enum is declared highest severity first (UNACCEPTABLE, HIGH,
 * LIMITED, MINIMAL), with newest as the tiebreaker; a system with no
 * classification sorts last. Newest/oldest are by creation, not last edit, so
 * "newest" means the most recently added.
 */
export function aiSystemOrderBy(sort: ListSort) {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" as const }];
    case "name":
      return [{ name: "asc" as const }];
    case "risk":
      return [
        { riskClassification: { riskLevel: "asc" as const } },
        { createdAt: "desc" as const },
      ];
    case "newest":
    default:
      return [{ createdAt: "desc" as const }];
  }
}
