// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  BAND_GUIDANCE,
  FACTOR_IDS,
  SENSITIVE_FACTORS,
  bandFor,
  type FactorRatings,
} from "./sensitive-data-factors";

describe("the five factors", () => {
  it("defines every factor once, in both languages", () => {
    expect(SENSITIVE_FACTORS.map((f) => f.id)).toEqual([...FACTOR_IDS]);
    for (const f of SENSITIVE_FACTORS) {
      expect(f.label.en).toBeTruthy();
      expect(f.label.es).toBeTruthy();
      expect(f.question.es).toBeTruthy();
      expect(f.guidance.es.length).toBeGreaterThan(40);
    }
  });

  it("treats content, use and harm as primary and the other two as modifiers", () => {
    const primary = SENSITIVE_FACTORS.filter((f) => f.weight === "primary").map((f) => f.id);
    expect(primary).toEqual(["content", "use", "harm"]);
  });
});

describe("banding", () => {
  const all = (r: "LOW" | "MEDIUM" | "HIGH"): FactorRatings =>
    Object.fromEntries(FACTOR_IDS.map((id) => [id, r])) as FactorRatings;

  it("returns low when everything is low", () => {
    expect(bandFor(all("LOW")).band).toBe("LOW");
  });

  it("returns high when everything is high", () => {
    expect(bandFor(all("HIGH")).band).toBe("HIGH");
  });

  it("cannot lower a high primary factor with low modifiers", () => {
    // Directly revealing data stays high even where the person might expect it.
    const ratings: FactorRatings = {
      source: "LOW",
      content: "HIGH",
      use: "LOW",
      expectations: "LOW",
      harm: "LOW",
    };
    expect(bandFor(ratings).band).toBe("HIGH");
  });

  it("raises the band a step when expectations are high", () => {
    const ratings: FactorRatings = {
      source: "LOW",
      content: "MEDIUM",
      use: "MEDIUM",
      expectations: "HIGH",
      harm: "LOW",
    };
    expect(bandFor(ratings).band).toBe("HIGH");
  });

  it("lowers the band a step when both modifiers are low", () => {
    const ratings: FactorRatings = {
      source: "LOW",
      content: "MEDIUM",
      use: "LOW",
      expectations: "LOW",
      harm: "LOW",
    };
    expect(bandFor(ratings).band).toBe("LOW");
  });

  it("never goes below low", () => {
    const ratings: FactorRatings = {
      source: "LOW",
      content: "LOW",
      use: "LOW",
      expectations: "LOW",
      harm: "LOW",
    };
    expect(bandFor(ratings).band).toBe("LOW");
  });

  it("reports an incomplete analysis without refusing to band it", () => {
    const result = bandFor({ content: "HIGH" });
    expect(result.incomplete).toBe(true);
    expect(result.band).toBe("HIGH");
  });

  it("explains itself in both languages", () => {
    const result = bandFor(all("MEDIUM"));
    expect(result.because.en).toBeTruthy();
    expect(result.because.es).toBeTruthy();
  });

  it("gives guidance for every band", () => {
    for (const band of ["LOW", "MEDIUM", "HIGH"] as const) {
      expect(BAND_GUIDANCE[band].en).toBeTruthy();
      expect(BAND_GUIDANCE[band].es).toBeTruthy();
    }
  });

  it("makes the advertising case come out high: purchase data modelled into a condition", () => {
    // Source is ordinary retail, but the model produces an individual health
    // determination used to target: content, use and harm are all high.
    const ratings: FactorRatings = {
      source: "LOW",
      content: "HIGH",
      use: "HIGH",
      expectations: "HIGH",
      harm: "HIGH",
    };
    expect(bandFor(ratings).band).toBe("HIGH");
  });
});
