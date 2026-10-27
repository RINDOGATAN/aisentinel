// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The rule that keeps each system's requirement rows in step with the scope
 * (sync-requirements.ts), tested without a database.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  planRequirementSync,
  requirementsInScope,
  type SyncMappingRow,
  type SyncRequirement,
  type SystemScopeInput,
} from "./sync-requirements";

const req = (id: string, frameworkCode: string, applicableTo: string[] = [], applicabilityTags: string[] = []): SyncRequirement => ({
  id,
  frameworkCode,
  applicableTo,
  applicabilityTags,
});

const REQUIREMENTS: SyncRequirement[] = [
  req("eu-high", "EU_AI_ACT", ["HIGH"]),
  req("eu-all", "EU_AI_ACT", ["HIGH", "LIMITED", "MINIMAL"]),
  req("nist-all", "NIST_AI_RMF", ["HIGH", "LIMITED", "MINIMAL"]),
  req("iso-all", "ISO_42001", ["HIGH", "LIMITED", "MINIMAL"]),
  req("gdpr-core", "EU_GDPR", [], ["jurisdiction:EU", "gdpr:core"]),
  req("gdpr-adm", "EU_GDPR", [], ["jurisdiction:EU", "gdpr:adm"]),
  req("tx-core", "TX_TRAIGA", [], ["jurisdiction:US_TX", "tx:core"]),
  req("ca-10", "CA_CCPA_ADMT", [], ["jurisdiction:US_CA", "admt:art10"]),
];

const system = (patch: Partial<SystemScopeInput> = {}): SystemScopeInput => ({
  id: "s1",
  riskLevel: "HIGH",
  regimes: [],
  admtTags: null,
  ...patch,
});

const row = (id: string, requirementId: string, empty = true, aiSystemId = "s1"): SyncMappingRow => ({
  id,
  aiSystemId,
  requirementId,
  empty,
});

const ids = (set: Set<string>) => [...set].sort();

describe("requirementsInScope", () => {
  it("takes the tier's requirements of the EU AI Act, NIST and ISO", () => {
    expect(ids(requirementsInScope(system(), REQUIREMENTS, []))).toEqual(["eu-all", "eu-high", "iso-all", "nist-all"]);
    expect(ids(requirementsInScope(system({ riskLevel: "LIMITED" }), REQUIREMENTS, []))).toEqual([
      "eu-all",
      "iso-all",
      "nist-all",
    ]);
  });

  it("takes no tier requirement from a system with no risk level", () => {
    expect(ids(requirementsInScope(system({ riskLevel: null }), REQUIREMENTS, []))).toEqual([]);
  });

  it("leaves out the frameworks the answers rule out", () => {
    expect(ids(requirementsInScope(system(), REQUIREMENTS, ["EU_AI_ACT", "ISO_42001"]))).toEqual(["nist-all"]);
  });

  it("takes what each regime admits, and nothing from a regime with no tags", () => {
    const scope = system({
      regimes: [
        { framework: "EU_GDPR", tags: ["jurisdiction:EU", "gdpr:core"] },
        { framework: "TX_TRAIGA", tags: [] },
      ],
    });
    expect(ids(requirementsInScope(scope, REQUIREMENTS, ["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001"]))).toEqual([
      "gdpr-core",
    ]);
  });

  it("takes the California rows only once the ADMT rules have resolved", () => {
    const tiers = ["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001"];
    expect(ids(requirementsInScope(system({ admtTags: null }), REQUIREMENTS, tiers))).toEqual([]);
    expect(ids(requirementsInScope(system({ admtTags: ["jurisdiction:US_CA", "admt:art10"] }), REQUIREMENTS, tiers))).toEqual([
      "ca-10",
    ]);
  });
});

describe("planRequirementSync", () => {
  it("adds the rows a framework brings in, once", () => {
    const plan = planRequirementSync([system()], REQUIREMENTS, [row("m1", "eu-high")], []);
    expect(plan.create.map((c) => c.requirementId).sort()).toEqual(["eu-all", "iso-all", "nist-all"]);
    expect(plan.remove).toEqual([]);
    expect(plan.byFramework.ISO_42001).toEqual({ created: 1, removed: 0 });
  });

  it("removes the empty rows of a framework taken out, and keeps every row someone worked on", () => {
    const rows = [
      row("m-eu-empty", "eu-high"),
      row("m-eu-worked", "eu-all", false),
      row("m-iso-empty", "iso-all"),
      row("m-nist", "nist-all"),
    ];
    const plan = planRequirementSync([system()], REQUIREMENTS, rows, ["EU_AI_ACT", "ISO_42001"]);
    expect(plan.create).toEqual([]);
    expect(plan.remove.sort()).toEqual(["m-eu-empty", "m-iso-empty"]);
    expect(plan.byFramework.EU_AI_ACT).toEqual({ created: 0, removed: 1 });
  });

  it("follows a change of risk level: the old tier's empty rows go, the new tier's come", () => {
    const rows = [row("m-high", "eu-high"), row("m-all", "eu-all"), row("m-n", "nist-all"), row("m-i", "iso-all")];
    const plan = planRequirementSync([system({ riskLevel: "MINIMAL" })], REQUIREMENTS, rows, []);
    expect(plan.remove).toEqual(["m-high"]);
    expect(plan.create).toEqual([]);
  });

  it("follows a regime that goes out of scope, or back to undetermined", () => {
    const rows = [row("m-tx", "tx-core"), row("m-gdpr", "gdpr-core")];
    const plan = planRequirementSync(
      [system({ riskLevel: null, regimes: [{ framework: "TX_TRAIGA", tags: [] }, { framework: "EU_GDPR", tags: ["jurisdiction:EU", "gdpr:core"] }] })],
      REQUIREMENTS,
      rows,
      [],
    );
    expect(plan.remove).toEqual(["m-tx"]);
    expect(plan.create).toEqual([]);
  });

  it("removes nothing from a system a legal hold covers, and still adds", () => {
    const plan = planRequirementSync(
      [system({ riskLevel: "MINIMAL" })],
      REQUIREMENTS,
      [row("m-high", "eu-high")],
      [],
      new Set(["s1"]),
    );
    expect(plan.remove).toEqual([]);
    expect(plan.create.length).toBeGreaterThan(0);
  });

  it("is idempotent: once applied, a second plan changes nothing", () => {
    const systems = [
      system(),
      system({ id: "s2", riskLevel: "LIMITED", regimes: [{ framework: "EU_GDPR", tags: ["jurisdiction:EU", "gdpr:adm"] }] }),
    ];
    const start = [row("m1", "eu-high", true, "s2"), row("m2", "iso-all", false, "s1")];
    const first = planRequirementSync(systems, REQUIREMENTS, start, ["ISO_42001"]);
    const after: SyncMappingRow[] = [
      ...start.filter((r) => !first.remove.includes(r.id)),
      ...first.create.map((c, i) => row(`n${i}`, c.requirementId, true, c.aiSystemId)),
    ];
    const second = planRequirementSync(systems, REQUIREMENTS, after, ["ISO_42001"]);
    expect(second.create).toEqual([]);
    expect(second.remove).toEqual([]);
    // The worked ISO row stayed although ISO is ruled out.
    expect(after.some((r) => r.id === "m2")).toBe(true);
  });

  it("never touches AIUC-1 rows: agent testing owns them", () => {
    const requirements = [...REQUIREMENTS, req("aiuc-1", "AIUC_1")];
    const plan = planRequirementSync([system()], requirements, [row("m-a", "aiuc-1")], []);
    expect(plan.remove).toEqual([]);
    expect(plan.create.some((c) => c.requirementId === "aiuc-1")).toBe(false);
  });
});

const read = (p: string) => readFileSync(p, "utf8");

describe("where the rows are brought in line", () => {
  it("every save that changes the scope runs the sync", () => {
    const callers: [string, string][] = [
      ["src/server/routers/governance/organization.ts", 'reason: "jurisdictions"'],
      ["src/server/routers/governance/regimes.ts", 'reason: "applicability"'],
      ["src/server/routers/governance/regimes.ts", 'reason: "regime-org-facts"'],
      ["src/server/routers/governance/regimes.ts", 'reason: "regime-system-facts"'],
      ["src/server/routers/governance/admt.ts", 'reason: "admt-org-facts"'],
      ["src/server/routers/governance/admt.ts", 'reason: "admt-profile"'],
      ["src/server/routers/governance/riskClassification.ts", 'reason: "risk-classification"'],
      ["src/server/routers/governance/aiSystem.ts", 'reason: "system-created"'],
      ["src/server/routers/governance/aiSystem.ts", 'reason: "system-facts"'],
      ["src/server/routers/governance/sample.ts", 'reason: "worked-example"'],
      ["src/server/routers/governance/clientTemplate.ts", 'reason: "client-template"'],
      ["src/server/services/suite/dpc-link.ts", 'reason: "dpo-central-link"'],
      ["src/server/routers/governance/chatbotOverlay.ts", 'reason: "chatbot-overlay-facts"'],
    ];
    for (const [file, marker] of callers) expect(read(file), `${file} ${marker}`).toContain(marker);
  });

  it("the tier queries leave out the frameworks the answers rule out", () => {
    expect(read("src/server/routers/governance/quickstart.ts")).toContain("framework: { code: { notIn: ruledOut } }");
    expect(read("src/server/services/inventory/import-systems.ts")).toContain("framework: { code: { notIn: ruledOut } }");
  });
});

describe("the customer-facing chatbot overlay", () => {
  const OVERLAY: SyncRequirement[] = [
    ...REQUIREMENTS,
    req("chatbot-ai-disclosure", "CHATBOT_OVERLAY", [], ["chatbot:overlay"]),
    req("chatbot-crisis-protocol", "CHATBOT_OVERLAY", [], ["chatbot:overlay"]),
  ];
  const overlayIds = (set: Set<string>) => ids(set).filter((id) => id.startsWith("chatbot-"));

  it("adds its rows only to a system the overlay applies to", () => {
    expect(overlayIds(requirementsInScope(system({ chatbotOverlay: true }), OVERLAY, []))).toEqual([
      "chatbot-ai-disclosure",
      "chatbot-crisis-protocol",
    ]);
    expect(overlayIds(requirementsInScope(system({ chatbotOverlay: false }), OVERLAY, []))).toEqual([]);
    expect(overlayIds(requirementsInScope(system(), OVERLAY, []))).toEqual([]);
  });

  it("does not depend on the risk tier, the places or the framework choice", () => {
    const s = system({ riskLevel: null, chatbotOverlay: true });
    const everythingRuledOut = ["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001", "CO_SB_26_189", "TX_TRAIGA", "WA_AI_RULES", "CA_CCPA_ADMT"];
    expect(overlayIds(requirementsInScope(s, OVERLAY, everythingRuledOut))).toHaveLength(2);
  });

  it("with the switch off (no system applies) adds nothing and removes only empty rows", () => {
    const plan = planRequirementSync(
      [system({ chatbotOverlay: false })],
      OVERLAY,
      [row("m1", "chatbot-ai-disclosure", true), row("m2", "chatbot-crisis-protocol", false)],
      [],
    );
    expect(plan.create.filter((c) => c.requirementId.startsWith("chatbot-"))).toEqual([]);
    expect(plan.remove).toEqual(["m1"]);
    expect(plan.byFramework.CHATBOT_OVERLAY).toEqual({ created: 0, removed: 1 });
  });

  it("keeps every row while a legal hold covers the system", () => {
    const plan = planRequirementSync(
      [system({ chatbotOverlay: false })],
      OVERLAY,
      [row("m1", "chatbot-ai-disclosure", true)],
      [],
      new Set(["s1"]),
    );
    expect(plan.remove).toEqual([]);
  });

  it("creates the missing rows once and is idempotent", () => {
    const first = planRequirementSync([system({ chatbotOverlay: true })], OVERLAY, [row("m1", "chatbot-ai-disclosure")], []);
    expect(first.create.filter((c) => c.requirementId.startsWith("chatbot-"))).toEqual([
      { aiSystemId: "s1", requirementId: "chatbot-crisis-protocol" },
    ]);
    const second = planRequirementSync(
      [system({ chatbotOverlay: true })],
      OVERLAY,
      [row("m1", "chatbot-ai-disclosure"), row("m2", "chatbot-crisis-protocol")],
      [],
    );
    expect(second.create.filter((c) => c.requirementId.startsWith("chatbot-"))).toEqual([]);
    expect(second.remove).toEqual([]);
  });

  it("the sync reads the switch and the system's own facts", () => {
    const src = read("src/server/services/scope/sync-requirements.ts");
    expect(src).toContain("chatbotOverlayInScope(overlayOn, readChatbotFacts(meta?.regimeFacts))");
    expect(src).toContain("options.chatbotOverlayEnabled ?? chatbotOverlayEnabled()");
  });
});
