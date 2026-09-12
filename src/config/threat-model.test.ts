// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  CAPABILITIES,
  CAPABILITY_IDS,
  CATEGORY_QUESTIONS,
  CONTROL_LAYERS,
  SCENARIO_CATEGORIES,
  SCENARIO_LIBRARY,
  SESSION_QUESTIONS,
  controlState,
  priorityFor,
  suggestScenarios,
} from "./threat-model";

describe("the capability map", () => {
  it("gives every capability a unique id and both languages", () => {
    expect(new Set(CAPABILITY_IDS).size).toBe(CAPABILITY_IDS.length);
    for (const c of CAPABILITIES) {
      expect(c.label.en).toBeTruthy();
      expect(c.label.es).toBeTruthy();
      expect(c.note.es.length).toBeGreaterThan(20);
    }
  });

  it("covers all five groups", () => {
    const groups = new Set(CAPABILITIES.map((c) => c.group));
    expect([...groups].sort()).toEqual(["acts", "calls", "remembers", "retrieves", "sees"]);
  });
});

describe("the scenario library", () => {
  it("gives every scenario a unique id, a category, controls and a test", () => {
    const ids = SCENARIO_LIBRARY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SCENARIO_LIBRARY) {
      expect(SCENARIO_CATEGORIES).toContain(s.category);
      expect(s.controls.length).toBeGreaterThan(0);
      expect(s.test.en).toBeTruthy();
      expect(s.test.es).toBeTruthy();
      expect(s.story.es.length).toBeGreaterThan(20);
      for (const control of s.controls) {
        expect(CONTROL_LAYERS).toContain(control.layer);
        expect(control.text.es).toBeTruthy();
      }
    }
  });

  it("only triggers on capabilities that exist", () => {
    for (const s of SCENARIO_LIBRARY) {
      for (const cap of [...s.anyOf, ...(s.allOf ?? [])]) {
        expect(CAPABILITY_IDS).toContain(cap);
      }
    }
  });

  it("asks all seven questions", () => {
    expect(Object.keys(CATEGORY_QUESTIONS).sort()).toEqual([...SCENARIO_CATEGORIES].sort());
  });

  it("gives the guided session five map questions", () => {
    expect(SESSION_QUESTIONS).toHaveLength(5);
  });
});

describe("suggesting scenarios", () => {
  it("proposes nothing for a system that does nothing", () => {
    expect(suggestScenarios([])).toEqual([]);
  });

  it("proposes the retrieval and injection scenarios for a document assistant", () => {
    const ids = suggestScenarios(["internal_docs", "user_input"]).map((s) => s.id);
    expect(ids).toContain("retrieval-authorisation");
    expect(ids).toContain("indirect-injection");
  });

  it("proposes the refund cap only where money can move", () => {
    expect(suggestScenarios(["user_input"]).map((s) => s.id)).not.toContain("refund-cap");
    expect(suggestScenarios(["transact"]).map((s) => s.id)).toContain("refund-cap");
  });

  it("proposes the fairness scenario where a decision about a person is influenced", () => {
    expect(suggestScenarios(["decide_about_person"]).map((s) => s.id)).toContain("biased-outcome");
  });

  it("honours allOf: dangerous advice needs sensitive data, not just user input", () => {
    expect(suggestScenarios(["user_input"]).map((s) => s.id)).not.toContain("dangerous-advice");
    expect(suggestScenarios(["user_input", "special_category"]).map((s) => s.id)).toContain(
      "dangerous-advice",
    );
  });

  it("returns a stable order for the same capabilities", () => {
    const a = suggestScenarios(["internal_docs", "transact", "send_external"]).map((s) => s.id);
    const b = suggestScenarios(["send_external", "transact", "internal_docs"]).map((s) => s.id);
    expect(a).toEqual(b);
  });

  it("keeps the proposed list short enough to argue with", () => {
    // Every capability at once is the worst case; a team must still be able to
    // read the list in a single sitting.
    expect(suggestScenarios(CAPABILITY_IDS).length).toBeLessThanOrEqual(20);
  });
});

describe("priority", () => {
  it("puts a severe blast radius at the top whatever the likelihood", () => {
    expect(priorityFor("LOW", "LOW", "SEVERE").priority).toBe("ACT_NOW");
  });

  it("puts high impact and high likelihood at the top", () => {
    expect(priorityFor("HIGH", "HIGH", "LIMITED").priority).toBe("ACT_NOW");
  });

  it("plans a medium case", () => {
    expect(priorityFor("MEDIUM", "MEDIUM", "LIMITED").priority).toBe("PLAN");
  });

  it("watches a low case", () => {
    expect(priorityFor("LOW", "LOW", "LIMITED").priority).toBe("WATCH");
  });

  it("explains itself in both languages", () => {
    const r = priorityFor("HIGH", "LOW", "SEVERE");
    expect(r.because.en).toBeTruthy();
    expect(r.because.es).toBeTruthy();
  });
});

describe("whether a control is proven", () => {
  const now = new Date("2026-09-12T00:00:00.000Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it("is untested when nothing has been tried", () => {
    expect(controlState(null, null, now)).toBe("untested");
  });

  it("is proven by a recent pass", () => {
    expect(controlState("PASS", daysAgo(10), now)).toBe("proven");
  });

  it("goes stale when the pass is old", () => {
    expect(controlState("PASS", daysAgo(200), now)).toBe("stale");
  });

  it("counts a partial result as failing, because a half-working control is not evidence", () => {
    expect(controlState("PARTIAL", daysAgo(1), now)).toBe("failing");
  });

  it("is failing after a failed test", () => {
    expect(controlState("FAIL", daysAgo(1), now)).toBe("failing");
  });
});
