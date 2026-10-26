// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One home per system: the classification form and the compliance matrix live
 * on the system's page; the risk-level and evidence steps are lists that link
 * there. The matrix shows only the frameworks with a requirement for the system.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { frameworksWithRequirements, unsetRequirementIds } from "./compliance-matrix";

const read = (p: string) => readFileSync(p, "utf8");

describe("frameworksWithRequirements", () => {
  it("keeps the frameworks mapped to the system, in their order", () => {
    const all = [{ id: "eu" }, { id: "nist" }, { id: "co" }, { id: "iso" }];
    expect(frameworksWithRequirements(all, [{ frameworkId: "iso" }, { frameworkId: "eu" }], [])).toEqual([
      { id: "eu" },
      { id: "iso" },
    ]);
    expect(frameworksWithRequirements(all, [], [])).toEqual([]);
  });

  it("adds the frameworks in scope for the system and leaves out a place not declared", () => {
    const all = [{ id: "eu" }, { id: "nist" }, { id: "co" }, { id: "iso" }];
    const counts = [
      { frameworkId: "eu", count: 83 },
      { frameworkId: "nist", count: 23 },
      { frameworkId: "co", count: 0 },
      { frameworkId: "iso", count: 33 },
    ];
    expect(frameworksWithRequirements(all, [], counts).map((f) => f.id)).toEqual(["eu", "nist", "iso"]);
  });
});

describe("unsetRequirementIds (the bulk action's 'all without a status')", () => {
  it("lists parents and children with no mapping or a NOT_ASSESSED one", () => {
    const matrix = [
      { id: "a", mapping: null, children: [{ id: "a1", mapping: { status: "COMPLIANT" } }, { id: "a2", mapping: null }] },
      { id: "b", mapping: { status: "NOT_ASSESSED" } },
      { id: "c", mapping: { status: "NOT_APPLICABLE" }, children: [] },
    ];
    expect(unsetRequirementIds(matrix)).toEqual(["a", "a2", "b"]);
    expect(unsetRequirementIds([])).toEqual([]);
  });

  it("is offered to the approver roles only, through the bulk endpoint", () => {
    const src = read("src/components/governance/compliance-matrix.tsx");
    expect(src).toContain("trpc.compliance.bulkSetStatus.useMutation");
    expect(src).toContain("canDecide && matrix.length > 0");
  });
});

describe("the step pages link into the system's page", () => {
  it("risk level opens the system's form", () => {
    const src = read("src/app/(dashboard)/governance/risk-classification/page.tsx");
    expect(src).toContain("?tab=risk&classify=1");
    expect(src).not.toContain("riskClassification.classify.useMutation");
  });

  it("evidence opens the system's matrix", () => {
    const src = read("src/app/(dashboard)/governance/compliance/page.tsx");
    expect(src).toContain("?tab=evidence");
    expect(src).not.toContain("ComplianceMatrix");
  });

  it("the system's page holds both", () => {
    const src = read("src/app/(dashboard)/governance/ai-registry/[id]/page.tsx");
    expect(src).toContain("<RiskClassificationForm");
    expect(src).toContain("<ComplianceMatrix");
    expect(src).not.toContain("/governance/risk-classification?system=");
    expect(src).not.toContain("/governance/compliance?systemId=");
  });
});
