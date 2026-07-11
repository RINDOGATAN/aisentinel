// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Taxonomy mapping for DPO Central → AI Sentinel system imports.
 *
 * DPO Central and AI Sentinel model an AI system with different vocabularies.
 * DPO sends a free-ish `euAiActRole` string and a `modelType` + `aiTechniques`
 * description; AI Sentinel requires a single `AISystemRole` and `AITechnique`
 * enum. These helpers translate DPO's description into AIS's enums with safe,
 * documented defaults. They are intentionally pure and unit-tested — this is the
 * one real design decision in the import bridge, so it lives in one place.
 *
 * Imported systems always land as DRAFT in AIS: the mapping is a best-effort
 * seed that an AI officer confirms, never an authoritative classification.
 */
import type { AITechnique, AISystemRole } from "@prisma/client";

const ROLE_BY_KEYWORD: Record<string, AISystemRole> = {
  provider: "PROVIDER",
  deployer: "DEPLOYER",
  importer: "IMPORTER",
  distributor: "DISTRIBUTOR",
  user: "USER",
};

/**
 * Map DPO's `euAiActRole` string to an AI-Act `AISystemRole`. A law firm running
 * DPO Central is, for most systems it registers, a *deployer* of third-party AI —
 * so an unrecognised or empty role defaults to DEPLOYER rather than PROVIDER.
 */
export function mapRole(euAiActRole?: string | null): AISystemRole {
  const key = (euAiActRole ?? "").trim().toLowerCase();
  return ROLE_BY_KEYWORD[key] ?? "DEPLOYER";
}

/**
 * Infer an `AITechnique` from DPO's `modelType` + `aiTechniques` free text.
 * Order is deliberate: a "language model / LLM" is both language and generative,
 * and the AI-Act-relevant characterisation is GENERATIVE_AI, so generative is
 * tested before NLP. Anything unrecognised falls through to OTHER.
 */
export function mapTechnique(
  modelType?: string | null,
  aiTechniques?: string[] | null,
): AITechnique {
  const hay = [modelType ?? "", ...(aiTechniques ?? [])]
    .join(" ")
    .toLowerCase();

  if (/\b(generative|gen[- ]?ai|llm|gpt|large language model|diffusion)\b/.test(hay))
    return "GENERATIVE_AI";
  if (/\bagent(ic)?\b/.test(hay)) return "AGENTIC_AI";
  if (/\b(computer vision|vision|image|ocr|object detection)\b/.test(hay))
    return "COMPUTER_VISION";
  if (/\b(speech|voice|audio|transcription|asr)\b/.test(hay))
    return "SPEECH_RECOGNITION";
  if (/\b(nlp|nlu|language|text|sentiment|translation)\b/.test(hay)) return "NLP";
  if (/\b(deep learning|neural|cnn|rnn|transformer)\b/.test(hay))
    return "DEEP_LEARNING";
  if (/\brobot(ics)?\b/.test(hay)) return "ROBOTICS";
  if (/\b(expert system)\b/.test(hay)) return "EXPERT_SYSTEM";
  if (/\b(rule[- ]?based|rules engine|heuristic)\b/.test(hay)) return "RULE_BASED";
  if (/\b(statistical|statistics|regression|bayesian)\b/.test(hay))
    return "STATISTICAL";
  if (/\b(machine learning|ml)\b/.test(hay)) return "MACHINE_LEARNING";
  return "OTHER";
}
