// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one place that understands what an assessment answer is, for BOTH the v1
 * (free-text / select) templates and the v2 (structured) ones. The fill screen
 * and the server completeness gate import from here, so the count the user sees
 * and the count the server enforces can never drift apart.
 *
 * Answers live in AIAssessment.responses, keyed by question id:
 *   text / single_choice / date  → a string
 *   multi_choice                 → a string[] of option values
 *   scale                        → a number (stored as-is; may arrive as string)
 *   yes_no                       → "yes" | "no"
 * A structured question may carry a free-text note under `${id}__note`.
 * A yes/no follow-up is a question in its own right, answered under its own id.
 *
 * v1 questions carry `text` as a plain string; v2 carries it as {en,es}. Option
 * labels are the same: v1 options are plain strings (value === label), v2 options
 * are {value, label:{en,es}}. localizedText / optionLabel absorb the difference.
 */

export type AnswerLocale = "en" | "es";

type MaybeLocalized = string | { en?: string; es?: string } | null | undefined;

export interface AnswerOption {
  value: string;
  label: MaybeLocalized;
}

export interface AnswerScale {
  min: number;
  max: number;
  minLabel?: MaybeLocalized;
  maxLabel?: MaybeLocalized;
}

export interface AnswerQuestion {
  id: string;
  text: MaybeLocalized;
  type?: string;
  required?: boolean;
  helpText?: string;
  options?: Array<AnswerOption | string>;
  scale?: AnswerScale;
  allowNote?: boolean;
  noteLabel?: MaybeLocalized;
  followUp?: { when: "yes" | "no"; question: AnswerQuestion };
  help?: unknown;
}

export interface AnswerSection {
  id?: string;
  title?: MaybeLocalized;
  questions?: AnswerQuestion[];
}

export type Responses = Record<string, unknown>;

/** Resolve possibly-localized text to a plain string for the given locale. */
export function localizedText(value: MaybeLocalized, locale: AnswerLocale): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value.en ?? value.es ?? "";
}

/** The note key for a question's optional free-text note. */
export function noteKey(questionId: string): string {
  return `${questionId}__note`;
}

function normaliseOption(option: AnswerOption | string): { value: string; label: MaybeLocalized } {
  return typeof option === "string" ? { value: option, label: option } : option;
}

/** The display label for a stored option value. Falls back to the raw value. */
export function optionLabel(question: AnswerQuestion, value: string, locale: AnswerLocale): string {
  const match = (question.options ?? []).map(normaliseOption).find((o) => o.value === value);
  return match ? localizedText(match.label, locale) : value;
}

/**
 * Is this question answered? Structure-aware, so a scale of 0, an empty
 * checklist and a whitespace-only text box are all judged correctly. v1
 * questions (no structured type) fall through to the non-empty-string rule.
 */
export function isAnswered(question: AnswerQuestion, responses: Responses): boolean {
  const raw = responses[question.id];
  switch (question.type) {
    case "multi_choice":
      return Array.isArray(raw) && raw.length > 0;
    case "yes_no":
      return raw === "yes" || raw === "no";
    case "scale":
      if (typeof raw === "number") return Number.isFinite(raw);
      return typeof raw === "string" && raw.trim().length > 0;
    default:
      // text, single_choice, date, and every v1 type.
      if (Array.isArray(raw)) return raw.length > 0;
      return raw != null && String(raw).trim().length > 0;
  }
}

/** The follow-up question that is currently revealed, if any. */
export function activeFollowUp(question: AnswerQuestion, responses: Responses): AnswerQuestion | null {
  if (question.type !== "yes_no" || !question.followUp) return null;
  return responses[question.id] === question.followUp.when ? question.followUp.question : null;
}

/**
 * Every question that is currently answerable, in order: each section's
 * questions plus any follow-up that its parent has revealed. This is the single
 * list the progress bar counts and the completeness gate walks.
 */
export function answerableQuestions(
  sections: AnswerSection[] | unknown,
  responses: Responses,
): AnswerQuestion[] {
  if (!Array.isArray(sections)) return [];
  const out: AnswerQuestion[] = [];
  for (const section of sections as AnswerSection[]) {
    for (const question of section?.questions ?? []) {
      if (!question?.id) continue;
      out.push(question);
      const follow = activeFollowUp(question, responses);
      if (follow?.id) out.push(follow);
    }
  }
  return out;
}

/** `required` defaults to true, so a template that omits the flag stays strict. */
function isRequired(question: AnswerQuestion): boolean {
  return question.required !== false;
}

/** Required, currently-answerable questions with no answer recorded. */
export function unansweredRequired(
  sections: AnswerSection[] | unknown,
  responses: unknown,
): AnswerQuestion[] {
  const answers = (responses ?? {}) as Responses;
  return answerableQuestions(sections, answers).filter(
    (q) => isRequired(q) && !isAnswered(q, answers),
  );
}

/** Answered / total over the currently-answerable questions. */
export function answerProgress(
  sections: AnswerSection[] | unknown,
  responses: unknown,
): { answered: number; total: number } {
  const answers = (responses ?? {}) as Responses;
  const questions = answerableQuestions(sections, answers);
  const answered = questions.filter((q) => isAnswered(q, answers)).length;
  return { answered, total: questions.length };
}

/**
 * The recorded answer as a labelled, human-readable string — the value a
 * regulator (or any report) should see, never a raw option slug. Returns null
 * when nothing usable is recorded.
 */
export function renderAnswerText(
  question: AnswerQuestion,
  responses: Responses,
  locale: AnswerLocale,
): string | null {
  const raw = responses[question.id];
  if (!isAnswered(question, responses)) return null;
  switch (question.type) {
    case "multi_choice":
      return (raw as string[]).map((v) => optionLabel(question, v, locale)).join("; ");
    case "single_choice":
      return optionLabel(question, String(raw), locale);
    case "yes_no":
      return raw === "yes"
        ? locale === "es" ? "Sí" : "Yes"
        : locale === "es" ? "No" : "No";
    case "scale": {
      const n = typeof raw === "number" ? raw : Number(raw);
      const s = question.scale;
      if (s) {
        const lo = localizedText(s.minLabel, locale);
        const hi = localizedText(s.maxLabel, locale);
        const range = lo && hi ? ` (${s.min} ${lo} – ${s.max} ${hi})` : "";
        return `${n}/${s.max}${range}`;
      }
      return String(n);
    }
    default:
      return String(raw).trim();
  }
}
