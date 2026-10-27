// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import {
  CHOOSABLE_FRAMEWORKS,
  EMPTY_APPLICABILITY_ANSWERS,
  evaluateApplicability,
  legacyFrameworkChoice,
  likelyLegalNotChosen,
  readApplicabilitySettings,
  type ApplicabilityAnswers,
} from "./applicability";
import { euAiActRuleOutReason, frameworksRuledOut } from "./framework-scope";

const answers = (patch: Partial<ApplicabilityAnswers> = {}): ApplicabilityAnswers => ({
  ...EMPTY_APPLICABILITY_ANSWERS,
  ...patch,
});
const ALL = [...CHOOSABLE_FRAMEWORKS];

describe("frameworksRuledOut", () => {
  it("rules out every framework not chosen, and nothing else while nothing is declared or answered", () => {
    expect(frameworksRuledOut([], answers(), ALL)).toEqual([]);
    expect(frameworksRuledOut([], answers(), [])).toEqual(ALL);
    expect(frameworksRuledOut([], answers(), ["NIST_AI_RMF"])).toEqual(ALL.filter((c) => c !== "NIST_AI_RMF"));
  });

  it("keeps a chosen EU AI Act with the EU or the EEA declared, and rules it out for places outside Europe", () => {
    expect(frameworksRuledOut(["EU"], answers(), ["EU_AI_ACT"])).not.toContain("EU_AI_ACT");
    expect(frameworksRuledOut(["EEA"], answers(), ["EU_AI_ACT"])).not.toContain("EU_AI_ACT");
    expect(frameworksRuledOut(["US_TX", "UK"], answers(), ["EU_AI_ACT"])).toContain("EU_AI_ACT");
    expect(euAiActRuleOutReason(["US_TX", "UK"], answers())).toBe("noEuropeanPlace");
  });

  it("rules a chosen EU AI Act out when every role question asked is answered no", () => {
    const none = answers({ buildsForOthers: "NO", usesAi: "NO", generalPurposeModel: "NO" });
    expect(frameworksRuledOut(["EU"], none, ["EU_AI_ACT"])).toContain("EU_AI_ACT");
    expect(euAiActRuleOutReason(["EU"], none)).toBe("noRole");
    // One role still unsure: the chosen Act stays.
    expect(frameworksRuledOut(["EU"], { ...none, usesAi: "UNSURE" }, ["EU_AI_ACT"])).not.toContain("EU_AI_ACT");
  });

  it("treats the standards as choices: a chosen ISO/IEC 42001 stays whatever the certification answer", () => {
    expect(frameworksRuledOut([], answers({ wantsCertification: "NO" }), ["ISO_42001"])).not.toContain("ISO_42001");
    expect(frameworksRuledOut([], answers({ wantsCertification: "YES" }), ["NIST_AI_RMF"])).toContain("ISO_42001");
  });

  it("agrees with the applicability check: a framework out of scope is never listed there", () => {
    const cases: [string[], ApplicabilityAnswers, string[]][] = [
      [["US_TX"], answers({ usesAi: "YES", wantsCertification: "NO" }), ALL],
      [["EU"], answers({ buildsForOthers: "NO", usesAi: "NO", generalPurposeModel: "NO" }), ALL],
      [["EU", "US_CO"], answers({ usesAi: "YES", decidesAboutPeople: "YES" }), ["NIST_AI_RMF"]],
      [["EU", "US_CA", "US_TX", "US_WA"], answers({ usesAi: "YES", decidesAboutPeople: "YES", usesAgents: "YES" }), []],
      [[], answers({ usesAgents: "YES", wantsCertification: "YES" }), ["EU_AI_ACT", "ISO_42001"]],
    ];
    for (const [places, given, chosen] of cases) {
      const listed = new Set(evaluateApplicability(places as never, given, chosen).map((i) => i.frameworkCode));
      for (const code of frameworksRuledOut(places, given, chosen)) expect(listed.has(code), code).toBe(false);
    }
  });
});

describe("the framework choice", () => {
  it("reads a stored choice, and an empty one as empty", () => {
    const stored = readApplicabilitySettings({ applicability: { frameworks: ["ISO_42001", "bogus", "EU_AI_ACT"] } }, ["EU"]);
    expect(stored.frameworks).toEqual(["EU_AI_ACT", "ISO_42001"]);
    expect(readApplicabilitySettings({ applicability: { frameworks: [] } }, ["EU"]).frameworks).toEqual([]);
  });

  it("without a stored choice, keeps what was in scope before the question existed", () => {
    const read = readApplicabilitySettings({ applicability: { answers: { wantsCertification: "NO" } } }, ["EU", "US_CO"]);
    expect(read.storedFrameworks).toBeNull();
    expect(read.frameworks).toEqual(["EU_AI_ACT", "CO_SB_26_189", "NIST_AI_RMF", "AIUC_1"]);
    // The same scope as before: nothing new is ruled out.
    const before = legacyFrameworkChoice(["US_TX"], answers());
    expect(before).toEqual(["TX_TRAIGA", "NIST_AI_RMF", "ISO_42001", "AIUC_1"]);
  });

  it("names a legal framework the places point to and that is not chosen, without choosing it", () => {
    expect(likelyLegalNotChosen(["NIST_AI_RMF"], ["EU", "US_CO", "UK"], answers())).toEqual(["EU_AI_ACT", "CO_SB_26_189"]);
    expect(likelyLegalNotChosen(["EU_AI_ACT", "CO_SB_26_189"], ["EU", "US_CO"], answers())).toEqual([]);
  });
});
