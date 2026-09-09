// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Tests for reading the unified template's metadata at the answering screen.
 * Pure. The load-bearing property is tolerance: the four seeded templates
 * carry none of this and must be unaffected.
 */

import { describe, it, expect } from "vitest";
import {
  readQuestionMeta,
  assessmentCoverage,
  citationText,
} from "./assessment-metadata";
import { selectUnifiedQuestions } from "@/config/unified-assessment";

describe("readQuestionMeta", () => {
  it("reads a unified question", () => {
    expect(
      readQuestionMeta({
        id: "q1",
        reason: "gdpr:adm",
        satisfies: [{ framework: "EU_GDPR", code: "Art. 22" }],
        feeds: ["assessment", "protocol"],
      }),
    ).toEqual({
      reason: "gdpr:adm",
      satisfies: [{ framework: "EU_GDPR", code: "Art. 22" }],
      feeds: ["assessment", "protocol"],
    });
  });

  it("returns empty metadata for a template that never had any", () => {
    expect(readQuestionMeta({ id: "fria1_1" })).toEqual({
      reason: null,
      satisfies: [],
      feeds: [],
    });
  });

  it("ignores malformed entries rather than throwing", () => {
    const meta = readQuestionMeta({
      id: "q",
      reason: "   ",
      satisfies: [
        { framework: "EU_GDPR", code: "Art. 22" },
        { framework: "EU_GDPR" },
        { code: "Art. 9" },
        "nonsense",
        null,
      ],
      feeds: ["notice", "", 42],
    });
    expect(meta.reason).toBeNull();
    expect(meta.satisfies).toEqual([{ framework: "EU_GDPR", code: "Art. 22" }]);
    expect(meta.feeds).toEqual(["notice"]);
  });

  it("survives satisfies being the wrong type entirely", () => {
    expect(readQuestionMeta({ id: "q", satisfies: "Art. 22", feeds: 3 }).satisfies).toEqual([]);
  });
});

describe("assessmentCoverage", () => {
  const sections = [
    {
      questions: [
        {
          id: "a",
          reason: "core",
          satisfies: [
            { framework: "EU_GDPR", code: "Art. 22" },
            { framework: "CA_CCPA_ADMT", code: "§ 7221" },
          ],
        },
        {
          id: "b",
          reason: "gdpr:adm",
          // Cites the same GDPR obligation as question a.
          satisfies: [{ framework: "EU_GDPR", code: "Art. 22" }],
        },
        {
          id: "c",
          reason: "core",
          satisfies: [{ framework: "EU_AI_ACT", code: "Art. 27(1)" }],
        },
      ],
    },
  ];

  it("counts distinct obligations, not citations", () => {
    // Four citations, three obligations: Art. 22 is cited twice.
    const coverage = assessmentCoverage(sections, {});
    expect(coverage.totalObligations).toBe(3);
    expect(coverage.evidencedObligations).toBe(0);
  });

  it("treats an obligation as evidenced when any question citing it is answered", () => {
    // Answering only question b evidences Art. 22, which question a also cites.
    const coverage = assessmentCoverage(sections, { b: "Yes, contract necessity." });
    expect(coverage.evidencedObligations).toBe(1);
    const gdpr = coverage.byFramework.find((f) => f.framework === "EU_GDPR");
    expect(gdpr).toEqual({ framework: "EU_GDPR", total: 1, evidenced: 1 });
  });

  it("does not count whitespace as an answer", () => {
    expect(assessmentCoverage(sections, { a: "   " }).evidencedObligations).toBe(0);
  });

  it("groups by framework, largest first", () => {
    const coverage = assessmentCoverage(
      [
        {
          questions: [
            { id: "x", satisfies: [{ framework: "EU_GDPR", code: "1" }, { framework: "EU_GDPR", code: "2" }] },
            { id: "y", satisfies: [{ framework: "TX_TRAIGA", code: "§ 552.052" }] },
          ],
        },
      ],
      {},
    );
    expect(coverage.byFramework.map((f) => f.framework)).toEqual(["EU_GDPR", "TX_TRAIGA"]);
  });

  it("lists the reasons with the common core first", () => {
    expect(assessmentCoverage(sections, {}).reasons[0]).toBe("core");
    expect(assessmentCoverage(sections, {}).reasons).toContain("gdpr:adm");
  });

  it("reports no metadata for a template that predates it, so the UI shows nothing", () => {
    const legacy = [{ questions: [{ id: "fria1_1" }, { id: "fria1_2" }] }];
    const coverage = assessmentCoverage(legacy, { fria1_1: "answered" });
    expect(coverage.hasMetadata).toBe(false);
    expect(coverage.totalObligations).toBe(0);
    expect(coverage.byFramework).toEqual([]);
  });

  it("handles an empty template", () => {
    expect(assessmentCoverage([], {}).hasMetadata).toBe(false);
    expect(assessmentCoverage([{ questions: undefined }], {}).totalObligations).toBe(0);
  });
});

describe("against the real unified template", () => {
  // The shape the unified router writes: reason and satisfies on every
  // question. If that ever drifts, the answering screen goes quiet, so it is
  // worth asserting against the real thing rather than a fixture alone.
  const sections = selectUnifiedQuestions(["gdpr:adm", "gdpr:dpia", "admt:art11", "agentic"]).map(
    (section) => ({
      questions: section.questions.map((q) => ({
        id: q.id,
        reason: q.reason,
        satisfies: q.satisfies,
        feeds: q.feeds ?? ["assessment"],
      })),
    }),
  );

  it("finds metadata on every question", () => {
    for (const section of sections) {
      for (const question of section.questions) {
        expect(readQuestionMeta(question).satisfies.length, question.id).toBeGreaterThan(0);
        expect(readQuestionMeta(question).reason, question.id).toBeTruthy();
      }
    }
  });

  it("evidences a meaningful number of obligations across several frameworks", () => {
    const coverage = assessmentCoverage(sections, {});
    expect(coverage.hasMetadata).toBe(true);
    expect(coverage.totalObligations).toBeGreaterThan(20);
    expect(coverage.byFramework.length).toBeGreaterThanOrEqual(4);
    expect(coverage.reasons).toContain("core");
  });

  it("answering the whole assessment evidences every obligation it claims", () => {
    const all = Object.fromEntries(
      sections.flatMap((s) => s.questions.map((q) => [q.id, "answered"])),
    );
    const coverage = assessmentCoverage(sections, all);
    expect(coverage.evidencedObligations).toBe(coverage.totalObligations);
  });
});

describe("citationText", () => {
  it("reads as a citation rather than a database code", () => {
    expect(citationText({ framework: "EU_GDPR", code: "Art. 22(3)" })).toBe("EU GDPR Art. 22(3)");
    expect(citationText({ framework: "CA_CCPA_ADMT", code: "§ 7221" })).toBe("CA CCPA ADMT § 7221");
  });
});
