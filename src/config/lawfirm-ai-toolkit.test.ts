// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  LAWFIRM_TOOL_CATEGORIES,
  LAWFIRM_TOOLS,
  LAWFIRM_POLICY_PACK,
  LAWFIRM_LAW_REVIEWED_AS_OF,
  LAWFIRM_REVIEW_MARKER,
  getLawFirmCategory,
  getLawFirmToolsById,
  getToolGovernance,
  resolveContentLocale,
  type Localized,
} from "./lawfirm-ai-toolkit";

// Mirror the Prisma enums locally so the test stays hermetic.
const RISK_LEVELS = ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"];
const GATE_TYPES = [
  "PRE_DEPLOYMENT",
  "POST_DEPLOYMENT",
  "PERIODIC_REVIEW",
  "INCIDENT_TRIGGERED",
  "MATERIAL_CHANGE",
];
const POLICY_TYPES = [
  "AI_USAGE",
  "AI_GOVERNANCE",
  "AI_ETHICS",
  "AI_RISK_MANAGEMENT",
  "AI_DATA_GOVERNANCE",
  "AI_PROCUREMENT",
  "AI_INCIDENT_RESPONSE",
  "AI_TRANSPARENCY",
  "CUSTOM",
];

/** Recursively collect every Localized-shaped object in a value. */
function collectLocalized(value: unknown, path: string, out: Array<{ path: string; l: Localized }>) {
  if (value === null || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 2 && typeof obj.en === "string" && typeof obj.es === "string") {
    out.push({ path, l: obj as unknown as Localized });
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    collectLocalized(v, `${path}.${k}`, out);
  }
}

describe("law-firm AI toolkit config", () => {
  it("tool ids and names are unique", () => {
    const ids = LAWFIRM_TOOLS.map((t) => t.id);
    const names = LAWFIRM_TOOLS.map((t) => t.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("category ids are unique and every tool references an existing category", () => {
    const catIds = LAWFIRM_TOOL_CATEGORIES.map((c) => c.id);
    expect(new Set(catIds).size).toBe(catIds.length);
    for (const tool of LAWFIRM_TOOLS) {
      expect(getLawFirmCategory(tool.categoryId), `${tool.id} → ${tool.categoryId}`).toBeDefined();
    }
  });

  it("every Localized field is non-empty in both locales", () => {
    const found: Array<{ path: string; l: Localized }> = [];
    collectLocalized(LAWFIRM_TOOL_CATEGORIES, "categories", found);
    collectLocalized(LAWFIRM_TOOLS, "tools", found);
    collectLocalized(LAWFIRM_POLICY_PACK, "policies", found);
    expect(found.length).toBeGreaterThan(0);
    for (const { path, l } of found) {
      expect(l.en.trim(), `${path}.en`).not.toBe("");
      expect(l.es.trim(), `${path}.es`).not.toBe("");
    }
  });

  it("governance enum values are valid", () => {
    for (const cat of LAWFIRM_TOOL_CATEGORIES) {
      expect(RISK_LEVELS, `${cat.id} riskLevel`).toContain(cat.governance.riskLevel);
      if (cat.governance.gateType) {
        expect(GATE_TYPES, `${cat.id} gateType`).toContain(cat.governance.gateType);
      }
      expect(cat.governance.role).toBe("DEPLOYER");
    }
    for (const policy of LAWFIRM_POLICY_PACK) {
      expect(POLICY_TYPES, `${policy.id} type`).toContain(policy.type);
    }
  });

  it("policy ids and per-locale titles are unique", () => {
    const ids = LAWFIRM_POLICY_PACK.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const locale of ["en", "es"] as const) {
      const titles = LAWFIRM_POLICY_PACK.map((p) => p.title[locale]);
      expect(new Set(titles).size, `${locale} titles`).toBe(titles.length);
    }
  });

  it("review marker date is well-formed and present in every rationale and policy content", () => {
    expect(LAWFIRM_LAW_REVIEWED_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const cat of LAWFIRM_TOOL_CATEGORIES) {
      expect(cat.governance.riskRationale.en, `${cat.id} rationale en`).toContain(
        LAWFIRM_REVIEW_MARKER.en,
      );
      expect(cat.governance.riskRationale.es, `${cat.id} rationale es`).toContain(
        LAWFIRM_REVIEW_MARKER.es,
      );
    }
    for (const policy of LAWFIRM_POLICY_PACK) {
      expect(policy.content.en, `${policy.id} content en`).toContain(LAWFIRM_REVIEW_MARKER.en);
      expect(policy.content.es, `${policy.id} content es`).toContain(LAWFIRM_REVIEW_MARKER.es);
    }
  });

  it("getLawFirmToolsById filters and preserves config order; getToolGovernance merges overrides", () => {
    const picked = getLawFirmToolsById(["harvey", "chatgpt", "nonexistent"]);
    expect(picked.map((t) => t.id)).toEqual(["chatgpt", "harvey"]); // config order, unknown dropped
    for (const tool of LAWFIRM_TOOLS) {
      const gov = getToolGovernance(tool);
      expect(RISK_LEVELS).toContain(gov.riskLevel);
    }
  });

  it("resolveContentLocale returns es only for the es cookie", () => {
    expect(resolveContentLocale(() => "es")).toBe("es");
    expect(resolveContentLocale(() => "en")).toBe("en");
    expect(resolveContentLocale(() => undefined)).toBe("en");
    expect(resolveContentLocale(() => "fr")).toBe("en");
  });
});
