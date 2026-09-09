// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Tests for turning answered questions into compliance evidence. Pure.
 *
 * The properties worth protecting are the restraints: never overwrite a human
 * verdict, never claim compliance, never duplicate on a second run.
 */

import { describe, it, expect } from "vitest";
import { planRegisterUpdate, evidenceTitle, type RequirementRow, type MappingRow } from "./assessment-to-register";

const sections = [
  {
    questions: [
      {
        id: "q1",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 22" },
          { framework: "EU_AI_ACT", code: "Art. 14(1)" },
        ],
      },
      { id: "q2", satisfies: [{ framework: "EU_GDPR", code: "Art. 35" }] },
      { id: "q3", satisfies: [{ framework: "CA_CCPA_ADMT", code: "§ 7221" }] },
    ],
  },
];

const requirements: RequirementRow[] = [
  { id: "r-gdpr-22", code: "Art. 22", frameworkCode: "EU_GDPR" },
  { id: "r-gdpr-35", code: "Art. 35", frameworkCode: "EU_GDPR" },
  { id: "r-eu-14", code: "Art. 14(1)", frameworkCode: "EU_AI_ACT" },
  { id: "r-ca-7221", code: "§ 7221", frameworkCode: "CA_CCPA_ADMT" },
];

const TITLE = "Unified AI impact assessment";

const mappings = (over: Partial<Record<string, string>> = {}): MappingRow[] =>
  requirements.map((r) => ({ requirementId: r.id, status: over[r.id] ?? "NOT_ASSESSED" }));

describe("planRegisterUpdate", () => {
  it("plans nothing from an unanswered assessment", () => {
    const plan = planRegisterUpdate(sections, {}, requirements, mappings(), TITLE);
    expect(plan.evidence).toEqual([]);
    expect(plan.counts).toEqual({ evidenced: 0, lifted: 0, alreadyPresent: 0 });
  });

  it("turns one answer into evidence on every requirement it cites", () => {
    const plan = planRegisterUpdate(sections, { q1: "A person reviews every output." }, requirements, mappings(), TITLE);
    expect(plan.evidence.map((e) => e.requirementId).sort()).toEqual(["r-eu-14", "r-gdpr-22"]);
    expect(plan.evidence[0].description).toBe("A person reviews every output.");
    expect(plan.counts.evidenced).toBe(2);
    expect(plan.counts.lifted).toBe(2);
  });

  it("does not treat whitespace as an answer", () => {
    expect(planRegisterUpdate(sections, { q1: "   " }, requirements, mappings(), TITLE).evidence).toEqual([]);
  });

  it("never lifts a status a person already set, in either direction", () => {
    const plan = planRegisterUpdate(
      sections,
      { q1: "answered", q2: "answered", q3: "answered" },
      requirements,
      mappings({ "r-gdpr-22": "NON_COMPLIANT", "r-gdpr-35": "COMPLIANT", "r-ca-7221": "NOT_APPLICABLE" }),
      TITLE,
    );
    // Evidence still attaches everywhere: the answer is worth recording.
    expect(plan.counts.evidenced).toBe(4);
    // Only the untouched requirement is lifted.
    expect(plan.evidence.filter((e) => e.liftStatus).map((e) => e.requirementId)).toEqual(["r-eu-14"]);
  });

  it("is idempotent: a second run adds nothing", () => {
    const first = planRegisterUpdate(sections, { q1: "answered" }, requirements, mappings(), TITLE);
    const withEvidence: MappingRow[] = mappings().map((m) => ({
      ...m,
      evidenceTitles: first.evidence.filter((e) => e.requirementId === m.requirementId).map((e) => e.title),
    }));
    const second = planRegisterUpdate(sections, { q1: "answered" }, requirements, withEvidence, TITLE);
    expect(second.evidence).toEqual([]);
    expect(second.counts.alreadyPresent).toBe(2);
  });

  it("re-running after editing an answer still adds nothing, because the title is the identity", () => {
    // The evidence row is the link, not a snapshot. Updating the text is a
    // separate concern; duplicating the row would be the real harm.
    const first = planRegisterUpdate(sections, { q1: "first answer" }, requirements, mappings(), TITLE);
    const withEvidence: MappingRow[] = mappings().map((m) => ({
      ...m,
      evidenceTitles: first.evidence.filter((e) => e.requirementId === m.requirementId).map((e) => e.title),
    }));
    expect(planRegisterUpdate(sections, { q1: "revised answer" }, requirements, withEvidence, TITLE).evidence).toEqual([]);
  });

  it("reports a requirement that exists but does not reach this system", () => {
    const partial = mappings().filter((m) => m.requirementId !== "r-ca-7221");
    const plan = planRegisterUpdate(sections, { q3: "answered" }, requirements, partial, TITLE);
    expect(plan.evidence).toEqual([]);
    expect(plan.unmapped).toEqual([{ questionId: "q3", framework: "CA_CCPA_ADMT", code: "§ 7221" }]);
  });

  it("reports a citation that matches no seeded requirement, rather than silently dropping it", () => {
    const plan = planRegisterUpdate(
      [{ questions: [{ id: "qx", satisfies: [{ framework: "EU_GDPR", code: "Art. 999" }] }] }],
      { qx: "answered" },
      requirements,
      mappings(),
      TITLE,
    );
    expect(plan.unknown).toEqual([{ questionId: "qx", framework: "EU_GDPR", code: "Art. 999" }]);
    expect(plan.evidence).toEqual([]);
  });

  it("does not confuse the same code in two different frameworks", () => {
    const reqs: RequirementRow[] = [
      { id: "a", code: "Art. 5", frameworkCode: "EU_GDPR" },
      { id: "b", code: "Art. 5", frameworkCode: "EU_AI_ACT" },
    ];
    const plan = planRegisterUpdate(
      [{ questions: [{ id: "q", satisfies: [{ framework: "EU_AI_ACT", code: "Art. 5" }] }] }],
      { q: "answered" },
      reqs,
      [{ requirementId: "a", status: "NOT_ASSESSED" }, { requirementId: "b", status: "NOT_ASSESSED" }],
      TITLE,
    );
    expect(plan.evidence.map((e) => e.requirementId)).toEqual(["b"]);
  });

  it("ignores questions from a template that carries no metadata", () => {
    const plan = planRegisterUpdate(
      [{ questions: [{ id: "fria1_1" }] }],
      { fria1_1: "answered" },
      requirements,
      mappings(),
      TITLE,
    );
    expect(plan.evidence).toEqual([]);
  });
});

describe("evidenceTitle", () => {
  it("is stable and identifies the answer it came from", () => {
    expect(evidenceTitle("My assessment", "dec_logic")).toBe("My assessment · dec_logic");
  });
});
