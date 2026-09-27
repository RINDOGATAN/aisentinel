// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// "Needs action": everything waiting for a person, gathered into one short list.
// A reviewer should not have to open five modules to learn there is nothing to
// do, or miss the one thing there is. The categories are the ones the consultant
// named: reviews, gates, overdue re-tests, incidents and the confirmation queue.
//
// This module is pure: it turns a set of counts into an ordered list of items,
// dropping the empty ones so the list only ever shows real work. The counts are
// gathered, org- and department-scoped, by the server (src/server/services/
// views/needs-action.ts).

export const NEEDS_ACTION_KINDS = [
  "assessment-review",
  "oversight-gate",
  "overdue-retest",
  "incident-open",
  "review-queue",
] as const;

export type NeedsActionKind = (typeof NEEDS_ACTION_KINDS)[number];

/// The link each category points at. Relative so the caller can prefix if needed.
const HREF: Record<NeedsActionKind, string> = {
  "assessment-review": "/governance/assessments",
  "oversight-gate": "/governance/oversight",
  "overdue-retest": "/governance/threat-model",
  "incident-open": "/governance/incidents",
  "review-queue": "/governance/review",
};

export interface NeedsActionCounts {
  /// Assessments a person has sent for internal review.
  assessmentReview: number;
  /// Oversight gates still pending a decision.
  oversightGate: number;
  /// Threat models whose review or re-test is overdue.
  overdueRetest: number;
  /// Incidents that are open.
  incidentOpen: number;
  /// Auto-derived items awaiting confirmation. Null when the view is scoped to a
  /// department, where a single org-wide confirmation count would be misleading.
  reviewQueue: number | null;
}

export interface NeedsActionItem {
  kind: NeedsActionKind;
  count: number;
  href: string;
}

/// The categories with work waiting, in a fixed order, empty ones dropped.
export function buildNeedsAction(counts: NeedsActionCounts): NeedsActionItem[] {
  const items: NeedsActionItem[] = [];
  const push = (kind: NeedsActionKind, count: number | null) => {
    if (count != null && count > 0) items.push({ kind, count, href: HREF[kind] });
  };
  push("assessment-review", counts.assessmentReview);
  push("oversight-gate", counts.oversightGate);
  push("overdue-retest", counts.overdueRetest);
  push("incident-open", counts.incidentOpen);
  push("review-queue", counts.reviewQueue);
  return items;
}

/// Total number of things waiting across every category shown.
export function needsActionTotal(items: NeedsActionItem[]): number {
  return items.reduce((sum, item) => sum + item.count, 0);
}
