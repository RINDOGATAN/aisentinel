// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** The program pack's plan (src/lib/document-pack.ts): what goes in, what stays out and why. */

import { describe, expect, it } from "vitest";
import type { EvaluatedDocument } from "@/config/document-register";
import { markDraft, packCounts, planPack } from "./document-pack";

const docs: EvaluatedDocument[] = [
  { id: "programReport", status: { state: "draft", gaps: [{ key: "toConfirm", count: 4 }] } },
  { id: "systemRegister", status: { state: "ready" } },
  { id: "policies", status: { state: "draft", gaps: [{ key: "notApproved", count: 6 }] } },
  { id: "obligationsCalendar", status: { state: "needsInput", input: "jurisdiction" } },
  { id: "riskClassification", status: { state: "ready" } },
  { id: "complianceSummary", status: { state: "ready" } },
  { id: "auditTrail", status: { state: "ready" } },
  { id: "prohibitedScreen", status: { state: "notYet" } },
];

describe("planPack", () => {
  it("holds the ready documents only, unless the drafts are asked for", () => {
    const ready = planPack(docs, { includeDrafts: false });
    expect(ready.include.map((d) => d.entry.id)).toEqual(["systemRegister"]);
    const all = planPack(docs, { includeDrafts: true });
    expect(all.include.map((d) => d.entry.id)).toEqual(["programReport", "systemRegister", "policies"]);
    expect(all.include[0]).toMatchObject({ state: "draft", gaps: [{ key: "toConfirm", count: 4 }] });
  });

  it("says why each other document stays out", () => {
    const reasons = Object.fromEntries(
      planPack(docs, { includeDrafts: false }).leftOut.map((l) => [l.entry.id, l.reason]),
    );
    expect(reasons).toEqual({
      programReport: "draftsNotRequested",
      policies: "draftsNotRequested",
      obligationsCalendar: "needsInput",
      riskClassification: "screenOnly",
      complianceSummary: "perRecord",
      auditTrail: "separateExport",
      prohibitedScreen: "notYet",
    });
  });

  it("counts for the dashboard's button", () => {
    expect(packCounts(docs)).toEqual({ ready: 1, drafts: 2 });
  });
});

describe("markDraft", () => {
  it("puts the draft mark after the number", () => {
    expect(markDraft("01-ai-governance-program.pdf", "DRAFT")).toBe("01-DRAFT-ai-governance-program.pdf");
    expect(markDraft("impact-assessment.md", "BORRADOR")).toBe("BORRADOR-impact-assessment.md");
  });
});
