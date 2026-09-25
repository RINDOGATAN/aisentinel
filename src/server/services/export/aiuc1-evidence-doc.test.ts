// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { agentReadiness, acceptanceEvidenceRow, testEvidenceRow } from "@/config/aiuc1-evidence";
import { renderAiuc1EvidenceDoc } from "./aiuc1-evidence-doc";

const NOW = new Date("2026-09-25T12:00:00Z");

function readiness() {
  const fail = {
    id: "t1",
    addedBy: "u1",
    addedAt: new Date("2026-09-02T00:00:00Z"),
    ...testEvidenceRow({
      code: "B001",
      method: "Third-party red team ran the jailbreak suite\n# not a heading",
      result: "FAIL",
      observed: "3 of 40 got through",
      evidenceRef: "https://ci.example/run/7",
      performedBy: "An outside testing lab",
      testedAt: new Date("2026-09-02T00:00:00Z"),
    }),
  };
  const partial = {
    id: "t2",
    addedBy: "u1",
    addedAt: new Date("2026-09-03T00:00:00Z"),
    ...testEvidenceRow({
      code: "A001",
      method: "Compared the published data notice against the retention settings.",
      result: "PARTIAL",
      observed: null,
      evidenceRef: null,
      performedBy: null,
      testedAt: new Date("2026-09-03T00:00:00Z"),
    }),
  };
  const accept = {
    id: "a1",
    addedBy: "u2",
    addedAt: NOW,
    ...acceptanceEvidenceRow({ code: "A001", testId: "t2", reason: "Notice update scheduled." }),
  };
  return agentReadiness(
    new Map([
      ["B001", { mappingStatus: "NOT_ASSESSED", mappingNotes: null, evidence: [fail] }],
      ["A001", { mappingStatus: "NOT_ASSESSED", mappingNotes: null, evidence: [partial, accept] }],
      ["A008", { mappingStatus: "NOT_APPLICABLE", mappingNotes: "The agent writes no code.", evidence: [] }],
    ]),
    NOW,
  );
}

const input = () => ({
  agentName: "Support agent",
  organizationName: "Example Org",
  readiness: readiness(),
  people: { u1: "Tester One", u2: "Officer Two" },
});

describe("the AIUC-1 evidence file", () => {
  it("leads with readiness and open items, then walks the six domains", () => {
    const md = renderAiuc1EvidenceDoc(input(), "en");
    expect(md).toContain("# AIUC-1 evidence file: Support agent");
    expect(md).toContain("**Not yet ready for the audit.**");
    const open = md.indexOf("## Open items");
    const domains = md.indexOf("## The six domains");
    expect(open).toBeGreaterThan(0);
    expect(domains).toBeGreaterThan(open);
    expect(md.slice(open, domains)).toContain("- B001 Third-party testing of adversarial robustness: Fail.");
    // Accepted partials and not-applicable requirements are not open items.
    expect(md.slice(open, domains)).not.toContain("A001");
    expect(md.slice(open, domains)).not.toContain("A008");
    for (const code of ["A", "B", "C", "D", "E", "F"]) expect(md).toMatch(new RegExp(`^### ${code}\\. `, "m"));
  });

  it("records the test in full: method, result, observation, evidence, who and when", () => {
    const md = renderAiuc1EvidenceDoc(input(), "en");
    expect(md).toContain("- Latest test: Fail");
    expect(md).toContain("  - Tested on: 2026-09-02");
    expect(md).toContain("  - What was observed: 3 of 40 got through");
    expect(md).toContain("  - Where the evidence lives: https://ci.example/run/7");
    expect(md).toContain("  - Performed by: An outside testing lab");
    expect(md).toContain("  - Recorded by: Tester One, 2026-09-02");
    expect(md).toContain("- Accepted by: Officer Two, 2026-09-25. Reason: Notice update scheduled.");
    expect(md).toContain("- Why it does not apply: The agent writes no code.");
    // Free text never breaks out into a heading of its own.
    expect(md).not.toMatch(/^# not a heading/m);
  });

  it("is in Castilian Spanish when asked, and says it is not a certificate", () => {
    const md = renderAiuc1EvidenceDoc(input(), "es");
    expect(md).toContain("# Expediente de pruebas AIUC-1: Support agent");
    expect(md).toContain("## Pendientes");
    expect(md).toContain("### B. Ciberseguridad");
    expect(md).toContain("No es un certificado");
    expect(renderAiuc1EvidenceDoc(input(), "en")).toContain("It is not a certificate");
  });

  it("is deterministic, and uses no long dash", () => {
    expect(renderAiuc1EvidenceDoc(input(), "en")).toBe(renderAiuc1EvidenceDoc(input(), "en"));
    for (const locale of ["en", "es"] as const) {
      expect(renderAiuc1EvidenceDoc(input(), locale)).not.toMatch(/[–—]/);
    }
  });
});
