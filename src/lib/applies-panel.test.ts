// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { appliesLines, lineDate } from "./applies-panel";
import { evaluateApplicability, EMPTY_APPLICABILITY_ANSWERS } from "@/config/applicability";

const row = (id: string, instrument: string, dateIso: string, daysRemaining: number, applicability = "applies") => ({
  id,
  instrument,
  dateIso,
  daysRemaining,
  applicability,
});

const ROWS = [
  row("eu-ai-act-prohibitions-literacy", "eu-ai-act", "2025-02-02", -600),
  row("eu-ai-act-gpai-governance", "eu-ai-act", "2025-08-02", -400),
  row("eu-ai-act-annex-iii-high-risk", "eu-ai-act", "2027-12-02", 400),
  row("ccpa-risk-assessment-duty-live", "ccpa-risk-assessments", "2026-01-01", -290),
  row("ccpa-admt-article-11-rights", "ccpa-admt", "2027-01-01", 74),
  row("tx-traiga-live", "tx-traiga", "2026-01-01", -290, "does-not-apply"),
];

describe("the next date of each law that applies", () => {
  it("takes the earliest date ahead among the entries for that law", () => {
    expect(lineDate("euAiAct", ROWS)).toEqual({ kind: "next", dateIso: "2027-12-02" });
    expect(lineDate("euHighRisk", ROWS)).toEqual({ kind: "next", dateIso: "2027-12-02" });
    expect(lineDate("californiaAdmt", ROWS)).toEqual({ kind: "next", dateIso: "2027-01-01" });
  });

  it("says 'in force' when every entry for it has passed", () => {
    expect(lineDate("euGeneralPurpose", ROWS)).toEqual({ kind: "inForce" });
  });

  it("ignores entries that do not reach the organisation, and laws with no dated entry", () => {
    expect(lineDate("texas", ROWS)).toEqual({ kind: "none" });
    expect(lineDate("gdpr", ROWS)).toEqual({ kind: "none" });
  });

  it("lists only what applies", () => {
    const items = evaluateApplicability(["US_CA"], { ...EMPTY_APPLICABILITY_ANSWERS, usesAi: "YES" });
    const lines = appliesLines(items, ROWS);
    expect(lines.every((l) => l.item.state === "applies")).toBe(true);
    expect(lines.map((l) => l.item.id)).not.toContain("euAiAct");
  });
});
