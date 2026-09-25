// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The AIUC-1 readiness rules: which systems are agents, how a test is stored
 * and read back, each requirement's state, and when an agent is ready for the
 * audit.
 */

import { describe, expect, it } from "vitest";
import {
  AIUC1_CODES,
  acceptanceEvidenceRow,
  agentReadiness,
  isAgentSystem,
  isAiuc1Record,
  parseAcceptance,
  parseTest,
  requirementState,
  retestDue,
  testEvidenceRow,
  type Aiuc1TestResult,
  type EvidenceRow,
  type RequirementInput,
} from "./aiuc1-evidence";
import { AIUC1_DOMAINS, allAiuc1Requirements } from "./aiuc1-requirements";

const NOW = new Date("2026-09-25T12:00:00Z");
let seq = 0;

function testRow(
  code: string,
  result: Aiuc1TestResult,
  testedAt: string,
  extra: Partial<{ method: string; addedAt: Date; id: string }> = {},
): EvidenceRow {
  const row = testEvidenceRow({
    code,
    method: extra.method ?? "Sent 50 prompt-injection attempts through the chat endpoint.",
    result,
    observed: null,
    evidenceRef: "run-42",
    performedBy: null,
    testedAt: new Date(testedAt),
  });
  seq += 1;
  return { id: extra.id ?? `ev${seq}`, addedBy: "u1", addedAt: extra.addedAt ?? new Date(testedAt), ...row };
}

function acceptRow(code: string, testId: string): EvidenceRow {
  seq += 1;
  return {
    id: `acc${seq}`,
    addedBy: "u2",
    addedAt: NOW,
    ...acceptanceEvidenceRow({ code, testId, reason: "Residual risk covered by the human review gate." }),
  };
}

const state = (input: Partial<RequirementInput> & { code?: string }) =>
  requirementState(
    { code: "B001", mappingStatus: null, mappingNotes: null, evidence: [], ...input },
    NOW,
  );

describe("which systems are agents", () => {
  it("counts the Agentic AI technique, or an agent profile that acts", () => {
    expect(isAgentSystem({ technique: "AGENTIC_AI" })).toBe(true);
    expect(isAgentSystem({ technique: "GENERATIVE_AI", autonomy: "ACTS_AUTONOMOUSLY" })).toBe(true);
    expect(isAgentSystem({ technique: "NLP", autonomy: "ACTS_WITH_APPROVAL" })).toBe(true);
  });

  it("does not count a system that only suggests, or whose autonomy nobody has answered", () => {
    expect(isAgentSystem({ technique: "GENERATIVE_AI", autonomy: "SUGGESTS" })).toBe(false);
    expect(isAgentSystem({ technique: "GENERATIVE_AI", autonomy: "NOT_ASSESSED" })).toBe(false);
    expect(isAgentSystem({ technique: "MACHINE_LEARNING", autonomy: null })).toBe(false);
  });
});

describe("the records", () => {
  it("stores a test as TEST_RESULT evidence and reads it back unchanged", () => {
    const row = testRow("A003", "PARTIAL", "2026-09-01T00:00:00Z");
    expect(row.type).toBe("TEST_RESULT");
    expect(row.title).toBe("AIUC-1 test A003: PARTIAL (2026-09-01)");
    const back = parseTest(row)!;
    expect(back).toMatchObject({ code: "A003", result: "PARTIAL", evidenceRef: "run-42", recordedBy: "u1" });
    expect(back.testedAt.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("puts a web link in the url field, and anything else only in the record", () => {
    const base = { code: "B001", method: "x".repeat(20), result: "PASS" as const, observed: null, performedBy: null, testedAt: NOW };
    expect(testEvidenceRow({ ...base, evidenceRef: "https://ci.example/run/1" }).url).toBe("https://ci.example/run/1");
    expect(testEvidenceRow({ ...base, evidenceRef: "ticket SEC-12" }).url).toBeNull();
    expect(testEvidenceRow({ ...base, evidenceRef: "  " }).url).toBeNull();
  });

  it("ignores rows it did not write: other evidence, bad JSON, unknown results", () => {
    const plain: EvidenceRow = { id: "x", type: "DOCUMENT", title: "Policy", url: null, description: "text", addedBy: "u", addedAt: NOW };
    expect(parseTest(plain)).toBeNull();
    expect(isAiuc1Record(plain)).toBe(false);
    const forged = { ...plain, type: "TEST_RESULT", title: "AIUC-1 test B001: PASS", description: "{not json" };
    expect(parseTest(forged)).toBeNull();
    const badResult = { ...forged, description: JSON.stringify({ kind: "aiuc1-test", code: "B001", method: "m", result: "GREAT", testedAt: NOW.toISOString() }) };
    expect(parseTest(badResult)).toBeNull();
    // A tested control linked from a threat model is a TEST_RESULT too, but not ours.
    const tested = { ...plain, type: "TEST_RESULT", title: "Tested control (Model): guard" };
    expect(isAiuc1Record(tested)).toBe(false);
  });

  it("recognises its own rows, so they can be refused deletion", () => {
    const t = testRow("B001", "FAIL", "2026-09-01T00:00:00Z");
    expect(isAiuc1Record(t)).toBe(true);
    expect(isAiuc1Record(acceptRow("B001", t.id))).toBe(true);
    expect(parseAcceptance(acceptRow("B001", t.id))?.testId).toBe(t.id);
  });

  it("offers exactly the requirements in force as codes", () => {
    expect(AIUC1_CODES).toEqual(allAiuc1Requirements().map((r) => r.code));
    expect(AIUC1_CODES).not.toContain("E007");
  });
});

describe("the state of one requirement", () => {
  it("is not tested with no test, and the domain comes from the code", () => {
    const v = state({ code: "C004" });
    expect(v.state).toBe("not-tested");
    expect(v.domain).toBe("C");
    expect(v.ready).toBe(false);
    expect(v.applicable).toBe(true);
  });

  it("follows the latest test by the date of the test, not the order of recording", () => {
    const older = testRow("B001", "PASS", "2026-08-01T00:00:00Z", { addedAt: new Date("2026-09-20T00:00:00Z") });
    const newer = testRow("B001", "FAIL", "2026-09-10T00:00:00Z", { addedAt: new Date("2026-09-10T00:00:00Z") });
    const v = state({ evidence: [newer, older] });
    expect(v.state).toBe("fail");
    expect(v.latest?.id).toBe(newer.id);
    expect(v.tests.map((t) => t.id)).toEqual([newer.id, older.id]);
    // A newer pass fixes it.
    const fixed = testRow("B001", "PASS", "2026-09-20T00:00:00Z");
    expect(state({ evidence: [older, newer, fixed] }).state).toBe("pass");
  });

  it("counts a pass for three months, then asks for a retest", () => {
    expect(retestDue(new Date("2026-06-26T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-09-26");
    expect(state({ evidence: [testRow("B001", "PASS", "2026-06-26T00:00:00Z")] }).state).toBe("pass");
    const stale = state({ evidence: [testRow("B001", "PASS", "2026-06-24T00:00:00Z")] });
    expect(stale.state).toBe("retest");
    expect(stale.ready).toBe(false);
  });

  it("counts a partial only once a person accepts that very test", () => {
    const partial = testRow("B001", "PARTIAL", "2026-09-01T00:00:00Z");
    expect(state({ evidence: [partial] })).toMatchObject({ state: "partial", ready: false, acceptance: null });
    const accepted = state({ evidence: [partial, acceptRow("B001", partial.id)] });
    expect(accepted).toMatchObject({ state: "partial", ready: true });
    expect(accepted.acceptance?.acceptedBy).toBe("u2");
    // A newer partial needs its own acceptance.
    const again = testRow("B001", "PARTIAL", "2026-09-15T00:00:00Z");
    expect(state({ evidence: [partial, acceptRow("B001", partial.id), again] }).ready).toBe(false);
  });

  it("takes 'not applicable' only with a reason", () => {
    const na = state({ mappingStatus: "NOT_APPLICABLE", mappingNotes: "The agent generates no code." });
    expect(na).toMatchObject({ state: "not-applicable", applicable: false, notApplicableReason: "The agent generates no code." });
    const bare = state({ mappingStatus: "NOT_APPLICABLE", mappingNotes: "  " });
    expect(bare).toMatchObject({ state: "not-tested", applicable: true, reasonMissing: true });
  });

  it("ignores the compliance status otherwise: a test result is what counts", () => {
    // Somebody set COMPLIANT by hand on the compliance page: no test, no readiness.
    expect(state({ mappingStatus: "COMPLIANT" })).toMatchObject({ state: "not-tested", ready: false });
  });

  it("shows a test filed under another code as plain evidence, never as this requirement's result", () => {
    const stray = testRow("A001", "PASS", "2026-09-01T00:00:00Z");
    const v = state({ code: "B001", evidence: [stray] });
    expect(v.state).toBe("not-tested");
    expect(v.otherEvidence).toHaveLength(1);
  });
});

describe("readiness of an agent", () => {
  const every = allAiuc1Requirements();

  function rowsFor(make: (code: string) => Omit<RequirementInput, "code"> | null) {
    const m = new Map<string, Omit<RequirementInput, "code">>();
    for (const r of every) {
      const row = make(r.code);
      if (row) m.set(r.code, row);
    }
    return m;
  }
  const passing = (code: string) => ({
    mappingStatus: "NOT_ASSESSED",
    mappingNotes: null,
    evidence: [testRow(code, "PASS", "2026-09-01T00:00:00Z")],
  });

  it("starts at nothing: every requirement applicable, none tested, not ready", () => {
    const r = agentReadiness(new Map(), NOW);
    expect(r.domains.map((d) => d.code)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(r.overall).toMatchObject({ total: every.length, applicable: every.length, tested: 0, ready: 0, readyForAudit: false });
    expect(r.started).toBe(false);
    // Supplemental requirements count until a person rules them out.
    const supplemental = every.filter((x) => x.application === "supplemental").length;
    expect(supplemental).toBeGreaterThan(0);
    expect(r.overall.applicable).toBe(every.length);
  });

  it("gives the per-domain line: tested, fail, and the total that applies", () => {
    const b = AIUC1_DOMAINS.find((d) => d.code === "B")!;
    const [first, second, third] = b.requirements.map((x) => x.code);
    const r = agentReadiness(
      new Map<string, Omit<RequirementInput, "code">>([
        [first, passing(first)],
        [second, { mappingStatus: null, mappingNotes: null, evidence: [testRow(second, "FAIL", "2026-09-02T00:00:00Z")] }],
        [third, { mappingStatus: "NOT_APPLICABLE", mappingNotes: "Not exposed to the public.", evidence: [] }],
      ]),
      NOW,
    );
    const domain = r.domains.find((d) => d.code === "B")!;
    expect(domain).toMatchObject({
      total: b.requirements.length,
      applicable: b.requirements.length - 1,
      notApplicable: 1,
      tested: 2,
      pass: 1,
      fail: 1,
      ready: 1,
      readyForAudit: false,
    });
    expect(r.started).toBe(true);
  });

  it("is ready when every applicable requirement has a current pass or an accepted partial", () => {
    const partialCode = every[0].code;
    const naCode = every[1].code;
    const rows = rowsFor((code) => {
      if (code === naCode) return { mappingStatus: "NOT_APPLICABLE", mappingNotes: "No code generation.", evidence: [] };
      if (code === partialCode) {
        const p = testRow(code, "PARTIAL", "2026-09-01T00:00:00Z", { id: "partial-1" });
        return { mappingStatus: "NOT_ASSESSED", mappingNotes: null, evidence: [p, acceptRow(code, "partial-1")] };
      }
      return passing(code);
    });
    const r = agentReadiness(rows, NOW);
    expect(r.overall.readyForAudit).toBe(true);
    expect(r.overall).toMatchObject({ applicable: every.length - 1, ready: every.length - 1, acceptedPartial: 1 });
  });

  it("is not ready with one fail, one unaccepted partial, one stale pass or one gap", () => {
    const base = (code: string) => passing(code);
    const target = every[5].code;
    const variants: Array<Omit<RequirementInput, "code"> | null> = [
      { mappingStatus: null, mappingNotes: null, evidence: [testRow(target, "FAIL", "2026-09-01T00:00:00Z")] },
      { mappingStatus: null, mappingNotes: null, evidence: [testRow(target, "PARTIAL", "2026-09-01T00:00:00Z")] },
      { mappingStatus: null, mappingNotes: null, evidence: [testRow(target, "PASS", "2026-05-01T00:00:00Z")] },
      null,
      { mappingStatus: "NOT_APPLICABLE", mappingNotes: null, evidence: [] },
    ];
    for (const v of variants) {
      const r = agentReadiness(rowsFor((code) => (code === target ? v : base(code))), NOW);
      expect(r.overall.readyForAudit).toBe(false);
      expect(r.overall.ready).toBe(every.length - 1);
    }
  });

  it("is never ready when nothing applies: ruling everything out proves nothing", () => {
    const r = agentReadiness(
      rowsFor(() => ({ mappingStatus: "NOT_APPLICABLE", mappingNotes: "Out of scope.", evidence: [] })),
      NOW,
    );
    expect(r.overall.applicable).toBe(0);
    expect(r.overall.readyForAudit).toBe(false);
  });
});
