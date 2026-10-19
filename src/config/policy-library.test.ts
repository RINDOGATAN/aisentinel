// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { findPolicyTemplate, policyLibrary, policySectors, suggestPolicies } from "./policy-library";

describe("the policy template library", () => {
  it("has unique ids and the same templates in both languages", () => {
    const en = policyLibrary("en");
    const es = policyLibrary("es");
    expect(new Set(en.map((t) => t.id)).size).toBe(en.length);
    expect(es.map((t) => t.id)).toEqual(en.map((t) => t.id));
    expect(findPolicyTemplate("core-ai-use", "es")?.title).toBe(es.find((t) => t.id === "core-ai-use")?.title);
    expect(en.every((t) => t.description && t.content)).toBe(true);
  });

  it("offers every industry, law firms and other as sectors", () => {
    const ids = policySectors("en").map((s) => s.id);
    expect(ids).toContain("healthcare");
    expect(ids).toContain("legal");
    expect(ids).toContain("other");
  });
});

describe("suggestPolicies", () => {
  it("suggests one policy per type, the sector's own text first", () => {
    const s = suggestPolicies({ sector: "healthcare", role: "deployer", agents: false }, "en");
    const types = s.map((x) => (x.kind === "template" ? x.template.type : x.type));
    expect(new Set(types).size).toBe(types.length);
    const usage = s.find((x) => x.kind === "template" && x.template.type === "AI_USAGE");
    expect(usage?.kind === "template" && usage.template.industryId).toBe("healthcare");
    expect(usage?.reasons).toEqual(["sector", "deployer"]);
  });

  it("uses the law-firm pack for law firms", () => {
    const s = suggestPolicies({ sector: "legal", role: "deployer", agents: false }, "en");
    expect(s.every((x) => x.kind === "template" && x.template.group === "lawfirm")).toBe(true);
  });

  it("gives a provider a risk-management policy, blank when the sector has none", () => {
    const other = suggestPolicies({ sector: "other", role: "provider", agents: false }, "en");
    expect(other.find((x) => x.kind === "blank")).toEqual({ kind: "blank", type: "AI_RISK_MANAGEMENT", reasons: ["provider"] });
    const fin = suggestPolicies({ sector: "financial", role: "both", agents: false }, "en");
    const risk = fin.find((x) => x.kind === "template" && x.template.type === "AI_RISK_MANAGEMENT");
    expect(risk?.reasons).toContain("provider");
    const deployerOnly = suggestPolicies({ sector: "other", role: "deployer", agents: false }, "en");
    expect(deployerOnly.some((x) => x.kind === "blank")).toBe(false);
  });

  it("marks the policies that matter for agents", () => {
    const s = suggestPolicies({ sector: "other", role: "deployer", agents: true }, "en");
    const agentTypes = s.filter((x) => x.reasons.includes("agents")).map((x) => (x.kind === "template" ? x.template.type : x.type));
    expect(agentTypes.sort()).toEqual(["AI_DATA_GOVERNANCE", "AI_GOVERNANCE", "AI_INCIDENT_RESPONSE"]);
  });
});
