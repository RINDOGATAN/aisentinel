// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "These apply to the organisation": each law or standard the applicability
 * check says applies (src/config/applicability.ts), with the next date the
 * obligations calendar holds for it.
 *
 * Pure: the panel on step 1.2's page and on the dashboard read it, and the
 * tests pin which calendar entries belong to which line.
 */

import type { ApplicabilityItem, ApplicabilityItemId } from "@/config/applicability";

/** The calendar rows a line's date is read from. */
interface CalendarRow {
  id: string;
  instrument: string;
  dateIso: string;
  daysRemaining: number;
  applicability: string;
}

/**
 * Which calendar entries belong to which line: by instrument, or by the
 * milestone ids of the part of the EU AI Act the line names. Lines with no
 * dated entry in the calendar (GDPR, Washington, the standards) map to none.
 */
const DATES_FOR: Record<ApplicabilityItemId, { instruments?: string[]; ids?: string[] }> = {
  euAiAct: { instruments: ["eu-ai-act"] },
  euGeneralPurpose: { ids: ["eu-ai-act-gpai-governance"] },
  euTransparency: { ids: ["eu-ai-act-art50-transparency", "eu-ai-act-art50-marking-grace"] },
  euHighRisk: {
    ids: [
      "eu-ai-act-annex-iii-high-risk",
      "eu-ai-act-annex-i-high-risk",
      "eu-ai-act-public-authority-high-risk",
    ],
  },
  gdpr: {},
  californiaAdmt: { instruments: ["ccpa-admt", "ccpa-risk-assessments", "ccpa-cyber-audits"] },
  colorado: { instruments: ["co-sb-26-189"] },
  texas: { instruments: ["tx-traiga"] },
  washington: {},
  aiuc1: {},
  nistAiRmf: {},
  iso42001: {},
};

export type LineDate =
  | { kind: "next"; dateIso: string }
  /** Every dated entry for it has passed: it is in force. */
  | { kind: "inForce" }
  | { kind: "none" };

export interface AppliesLine {
  item: ApplicabilityItem;
  date: LineDate;
}

function belongs(row: CalendarRow, id: ApplicabilityItemId): boolean {
  const map = DATES_FOR[id];
  return !!map.instruments?.includes(row.instrument) || !!map.ids?.includes(row.id);
}

/** The next date for one line, from the calendar rows that reach the organisation. */
export function lineDate(id: ApplicabilityItemId, rows: readonly CalendarRow[]): LineDate {
  const own = rows.filter((r) => belongs(r, id) && r.applicability !== "does-not-apply");
  const ahead = own
    .filter((r) => r.daysRemaining >= 0)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  if (ahead.length > 0) return { kind: "next", dateIso: ahead[0].dateIso };
  return own.length > 0 ? { kind: "inForce" } : { kind: "none" };
}

/** The lines that apply, each with its date, in the check's order. */
export function appliesLines(
  items: readonly ApplicabilityItem[],
  rows: readonly CalendarRow[],
): AppliesLine[] {
  return items
    .filter((item) => item.state === "applies")
    .map((item) => ({ item, date: lineDate(item.id, rows) }));
}
