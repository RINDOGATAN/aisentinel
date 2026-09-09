// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * How the obligations calendar is divided for reading.
 *
 * The calendar used to render every seeded milestone in one flat list,
 * whatever the organisation had declared. For a European organisation that
 * meant 23 cards of which 21 said "does not apply", and 11 of which had
 * already passed. Choosing more jurisdictions did not add rows; it only
 * changed the label on rows that were shown regardless.
 *
 * So the grouping is the fix rather than a filter: what is ahead and reaches
 * you goes in the body, what has already taken effect and what was checked and
 * ruled out are kept but folded away. Nothing is hidden outright, because
 * "we considered this and it does not reach you" is itself an answer a
 * practitioner needs. Pure.
 */

export type ObligationGroupId =
  | "overdue"
  | "imminent"
  | "upcoming"
  | "future"
  | "past"
  | "notApplicable";

export interface GroupableRow {
  id: string;
  phase: string;
  overdue: boolean;
  applicability: string;
  /** Jurisdiction codes this milestone belongs to, for the filter. */
  jurisdictions?: string[];
}

export interface ObligationGroup<T extends GroupableRow> {
  id: ObligationGroupId;
  rows: T[];
  /** Folded away by default: true for the two archival groups. */
  collapsedByDefault: boolean;
}

const AHEAD: ObligationGroupId[] = ["overdue", "imminent", "upcoming", "future"];

/**
 * A milestone that does not reach this organisation is archival whatever its
 * date, so that test comes first: an out-of-scope deadline next month is not
 * "imminent" for anyone here.
 */
function groupFor(row: GroupableRow): ObligationGroupId {
  if (row.applicability === "does-not-apply") return "notApplicable";
  if (row.overdue) return "overdue";
  if (row.phase === "past") return "past";
  if (row.phase === "imminent") return "imminent";
  if (row.phase === "upcoming") return "upcoming";
  return "future";
}

export function groupObligations<T extends GroupableRow>(
  rows: readonly T[],
): ObligationGroup<T>[] {
  const order: ObligationGroupId[] = [
    "overdue",
    "imminent",
    "upcoming",
    "future",
    "past",
    "notApplicable",
  ];
  const buckets = new Map<ObligationGroupId, T[]>(order.map((id) => [id, []]));
  for (const row of rows) {
    buckets.get(groupFor(row))!.push(row);
  }
  return order
    .map((id) => ({
      id,
      rows: buckets.get(id)!,
      collapsedByDefault: id === "past" || id === "notApplicable",
    }))
    .filter((group) => group.rows.length > 0);
}

/** How many rows are ahead and actually reach this organisation. */
export function aheadCount<T extends GroupableRow>(rows: readonly T[]): number {
  return rows.filter((row) => AHEAD.includes(groupFor(row))).length;
}

/**
 * The timeline plots what is ahead. Plotting a milestone that does not apply,
 * or one whose date has passed, spends the scarce horizontal room on things
 * the reader cannot act on.
 */
export function timelineRows<T extends GroupableRow>(rows: readonly T[]): T[] {
  return rows.filter((row) => AHEAD.includes(groupFor(row)));
}

/**
 * The jurisdictions worth offering as a filter.
 *
 * Only those the organisation has declared, and only where a milestone that
 * reaches it actually exists. Offering every jurisdiction the catalogue
 * mentions gave a European organisation chips for Illinois and Utah, which is
 * the same clutter the grouping exists to remove.
 */
export function jurisdictionsIn<T extends GroupableRow>(
  rows: readonly T[],
  declared?: readonly string[],
): string[] {
  const out = new Set<string>();
  for (const row of rows) {
    // A row that does not reach this organisation should not put its
    // jurisdiction in the filter.
    if (row.applicability === "does-not-apply") continue;
    for (const j of row.jurisdictions ?? []) {
      if (declared && !declared.includes(j)) continue;
      out.add(j);
    }
  }
  return [...out].sort();
}

export function filterByJurisdiction<T extends GroupableRow>(
  rows: readonly T[],
  jurisdiction: string | null,
): T[] {
  if (!jurisdiction) return [...rows];
  return rows.filter((row) => (row.jurisdictions ?? []).includes(jurisdiction));
}
