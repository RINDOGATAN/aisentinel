// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { EMPTY_APPLICABILITY_ANSWERS, evaluateApplicability, type ApplicabilityAnswers } from "./applicability";
import { frameworksRuledOut } from "./framework-scope";

const answers = (patch: Partial<ApplicabilityAnswers> = {}): ApplicabilityAnswers => ({
  ...EMPTY_APPLICABILITY_ANSWERS,
  ...patch,
});

describe("frameworksRuledOut", () => {
  it("rules nothing out while nothing is declared or answered", () => {
    expect(frameworksRuledOut([], answers())).toEqual([]);
  });

  it("keeps the EU AI Act with the EU or the EEA declared, and rules it out for places outside Europe", () => {
    expect(frameworksRuledOut(["EU"], answers())).toEqual([]);
    expect(frameworksRuledOut(["EEA"], answers())).toEqual([]);
    expect(frameworksRuledOut(["US_TX", "UK"], answers())).toEqual(["EU_AI_ACT"]);
  });

  it("rules the EU AI Act out when every role is answered no", () => {
    const none = answers({ buildsForOthers: "NO", usesAi: "NO", generalPurposeModel: "NO" });
    expect(frameworksRuledOut(["EU"], none)).toEqual(["EU_AI_ACT"]);
    // One role still unsure: nothing is ruled out.
    expect(frameworksRuledOut(["EU"], { ...none, usesAi: "UNSURE" })).toEqual([]);
  });

  it("rules ISO/IEC 42001 out on a no to certification only", () => {
    expect(frameworksRuledOut([], answers({ wantsCertification: "NO" }))).toEqual(["ISO_42001"]);
    expect(frameworksRuledOut([], answers({ wantsCertification: "UNSURE" }))).toEqual([]);
    expect(frameworksRuledOut([], answers({ wantsCertification: "YES" }))).toEqual([]);
  });

  it("never rules NIST AI RMF out", () => {
    const everythingNo = answers(
      Object.fromEntries(Object.keys(EMPTY_APPLICABILITY_ANSWERS).map((q) => [q, "NO"])) as ApplicabilityAnswers,
    );
    expect(frameworksRuledOut(["US_CA"], everythingNo)).not.toContain("NIST_AI_RMF");
  });

  it("agrees with the applicability check: a framework ruled out is never listed there", () => {
    const cases: [string[], ApplicabilityAnswers][] = [
      [["US_TX"], answers({ usesAi: "YES", wantsCertification: "NO" })],
      [["EU"], answers({ buildsForOthers: "NO", usesAi: "NO", generalPurposeModel: "NO" })],
      [["EU", "US_CO"], answers({ usesAi: "YES", decidesAboutPeople: "YES", wantsCertification: "NO" })],
    ];
    for (const [places, given] of cases) {
      const listed = new Set(evaluateApplicability(places as never, given).map((i) => i.frameworkCode));
      for (const code of frameworksRuledOut(places, given)) expect(listed.has(code)).toBe(false);
    }
  });
});
