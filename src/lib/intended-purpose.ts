// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The intended-purpose builder: five short answers assembled into one
 * statement the person can then edit.
 *
 * Reg. (EU) 2024/1689, Art. 3(12): the intended purpose is the use for which
 * the provider intends the system, including the specific context and
 * conditions of use. The five parts ask for exactly that: what the system
 * does, who uses it, where and in what context, which decisions it supports,
 * and what it must not be used for. The sentence frames come from the locale
 * file, so the statement reads naturally in each language.
 *
 * Pure: no React.
 */

export const PURPOSE_PARTS = ["what", "who", "where", "decisions", "notFor"] as const;
export type PurposePart = (typeof PURPOSE_PARTS)[number];
export type PurposeParts = Partial<Record<PurposePart, string>>;

/** Sentence frames: each receives the trimmed answer and returns one sentence. */
export type PurposeFrames = Record<Exclude<PurposePart, "what">, (value: string) => string>;

function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/[\s.;:,]+$/u, "");
}

function sentence(text: string): string {
  if (!text) return "";
  const first = text.charAt(0).toLocaleUpperCase();
  const body = first + text.slice(1);
  return /[.!?]$/u.test(body) ? body : `${body}.`;
}

/** True when at least one part has an answer. */
export function hasPurposeAnswers(parts: PurposeParts): boolean {
  return PURPOSE_PARTS.some((p) => clean(parts[p]) !== "");
}

/** The statement, sentence by sentence, leaving out the parts with no answer. */
export function assemblePurpose(parts: PurposeParts, frames: PurposeFrames): string {
  const out: string[] = [];
  const what = clean(parts.what);
  if (what) out.push(sentence(what));
  for (const part of ["who", "where", "decisions", "notFor"] as const) {
    const value = clean(parts[part]);
    if (value) out.push(sentence(frames[part](value)));
  }
  return out.join(" ");
}
