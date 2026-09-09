// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Tests for what a system's autonomy means for its governance. Pure.
 */

import { describe, it, expect } from "vitest";
import {
  assessAgent,
  autonomyIsAgentic,
  AGENT_AUTONOMY_VALUES,
  AUTONOMY_LABELS,
  AUTONOMY_HELP,
  AGENT_CONTROL_LABELS,
  EMPTY_AGENT_FACTS,
  type AgentProfileFacts,
} from "./agent-rules";

const facts = (over: Partial<AgentProfileFacts> = {}): AgentProfileFacts => ({
  ...EMPTY_AGENT_FACTS,
  ...over,
});

describe("content", () => {
  it("names and explains every autonomy level in both languages", () => {
    for (const value of AGENT_AUTONOMY_VALUES) {
      for (const locale of ["en", "es"] as const) {
        expect(AUTONOMY_LABELS[value][locale].trim(), `${value} ${locale}`).not.toBe("");
        expect(AUTONOMY_HELP[value][locale].trim(), `${value} help ${locale}`).not.toBe("");
      }
      expect(AUTONOMY_LABELS[value].es).not.toBe(AUTONOMY_LABELS[value].en);
    }
  });

  it("names every control in both languages", () => {
    for (const [id, label] of Object.entries(AGENT_CONTROL_LABELS)) {
      expect(label.en.trim(), id).not.toBe("");
      expect(label.es.trim(), id).not.toBe("");
      expect(label.es, id).not.toBe(label.en);
    }
  });
});

describe("autonomyIsAgentic", () => {
  it("is true only where the system acts for itself", () => {
    expect(autonomyIsAgentic("ACTS_AUTONOMOUSLY")).toBe(true);
    expect(autonomyIsAgentic("ACTS_WITH_APPROVAL")).toBe(true);
    // Proposing is not acting: a person still stands between it and the effect.
    expect(autonomyIsAgentic("SUGGESTS")).toBe(false);
    expect(autonomyIsAgentic("NONE")).toBe(false);
    expect(autonomyIsAgentic("NOT_ASSESSED")).toBe(false);
    expect(autonomyIsAgentic(null)).toBe(false);
    expect(autonomyIsAgentic(undefined)).toBe(false);
  });
});

describe("assessAgent", () => {
  it("asks nothing of a system nobody has classified, and says so", () => {
    const a = assessAgent(facts());
    expect(a.undetermined).toBe(true);
    expect(a.isAgentic).toBe(false);
    expect(a.missing).toEqual([]);
  });

  it("asks nothing of a system that only produces an output", () => {
    const a = assessAgent(facts({ autonomy: "NONE" }));
    expect(a.undetermined).toBe(false);
    expect(a.missing).toEqual([]);
  });

  it("asks a proposing system for a scope and a sponsor, and nothing more", () => {
    const a = assessAgent(facts({ autonomy: "SUGGESTS" }));
    expect(a.isAgentic).toBe(false);
    expect(a.missing).toEqual(["actionScope", "humanSponsor"]);
  });

  it("asks an approving agent for the operational controls too", () => {
    const a = assessAgent(facts({ autonomy: "ACTS_WITH_APPROVAL" }));
    expect(a.isAgentic).toBe(true);
    expect(a.missing).toEqual(["actionScope", "humanSponsor", "killSwitch", "traceability", "tools"]);
    // Only a fully autonomous agent is asked to have exercised the stop.
    expect(a.missing).not.toContain("killSwitchTested");
    expect(a.missing).not.toContain("reversalWindow");
  });

  it("asks a fully autonomous agent for everything, including a tested stop", () => {
    const a = assessAgent(facts({ autonomy: "ACTS_AUTONOMOUSLY" }));
    expect(a.missing).toContain("killSwitchTested");
    expect(a.missing).toContain("reversalWindow");
    expect(a.missing).toHaveLength(7);
  });

  it("credits what is recorded and keeps asking for the rest", () => {
    const a = assessAgent(
      facts({
        autonomy: "ACTS_AUTONOMOUSLY",
        actionScope: "May reply to a candidate and close a requisition.",
        humanSponsor: "Head of Talent",
        killSwitch: "The duty officer halts the queue within two minutes.",
        tools: ["email", "ats-api"],
      }),
    );
    expect(a.recorded).toEqual(["actionScope", "humanSponsor", "killSwitch", "tools"]);
    expect(a.missing).toEqual(["killSwitchTested", "reversalWindow", "traceability"]);
  });

  it("does not accept whitespace as a recorded control", () => {
    const a = assessAgent(facts({ autonomy: "SUGGESTS", actionScope: "   ", humanSponsor: "" }));
    expect(a.missing).toEqual(["actionScope", "humanSponsor"]);
  });

  it("counts an untested stop as missing even when the stop itself is described", () => {
    const described = assessAgent(
      facts({ autonomy: "ACTS_AUTONOMOUSLY", killSwitch: "Anyone on the rota can halt it." }),
    );
    expect(described.recorded).toContain("killSwitch");
    // A control that has never been exercised is a claim, not a control.
    expect(described.missing).toContain("killSwitchTested");

    const tested = assessAgent(
      facts({
        autonomy: "ACTS_AUTONOMOUSLY",
        killSwitch: "Anyone on the rota can halt it.",
        killSwitchTestedAt: new Date("2026-09-01"),
      }),
    );
    expect(tested.missing).not.toContain("killSwitchTested");
  });

  it("treats an empty tool list as unrecorded, not as 'no tools'", () => {
    // "It calls nothing" is an answer worth typing; an empty list is silence.
    expect(assessAgent(facts({ autonomy: "ACTS_WITH_APPROVAL" })).missing).toContain("tools");
    expect(
      assessAgent(facts({ autonomy: "ACTS_WITH_APPROVAL", tools: ["none"] })).missing,
    ).not.toContain("tools");
  });
});
