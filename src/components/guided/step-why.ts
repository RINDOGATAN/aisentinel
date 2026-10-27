// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one-line explanation of a step, as the next-step card, the dashboard's
 * next actions and the step band show it.
 *
 * Every step reads its text from `guided.steps.<id>`. The transparency step
 * ("Telling people it is AI") adds the disclosure laws of the declared places
 * (src/config/disclosure-laws.ts); with none, its text stays neutral and cites
 * no article.
 */

import type { DisclosureLawId } from "@/config/disclosure-laws";

type Translate = {
  (key: string, values?: Record<string, string | number>): string;
};

/** "Laws to check for the organization's places: A, B and C.", or null with none. */
export function disclosureLawsSentence(
  t: Translate,
  laws: readonly DisclosureLawId[],
  locale: string,
): string | null {
  if (laws.length === 0) return null;
  const names = laws.map((id) => t(`disclosureLaws.${id}`));
  const list = new Intl.ListFormat(locale === "es" ? "es" : "en", { style: "long", type: "conjunction" }).format(names);
  return t("disclosureLaws.sentence", { laws: list });
}

/** A step's text (`why` or `do`), with the transparency step's laws appended. */
export function stepText(
  t: Translate,
  stepId: string,
  part: "why" | "do",
  laws: readonly DisclosureLawId[],
  locale: string,
): string {
  const base = t(`steps.${stepId}.${part}`);
  if (stepId !== "transparency") return base;
  const sentence = disclosureLawsSentence(t, laws, locale);
  return sentence ? `${base} ${sentence}` : base;
}
