// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * How the "AI tools in use" page groups its records, in one place.
 *
 * A tool report moves through four stages: reported (DISCOVERED), under
 * review, a decision (approved or prohibited), and registered in the
 * inventory. The page shows four tabs; the first holds everything still
 * waiting for a decision, and only that tab counts as work left on the
 * program path (src/server/services/program/path-counts.ts uses the same list).
 *
 * Pure: no Prisma, no React.
 */

export type ToolStatus = "DISCOVERED" | "UNDER_REVIEW" | "APPROVED" | "PROHIBITED" | "REGISTERED";

export const TOOL_TABS = ["toReview", "approved", "prohibited", "registered"] as const;
export type ToolTab = (typeof TOOL_TABS)[number];

/** The statuses each tab lists. Every status sits in exactly one tab. */
export const TOOL_TAB_STATUSES: Record<ToolTab, readonly ToolStatus[]> = {
  toReview: ["DISCOVERED", "UNDER_REVIEW"],
  approved: ["APPROVED"],
  prohibited: ["PROHIBITED"],
  registered: ["REGISTERED"],
};

/** Reports still waiting for someone to approve or prohibit them. */
export const STILL_TO_REVIEW: readonly ToolStatus[] = TOOL_TAB_STATUSES.toReview;

export function isStillToReview(status: string): boolean {
  return (STILL_TO_REVIEW as readonly string[]).includes(status);
}

/** The tab a report belongs to. */
export function tabOf(status: ToolStatus): ToolTab {
  return TOOL_TABS.find((tab) => TOOL_TAB_STATUSES[tab].includes(status)) ?? "toReview";
}

export interface ToolStatusCounts {
  discovered: number;
  underReview: number;
  approved: number;
  prohibited: number;
  registered: number;
}

/** The number shown on each tab. */
export function toolTabCounts(c: ToolStatusCounts): Record<ToolTab, number> {
  return {
    toReview: c.discovered + c.underReview,
    approved: c.approved,
    prohibited: c.prohibited,
    registered: c.registered,
  };
}

/** The four stages shown in the key at the top of the page, in order. */
export const TOOL_STAGES = ["reported", "underReview", "decided", "registered"] as const;
export type ToolStage = (typeof TOOL_STAGES)[number];
