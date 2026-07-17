// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Per-question assessment-draft prompt builder (FRIA / Conformity /
 * Bias & Fairness).
 *
 * Builds the prompts for one template question from Prisma-derived AI-system
 * context (never from client-supplied text). Pure functions — no network,
 * no DB. Callers pass the posture gate first and send the result through
 * the one LLM Door.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

export interface AssessmentSystemContext {
  organizationName: string;
  system: {
    name: string;
    description?: string | null;
    purpose?: string | null;
    technique: string;
    role: string;
    status: string;
    processesPersonalData: boolean;
    businessOwner?: string | null;
    technicalOwner?: string | null;
  };
  models: {
    name: string;
    provider?: string | null;
    modelType?: string | null;
    version?: string | null;
    trainingDataSummary?: string | null;
    knownLimitations?: string | null;
  }[];
  dataSources: {
    name: string;
    sourceType: string;
    containsPersonalData: boolean;
    dataCategories: string[];
    description?: string | null;
  }[];
  riskLevel?: string | null;
  annexIIICategory?: string | null;
}

export interface AssessmentDraftInput {
  context: AssessmentSystemContext;
  assessment: {
    title: string;
    type: string; // "FRIA" | "CONFORMITY" | "BIAS_FAIRNESS" | ...
  };
  sectionTitle: string;
  question: {
    text: string;
    helpText?: string | null;
  };
  /** The user's current answer, if any — the draft should refine, not ignore it. */
  currentResponse?: string | null;
}

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  en: "Write the draft in English.",
  es: "Redacta el borrador en español de España (castellano peninsular), con la terminología del Reglamento de IA de la UE.",
};

const TYPE_FRAMING: Record<string, string> = {
  FRIA: "This is a Fundamental Rights Impact Assessment (Art. 27, Regulation (EU) 2024/1689).",
  CONFORMITY: "This is an EU AI Act conformity assessment (Annex VI/VII, Regulation (EU) 2024/1689).",
  BIAS_FAIRNESS: "This is a bias & fairness assessment (data governance duties of Art. 10, Regulation (EU) 2024/1689).",
  AI_RISK: "This is an AI risk assessment for the registered system.",
  CUSTOM: "This is an organization-defined AI governance assessment.",
};

function systemContextBlock(context: AssessmentSystemContext): string {
  const lines: string[] = [
    `Organization: ${context.organizationName}`,
    `AI system: ${context.system.name}`,
    `Status: ${context.system.status}; role of the organization: ${context.system.role}; technique: ${context.system.technique}`,
    `Processes personal data: ${context.system.processesPersonalData ? "yes" : "no"}`,
  ];
  if (context.system.purpose) lines.push(`Intended purpose: ${context.system.purpose}`);
  if (context.system.description) lines.push(`Description: ${context.system.description}`);
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
  return lines.join("\n");
}

export function buildAssessmentDraftSystemPrompt(
  assessmentType: string,
  locale: string = "en"
): string {
  const languageLine = LOCALE_INSTRUCTIONS[locale] ?? LOCALE_INSTRUCTIONS.en;
  const framing = TYPE_FRAMING[assessmentType] ?? TYPE_FRAMING.CUSTOM;

  return [
    "You are an AI-governance analyst helping to complete an assessment questionnaire about one registered AI system.",
    framing,
    "Answer ONLY the single question you are given, for THIS system, strictly from the provided system context.",
    "Where the context does not cover something the question needs, say so explicitly (e.g. \"Not documented in the registry\") rather than inventing facts.",
    "Be specific and audit-ready: 1-3 short paragraphs, no headings, no preamble, no closing formula.",
    "The draft will be reviewed and edited by the person responsible for the assessment before any use.",
    languageLine,
  ].join("\n");
}

export function buildAssessmentDraftUserPrompt(input: AssessmentDraftInput): string {
  const parts: string[] = [
    `Assessment: ${input.assessment.title} (type ${input.assessment.type})`,
    `Section: ${input.sectionTitle}`,
    "",
    "System context:",
    systemContextBlock(input.context),
    "",
    `Question: ${input.question.text}`,
  ];
  if (input.question.helpText) parts.push(`Guidance for this question: ${input.question.helpText}`);
  if (input.currentResponse?.trim()) {
    parts.push(
      "",
      "The current draft answer (improve and complete it; keep anything that is correct):",
      input.currentResponse.trim()
    );
  }
  parts.push("", "Draft the answer to this question.");
  return parts.join("\n");
}
