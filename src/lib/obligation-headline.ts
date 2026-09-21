// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The words of the dashboard's obligations card.
 *
 * A milestone title is a full statement with its own verb ("… are live",
 * "… apply", "… due"). The card used to pour it into a sentence that brought a
 * second verb ("{title} applied {days} days ago"), which printed "… are live
 * applied 596 days ago". So the title is never part of a sentence here. The
 * card shows two separate lines: a timing label that carries NO verb a title
 * can carry, and the title as written. Every message below is a label, and
 * the test renders it against every title in the catalogue, in both
 * languages, to keep it that way. Pure.
 */

import type { MilestoneKind } from "@/config/regulatory-milestones";

/** Where the milestone stands relative to today. */
export type HeadlineMoment = "ahead" | "today" | "overdue" | "inForce";

/**
 * Two families of wording. A date on which something starts to apply is
 * counted "in N days"; a date by which something must be done is a deadline
 * and is called one.
 */
export type HeadlineFamily = "start" | "deadline";

const FAMILY: Record<MilestoneKind, HeadlineFamily> = {
  applies: "start",
  "duty-live": "start",
  deadline: "deadline",
  "grace-expiry": "deadline",
  "phase-in": "deadline",
};

export interface HeadlineRow {
  kind: MilestoneKind;
  /** Signed whole days; negative when the date has passed. */
  daysRemaining: number;
  overdue: boolean;
}

export function headlineMoment(row: HeadlineRow): HeadlineMoment {
  if (row.daysRemaining > 0) return "ahead";
  if (row.daysRemaining === 0) return "today";
  return row.overdue ? "overdue" : "inForce";
}

export type HeadlineTimingKey = `next.timing.${HeadlineMoment}.${HeadlineFamily}`;

/** The message key for the timing label, within the `obligations` namespace. */
export function headlineTimingKey(row: HeadlineRow): HeadlineTimingKey {
  return `next.timing.${headlineMoment(row)}.${FAMILY[row.kind]}`;
}

type Translate = (
  key: HeadlineTimingKey,
  values: { days: number; date: string },
) => string;

export interface ObligationHeadline {
  /** The label above the title: "In 72 days · 2 December 2026". */
  timing: string;
  /** The milestone's title, exactly as the catalogue has it. */
  title: string;
}

/**
 * Build the two lines. `date` arrives already formatted for the reader's
 * locale, so this module stays free of Intl and is the same on the server,
 * in the browser and in a test.
 */
export function obligationHeadline(
  row: HeadlineRow & { title: string },
  date: string,
  t: Translate,
): ObligationHeadline {
  return {
    timing: t(headlineTimingKey(row), {
      days: Math.abs(row.daysRemaining),
      date,
    }),
    title: row.title,
  };
}
