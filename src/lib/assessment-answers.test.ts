// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import {
  isAnswered,
  unansweredRequired,
  answerProgress,
  activeFollowUp,
  renderAnswerText,
  localizedText,
  type AnswerQuestion,
  type AnswerSection,
} from "./assessment-answers";

const single: AnswerQuestion = {
  id: "q_single",
  text: { en: "Pick one", es: "Elige uno" },
  type: "single_choice",
  options: [
    { value: "a", label: { en: "Alpha", es: "Alfa" } },
    { value: "b", label: { en: "Beta", es: "Beta" } },
  ],
};

const multi: AnswerQuestion = {
  id: "q_multi",
  text: { en: "Pick many", es: "Elige varios" },
  type: "multi_choice",
  options: [
    { value: "x", label: { en: "Ex", es: "Equis" } },
    { value: "y", label: { en: "Why", es: "Ye" } },
  ],
};

const scale: AnswerQuestion = {
  id: "q_scale",
  text: { en: "How much", es: "Cuánto" },
  type: "scale",
  scale: { min: 1, max: 5, minLabel: { en: "low", es: "bajo" }, maxLabel: { en: "high", es: "alto" } },
};

const yesNo: AnswerQuestion = {
  id: "q_yesno",
  text: { en: "Yes or no", es: "Sí o no" },
  type: "yes_no",
  followUp: {
    when: "yes",
    question: { id: "q_yesno_detail", text: { en: "Detail", es: "Detalle" }, type: "text" },
  },
};

const v1Select: AnswerQuestion = {
  id: "q_v1select",
  text: "Legacy select",
  type: "select",
  options: ["Low", "High"],
};

const v1Text: AnswerQuestion = { id: "q_v1text", text: "Legacy text", type: "textarea" };

describe("isAnswered", () => {
  it("multi_choice: empty array is unanswered, non-empty is answered", () => {
    expect(isAnswered(multi, { q_multi: [] })).toBe(false);
    expect(isAnswered(multi, { q_multi: ["x"] })).toBe(true);
    expect(isAnswered(multi, {})).toBe(false);
  });

  it("scale: zero and any finite number count; empty string does not", () => {
    expect(isAnswered(scale, { q_scale: 0 })).toBe(true);
    expect(isAnswered(scale, { q_scale: 3 })).toBe(true);
    expect(isAnswered(scale, { q_scale: "" })).toBe(false);
    expect(isAnswered(scale, {})).toBe(false);
  });

  it("yes_no: only 'yes' or 'no' count", () => {
    expect(isAnswered(yesNo, { q_yesno: "yes" })).toBe(true);
    expect(isAnswered(yesNo, { q_yesno: "maybe" })).toBe(false);
  });

  it("single/text: non-empty string counts; whitespace does not", () => {
    expect(isAnswered(single, { q_single: "a" })).toBe(true);
    expect(isAnswered(v1Text, { q_v1text: "   " })).toBe(false);
    expect(isAnswered(v1Text, { q_v1text: "written" })).toBe(true);
  });
});

describe("follow-ups", () => {
  const sections: AnswerSection[] = [{ id: "s", questions: [yesNo] }];

  it("a follow-up is active only when its parent trigger is met", () => {
    expect(activeFollowUp(yesNo, { q_yesno: "yes" })?.id).toBe("q_yesno_detail");
    expect(activeFollowUp(yesNo, { q_yesno: "no" })).toBeNull();
  });

  it("an unanswered active follow-up blocks completeness", () => {
    // Parent answered yes, follow-up empty → the follow-up is required and missing.
    const missing = unansweredRequired(sections, { q_yesno: "yes" });
    expect(missing.map((q) => q.id)).toEqual(["q_yesno_detail"]);
  });

  it("a follow-up not revealed is not counted", () => {
    const missing = unansweredRequired(sections, { q_yesno: "no" });
    expect(missing).toHaveLength(0);
    // total counts the parent only while the follow-up is hidden.
    expect(answerProgress(sections, { q_yesno: "no" })).toEqual({ answered: 1, total: 1 });
    // revealing the follow-up adds it to the total.
    expect(answerProgress(sections, { q_yesno: "yes" })).toEqual({ answered: 1, total: 2 });
  });
});

describe("renderAnswerText — labelled values, never raw slugs", () => {
  it("single_choice renders the option label in the locale", () => {
    expect(renderAnswerText(single, { q_single: "b" }, "en")).toBe("Beta");
    expect(renderAnswerText(single, { q_single: "a" }, "es")).toBe("Alfa");
  });

  it("multi_choice joins the labels", () => {
    expect(renderAnswerText(multi, { q_multi: ["x", "y"] }, "es")).toBe("Equis; Ye");
  });

  it("yes_no is localised", () => {
    expect(renderAnswerText(yesNo, { q_yesno: "yes" }, "es")).toBe("Sí");
    expect(renderAnswerText(yesNo, { q_yesno: "no" }, "en")).toBe("No");
  });

  it("scale shows the value with its band labels", () => {
    expect(renderAnswerText(scale, { q_scale: 3 }, "en")).toContain("3/5");
    expect(renderAnswerText(scale, { q_scale: 3 }, "en")).toContain("low");
  });

  it("v1 select value equals its label", () => {
    expect(renderAnswerText(v1Select, { q_v1select: "High" }, "en")).toBe("High");
  });

  it("unanswered renders null", () => {
    expect(renderAnswerText(single, {}, "en")).toBeNull();
  });
});

describe("localizedText", () => {
  it("passes a plain string through (v1) and resolves an object (v2)", () => {
    expect(localizedText("plain", "es")).toBe("plain");
    expect(localizedText({ en: "E", es: "S" }, "es")).toBe("S");
    expect(localizedText({ en: "E" }, "es")).toBe("E");
  });
});
