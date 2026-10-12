// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isPerSystemUnifiedTemplate, UNIFIED_TEMPLATE_REF } from "./unified-template";

describe("assessment template picker", () => {
  it("leaves out a system's own unified template, keeps the others", () => {
    expect(isPerSystemUnifiedTemplate({ frameworkRef: UNIFIED_TEMPLATE_REF, isSystem: false })).toBe(true);
    expect(isPerSystemUnifiedTemplate({ frameworkRef: "NIST AI RMF", isSystem: false })).toBe(false);
    expect(isPerSystemUnifiedTemplate({ frameworkRef: null, isSystem: true })).toBe(false);
  });

  it("the unified draft writes the reference the picker looks for", () => {
    const src = readFileSync(path.join(process.cwd(), "src/server/services/program/starter-artifacts.ts"), "utf8");
    expect(src).toContain("frameworkRef: UNIFIED_TEMPLATE_REF");
  });
});

describe("review queue", () => {
  it("lists compliance mappings by the same rule the meter counts", () => {
    const src = readFileSync(path.join(process.cwd(), "src/server/routers/governance/provenance.ts"), "utf8");
    expect(src).toMatch(/complianceMapping\.findMany\(\{[\s\S]{0,300}\.\.\.ASSERTED_MAPPING_WHERE/);
  });
});
