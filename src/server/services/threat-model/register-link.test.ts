// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  evidenceTitle,
  planRegisterLink,
  type MappingRow,
  type RequirementRow,
  type ScenarioForLink,
} from "./register-link";
import { SCENARIO_LIBRARY } from "@/config/threat-model";

const NOW = new Date("2026-09-12T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/** The refund-cap entry cites Art. 14, Art. 9, MANAGE 2 and ISO 8.3. */
const REFUND = SCENARIO_LIBRARY.find((s) => s.id === "refund-cap")!;

const requirements: RequirementRow[] = [
  { id: "req-art14", code: "Art. 14", frameworkCode: "EU_AI_ACT" },
  { id: "req-art9", code: "Art. 9", frameworkCode: "EU_AI_ACT" },
  { id: "req-manage2", code: "MANAGE 2", frameworkCode: "NIST_AI_RMF" },
  { id: "req-iso83", code: "8.3", frameworkCode: "ISO_42001" },
];

const mappings = (overrides: Partial<MappingRow> = {}): MappingRow[] =>
  requirements.map((r, i) => ({
    id: `map-${i}`,
    requirementId: r.id,
    status: "NOT_ASSESSED",
    evidenceTitles: [],
    ...overrides,
  }));

function scenario(tests: ScenarioForLink["controls"][number]["tests"]): ScenarioForLink {
  return {
    id: "sc-1",
    libraryId: "refund-cap",
    title: REFUND.title.en,
    status: "OPEN",
    controls: [
      {
        id: "ctl-1",
        layer: "CONSTRAIN",
        description: "Cap autonomous refunds and route above the cap for approval.",
        tests,
      },
    ],
  };
}

describe("only a tested control becomes evidence", () => {
  it("writes nothing when the control has never been tested", () => {
    const plan = planRegisterLink("Support agent", [scenario([])], requirements, mappings(), NOW);
    expect(plan.evidence).toEqual([]);
    expect(plan.untested).toEqual([
      { scenarioId: "sc-1", title: REFUND.title.en, reason: "no-test" },
    ]);
  });

  it("writes nothing when the last test failed", () => {
    const plan = planRegisterLink(
      "Support agent",
      [scenario([{ result: "FAIL", method: "tried the cap", testedAt: daysAgo(2) }])],
      requirements,
      mappings(),
      NOW,
    );
    expect(plan.evidence).toEqual([]);
    expect(plan.untested[0].reason).toBe("not-passing");
  });

  it("writes nothing when a passing test has gone stale", () => {
    const plan = planRegisterLink(
      "Support agent",
      [scenario([{ result: "PASS", method: "tried the cap", testedAt: daysAgo(400) }])],
      requirements,
      mappings(),
      NOW,
    );
    expect(plan.evidence).toEqual([]);
    expect(plan.untested[0].reason).toBe("not-passing");
  });

  it("writes one evidence item per cited requirement when the test passed recently", () => {
    const plan = planRegisterLink(
      "Support agent",
      [scenario([{ result: "PASS", method: "tried three ways to beat the cap", testedAt: daysAgo(3) }])],
      requirements,
      mappings(),
      NOW,
    );
    expect(plan.evidence).toHaveLength(REFUND.satisfies.length);
    expect(plan.evidence.map((e) => e.requirementCode).sort()).toEqual(
      ["8.3", "Art. 14", "Art. 9", "MANAGE 2"].sort(),
    );
  });

  it("quotes the test method and date in the evidence, so the register can be read alone", () => {
    const plan = planRegisterLink(
      "Support agent",
      [scenario([{ result: "PASS", method: "tried three ways to beat the cap", testedAt: daysAgo(3) }])],
      requirements,
      mappings(),
      NOW,
    );
    expect(plan.evidence[0].description).toContain("tried three ways to beat the cap");
    expect(plan.evidence[0].description).toContain("2026-09-09");
    expect(plan.evidence[0].description).toContain("Result: PASS");
  });
});

describe("it never writes the same thing twice", () => {
  const passing = scenario([
    { result: "PASS", method: "tried the cap", testedAt: daysAgo(1) },
  ]);

  it("skips a requirement that already holds this evidence", () => {
    const title = evidenceTitle("Support agent", passing.controls[0].description);
    const plan = planRegisterLink(
      "Support agent",
      [passing],
      requirements,
      mappings({ evidenceTitles: [title] }),
      NOW,
    );
    expect(plan.evidence).toEqual([]);
    expect(plan.counts.alreadyThere).toBe(REFUND.satisfies.length);
  });
});

describe("status lifting", () => {
  const passing = scenario([{ result: "PASS", method: "tried the cap", testedAt: daysAgo(1) }]);

  it("lifts a requirement nobody has assessed", () => {
    const plan = planRegisterLink("Support agent", [passing], requirements, mappings(), NOW);
    expect(plan.evidence.every((e) => e.liftStatus)).toBe(true);
    expect(plan.counts.lifted).toBe(REFUND.satisfies.length);
  });

  it("does not touch a requirement a person already marked compliant", () => {
    const plan = planRegisterLink(
      "Support agent",
      [passing],
      requirements,
      mappings({ status: "COMPLIANT" }),
      NOW,
    );
    expect(plan.evidence.every((e) => e.liftStatus)).toBe(false);
    expect(plan.counts.lifted).toBe(0);
  });
});

describe("what cannot be mapped", () => {
  it("reports a citation with no mapping for this system rather than failing", () => {
    const plan = planRegisterLink(
      "Support agent",
      [scenario([{ result: "PASS", method: "tried the cap", testedAt: daysAgo(1) }])],
      requirements,
      [mappings()[0]],
      NOW,
    );
    expect(plan.evidence).toHaveLength(1);
    expect(plan.unmapped.length).toBe(REFUND.satisfies.length - 1);
  });

  it("ignores a scenario somebody wrote by hand, which cites nothing", () => {
    const custom: ScenarioForLink = {
      id: "sc-2",
      libraryId: null,
      title: "Something we thought of ourselves",
      status: "OPEN",
      controls: [
        {
          id: "ctl-2",
          layer: "PREVENT",
          description: "A control of our own",
          tests: [{ result: "PASS", method: "tested it", testedAt: daysAgo(1) }],
        },
      ],
    };
    const plan = planRegisterLink("Support agent", [custom], requirements, mappings(), NOW);
    expect(plan.evidence).toEqual([]);
    expect(plan.untested).toEqual([]);
  });
});

describe("every library citation points at something real", () => {
  it("uses framework codes the product actually seeds", () => {
    const known = new Set([
      "EU_AI_ACT",
      "EU_GDPR",
      "CA_CCPA_ADMT",
      "CO_SB_26_189",
      "TX_TRAIGA",
      "WA_AI_RULES",
      "NIST_AI_RMF",
      "ISO_42001",
    ]);
    for (const entry of SCENARIO_LIBRARY) {
      for (const c of entry.satisfies) {
        expect(known.has(c.framework)).toBe(true);
        expect(c.code.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives every library scenario at least one citation", () => {
    for (const entry of SCENARIO_LIBRARY) {
      expect(entry.satisfies.length).toBeGreaterThan(0);
    }
  });
});
