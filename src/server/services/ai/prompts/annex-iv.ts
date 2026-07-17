// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Annex IV technical-documentation prompt builder.
 *
 * Drafts the sectioned markdown skeleton of the Annex IV technical
 * documentation (Regulation (EU) 2024/1689) for one registered AI system,
 * from registry facts only. Pure functions — no network, no DB.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import type { AssessmentSystemContext } from "./assessment-draft";

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  en: "Write the document in English.",
  es: "Redacta el documento en español de España (castellano peninsular), con la terminología del Reglamento de IA de la UE.",
};

/** The Annex IV headings the draft must follow, in order. */
export const ANNEX_IV_SECTIONS = [
  "1. General description of the AI system",
  "2. Detailed description of the elements and development process",
  "3. Monitoring, functioning and control",
  "4. Appropriateness of the performance metrics",
  "5. Risk management system (Art. 9)",
  "6. Lifecycle changes",
  "7. Applied harmonised standards or other solutions",
  "8. EU declaration of conformity (reference)",
  "9. Post-market monitoring plan (Art. 72)",
] as const;

export interface AnnexIvInput {
  context: AssessmentSystemContext;
}

export function buildAnnexIvSystemPrompt(locale: string = "en"): string {
  const languageLine = LOCALE_INSTRUCTIONS[locale] ?? LOCALE_INSTRUCTIONS.en;
  return [
    "You are an AI-governance analyst drafting EU AI Act Annex IV technical documentation for one registered AI system.",
    "Produce a markdown document with EXACTLY these level-2 headings, in this order:",
    ...ANNEX_IV_SECTIONS.map((s) => `## ${s}`),
    "Fill each section strictly from the provided registry facts. Where the registry does not document what a section requires, write a short bracketed gap note (e.g. \"[Gap: performance metrics not documented in the registry]\") so the owner can complete it — never invent facts.",
    "Keep sections concise (2-6 sentences or a short list each). This is a working draft the system owner will complete and review, not a final document.",
    languageLine,
  ].join("\n");
}

export function buildAnnexIvUserPrompt(input: AnnexIvInput): string {
  const { context } = input;
  const lines: string[] = [
    `Organization: ${context.organizationName}`,
    `AI system: ${context.system.name}`,
    `Status: ${context.system.status}; organization role: ${context.system.role}; technique: ${context.system.technique}`,
    `Processes personal data: ${context.system.processesPersonalData ? "yes" : "no"}`,
  ];
  if (context.system.purpose) lines.push(`Intended purpose: ${context.system.purpose}`);
  if (context.system.description) lines.push(`Description: ${context.system.description}`);
  if (context.system.businessOwner) lines.push(`Business owner: ${context.system.businessOwner}`);
  if (context.system.technicalOwner) lines.push(`Technical owner: ${context.system.technicalOwner}`);
  if (context.riskLevel) {
    lines.push(
      `Risk classification: ${context.riskLevel}${context.annexIIICategory ? ` (Annex III category: ${context.annexIIICategory})` : ""}`
    );
  }
  for (const model of context.models) {
    const bits = [
      `Model: ${model.name}`,
      model.provider ? `provider ${model.provider}` : null,
      model.modelType ? `type ${model.modelType}` : null,
      model.version ? `version ${model.version}` : null,
    ].filter(Boolean);
    lines.push(bits.join(", "));
    if (model.trainingDataSummary) lines.push(`  Training data: ${model.trainingDataSummary}`);
    if (model.knownLimitations) lines.push(`  Known limitations: ${model.knownLimitations}`);
  }
  for (const source of context.dataSources) {
    lines.push(
      `Data source: ${source.name} (${source.sourceType}${source.containsPersonalData ? ", personal data" : ""}${source.dataCategories.length ? `; categories: ${source.dataCategories.join(", ")}` : ""})`
    );
    if (source.description) lines.push(`  ${source.description}`);
  }

  return ["Registry facts:", lines.join("\n"), "", "Draft the Annex IV technical documentation."].join("\n");
}
