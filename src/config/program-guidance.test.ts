// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  LAWFIRM_ROLLOUT_RECOMMENDATIONS,
  PROGRAM_ACTION_TEMPLATES,
  LAWFIRM_PROFESSIONAL_DUTIES,
  PROGRAM_GUIDANCE_LAW_REVIEWED_AS_OF,
  PROGRAM_GUIDANCE_REVIEW_MARKER,
  getRolloutForCategory,
  getActionTemplate,
  type GapId,
} from "./program-guidance";
import {
  LAWFIRM_TOOL_CATEGORIES,
  LAWFIRM_POLICY_PACK,
  getLawFirmCategory,
  type Localized,
} from "./lawfirm-ai-toolkit";

const ALL_GAP_IDS: GapId[] = [
  "no-systems",
  "unclassified-systems",
  "high-risk-without-gate",
  "overdue-gates",
  "draft-policies",
  "unlinked-policies",
  "missing-transparency-profiles",
  "marking-overdue",
  "unassessed-vendors",
  "untriaged-shadow-reports",
  "unassessed-compliance",
];

const STAGES = ["ADOPT", "PILOT", "RESTRICT", "HOLD"];
const EFFORTS = ["S", "M", "L"];

/** Recursively collect every Localized-shaped object in a value. */
function collectLocalized(
  value: unknown,
  path: string,
  out: Array<{ path: string; l: Localized }>,
) {
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

describe("program guidance config", () => {
  it("every Localized field is non-empty in both locales", () => {
    const found: Array<{ path: string; l: Localized }> = [];
    collectLocalized(LAWFIRM_ROLLOUT_RECOMMENDATIONS, "rollout", found);
    collectLocalized(PROGRAM_ACTION_TEMPLATES, "actions", found);
    collectLocalized(LAWFIRM_PROFESSIONAL_DUTIES, "duties", found);
    expect(found.length).toBeGreaterThan(0);
    for (const { path, l } of found) {
      expect(l.en.trim(), `${path}.en`).not.toBe("");
      expect(l.es.trim(), `${path}.es`).not.toBe("");
    }
  });

  it("covers every lawfirm category exactly once with a valid stage and 2-3 preconditions", () => {
    const ids = LAWFIRM_ROLLOUT_RECOMMENDATIONS.map((r) => r.categoryId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(
      LAWFIRM_TOOL_CATEGORIES.map((c) => c.id).sort(),
    );
    for (const rec of LAWFIRM_ROLLOUT_RECOMMENDATIONS) {
      expect(getLawFirmCategory(rec.categoryId), rec.categoryId).toBeDefined();
      expect(STAGES, `${rec.categoryId} stage`).toContain(rec.stage);
      expect(rec.preconditions.length, `${rec.categoryId} preconditions`).toBeGreaterThanOrEqual(2);
      expect(rec.preconditions.length, `${rec.categoryId} preconditions`).toBeLessThanOrEqual(3);
    }
  });

  it("every GapId has exactly one ActionTemplate with a /governance href and valid effort", () => {
    const templateIds = PROGRAM_ACTION_TEMPLATES.map((a) => a.id);
    expect(new Set(templateIds).size).toBe(templateIds.length);
    expect(templateIds.sort()).toEqual([...ALL_GAP_IDS].sort());
    for (const tpl of PROGRAM_ACTION_TEMPLATES) {
      expect(tpl.href.startsWith("/governance"), `${tpl.id} href`).toBe(true);
      expect(EFFORTS, `${tpl.id} effort`).toContain(tpl.effort);
    }
  });

  it("every duty control policyId exists in the law-firm policy pack", () => {
    const packIds = new Set(LAWFIRM_POLICY_PACK.map((p) => p.id));
    for (const duty of LAWFIRM_PROFESSIONAL_DUTIES) {
      for (const control of duty.controls) {
        if (control.kind === "policy") {
          expect(packIds.has(control.policyId), `${duty.id} → ${control.policyId}`).toBe(true);
        }
      }
      expect(duty.controls.length, `${duty.id} controls`).toBeGreaterThan(0);
    }
  });

  it("duty ids are unique and cover the six-duty set", () => {
    const ids = LAWFIRM_PROFESSIONAL_DUTIES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(
      ["candor", "communication", "competence", "confidentiality", "fees", "supervision"],
    );
  });

  it("review marker date is well-formed and present in every summary and duty description", () => {
    expect(PROGRAM_GUIDANCE_LAW_REVIEWED_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const rec of LAWFIRM_ROLLOUT_RECOMMENDATIONS) {
      expect(rec.summary.en, `${rec.categoryId} en`).toContain(PROGRAM_GUIDANCE_REVIEW_MARKER.en);
      expect(rec.summary.es, `${rec.categoryId} es`).toContain(PROGRAM_GUIDANCE_REVIEW_MARKER.es);
    }
    for (const duty of LAWFIRM_PROFESSIONAL_DUTIES) {
      expect(duty.description.en, `${duty.id} en`).toContain(PROGRAM_GUIDANCE_REVIEW_MARKER.en);
      expect(duty.description.es, `${duty.id} es`).toContain(PROGRAM_GUIDANCE_REVIEW_MARKER.es);
    }
  });

  it("lookup helpers resolve and miss correctly", () => {
    expect(getRolloutForCategory("GENERAL_ASSISTANT")?.stage).toBe("ADOPT");
    expect(getRolloutForCategory("NOT_A_CATEGORY")).toBeUndefined();
    expect(getActionTemplate("draft-policies")?.href).toBe("/governance/policies");
  });
});
