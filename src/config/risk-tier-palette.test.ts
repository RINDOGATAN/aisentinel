// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RISK_TIERS,
  TIER_CHIP_CSS_VAR,
  TIER_CSS_VAR,
  TIER_MARKER,
  TIER_SURFACES,
  toRiskTier,
  type TierTheme,
} from "./risk-tier-palette";
import { RISK_COLORS, UNCLASSIFIED_COLOR, VENDOR_RISK_COLORS } from "@/lib/program-map/palette";

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES: TierTheme[] = ["dark", "light"];

describe("risk-tier palette contrast (WCAG 2.2 AA)", () => {
  it("the formula matches known reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  for (const theme of THEMES) {
    const surf = TIER_SURFACES[theme];

    it(`${theme}: body text on the chip fill is at least 4.5:1 (${contrast(surf.text, surf.chip).toFixed(2)})`, () => {
      expect(contrast(surf.text, surf.chip)).toBeGreaterThanOrEqual(4.5);
    });

    for (const tier of RISK_TIERS) {
      const marker = TIER_MARKER[theme][tier];
      const ratios = [surf.chip, surf.page]
        .map((bg) => contrast(marker, bg).toFixed(2))
        .join(" / ");
      it(`${theme}: ${tier} marker ${marker} is at least 3:1 against chip, page, card and alternate row (chip / page ${ratios})`, () => {
        for (const bg of [surf.chip, surf.page, surf.card, surf.altRow]) {
          expect(
            contrast(marker, bg),
            `${tier} ${marker} vs ${bg}`,
          ).toBeGreaterThanOrEqual(3);
        }
      });
    }
  }

  it("the four tiers use four different marker colours in each theme", () => {
    for (const theme of THEMES) {
      const tiers = RISK_TIERS.filter((t) => t !== "UNCLASSIFIED");
      const set = new Set(tiers.map((t) => TIER_MARKER[theme][t]));
      expect(set.size).toBe(tiers.length);
    }
  });
});

describe("risk-tier palette single source", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  /** Every value a variable takes in globals.css (it is declared in :root and .dark). */
  function cssValues(name: string): string[] {
    const re = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`, "g");
    return [...css.matchAll(re)].map((m) => m[1].toLowerCase());
  }

  it("globals.css tier variables equal the dark tokens", () => {
    for (const tier of RISK_TIERS) {
      const values = cssValues(TIER_CSS_VAR[tier]);
      expect(values.length, TIER_CSS_VAR[tier]).toBeGreaterThanOrEqual(2);
      for (const v of values) expect(v).toBe(TIER_MARKER.dark[tier].toLowerCase());
    }
    const chip = cssValues(TIER_CHIP_CSS_VAR);
    expect(chip.length).toBeGreaterThanOrEqual(2);
    for (const v of chip) expect(v).toBe(TIER_SURFACES.dark.chip.toLowerCase());
  });

  it("globals.css foreground and background equal the dark surfaces", () => {
    for (const v of cssValues("--foreground")) expect(v).toBe(TIER_SURFACES.dark.text);
    for (const v of cssValues("--background")) expect(v).toBe(TIER_SURFACES.dark.page);
    for (const v of cssValues("--card")) expect(v).toBe(TIER_SURFACES.dark.card);
  });

  it("the program map (light canvas) sources its tier colours from the tokens", () => {
    for (const level of ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"] as const) {
      expect(RISK_COLORS[level]).toBe(TIER_MARKER.light[level]);
    }
    expect(UNCLASSIFIED_COLOR).toBe(TIER_MARKER.light.UNCLASSIFIED);
    for (const level of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
      expect(VENDOR_RISK_COLORS[level]).toBe(TIER_MARKER.light[toRiskTier(level)]);
    }
  });

  it("aliases resolve onto the tiers", () => {
    expect(toRiskTier("critical")).toBe("UNACCEPTABLE");
    expect(toRiskTier("Medium")).toBe("LIMITED");
    expect(toRiskTier("LOW")).toBe("MINIMAL");
    expect(toRiskTier(null)).toBe("UNCLASSIFIED");
    expect(toRiskTier("nonsense")).toBe("UNCLASSIFIED");
  });
});
