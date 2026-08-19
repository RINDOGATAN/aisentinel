// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Obligations timeline core types.
 *
 * Pure library, same doctrine as src/lib/program-map/: importable from client
 * components, tRPC routers and the PDF pipeline alike, free of Prisma, Next
 * and React. Labels arrive **pre-localized** — the layout never translates.
 */

export type TimelineTone =
  | "overdue"
  | "imminent"
  | "upcoming"
  | "past-satisfied"
  | "not-applicable"
  | "unknown";

export type TimelineOrientation = "horizontal" | "vertical";

export interface TimelineMilestoneInput {
  id: string;
  /** ISO "YYYY-MM-DD" (UTC midnight). */
  dateIso: string;
  /** Pre-localized title. */
  label: string;
  /** Pre-formatted date string. */
  dateLabel: string;
  /** Pre-localized count line, e.g. "4 systems · 2 undetermined". */
  countLabel: string | null;
  tone: TimelineTone;
  /** The "next" milestone gets visual weight. */
  emphasis: boolean;
}

export interface TimelineBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TimelineTextLine {
  /** Truncated to fit the card at its font size. */
  text: string;
  fontSize: number;
  /** y offset within the card box. */
  dy: number;
  role: "date" | "label" | "count";
}

export interface MilestoneBox extends TimelineBox {
  id: string;
  /** Which side of the axis the card sits on (horizontal only). */
  side: "above" | "below";
  dotX: number;
  dotY: number;
  dotR: number;
  /** Connector from the dot to the card edge. */
  connector: string;
  tone: TimelineTone;
  emphasis: boolean;
  lines: TimelineTextLine[];
}

export interface TimelineTick {
  x: number;
  label: string;
}

/**
 * Marks a place where the min-gap pass compressed a real interval by more
 * than the tolerance. The renderer draws a break glyph plus `trueInterval`, so
 * the chart never silently lies about a gap it squeezed.
 */
export interface TimelineBreak {
  x: number;
  /** Ids either side of the compressed gap. */
  fromId: string;
  toId: string;
  /** Whole days actually between them. */
  trueDays: number;
}

export interface TimelineLegendItem {
  /** Stable id — renderers resolve display labels via i18n. */
  id: TimelineTone;
  color: string;
}

export interface TimelineLayout {
  width: number;
  height: number;
  orientation: TimelineOrientation;
  axis: { y: number; x1: number; x2: number };
  ticks: TimelineTick[];
  /** null when there is nothing to place "today" against. */
  today: { x: number; clamped: boolean } | null;
  /** Shaded region left of today — "already in force" reads as a band. */
  pastBand: TimelineBox | null;
  milestones: MilestoneBox[];
  breaks: TimelineBreak[];
  legend: TimelineLegendItem[];
}

export interface TimelineLayoutOptions {
  /** Total canvas width budget; default 1160. */
  maxWidth?: number;
  /** Tighter metrics for PDF. */
  compact?: boolean;
  /** Vertical spine for narrow viewports. */
  orientation?: TimelineOrientation;
  /**
   * "Today" as an ISO string. REQUIRED for determinism in tests; when absent
   * the layout simply omits the today marker rather than reading the clock.
   */
  nowIso?: string;
}
