// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Risk-tier palette: the ONE definition of the colours that mark a risk tier
 * (EU AI Act tiers, and the vendor / severity scales that reuse them).
 *
 * Rules (owner's directive, WCAG 2.2 AA):
 *  1. The label text of a tier chip is ALWAYS the theme's normal body-text
 *     colour. The tier is shown by a coloured marker (a filled dot, a short
 *     bar or a left border) next to the text. Colour is never the only
 *     signal: the label always names the tier, and "not classified" uses a
 *     hollow ring instead of a filled dot.
 *  2. The chip fill is a quiet neutral tint. Body text on it >= 4.5:1.
 *  3. The marker reaches >= 3:1 against the chip fill AND the page/card
 *     background (non-text contrast, WCAG 1.4.11).
 *  `risk-tier-palette.test.ts` computes every one of those ratios and fails
 *  under the thresholds, and checks that the CSS variables in
 *  `src/app/globals.css` equal the dark values below.
 *
 * Hue choice and rationale:
 *  - Red (unacceptable), orange (high), blue (limited), slate grey (minimal).
 *    The old red / amber / green scale collapses for the most common forms
 *    of colour blindness (red and green read as the same brown). Blue stays
 *    distinct from red and orange for protan, deutan and tritan readers, and
 *    the scale also reads by lightness: red and orange are "warm, act",
 *    blue is "note", grey is "nothing required".
 *  - Green is deliberately not used: "minimal" is not an endorsement, and a
 *    neutral grey says "no specific obligations" without implying approval.
 *  - "Not classified" is a hollow ring in a neutral grey: a visible gap by
 *    shape, not a hue that blends in with the tiers.
 *  - Hues are muted (calm) rather than saturated alarm colours; the light set
 *    is darker so the markers keep 3:1 on white paper (PDF exports and the
 *    light program-map canvas); the dark set is lighter for the dark app.
 *  - Orange is kept clearly apart from the brand amber (#f5a623) by being
 *    redder in the dark set and burnt in the light set.
 */

export type RiskTier =
  | "UNACCEPTABLE"
  | "HIGH"
  | "LIMITED"
  | "MINIMAL"
  | "UNCLASSIFIED";

export type TierTheme = "dark" | "light";

export const RISK_TIERS: readonly RiskTier[] = [
  "UNACCEPTABLE",
  "HIGH",
  "LIMITED",
  "MINIMAL",
  "UNCLASSIFIED",
] as const;

/**
 * Theme neutrals the tier chips sit on.
 *  - dark: mirrors `--foreground`, `--background`, `--card` in globals.css;
 *    `chip` is the neutral chip fill (`--tier-chip`).
 *  - light: the PDF exports and the light program-map canvas (white paper,
 *    ink #1a1a1a, alternate table rows #f5f5f5).
 */
export const TIER_SURFACES: Record<
  TierTheme,
  { text: string; page: string; card: string; chip: string; altRow: string }
> = {
  dark: {
    text: "#fefeff",
    page: "#1a1a1a",
    card: "#242424",
    chip: "#2e2e2e",
    altRow: "#2e2e2e",
  },
  light: {
    text: "#1a1a1a",
    page: "#ffffff",
    card: "#ffffff",
    chip: "#f1f1f1",
    altRow: "#f5f5f5",
  },
};

/** Marker colour per tier per theme. */
export const TIER_MARKER: Record<TierTheme, Record<RiskTier, string>> = {
  dark: {
    UNACCEPTABLE: "#f2665c",
    HIGH: "#f08a4b",
    LIMITED: "#5aa9e6",
    MINIMAL: "#9aa5b1",
    UNCLASSIFIED: "#a0a0a0",
  },
  light: {
    UNACCEPTABLE: "#c42b1c",
    HIGH: "#b85200",
    LIMITED: "#1f6fbf",
    MINIMAL: "#5f6b7a",
    UNCLASSIFIED: "#737373",
  },
};

/** CSS variable name for each tier marker (declared in globals.css). */
export const TIER_CSS_VAR: Record<RiskTier, string> = {
  UNACCEPTABLE: "--tier-unacceptable",
  HIGH: "--tier-high",
  LIMITED: "--tier-limited",
  MINIMAL: "--tier-minimal",
  UNCLASSIFIED: "--tier-unclassified",
};
export const TIER_CHIP_CSS_VAR = "--tier-chip";

/**
 * Other scales that reuse the tier palette, mapped onto a tier. Vendor risk
 * and incident severity are four-step scales, so they borrow the four tiers.
 */
const ALIASES: Record<string, RiskTier> = {
  UNACCEPTABLE: "UNACCEPTABLE",
  PROHIBITED: "UNACCEPTABLE",
  CRITICAL: "UNACCEPTABLE",
  HIGH: "HIGH",
  LIMITED: "LIMITED",
  MEDIUM: "LIMITED",
  MINIMAL: "MINIMAL",
  LOW: "MINIMAL",
  UNCLASSIFIED: "UNCLASSIFIED",
};

/** Resolve any tier-like level (case-insensitive) to a tier; unknown/empty = UNCLASSIFIED. */
export function toRiskTier(level: string | null | undefined): RiskTier {
  if (!level) return "UNCLASSIFIED";
  return ALIASES[level.toUpperCase()] ?? "UNCLASSIFIED";
}

/** Hex marker colour for a level in a theme. */
export function tierMarker(
  level: string | null | undefined,
  theme: TierTheme = "dark",
): string {
  return TIER_MARKER[theme][toRiskTier(level)];
}

/** Tailwind background class for a tier marker (utilities from globals.css @theme). */
export const TIER_BG_CLASS: Record<RiskTier, string> = {
  UNACCEPTABLE: "bg-tier-unacceptable",
  HIGH: "bg-tier-high",
  LIMITED: "bg-tier-limited",
  MINIMAL: "bg-tier-minimal",
  UNCLASSIFIED: "bg-tier-unclassified",
};

/** Tailwind left-border colour class for a tier (cards marked by a left bar). */
export const TIER_BORDER_L_CLASS: Record<RiskTier, string> = {
  UNACCEPTABLE: "border-l-tier-unacceptable",
  HIGH: "border-l-tier-high",
  LIMITED: "border-l-tier-limited",
  MINIMAL: "border-l-tier-minimal",
  UNCLASSIFIED: "border-l-tier-unclassified",
};

/**
 * Neutral pill classes for a tier chip rendered without the Badge component
 * (docs pages). Pair with <TierMarker>. Text stays the body colour.
 */
export const TIER_PILL_CLASS =
  "inline-flex items-center gap-2 border border-border bg-tier-chip text-foreground";
