// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Every remaining foreground and background pair the product puts on screen
 * that is not a risk tier (`src/config/risk-tier-palette.test.ts`) and not one
 * of the four statuses (`src/config/status-palette.test.ts`): the brand amber,
 * the neutrals, the button and chip states, and the handful of raw Tailwind
 * hues still used for categories that carry no severity.
 *
 * Each pair is named, so a failure says which one and where. The thresholds
 * are the owner's: 4.5:1 for text, 3:1 for large text and for a non-text mark
 * that carries meaning.
 */

import { describe, expect, it } from "vitest";
import { blend, contrastRatio } from "@/lib/contrast";
import { STATUS_COLOR, STATUS_SURFACES } from "@/config/status-palette";

const PAGE = STATUS_SURFACES.dark.page; // #1a1a1a
const CARD = STATUS_SURFACES.dark.card; // #242424
const MUTED = STATUS_SURFACES.dark.muted; // #333333
const INK = "#1a1a1a";
const FG = STATUS_SURFACES.dark.text;
const MUTED_FG = STATUS_SURFACES.dark.mutedText;

/** The brand amber, from src/config/brand.ts and --primary in globals.css. */
const PRIMARY = "#f5a623";

/**
 * The raw Tailwind hues the product still uses. They mark a CATEGORY, never a
 * severity, so they carry no meaning a reader could miss: the chip's own word
 * is the meaning. They are listed here only so their ratio stays measured.
 */
const TAILWIND = {
  "purple-400": "#c084fc",
  "purple-500": "#a855f7",
  "pink-400": "#f472b6",
  "blue-400": "#60a5fa",
  "green-400": "#4ade80",
  "cyan-400": "#22d3ee",
  "orange-400": "#fb923c",
  "emerald-400": "#34d399",
  "violet-400": "#a78bfa",
  "amber-400": "#fbbf24",
  "amber-500": "#f59e0b",
  "gray-400": "#9ca3af",
  "red-400": "#f87171",
};

type Pair = { name: string; fg: string; bg: string; min: number };

const PAIRS: Pair[] = [
  // ── The neutrals every screen rests on ──────────────────────────────
  { name: "body text on the page", fg: FG, bg: PAGE, min: 4.5 },
  { name: "body text on a card", fg: FG, bg: CARD, min: 4.5 },
  { name: "secondary text on the page", fg: MUTED_FG, bg: PAGE, min: 4.5 },
  { name: "secondary text on a card", fg: MUTED_FG, bg: CARD, min: 4.5 },
  { name: "secondary text on the muted surface", fg: MUTED_FG, bg: MUTED, min: 4.5 },
  { name: "secondary-surface text on the secondary surface", fg: "#e0e0e0", bg: "#2e2e2e", min: 4.5 },

  // ── The brand amber: links, active tabs, the primary button ─────────
  { name: "a brand amber link on the page", fg: PRIMARY, bg: PAGE, min: 4.5 },
  { name: "a brand amber link on a card", fg: PRIMARY, bg: CARD, min: 4.5 },
  { name: "a brand amber link on the muted surface", fg: PRIMARY, bg: MUTED, min: 4.5 },
  { name: "the ink on the primary button", fg: INK, bg: PRIMARY, min: 4.5 },
  { name: "the primary button at rest against the page", fg: PRIMARY, bg: PAGE, min: 3 },
  { name: "the ink on the primary button hovered (90%) over a card", fg: INK, bg: blend(PRIMARY, CARD, 0.9), min: 4.5 },

  // ── Button and badge states that keep a status fill ─────────────────
  { name: "the ink on a danger button hovered (85%) over a card", fg: INK, bg: blend(STATUS_COLOR.dark.danger, CARD, 0.85), min: 4.5 },
  { name: "the ink on a danger button pressed (75%) over a card", fg: INK, bg: blend(STATUS_COLOR.dark.danger, CARD, 0.75), min: 4.5 },
  { name: "the ink on a warning button hovered (85%) over a card", fg: INK, bg: blend(STATUS_COLOR.dark.warning, CARD, 0.85), min: 4.5 },
  { name: "the ink on a warning button pressed (75%) over a card", fg: INK, bg: blend(STATUS_COLOR.dark.warning, CARD, 0.75), min: 4.5 },
  { name: "the ink on a solid danger badge (90%) over a card", fg: INK, bg: blend(STATUS_COLOR.dark.danger, CARD, 0.9), min: 4.5 },
  { name: "the body text of a status chip hovered (30%) over a card", fg: FG, bg: blend(STATUS_COLOR.dark.warning, CARD, 0.3), min: 4.5 },
  { name: "the marker of a status chip hovered (30%) over a card", fg: STATUS_COLOR.dark.warning, bg: blend(STATUS_COLOR.dark.warning, CARD, 0.3), min: 3 },

  // ── Bars and legend swatches: full-opacity marks on a card ──────────
  { name: "the approved band of the assessment bar on a card", fg: STATUS_COLOR.dark.good, bg: CARD, min: 3 },
  { name: "the under-review band of the assessment bar on a card", fg: STATUS_COLOR.dark.warning, bg: CARD, min: 3 },
  { name: "the in-progress band of the assessment bar on a card", fg: STATUS_COLOR.dark.note, bg: CARD, min: 3 },
  { name: "the non-compliant band of the compliance bar on a card", fg: STATUS_COLOR.dark.danger, bg: CARD, min: 3 },
  { name: "the neutral band of a bar on a card", fg: MUTED_FG, bg: CARD, min: 3 },
  { name: "the rule drawn between two bands", fg: CARD, bg: STATUS_COLOR.dark.good, min: 3 },

  // ── Category chips in raw Tailwind hues (no severity) ───────────────
  { name: "a conformity assessment chip on a card", fg: TAILWIND["purple-400"], bg: CARD, min: 4.5 },
  { name: "a bias and fairness assessment chip on a card", fg: TAILWIND["pink-400"], bg: CARD, min: 4.5 },
  { name: "an image-generation model chip on its own fill", fg: TAILWIND["purple-400"], bg: blend(TAILWIND["purple-500"], CARD, 0.2), min: 4.5 },
  { name: "a speech model chip on its own fill", fg: TAILWIND["blue-400"], bg: blend("#3b82f6", CARD, 0.2), min: 4.5 },
  { name: "an embedding model chip on its own fill", fg: TAILWIND["green-400"], bg: blend("#22c55e", CARD, 0.2), min: 4.5 },
  { name: "a code-generation model chip on its own fill", fg: TAILWIND["cyan-400"], bg: blend("#06b6d4", CARD, 0.2), min: 4.5 },
  { name: "a vision model chip on its own fill", fg: TAILWIND["orange-400"], bg: blend("#f97316", CARD, 0.2), min: 4.5 },
  { name: "a multimodal model chip on its own fill", fg: TAILWIND["pink-400"], bg: blend("#ec4899", CARD, 0.2), min: 4.5 },
  { name: "a draft assessment chip on its own fill", fg: TAILWIND["gray-400"], bg: blend("#6b7280", CARD, 0.2), min: 4.5 },
  { name: "a rejected assessment chip on its own fill", fg: TAILWIND["red-400"], bg: blend("#ef4444", CARD, 0.2), min: 4.5 },

  // ── The roles page cards (docs) ─────────────────────────────────────
  { name: "the owner role card text on its own fill", fg: TAILWIND["amber-400"], bg: blend(TAILWIND["amber-400"], PAGE, 0.1), min: 4.5 },
  { name: "the admin role card text on its own fill", fg: TAILWIND["blue-400"], bg: blend(TAILWIND["blue-400"], PAGE, 0.1), min: 4.5 },
  { name: "the officer role card text on its own fill", fg: TAILWIND["emerald-400"], bg: blend(TAILWIND["emerald-400"], PAGE, 0.1), min: 4.5 },
  { name: "the member role card text on its own fill", fg: TAILWIND["violet-400"], bg: blend(TAILWIND["violet-400"], PAGE, 0.1), min: 4.5 },
  { name: "the viewer role card text on its own fill", fg: TAILWIND["gray-400"], bg: blend(TAILWIND["gray-400"], PAGE, 0.1), min: 4.5 },

  // ── The premium lock card on the vendors page ───────────────────────
  { name: "the locked-feature label on a card", fg: TAILWIND["amber-500"], bg: CARD, min: 4.5 },
  { name: "the attention counter on the clients page", fg: TAILWIND["amber-400"], bg: CARD, min: 4.5 },
];

describe("theme contrast (WCAG 2.2 AA)", () => {
  for (const pair of PAIRS) {
    const ratio = contrastRatio(pair.fg, pair.bg);
    it(`${pair.name} is at least ${pair.min}:1 (${ratio.toFixed(2)}:1)`, () => {
      expect(
        contrastRatio(pair.fg, pair.bg),
        `${pair.name}: ${pair.fg} on ${pair.bg}`,
      ).toBeGreaterThanOrEqual(pair.min);
    });
  }

  it("the brand amber is unchanged", () => {
    expect(PRIMARY).toBe("#f5a623");
  });
});
