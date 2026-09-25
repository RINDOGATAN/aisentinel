// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import {
  APPLICABILITY_QUESTIONS,
  EMPTY_APPLICABILITY_ANSWERS,
  evaluateApplicability,
  hasAnyApplicabilityAnswer,
  readApplicabilityAnswers,
  type ApplicabilityAnswers,
} from "./applicability";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

const answers = (over: Partial<ApplicabilityAnswers>): ApplicabilityAnswers => ({
  ...EMPTY_APPLICABILITY_ANSWERS,
  ...over,
});
const ALL_NO = answers(
  Object.fromEntries(APPLICABILITY_QUESTIONS.map((q) => [q, "NO"])) as Partial<ApplicabilityAnswers>,
);
const ids = (items: ReturnType<typeof evaluateApplicability>) => items.map((i) => i.id);
const byId = (items: ReturnType<typeof evaluateApplicability>, id: string) =>
  items.find((i) => i.id === id);

describe("evaluateApplicability", () => {
  it("lists nothing that depends on a place while no jurisdiction is declared", () => {
    const items = evaluateApplicability([], answers({ usesAi: "YES", decidesAboutPeople: "YES" }));
    expect(items.every((i) => i.kind === "standard")).toBe(true);
    expect(ids(items)).not.toContain("euAiAct");
  });

  it("never says 'applies' from answers that are all 'not sure yet'", () => {
    const items = evaluateApplicability(["EU", "US_CO", "US_TX", "US_CA", "US_WA"], EMPTY_APPLICABILITY_ANSWERS);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.state, item.id).toBe("check");
  });

  it("lists nothing when every answer is no, outside Europe", () => {
    expect(evaluateApplicability(["US_TX", "US_CO"], ALL_NO)).toEqual([]);
  });

  it("an EU deployer: the EU AI Act applies, as a deployer", () => {
    const items = evaluateApplicability(["EU"], answers({ ...ALL_NO, usesAi: "YES" }));
    expect(byId(items, "euAiAct")).toMatchObject({ state: "applies", reasons: ["operatesEu", "deployer"] });
    // GDPR follows personal data, which was not asked: a check.
    expect(byId(items, "gdpr")?.state).toBe("check");
    expect(ids(items)).toEqual(["euAiAct", "gdpr"]);
  });

  it("an EU provider of a general-purpose model with a chatbot that decides about people", () => {
    const items = evaluateApplicability(
      ["EU"],
      answers({
        buildsForOthers: "YES",
        generalPurposeModel: "YES",
        meetsPeople: "YES",
        decidesAboutPeople: "YES",
        usesAi: "NO",
        usesAgents: "NO",
        wantsCertification: "NO",
      }),
    );
    expect(ids(items)).toEqual(["euAiAct", "euGeneralPurpose", "euTransparency", "euHighRisk", "gdpr"]);
    for (const item of items) expect(item.state, item.id).toBe("applies");
    expect(byId(items, "euAiAct")?.reasons).toEqual(["operatesEu", "provider", "generalPurpose"]);
  });

  it("the EEA alone is a check for the EU AI Act, never 'applies'", () => {
    const items = evaluateApplicability(["EEA"], answers({ ...ALL_NO, usesAi: "YES", meetsPeople: "YES" }));
    expect(byId(items, "euAiAct")?.state).toBe("check");
    expect(byId(items, "euTransparency")?.state).toBe("check");
    expect(byId(items, "gdpr")?.state).toBe("applies");
  });

  it("the UK brings GDPR (UK GDPR) but not the EU AI Act", () => {
    const items = evaluateApplicability(["UK"], answers({ ...ALL_NO, usesAi: "YES" }));
    expect(ids(items)).toEqual(["gdpr"]);
  });

  it("deciding about people switches on Colorado, and California only as a check", () => {
    const items = evaluateApplicability(
      ["US_CO", "US_CA"],
      answers({ ...ALL_NO, usesAi: "YES", decidesAboutPeople: "YES" }),
    );
    expect(byId(items, "colorado")?.state).toBe("applies");
    expect(byId(items, "californiaAdmt")).toMatchObject({ state: "check" });
    expect(byId(items, "californiaAdmt")?.reasons).toContain("thresholds");
  });

  it("no decisions about people: neither Colorado nor California", () => {
    const items = evaluateApplicability(["US_CO", "US_CA"], answers({ ...ALL_NO, usesAi: "YES" }));
    expect(ids(items)).toEqual([]);
  });

  it("Texas follows any role; Washington is always a check on the screening", () => {
    const items = evaluateApplicability(["US_TX", "US_WA"], answers({ ...ALL_NO, buildsForOthers: "YES" }));
    expect(byId(items, "texas")).toMatchObject({ state: "applies", reasons: ["operatesTexas", "provider"] });
    expect(byId(items, "washington")?.state).toBe("check");
  });

  it("agents switch on AIUC-1 and a certifiable system ISO/IEC 42001, anywhere", () => {
    const items = evaluateApplicability([], answers({ usesAgents: "YES", wantsCertification: "YES" }));
    expect(items).toEqual([
      expect.objectContaining({ id: "aiuc1", frameworkCode: "AIUC_1", state: "applies", kind: "standard" }),
      expect.objectContaining({ id: "iso42001", frameworkCode: "ISO_42001", state: "applies", kind: "standard" }),
    ]);
  });

  it("a no removes a line; not sure keeps it as a check", () => {
    expect(ids(evaluateApplicability([], answers({ usesAgents: "NO" })))).not.toContain("aiuc1");
    expect(byId(evaluateApplicability([], answers({ usesAgents: "UNSURE" })), "aiuc1")?.state).toBe("check");
  });
});

describe("readApplicabilityAnswers", () => {
  it("reads anything unrecognised as not sure yet", () => {
    const read = readApplicabilityAnswers({ usesAi: "YES", meetsPeople: "maybe", extra: "YES" });
    expect(read.usesAi).toBe("YES");
    expect(read.meetsPeople).toBe("UNSURE");
    expect(Object.keys(read).sort()).toEqual([...APPLICABILITY_QUESTIONS].sort());
    expect(readApplicabilityAnswers(null)).toEqual(EMPTY_APPLICABILITY_ANSWERS);
    expect(hasAnyApplicabilityAnswer(read)).toBe(true);
    expect(hasAnyApplicabilityAnswer(EMPTY_APPLICABILITY_ANSWERS)).toBe(false);
  });
});

describe("applicability wording", () => {
  it("has EN and ES text for every question, item and reason", () => {
    const items = evaluateApplicability(
      ["EU", "UK", "US_CA", "US_CO", "US_TX", "US_WA"],
      answers({ usesAi: "YES", buildsForOthers: "YES", generalPurposeModel: "YES", meetsPeople: "YES", decidesAboutPeople: "YES", usesAgents: "YES", wantsCertification: "YES" }),
    );
    const unsure = evaluateApplicability(["EEA", "US_CA", "US_CO", "US_TX", "US_WA"], EMPTY_APPLICABILITY_ANSWERS);
    for (const messages of [en, es] as unknown as { applicability: Record<string, Record<string, unknown>> }[]) {
      const ns = messages.applicability;
      for (const q of APPLICABILITY_QUESTIONS) expect(ns.questions[q], q).toBeTruthy();
      for (const item of [...items, ...unsure]) {
        expect(ns.items[item.id], item.id).toBeTruthy();
        for (const r of item.reasons) expect(ns.reasons[r], r).toBeTruthy();
      }
    }
  });
});
