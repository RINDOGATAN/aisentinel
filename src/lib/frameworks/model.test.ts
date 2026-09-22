// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultAnswers,
  describeWhen,
  frameworksData,
  isUnderReview,
  runSelector,
  underReviewCount,
  validateFrameworks,
  type Answers,
  type FrameworksData,
} from "./model";
import { docsPageForModule, docsPagesForModules } from "./doc-links";

const rawText = readFileSync(join(process.cwd(), "src/content/frameworks/frameworks.json"), "utf8");

describe("frameworks data", () => {
  it("loads and passes the alpha's checks", () => {
    expect(validateFrameworks(frameworksData, rawText)).toEqual([]);
    expect(frameworksData.frameworks).toHaveLength(13);
    expect(frameworksData.rings).toHaveLength(14);
    expect(underReviewCount()).toBe(23);
  });

  it("gives every framework all fourteen cells, each with a depth, a summary and a source", () => {
    const ringIds = frameworksData.rings.map((r) => r.id);
    for (const f of frameworksData.frameworks) {
      expect(Object.keys(f.cells).sort(), f.id).toEqual([...ringIds].sort());
      for (const id of ringIds) {
        const c = f.cells[id];
        expect([0, 1, 2, 3], `${f.id}/${id}`).toContain(c.depth);
        expect(c.summary.length, `${f.id}/${id}`).toBeGreaterThan(0);
        expect(c.source, `${f.id}/${id}`).toBeDefined();
      }
    }
  });

  it("carries AIUC-1 as the certification standard for AI agents, every cell sourced to the standard", () => {
    const aiuc = frameworksData.frameworks.find((f) => f.id === "aiuc-1")!;
    expect(aiuc.short).toBe("AIUC-1");
    expect(aiuc.nature).toBe(frameworksData.frameworks.find((f) => f.id === "iso-42001")!.nature);
    expect(aiuc.summary).toMatch(/certification standard/);
    expect(aiuc.summary).toMatch(/first framework on this wheel written for agents/);
    expect(aiuc.summary).toMatch(/only one with mandatory technical evals/);
    for (const c of Object.values(aiuc.cells)) {
      expect(c.source?.url).toMatch(/^https:\/\/standard\.aiuc-1\.com\//);
      expect(isUnderReview(c)).toBe(false);
    }
    expect(frameworksData.asOf).toBe("2026-09-22");
  });

  it("rejects what the alpha rejects", () => {
    const broken = structuredClone(frameworksData) as FrameworksData;
    broken.asOf = "16/09/2026";
    broken.frameworks[0].cells.nature.depth = 4 as never;
    delete (broken.frameworks[1].cells as Record<string, unknown>).scope;
    broken.frameworks[2].cells.risk.source = { ref: "x", url: "http://insecure" };
    broken.frameworks[3].cells.data.modules = ["nope"];
    broken.picker.rules[0].framework = "missing";
    broken.picker.stack.riskMethod.at(-1)!.when = { size: ["small"] };
    const text = JSON.stringify(broken).replace("A learning aid", "A learning aid — compliant");
    const errors = validateFrameworks(broken, text).join("\n");
    for (const expected of [
      "long dash",
      'banned wording: "compliant"',
      "asOf is not an ISO date",
      "non-ISO date form",
      "eu-ai-act/nature: depth must be 0-3",
      "nist-ai-rmf: missing ring scope",
      "no https url",
      "unknown module nope",
      "rule 0: unknown framework missing",
      "stack riskMethod: last rule must be unconditional",
    ]) {
      expect(errors).toContain(expected);
    }
  });

  it("marks a cell under review only when its source is unverified", () => {
    const cells = frameworksData.frameworks.flatMap((f) => Object.values(f.cells));
    expect(cells.filter(isUnderReview).every((c) => c.source?.status === "to verify")).toBe(true);
    expect(isUnderReview({ depth: 1, summary: "x" })).toBe(true);
  });

  it("links every cell module either to a real docs page or to nothing", () => {
    const modules = new Set(
      frameworksData.frameworks.flatMap((f) => Object.values(f.cells).flatMap((c) => c.modules ?? [])),
    );
    for (const m of modules) {
      const href = docsPageForModule(m);
      if (href) expect(existsSync(join(process.cwd(), "src/app", href, "page.tsx"))).toBe(true);
    }
    expect(docsPagesForModules(["regimes", "obligations", "sensitive"])).toEqual([
      { module: "regimes", href: "/docs/cross-border" },
    ]);
  });
});

// Recorded by running the alpha's own page script (index.html on the
// docs/frameworks-wheel branch, as of 2026-09-16) with these answers.
const ALPHA_SCENARIOS: Record<
  string,
  { answers: Answers; ranked: string[]; binding: string[]; managementSystem: string; riskMethod: string }
> = {
  euTexasHiring: {
    answers: { jurisdictions: ["eu", "tx"], role: ["deployer"], sector: ["employment"], risk: ["high"], assurance: ["yes"], size: ["medium"] },
    ranked: ["eu-ai-act", "texas", "iso-42001", "nist-ai-rmf", "iso-23894", "coe-convention", "oecd"],
    binding: ["eu-ai-act", "texas"],
    managementSystem: "iso-42001",
    riskMethod: "nist-ai-rmf",
  },
  usProviderSmall: {
    answers: { jurisdictions: ["ca", "nyc"], role: ["provider"], sector: ["employment"], risk: ["unknown"], assurance: ["no"], size: ["small"] },
    ranked: ["california-admt", "nist-ai-rmf", "nyc-ll144", "iso-23894", "oecd"],
    binding: ["california-admt"],
    managementSystem: "nist-ai-rmf",
    riskMethod: "nist-ai-rmf",
  },
  publicSectorAsia: {
    answers: { jurisdictions: ["sg", "uk", "other"], role: ["both"], sector: ["public"], risk: ["minimal"], assurance: ["no"], size: ["large"] },
    ranked: ["singapore", "uk", "coe-convention", "iso-42001", "nist-ai-rmf", "iso-23894", "oecd"],
    binding: [],
    managementSystem: "iso-42001",
    riskMethod: "singapore",
  },
};

describe("frameworks selector", () => {
  for (const [name, s] of Object.entries(ALPHA_SCENARIOS)) {
    it(`ranks ${name} exactly as the alpha did`, () => {
      const r = runSelector(s.answers);
      expect(r.ready).toBe(true);
      expect(r.ranked.map((x) => x.id)).toEqual(s.ranked);
      expect(r.binding).toEqual(s.binding);
      expect(r.stack.managementSystem?.pick).toBe(s.managementSystem);
      expect(r.stack.riskMethod?.pick).toBe(s.riskMethod);
    });
  }

  it("asks for a jurisdiction before ranking", () => {
    const r = runSelector(defaultAnswers());
    expect(r.ready).toBe(false);
    expect(r.ranked).toEqual([]);
  });

  it("starts from the alpha's defaults", () => {
    expect(defaultAnswers()).toEqual({
      jurisdictions: [],
      role: ["deployer"],
      sector: ["general"],
      risk: ["unknown"],
      assurance: ["no"],
      size: ["medium"],
      agents: ["no"],
    });
  });

  it("puts AIUC-1 in the stack as the certification for agents only when the organisation has agents", () => {
    const base = ALPHA_SCENARIOS.euTexasHiring.answers;
    const without = runSelector(base);
    expect(without.stack.agentCertification).toBeNull();
    expect(without.ranked.map((x) => x.id)).not.toContain("aiuc-1");

    const withAgents = runSelector({ ...base, agents: ["yes"] });
    expect(withAgents.stack.agentCertification?.pick).toBe("aiuc-1");
    const aiuc = withAgents.ranked.find((x) => x.id === "aiuc-1")!;
    expect(aiuc.binding).toBe(false);
    expect(aiuc.score).toBe(60); // agents (40) + certificate needed (20)
    // The other two slots do not move.
    expect(withAgents.stack.managementSystem?.pick).toBe("iso-42001");
    expect(withAgents.stack.riskMethod?.pick).toBe("nist-ai-rmf");
  });

  it("does not require the agent slot to end with an unconditional rule", () => {
    const data = structuredClone(frameworksData) as FrameworksData;
    expect(validateFrameworks(data, rawText)).toEqual([]);
    data.picker.stack.agentCertification = [{ when: { agents: ["yes"] }, pick: "missing", reason: "x" }];
    expect(validateFrameworks(data, rawText).join("\n")).toContain("stack agentCertification 0: unknown framework missing");
  });

  it("shows the reasoning behind each result", () => {
    const r = runSelector(ALPHA_SCENARIOS.euTexasHiring.answers);
    const eu = r.ranked.find((x) => x.id === "eu-ai-act")!;
    expect(eu.reasons).toHaveLength(3);
    expect(describeWhen({ jurisdictions: ["eu", "uk"] })).toEqual([{ input: "Jurisdictions", values: ["EU", "UK"] }]);
    expect(describeWhen({})).toEqual([]);
  });
});
