// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import {
  STATUS_ALPHA,
  STATUS_COLOR,
  STATUS_CSS_VAR,
  STATUS_KEYS,
  STATUS_ON_COLOR,
  STATUS_SHAPE,
  STATUS_SURFACES,
  pairRatio,
  statusContrastPairs,
  statusGlyph,
  type StatusTheme,
} from "./status-palette";

const THEMES: StatusTheme[] = ["dark", "light"];

describe("contrast arithmetic", () => {
  it("matches known reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});

describe("status palette contrast (WCAG 2.2 AA)", () => {
  for (const theme of THEMES) {
    for (const pair of statusContrastPairs(theme)) {
      const ratio = pairRatio(pair);
      it(`${pair.name} is at least ${pair.min}:1 (${ratio.toFixed(2)}:1)`, () => {
        expect(
          pairRatio(pair),
          `${pair.name}: ${pair.foreground} on ${pair.background}`,
        ).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }

  it("the four statuses use four different colours in each theme", () => {
    for (const theme of THEMES) {
      expect(new Set(STATUS_KEYS.map((s) => STATUS_COLOR[theme][s])).size).toBe(STATUS_KEYS.length);
    }
  });

  it("every status carries a word-sized shape as well as a hue", () => {
    for (const status of STATUS_KEYS) {
      expect(STATUS_SHAPE[status].icon).toMatch(/^[A-Z]/);
      expect(statusGlyph(status).length).toBeGreaterThan(0);
    }
    expect(new Set(STATUS_KEYS.map(statusGlyph)).size).toBe(STATUS_KEYS.length);
    expect(new Set(STATUS_KEYS.map((s) => STATUS_SHAPE[s].icon)).size).toBe(STATUS_KEYS.length);
  });
});

describe("status palette single source", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  function cssValues(name: string): string[] {
    const re = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`, "g");
    return [...css.matchAll(re)].map((m) => m[1].toLowerCase());
  }

  it("globals.css status variables equal the dark tokens", () => {
    for (const status of STATUS_KEYS) {
      const values = cssValues(STATUS_CSS_VAR[status]);
      expect(values.length, STATUS_CSS_VAR[status]).toBeGreaterThanOrEqual(2);
      for (const v of values) expect(v, STATUS_CSS_VAR[status]).toBe(STATUS_COLOR.dark[status].toLowerCase());
    }
  });

  it("globals.css prints the page ink on a solid status fill", () => {
    for (const name of [
      "--destructive-foreground",
      "--warning-foreground",
      "--success-foreground",
      "--info-foreground",
    ]) {
      const values = cssValues(name);
      expect(values.length, name).toBeGreaterThanOrEqual(2);
      for (const v of values) expect(v, name).toBe(STATUS_ON_COLOR.dark.toLowerCase());
    }
  });

  it("globals.css surfaces equal the dark surfaces", () => {
    for (const v of cssValues("--background")) expect(v).toBe(STATUS_SURFACES.dark.page);
    for (const v of cssValues("--card")) expect(v).toBe(STATUS_SURFACES.dark.card);
    for (const v of cssValues("--secondary")) expect(v).toBe(STATUS_SURFACES.dark.secondary);
    for (const v of cssValues("--muted")) expect(v).toBe(STATUS_SURFACES.dark.muted);
    for (const v of cssValues("--foreground")) expect(v).toBe(STATUS_SURFACES.dark.text);
    for (const v of cssValues("--muted-foreground")) expect(v).toBe(STATUS_SURFACES.dark.mutedText);
  });

  it("the alpha contract is the one the source is allowed to use", () => {
    expect(STATUS_ALPHA.alertFill).toBe(0.1);
    expect(STATUS_ALPHA.chipFill).toBe(0.2);
    expect(STATUS_ALPHA.border).toBe(1);
  });
});
