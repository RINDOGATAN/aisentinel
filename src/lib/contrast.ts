// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * WCAG 2.2 contrast arithmetic. One implementation, used by every contrast
 * test in the tree (`src/config/risk-tier-palette.test.ts`,
 * `src/app/theme-contrast.test.ts`) so a single formula decides whether a
 * colour pair passes.
 *
 * Thresholds (owner's directive, WCAG 2.2 AA):
 *  - 4.5:1  normal body text
 *  - 3:1    large text (>= 24px, or >= 19px bold) and non-text marks that
 *           carry meaning (icons, borders, status dots, chart series)
 */

export const AA_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;
export const AA_NON_TEXT = 3;

/** WCAG 2.x relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Flatten a translucent colour onto an opaque one, so a pair written as
 * `bg-destructive/10` over the card can be measured as the colour a reader
 * actually sees. `alpha` is 0 to 1.
 */
export function blend(fg: string, bg: string, alpha: number): string {
  const part = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2]
    .map((i) => Math.round(part(fg, i) * alpha + part(bg, i) * (1 - alpha)))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return `#${out}`;
}
