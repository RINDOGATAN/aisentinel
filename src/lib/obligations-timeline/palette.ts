// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Obligations timeline palette.
 *
 * Re-exports the program map's canvas tokens so the two visuals share one
 * color source — a deadline card and a system card sitting in the same PDF
 * must not disagree about what "ink" or "hairline" means.
 */

import { CANVAS, GLYPH_COLORS } from "@/lib/program-map/palette";
import type { TimelineTone } from "./types";

export { CANVAS, GLYPH_COLORS };

/**
 * Tone → color. Deliberately reuses the glyph semantics already in the map:
 * red means a real problem, amber means attention, green means done, grey
 * means "not your concern", dashed grey means "we can't tell yet".
 */
export const TONE_COLORS: Record<TimelineTone, string> = {
  overdue: GLYPH_COLORS.alert,
  imminent: GLYPH_COLORS.warn,
  upcoming: "#2563eb",
  "past-satisfied": GLYPH_COLORS.ok,
  "not-applicable": CANVAS.inkFaint,
  unknown: GLYPH_COLORS.missing,
};

export const TIMELINE = {
  axis: "#94a3b8",
  tick: "#cbd5e1",
  tickLabel: CANVAS.inkMuted,
  /** Amber "today" rule — the app accent, and the eye's anchor. */
  today: "#f5a623",
  /** Wash over the region left of today. */
  pastBand: "#f8fafc",
  cardBg: CANVAS.cardBg,
  cardBorder: CANVAS.cardBorder,
  connector: CANVAS.edge,
  ink: CANVAS.ink,
  inkMuted: CANVAS.inkMuted,
  breakGlyph: CANVAS.inkFaint,
} as const;

/** Tones that render a dashed card border (nothing asserted yet). */
export const DASHED_TONES: ReadonlySet<TimelineTone> = new Set<TimelineTone>([
  "unknown",
]);
