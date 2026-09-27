// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_TEMPLATES_V2,
  serializeSections,
  type V2Question,
} from "./assessment-templates-v2";
import { QUESTION_HELP } from "@/config/help/question-help";

const STRUCTURED = ["single_choice", "multi_choice", "scale", "yes_no", "date", "text"];

function walk(questions: V2Question[]): V2Question[] {
  const out: V2Question[] = [];
  for (const q of questions) {
    out.push(q);
    if (q.followUp) out.push(...walk([q.followUp.question]));
  }
  return out;
}

const allQuestions = ASSESSMENT_TEMPLATES_V2.flatMap((t) =>
  t.sections.flatMap((s) => walk(s.questions)),
);

describe("v2 templates — structure", () => {
  it("supersede the five v1 system templates, one each", () => {
    expect(ASSESSMENT_TEMPLATES_V2).toHaveLength(5);
    expect(ASSESSMENT_TEMPLATES_V2.map((t) => t.supersedes).sort()).toEqual([
      "system-ai-risk-template",
      "system-bias-fairness-template",
      "system-conformity-template",
      "system-custom-template",
      "system-fria-template",
    ]);
    for (const t of ASSESSMENT_TEMPLATES_V2) {
      expect(t.version).toBe(2);
      expect(t.id).toBe(`${t.supersedes}-v2`);
    }
  });

  it("every question uses a known type", () => {
    for (const q of allQuestions) expect(STRUCTURED).toContain(q.type);
  });

  it("question ids are unique across each template (incl. follow-ups)", () => {
    for (const t of ASSESSMENT_TEMPLATES_V2) {
      const ids = t.sections.flatMap((s) => walk(s.questions)).map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("keeps the stable v1 concept ids (e.g. FRIA Art. 27 elements)", () => {
    const friaIds = new Set(
      ASSESSMENT_TEMPLATES_V2.find((t) => t.type === "FRIA")!
        .sections.flatMap((s) => s.questions.map((q) => q.id)),
    );
    for (const id of ["fria1_1", "fria2_2", "fria3_1", "fria4_1", "fria5_4"]) {
      expect(friaIds.has(id)).toBe(true);
    }
  });

  it("choice questions carry options with unique, non-empty values", () => {
    for (const q of allQuestions) {
      if (q.type === "single_choice" || q.type === "multi_choice") {
        expect(q.options && q.options.length).toBeGreaterThan(0);
        const values = q.options!.map((o) => o.value);
        expect(new Set(values).size).toBe(values.length);
        for (const v of values) expect(v.length).toBeGreaterThan(0);
      }
      if (q.type === "scale") expect(q.scale).toBeTruthy();
      if (q.followUp) expect(q.followUp.question.id.length).toBeGreaterThan(0);
    }
  });

  it("uses the law's own vocabulary where the directive names it", () => {
    const bias = ASSESSMENT_TEMPLATES_V2.find((t) => t.type === "BIAS_FAIRNESS")!;
    const biasQuestion = bias.sections
      .flatMap((s) => s.questions)
      .find((q) => q.id === "bf2_4")!;
    const values = biasQuestion.options!.map((o) => o.value);
    for (const kind of ["historical", "representation", "measurement", "aggregation", "evaluation"]) {
      expect(values).toContain(kind);
    }
  });
});

describe("v2 templates — bilingual", () => {
  const nonEmpty = (v: { en: string; es: string } | undefined) =>
    !!v && v.en.trim().length > 0 && v.es.trim().length > 0;

  it("every template name and description is EN + ES", () => {
    for (const t of ASSESSMENT_TEMPLATES_V2) {
      expect(nonEmpty(t.name)).toBe(true);
      expect(nonEmpty(t.description)).toBe(true);
    }
  });

  it("every question text, option label and note label is EN + ES", () => {
    for (const t of ASSESSMENT_TEMPLATES_V2) {
      for (const s of t.sections) {
        expect(nonEmpty(s.title)).toBe(true);
        for (const q of walk(s.questions)) {
          expect(nonEmpty(q.text)).toBe(true);
          for (const o of q.options ?? []) expect(nonEmpty(o.label)).toBe(true);
          if (q.noteLabel) expect(nonEmpty(q.noteLabel)).toBe(true);
          if (q.scale) {
            expect(nonEmpty(q.scale.minLabel)).toBe(true);
            expect(nonEmpty(q.scale.maxLabel)).toBe(true);
          }
        }
      }
    }
  });
});

describe("serializeSections — the DB JSON", () => {
  const fria = ASSESSMENT_TEMPLATES_V2.find((t) => t.type === "FRIA")!;
  const json = serializeSections(fria);

  it("mirrors the section/question shape", () => {
    expect(json).toHaveLength(fria.sections.length);
    const q0 = (json[0].questions as Record<string, unknown>[])[0];
    expect(q0.id).toBe("fria1_1");
    expect(q0.required).toBe(true);
  });

  it("carries the stage-2 help inside the JSON (reused from QUESTION_HELP)", () => {
    // fria1_1 has a central QUESTION_HELP entry and no inline help; it must be
    // embedded in the serialized JSON.
    const q0 = (json[0].questions as Record<string, unknown>[])[0];
    expect(q0.help).toBeTruthy();
    expect((q0.help as { meaning: { en: string } }).meaning.en).toBe(QUESTION_HELP.fria1_1.meaning.en);
  });

  it("serializes a yes/no follow-up as a nested question", () => {
    const section2 = json[1].questions as Record<string, unknown>[];
    const q = section2.find((x) => x.id === "fria2_4")!;
    expect(q.type).toBe("yes_no");
    expect((q.followUp as { question: { id: string } }).question.id).toBe("fria2_4_detail");
  });
});
