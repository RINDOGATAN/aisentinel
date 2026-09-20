// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Status palette: the ONE definition of the four status colours (danger,
 * warning, good, note) and of the rules that govern where each may appear.
 *
 * It is the sibling of `risk-tier-palette.ts`, which owns the risk-tier
 * markers, and it follows the same shape: pure tokens here, the CSS variables
 * in `src/app/globals.css` kept equal to them by a test, and every foreground
 * and background pair the product actually uses given a computed contrast
 * ratio in `status-palette.test.ts`.
 *
 * Rules (owner's directive, WCAG 2.2 AA):
 *  1. Every piece of text reaches 4.5:1 against the surface it really sits on
 *     (3:1 if it is at least 24px, or 19px and bold), in both themes.
 *  2. Colour never carries meaning on its own. Severity, status and direction
 *     are carried by a word AND by a shape: an icon, a border, a marker.
 *  3. Body text stays in the body text colour, including inside alerts. The
 *     severity of an alert shows in its icon, its border and its heading word,
 *     never by tinting the sentence.
 *  4. Non-text marks that carry meaning reach 3:1 against their background.
 *
 * Why the old values were replaced: `#d4645c` (danger) reached only 4.27:1 on
 * the card and 3.48:1 on the muted surface, so a red sentence on a near black
 * card failed. Every hue here is the lighter, text-safe member of the same
 * family, so the product keeps its palette and gains the ratio.
 */

import { blend, contrastRatio } from "@/lib/contrast";

export type StatusKey = "danger" | "warning" | "good" | "note";

export type StatusTheme = "dark" | "light";

export const STATUS_KEYS: readonly StatusKey[] = ["danger", "warning", "good", "note"] as const;

/** The CSS token each status maps onto (kept from the existing vocabulary). */
export const STATUS_CSS_VAR: Record<StatusKey, string> = {
  danger: "--destructive",
  warning: "--warning",
  good: "--success",
  note: "--info",
};

/** The Tailwind colour name each status maps onto (`text-destructive`, ...). */
export const STATUS_TAILWIND: Record<StatusKey, string> = {
  danger: "destructive",
  warning: "warning",
  good: "success",
  note: "info",
};

/**
 * Surfaces a status colour is allowed to sit on.
 *  - dark: the app (`--background`, `--card`, `--secondary`, `--muted`).
 *  - light: the generated documents and the light program-map canvas.
 */
export const STATUS_SURFACES: Record<
  StatusTheme,
  { text: string; mutedText: string; page: string; card: string; secondary: string; muted: string }
> = {
  dark: {
    text: "#fefeff",
    mutedText: "#a0a0a0",
    page: "#1a1a1a",
    card: "#242424",
    secondary: "#2e2e2e",
    muted: "#333333",
  },
  light: {
    text: "#1a1a1a",
    mutedText: "#4a4a4a",
    page: "#ffffff",
    card: "#ffffff",
    secondary: "#f5f5f5",
    muted: "#f1f1f1",
  },
};

/** The status colour itself, per theme. */
export const STATUS_COLOR: Record<StatusTheme, Record<StatusKey, string>> = {
  dark: {
    danger: "#f2948b",
    warning: "#e8a05e",
    good: "#7cc294",
    note: "#8ab6d6",
  },
  light: {
    danger: "#c42b1c",
    warning: "#8c4a00",
    good: "#1f7a4d",
    note: "#1f6fbf",
  },
};

/**
 * The text colour printed ON a solid status fill (a danger button, a severity
 * pill with a solid background). On dark the status colours are light, so the
 * ink is the page black; on light they are dark, so the ink is white.
 */
export const STATUS_ON_COLOR: Record<StatusTheme, string> = {
  dark: "#1a1a1a",
  light: "#ffffff",
};

/**
 * The alpha contract. These are the only opacities a status colour may take,
 * and the test proves each one.
 *  - `chipFill` 20%: a chip or pill. Its LABEL is the body text colour, as the
 *    risk-tier chips already are; the status is carried by the word and by a
 *    marker in the status colour, which clears 3:1 on the fill. A label in the
 *    status colour on its own tint cannot reach 4.5:1 and is not allowed.
 *  - `alertFill` 10%: an alert or banner whose text is the body text colour;
 *    10% keeps even the secondary body text above 4.5:1, which 15% and 20% do
 *    not. Alerts sit on the page or on a card, never on a deeper surface.
 *  - `border` 100%: a border or left bar that carries the severity. At full
 *    opacity it clears 3:1 against BOTH the surface outside it and the alert
 *    fill inside it; 30%, 40% and 50% clear neither.
 */
export const STATUS_ALPHA = {
  chipFill: 0.2,
  alertFill: 0.1,
  border: 1,
} as const;

/** The Tailwind class fragments the alpha contract translates into. */
export const STATUS_ALPHA_CLASS = {
  chipFill: "/20",
  alertFill: "/10",
  border: "",
} as const;

/**
 * The SHAPE and the WORD that carry the status when the hue cannot: the icon
 * name (lucide) drawn next to the label on screen, and a plain-text glyph for
 * Markdown, CSV and anything else without styling. A reader who sees no colour
 * at all reads the same status from the same screen.
 *
 * The glyphs are ordinary characters, so they survive a paste into a word
 * processor, an issue tracker or an email, and they differ in outline, not
 * only in fill: a triangle warns, a cross stops, a tick confirms, a circle
 * notes.
 */
export const STATUS_SHAPE: Record<StatusKey, { icon: string; glyph: string }> = {
  danger: { icon: "XCircle", glyph: "✕" },
  warning: { icon: "AlertTriangle", glyph: "▲" },
  good: { icon: "CheckCircle2", glyph: "✓" },
  note: { icon: "Info", glyph: "◆" },
};

/** Plain-text shape for a status, for Markdown and other unstyled surfaces. */
export function statusGlyph(status: StatusKey): string {
  return STATUS_SHAPE[status].glyph;
}

/** The status colour for a key in a theme. */
export function statusColor(status: StatusKey, theme: StatusTheme = "dark"): string {
  return STATUS_COLOR[theme][status];
}

/**
 * The opaque colour a translucent status fill or border resolves to over a
 * given surface, so a test can measure what a reader actually sees.
 */
export function statusOn(
  status: StatusKey,
  surface: string,
  alpha: number,
  theme: StatusTheme = "dark",
): string {
  return blend(STATUS_COLOR[theme][status], surface, alpha);
}

/**
 * Every foreground / background pair the product puts on screen for a status,
 * named, with the threshold it must clear. The test walks this list, so a
 * failure says which pair and where.
 */
export type ContrastPair = {
  name: string;
  foreground: string;
  background: string;
  min: number;
  /** What the pair is: body text, large text, or a mark that carries meaning. */
  kind: "text" | "large-text" | "mark";
};

export function statusContrastPairs(theme: StatusTheme): ContrastPair[] {
  const surf = STATUS_SURFACES[theme];
  const surfaces: [string, string][] = [
    ["page", surf.page],
    ["card", surf.card],
    ["secondary", surf.secondary],
    ["muted", surf.muted],
  ];
  /** Alerts and banners are laid on the page or on a card, never deeper. */
  const alertSurfaces = surfaces.filter(([n]) => n === "page" || n === "card");
  const pairs: ContrastPair[] = [];

  for (const status of STATUS_KEYS) {
    const color = STATUS_COLOR[theme][status];

    for (const [surfaceName, surface] of surfaces) {
      // The status colour used as text (a heading word, a chip label).
      pairs.push({
        name: `${theme}: ${status} text on the ${surfaceName} surface`,
        foreground: color,
        background: surface,
        min: 4.5,
        kind: "text",
      });

      // The status colour used as an icon, a dot or any other mark.
      pairs.push({
        name: `${theme}: ${status} icon or marker on the ${surfaceName} surface`,
        foreground: color,
        background: surface,
        min: 3,
        kind: "mark",
      });

      // Rule 3 again, for a chip: the label is the body text colour and the
      // status is carried by a marker, which must clear 3:1 on the chip fill.
      const chipFill = blend(color, surface, STATUS_ALPHA.chipFill);
      pairs.push({
        name: `${theme}: the label of a ${status} chip on its chip fill (${surfaceName})`,
        foreground: surf.text,
        background: chipFill,
        min: 4.5,
        kind: "text",
      });
      pairs.push({
        name: `${theme}: the marker of a ${status} chip on its chip fill (${surfaceName})`,
        foreground: color,
        background: chipFill,
        min: 3,
        kind: "mark",
      });
      pairs.push({
        name: `${theme}: a ${status} chip fill against the ${surfaceName} surface`,
        foreground: chipFill,
        background: surface,
        min: 1,
        kind: "mark",
      });
    }

    for (const [surfaceName, surface] of alertSurfaces) {
      const alertFill = blend(color, surface, STATUS_ALPHA.alertFill);
      const border = blend(color, surface, STATUS_ALPHA.border);

      // Rule 3: the body of an alert is the body text colour, on the alert fill.
      pairs.push({
        name: `${theme}: body text inside a ${status} alert on the ${surfaceName} surface`,
        foreground: surf.text,
        background: alertFill,
        min: 4.5,
        kind: "text",
      });
      pairs.push({
        name: `${theme}: secondary text inside a ${status} alert on the ${surfaceName} surface`,
        foreground: surf.mutedText,
        background: alertFill,
        min: 4.5,
        kind: "text",
      });
      pairs.push({
        name: `${theme}: the icon of a ${status} alert on its fill (${surfaceName})`,
        foreground: color,
        background: alertFill,
        min: 3,
        kind: "mark",
      });

      // Rule 4: the border that carries the severity, measured on both sides.
      pairs.push({
        name: `${theme}: ${status} border against the ${surfaceName} surface outside it`,
        foreground: border,
        background: surface,
        min: 3,
        kind: "mark",
      });
      pairs.push({
        name: `${theme}: ${status} border against the alert fill inside it (${surfaceName})`,
        foreground: border,
        background: alertFill,
        min: 3,
        kind: "mark",
      });
    }

    // A solid status fill (a danger button, a solid severity pill).
    pairs.push({
      name: `${theme}: the ink printed on a solid ${status} fill`,
      foreground: STATUS_ON_COLOR[theme],
      background: color,
      min: 4.5,
      kind: "text",
    });
  }

  // The plain surfaces themselves, which every screen relies on.
  for (const [surfaceName, surface] of surfaces) {
    pairs.push({
      name: `${theme}: body text on the ${surfaceName} surface`,
      foreground: surf.text,
      background: surface,
      min: 4.5,
      kind: "text",
    });
    pairs.push({
      name: `${theme}: secondary text on the ${surfaceName} surface`,
      foreground: surf.mutedText,
      background: surface,
      min: 4.5,
      kind: "text",
    });
  }

  return pairs;
}

/** The ratio of a named pair, for reporting. */
export function pairRatio(pair: ContrastPair): number {
  return contrastRatio(pair.foreground, pair.background);
}
