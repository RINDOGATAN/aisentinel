// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Risk-classification rationale prompt builder.
 *
 * The deterministic Annex III screening (config/annex-iii-rules.ts) runs
 * FIRST and its hits are the only legal grounding the draft may cite — the
 * AI writes prose around rule results, it never classifies. The user still
 * picks the level. Pure functions — no network, no DB.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import type { AnnexIiiScreening } from "@/config/annex-iii-rules";
import type { AssessmentSystemContext } from "./assessment-draft";

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  en: "Write the rationale in English.",
  es: "Redacta la justificación en español de España (castellano peninsular), con la terminología del Reglamento de IA de la UE.",
};

export interface RiskRationaleInput {
  context: AssessmentSystemContext;
  screening: AnnexIiiScreening;
  /** The level the user is about to record (may differ from the suggestion). */
  chosenLevel: string;
  chosenCategory?: string | null;
}

function screeningBlock(screening: AnnexIiiScreening): string {
  const lines: string[] = [
    `Rule-suggested level: ${screening.suggestedLevel}${screening.suggestedCategory ? ` (category: ${screening.suggestedCategory})` : ""}`,
  ];
  for (const hit of screening.prohibited) {
    lines.push(`Prohibited-practice hit: ${hit.article} — matched "${hit.matched}"`);
  }
  for (const hit of screening.highRisk) {
    lines.push(`High-risk hit: ${hit.article} (${hit.category}) — matched "${hit.matched}"`);
  }
  for (const hit of screening.transparency) {
    lines.push(`Transparency trigger: ${hit.article} — matched "${hit.matched}"`);
  }
  for (const hit of screening.carveOuts) {
    lines.push(`Carve-out applied: ${hit.article} (financial-fraud detection) — matched "${hit.matched}"`);
  }
  if (lines.length === 1) lines.push("No prohibited, high-risk, or transparency rules matched.");
  return lines.join("\n");
}

export function buildRiskRationaleSystemPrompt(locale: string = "en"): string {
  const languageLine = LOCALE_INSTRUCTIONS[locale] ?? LOCALE_INSTRUCTIONS.en;
  return [
    "You are an AI-governance analyst drafting the written rationale for an EU AI Act risk classification of one registered AI system.",
    "Ground every legal statement ONLY in the deterministic rule hits provided (article references included). Do not cite articles that are not in the hits, and do not invent system facts.",
    "If the chosen level differs from the rule-suggested level, present the rule result faithfully and note that the classifier's judgment differs — never paper over the difference.",
    "Structure: one paragraph on what the system does, one on the applicable rule findings with their article references, one concluding paragraph for the chosen level. No headings, no preamble.",
    "The rationale will be reviewed and edited by the person recording the classification; the classification decision is theirs, not yours.",
    languageLine,
  ].join("\n");
}

export function buildRiskRationaleUserPrompt(input: RiskRationaleInput): string {
  const { context } = input;
  const lines: string[] = [
    `AI system: ${context.system.name}`,
    `Technique: ${context.system.technique}; organization role: ${context.system.role}`,
    `Processes personal data: ${context.system.processesPersonalData ? "yes" : "no"}`,
  ];
  if (context.system.purpose) lines.push(`Intended purpose: ${context.system.purpose}`);
  if (context.system.description) lines.push(`Description: ${context.system.description}`);
  for (const source of context.dataSources) {
    lines.push(
      `Data source: ${source.name} (${source.sourceType}${source.dataCategories.length ? `; categories: ${source.dataCategories.join(", ")}` : ""})`
    );
  }

  return [
    "System facts:",
    lines.join("\n"),
    "",
    "Deterministic screening result (Regulation (EU) 2024/1689):",
    screeningBlock(input.screening),
    "",
    `Level chosen by the classifier: ${input.chosenLevel}${input.chosenCategory ? ` (Annex III category: ${input.chosenCategory})` : ""}`,
    "",
    "Draft the classification rationale.",
  ].join("\n");
}
