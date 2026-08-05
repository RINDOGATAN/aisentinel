// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Art. 50 transparency ("marking methods") statement prompt builder.
 *
 * Drafts a sectioned markdown statement documenting how one registered AI
 * system meets its EU AI Act Art. 50 transparency obligations, from registry
 * facts plus the deterministic transparency-rules output (which is the ground
 * truth the draft must cite). Pure functions — no network, no DB.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import type { AssessmentSystemContext } from "./assessment-draft";
import type {
  Art50Suggestion,
  MarkingMethod,
  TransparencyObligationStatusValue,
} from "@/config/transparency-rules";

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  en: "Write the document in English.",
  es: "Redacta el documento en español de España (castellano peninsular), con la terminología del Reglamento de IA de la UE.",
};

/** The statement headings the draft must follow, in order. */
export const TRANSPARENCY_STATEMENT_SECTIONS = [
  "1. System and role under Art. 50",
  "2. Applicable transparency obligations",
  "3. Machine-readable marking methods (Art. 50(2))",
  "4. Disclosure measures (Art. 50(1), 50(3), 50(4))",
  "5. Deadlines and open gaps",
] as const;

const METHOD_LABELS: Record<MarkingMethod, string> = {
  c2pa_manifest: "C2PA manifest",
  invisible_watermark: "invisible watermark (SynthID-style)",
  visible_label: "visible label",
  metadata_tagging: "metadata tagging",
  generation_logging: "generation logging",
};

const OBLIGATION_LABELS: Record<Art50Suggestion["obligation"], string> = {
  art50_interaction: "AI-interaction disclosure",
  art50_marking: "machine-readable marking of synthetic content",
  art50_emotion: "emotion-recognition / biometric-categorisation disclosure",
  art50_deepfake: "deepfake and AI-text labelling",
};

export interface TransparencyStatementInput {
  context: AssessmentSystemContext;
  profile: {
    art50InteractionStatus: TransparencyObligationStatusValue;
    art50MarkingStatus: TransparencyObligationStatusValue;
    art50EmotionStatus: TransparencyObligationStatusValue;
    art50DeepfakeStatus: TransparencyObligationStatusValue;
    markingMethods: string[];
    placedOnMarketBefore2Aug2026: boolean | null;
    notes: string | null;
  } | null;
  suggestions: Art50Suggestion[];
  markingDeadline: {
    deadline: string;
    graceApplies: boolean;
    overdue: boolean;
  } | null;
}

export function buildTransparencyStatementSystemPrompt(
  locale: string = "en",
): string {
  const languageLine = LOCALE_INSTRUCTIONS[locale] ?? LOCALE_INSTRUCTIONS.en;
  return [
    "You are an AI-governance analyst drafting an EU AI Act Article 50 transparency statement for one registered AI system.",
    "Article 50 (Regulation (EU) 2024/1689) applies since 2 August 2026. The Commission adopted final guidelines on the Art. 50 transparency obligations on 20 July 2026, and the Code of Practice on Transparency of AI-Generated Content was assessed adequate in July 2026 — the owner may consult both.",
    "Produce a markdown document with EXACTLY these level-2 headings, in this order:",
    ...TRANSPARENCY_STATEMENT_SECTIONS.map((s) => `## ${s}`),
    "Fill each section strictly from the provided registry facts, recorded obligation statuses, and deterministic screening results. The screening results are the ground truth for which obligations apply — restate them, never contradict them.",
    'Where the record does not document what a section requires, write a short bracketed gap note (e.g. "[Gap: no marking method recorded]") so the owner can complete it — never invent facts, methods, or dates.',
    "If a prohibition warning is present in the input, reproduce it prominently in section 2 — a prohibited use is never satisfied by disclosure.",
    "Keep sections concise (2-6 sentences or a short list each). This is a working draft the system owner will complete and review, not a final document or legal advice.",
    languageLine,
  ].join("\n");
}

function statusLine(
  label: string,
  status: TransparencyObligationStatusValue,
): string {
  return `- ${label}: ${status}`;
}

export function buildTransparencyStatementUserPrompt(
  input: TransparencyStatementInput,
): string {
  const { context, profile, suggestions, markingDeadline } = input;

  const lines: string[] = [
    `Organization: ${context.organizationName}`,
    `AI system: ${context.system.name}`,
    `Status: ${context.system.status}; organization role: ${context.system.role}; technique: ${context.system.technique}`,
  ];
  if (context.system.purpose) lines.push(`Intended purpose: ${context.system.purpose}`);
  if (context.system.description) lines.push(`Description: ${context.system.description}`);
  if (context.riskLevel) lines.push(`Risk classification: ${context.riskLevel}`);

  lines.push("", "Deterministic Art. 50 screening (ground truth):");
  for (const s of suggestions) {
    lines.push(
      `- ${s.article} ${OBLIGATION_LABELS[s.obligation]} (${s.actor} duty): ${
        s.suggested ? `suggested (trigger: "${s.matched}")` : "no trigger found"
      }`,
    );
    if (s.prohibitedOverlap) {
      lines.push(
        "  PROHIBITION WARNING: an Art. 5 prohibited-practice trigger overlaps (e.g. emotion recognition in the workplace or education, Art. 5(1)(f)). Disclosure does not permit a prohibited use.",
      );
    }
  }

  if (profile) {
    lines.push("", "Recorded obligation statuses (reviewed by the owner):");
    lines.push(statusLine("Art. 50(1) interaction disclosure", profile.art50InteractionStatus));
    lines.push(statusLine("Art. 50(2) synthetic-content marking", profile.art50MarkingStatus));
    lines.push(statusLine("Art. 50(3) emotion-recognition disclosure", profile.art50EmotionStatus));
    lines.push(statusLine("Art. 50(4) deepfake labelling", profile.art50DeepfakeStatus));
    if (profile.markingMethods.length) {
      const labels = profile.markingMethods.map(
        (m) => METHOD_LABELS[m as MarkingMethod] ?? m,
      );
      lines.push(`- Marking methods in use: ${labels.join(", ")}`);
    } else {
      lines.push("- Marking methods in use: none recorded");
    }
    if (profile.placedOnMarketBefore2Aug2026 !== null) {
      lines.push(
        `- Placed on the market before 2 August 2026: ${profile.placedOnMarketBefore2Aug2026 ? "yes" : "no"}`,
      );
    }
    if (profile.notes) lines.push(`- Reviewer notes: ${profile.notes}`);
  } else {
    lines.push("", "No transparency profile has been recorded yet for this system.");
  }

  if (markingDeadline) {
    lines.push(
      "",
      `Marking deadline (Art. 50(2)): ${markingDeadline.deadline}${
        markingDeadline.graceApplies
          ? " (grace period for systems on the market before 2 Aug 2026, Reg. (EU) 2026/1744)"
          : " (Art. 50 applicable date)"
      }${markingDeadline.overdue ? " — OVERDUE" : ""}`,
    );
  }

  return [
    "Facts:",
    lines.join("\n"),
    "",
    "Draft the Art. 50 transparency statement.",
  ].join("\n");
}
