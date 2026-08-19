// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { buildProgramGraph, type ProgramSystemRow } from "./graph-input";

const NOW = new Date("2026-08-18T12:00:00Z");

const baseRow: ProgramSystemRow = {
  id: "sys-1",
  name: "ChatGPT",
  technique: "GENERATIVE_AI",
  status: "DRAFT",
  processesPersonalData: true,
  vendorId: "ven-1",
  metadata: { source: "quickstart", profile: "lawfirm", toolId: "chatgpt" },
  riskLevel: "LIMITED",
  gates: [{ gateType: "PRE_DEPLOYMENT", status: "PENDING", nextReviewDate: null }],
  policyLinkCount: 0,
  hasTransparencyProfile: false,
};

function build(overrides: Partial<Parameters<typeof buildProgramGraph>[0]> = {}) {
  return buildProgramGraph({
    systems: [baseRow],
    vendors: [{ id: "ven-1", name: "OpenAI", riskLevel: "MEDIUM", systemCount: 1 }],
    complianceBySystem: new Map([["sys-1", { assessed: 20, total: 80 }]]),
    locale: "en",
    now: NOW,
    labels: { technique: (t) => `T:${t}` },
    ...overrides,
  });
}

describe("buildProgramGraph", () => {
  it("resolves law-firm quickstart systems to toolkit category lanes with localized labels", () => {
    const graph = build();
    expect(graph.groups).toHaveLength(1);
    expect(graph.groups[0].id).toBe("GENERAL_ASSISTANT");
    expect(graph.groups[0].label).toBe("General AI Assistants");
    const es = build({ locale: "es" });
    expect(es.groups[0].label).toBe("Asistentes de IA generalistas");
  });

  it("falls back to technique grouping for non-quickstart systems", () => {
    const graph = build({
      systems: [{ ...baseRow, id: "sys-2", metadata: null, technique: "NLP" }],
      complianceBySystem: new Map(),
    });
    expect(graph.groups[0].id).toBe("technique:NLP");
    expect(graph.groups[0].label).toBe("T:NLP");
    expect(graph.systems[0].groupId).toBe("technique:NLP");
  });

  it("unknown toolId degrades to technique grouping", () => {
    const graph = build({
      systems: [
        { ...baseRow, metadata: { profile: "lawfirm", toolId: "not-a-tool" } },
      ],
    });
    expect(graph.systems[0].groupId).toBe("technique:GENERATIVE_AI");
  });

  it("excludes RETIRED systems and unreferenced vendors", () => {
    const graph = build({
      systems: [
        baseRow,
        { ...baseRow, id: "sys-old", status: "RETIRED", vendorId: "ven-2" },
      ],
      vendors: [
        { id: "ven-1", name: "OpenAI", riskLevel: "MEDIUM", systemCount: 1 },
        { id: "ven-2", name: "Gone Corp", riskLevel: null, systemCount: 1 },
      ],
    });
    expect(graph.systems).toHaveLength(1);
    expect(graph.vendors.map((v) => v.id)).toEqual(["ven-1"]);
  });

  it("computes gate overdue from nextReviewDate against the injected clock", () => {
    const graph = build({
      systems: [
        {
          ...baseRow,
          gates: [
            {
              gateType: "PRE_DEPLOYMENT",
              status: "PENDING",
              nextReviewDate: new Date("2026-08-01T00:00:00Z"),
            },
            {
              gateType: "PERIODIC_REVIEW",
              status: "PASSED",
              nextReviewDate: new Date("2026-08-01T00:00:00Z"),
            },
          ],
        },
      ],
    });
    expect(graph.systems[0].gates[0].overdue).toBe(true);
    expect(graph.systems[0].gates[1].overdue).toBe(false); // PASSED never overdue
  });

  it("marks GENERATIVE_AI as transparency-relevant, others not", () => {
    const graph = build({
      systems: [
        baseRow,
        { ...baseRow, id: "sys-3", metadata: null, technique: "SPEECH_RECOGNITION" },
      ],
    });
    expect(graph.systems.find((s) => s.id === "sys-1")!.transparencyRelevant).toBe(true);
    expect(graph.systems.find((s) => s.id === "sys-3")!.transparencyRelevant).toBe(false);
  });

  it("computes compliance percentage and null when no mappings", () => {
    const graph = build();
    expect(graph.systems[0].complianceAssessedPct).toBe(25);
    const none = build({ complianceBySystem: new Map() });
    expect(none.systems[0].complianceAssessedPct).toBeNull();
  });

  it("passes rollout stages through the injected lookup", () => {
    const graph = build({ stageForCategory: () => "ADOPT" });
    expect(graph.groups[0].rolloutStage).toBe("ADOPT");
  });

  it("orders lawfirm category groups by config order, before technique groups", () => {
    const graph = build({
      systems: [
        { ...baseRow, id: "s-ediscovery", metadata: { profile: "lawfirm", toolId: "relativity-air" } },
        { ...baseRow, id: "s-assistant", metadata: { profile: "lawfirm", toolId: "claude" } },
        { ...baseRow, id: "s-plain", metadata: null, technique: "NLP" },
      ],
    });
    expect(graph.groups.map((g) => g.id)).toEqual([
      "GENERAL_ASSISTANT",
      "EDISCOVERY",
      "technique:NLP",
    ]);
  });
});
