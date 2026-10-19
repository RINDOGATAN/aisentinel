// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Suggested edits for a policy the organization wrote or imported.
 *
 * Runs only when the organization has turned the AI assist on (the posture
 * gate in the router runs first). The model proposes edits as a list; it never
 * rewrites the policy, and nothing is applied: a person reads the suggestions
 * and edits the text. Pure functions: no network, no DB.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  en: "Write in English.",
  es: "Escribe en español de España (castellano peninsular), con la terminología del RIA. Trata siempre de tú al lector, nunca de usted.",
};

/** Longest policy text sent; longer text is cut and the prompt says so. */
export const POLICY_REVIEW_MAX_CHARS = 24_000;

export interface PolicyReviewInput {
  title: string;
  typeLabel: string;
  content: string;
  /** Places the organization declared (for scope), e.g. ["EU", "US-CA"]. */
  jurisdictions: string[];
}

export function buildPolicyReviewSystemPrompt(locale: string = "en"): string {
  return [
    "You review an internal AI policy for an organization and suggest edits. You do not rewrite the policy.",
    "Return a numbered list of at most ten suggestions. For each: the passage concerned (quoted briefly), the problem, and the edit you propose.",
    "Cover, where they apply: unclear scope or roles, missing human review, missing approval or review dates, data handling, vendor terms, incident reporting, and statements that are inaccurate or overstated.",
    "Cite a legal provision only when you are sure of it, by its number in Regulation (EU) 2024/1689 or the named law; never invent a provision, a deadline or a fixed review period. If unsure, say the point should be checked with counsel.",
    "Only consider the places listed as the organization's jurisdictions.",
    "No preamble and no closing summary. The organization decides what to change.",
    LOCALE_INSTRUCTIONS[locale] ?? LOCALE_INSTRUCTIONS.en,
  ].join("\n");
}

export function buildPolicyReviewUserPrompt(input: PolicyReviewInput): string {
  const cut = input.content.length > POLICY_REVIEW_MAX_CHARS;
  const text = cut ? input.content.slice(0, POLICY_REVIEW_MAX_CHARS) : input.content;
  const lines = [
    `Policy title: ${input.title}`,
    `Policy type: ${input.typeLabel}`,
    `Jurisdictions: ${input.jurisdictions.length ? input.jurisdictions.join(", ") : "not declared"}`,
  ];
  if (cut) lines.push(`The text below is the first ${POLICY_REVIEW_MAX_CHARS} characters of a longer policy.`);
  lines.push("", "Policy text:", "<<<", text, ">>>");
  return lines.join("\n");
}
