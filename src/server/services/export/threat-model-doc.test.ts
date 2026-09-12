// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { renderThreatModelDoc, type ThreatModelDocInput } from "./threat-model-doc";

const NOW = new Date("2026-09-12T10:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const base: ThreatModelDocInput = {
  name: "Customer support agent",
  systemSummary: "Reads customer records and can issue refunds.",
  systemName: "Support agent",
  capabilities: ["customer_records", "transact", "send_external"],
  reviewedAt: daysAgo(3),
  organizationName: "Test organisation",
  scenarios: [
    {
      title: "It pays out far more than anyone intended",
      description: "A persuasive message leads to a large refund.",
      category: "AUTHORITY",
      impact: "HIGH",
      likelihood: "MEDIUM",
      blastRadius: "SIGNIFICANT",
      priority: "ACT_NOW",
      status: "OPEN",
      decisionNote: null,
      owner: "Payments team",
      controls: [
        {
          layer: "CONSTRAIN",
          description: "Cap autonomous refunds and route above the cap for approval.",
          implemented: true,
          howToTest: "Try to get past the cap three ways.",
          tests: [
            {
              result: "PASS",
              method: "Asked directly, asked in pieces, planted the request in a document.",
              notes: "All three refused.",
              evidenceRef: "run-4412",
              testedAt: daysAgo(5),
            },
          ],
        },
        {
          layer: "DETECT",
          description: "Alert on refund totals per hour.",
          implemented: false,
          howToTest: "Trigger a burst in staging and time the alert.",
          tests: [],
        },
      ],
    },
  ],
};

describe("the threat model document", () => {
  it("leads with what has not been tested", () => {
    const doc = renderThreatModelDoc(base, "en", NOW);
    const headline = doc.slice(0, doc.indexOf("## What it can see"));
    expect(headline).toContain("1 controls have never been tested");
  });

  it("counts a control with a recent passing test as proven", () => {
    const doc = renderThreatModelDoc(base, "en", NOW);
    expect(doc).toContain("2 controls, of which 1 have a passing test");
  });

  it("says plainly that a control with no test is a claim", () => {
    const doc = renderThreatModelDoc(base, "en", NOW);
    expect(doc).toContain("A control with no test is a claim, not a control.");
  });

  it("records the test method and the evidence reference", () => {
    const doc = renderThreatModelDoc(base, "en", NOW);
    expect(doc).toContain("planted the request in a document");
    expect(doc).toContain("run-4412");
  });

  it("groups the capabilities under the five map headings", () => {
    const doc = renderThreatModelDoc(base, "en", NOW);
    expect(doc).toContain("**What it can see**: Customer records");
    expect(doc).toContain("**What it can do**");
  });

  it("renders in Spanish without falling back to English", () => {
    const doc = renderThreatModelDoc(base, "es", NOW);
    expect(doc).toContain("Modelo de amenazas");
    expect(doc).toContain("Qué puede salir mal");
    expect(doc).not.toContain("What could go wrong");
  });

  it("reports a clean bill when everything passes", () => {
    const allTested: ThreatModelDocInput = {
      ...base,
      scenarios: [
        {
          ...base.scenarios[0],
          controls: [base.scenarios[0].controls[0]],
        },
      ],
    };
    expect(renderThreatModelDoc(allTested, "en", NOW)).toContain(
      "Every control has a passing test that is still current.",
    );
  });

  it("treats a stale pass as untested in the headline", () => {
    const stale: ThreatModelDocInput = {
      ...base,
      scenarios: [
        {
          ...base.scenarios[0],
          controls: [
            {
              ...base.scenarios[0].controls[0],
              tests: [
                { ...base.scenarios[0].controls[0].tests[0], testedAt: daysAgo(400) },
              ],
            },
          ],
        },
      ],
    };
    expect(renderThreatModelDoc(stale, "en", NOW)).toContain("1 controls have never been tested");
  });
});
