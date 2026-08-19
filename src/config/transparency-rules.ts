// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Deterministic EU AI Act Art. 50 transparency rules — obligation suggestions
 * and the machine-readable-marking deadline.
 *
 * Pure functions over registered AI-system facts, same rules-first doctrine as
 * annex-iii-rules.ts: no network, no DB, no AI — this layer works with the AI
 * posture OFF and is the ground truth any AI-drafted statement must cite.
 * Suggestions are a triage aid for the human reviewer, never a legal
 * determination — the user always sets the obligation status.
 *
 * Legal basis: Art. 50, Regulation (EU) 2024/1689, applicable since
 * 2 August 2026. Reg. (EU) 2026/1744 (Digital Omnibus on AI, OJ L 24.7.2026)
 * Art. 1(38) grants generative systems placed on the market before
 * 2 August 2026 a marking grace period until 2 December 2026. Final Commission
 * guidelines on Art. 50 were adopted 20 July 2026; the Code of Practice on
 * Transparency of AI-Generated Content was assessed adequate in July 2026.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import { screenAnnexIii, type AnnexIiiFacts } from "./annex-iii-rules";

/**
 * Rule-pack version. Bump on any content change (obligation triggers, marking
 * methods, deadline arithmetic) so exported artifacts can state which revision
 * produced them. See src/config/rule-pack-versions.ts.
 */
export const TRANSPARENCY_RULES_VERSION = "2026.08.1";
export const TRANSPARENCY_RULES_LAW_REVIEWED_AS_OF = "2026-08-05";

// ---------------------------------------------------------------------------
// Dates and vocabularies
// ---------------------------------------------------------------------------

/** Art. 50 applies from 2 August 2026 (Art. 113, unchanged by the omnibus). */
export const ART50_APPLICABLE_FROM = new Date(Date.UTC(2026, 7, 2));

/**
 * Marking grace deadline for systems placed on the market before 2 Aug 2026
 * (Reg. (EU) 2026/1744 Art. 1(38): four-month transitional period).
 */
export const ART50_MARKING_GRACE_DEADLINE = new Date(Date.UTC(2026, 11, 2));

/**
 * De facto marking-method vocabulary (C2PA manifests + invisible watermarks
 * are the prevailing two-layer stack; the rest are complements).
 */
export const MARKING_METHODS = [
  "c2pa_manifest",
  "invisible_watermark",
  "visible_label",
  "metadata_tagging",
  "generation_logging",
] as const;
export type MarkingMethod = (typeof MARKING_METHODS)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Art50ObligationId =
  | "art50_interaction"
  | "art50_marking"
  | "art50_emotion"
  | "art50_deepfake";

export type TransparencyObligationStatusValue =
  | "NOT_APPLICABLE"
  | "REQUIRED"
  | "IMPLEMENTED";

export interface TransparencyFacts extends AnnexIiiFacts {
  /** Prisma AISystemRole value ("PROVIDER", "DEPLOYER", ...). */
  role?: string | null;
}

export interface Art50Suggestion {
  obligation: Art50ObligationId;
  article: "Art. 50(1)" | "Art. 50(2)" | "Art. 50(3)" | "Art. 50(4)";
  /** Who the duty binds: 50(1)/(2) the provider, 50(3)/(4) the deployer. */
  actor: "provider" | "deployer";
  suggested: boolean;
  /** Trigger fragment, or "generative_ai" for the technique path. */
  matched: string | null;
  /**
   * True when an Art. 5 prohibited hit overlaps (e.g. emotion recognition in
   * the workplace) — the UI must render a prohibition warning, never imply
   * the use is permitted-with-disclosure.
   */
  prohibitedOverlap: boolean;
}

export interface MarkingDeadline {
  /** Grace deadline when the grace period applies, else the Art. 50 start. */
  deadline: Date;
  graceApplies: boolean;
  overdue: boolean;
  /** Signed whole days until the deadline (negative when past). */
  daysRemaining: number;
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

const EMOTION_PROHIBITED_RULE_IDS = new Set([
  "art5_emotion_work_edu",
  "art5_biometric_categorisation",
]);

/**
 * Suggest which Art. 50 obligations apply. Always returns all four
 * obligations with `suggested` flags; deterministic and side-effect free.
 */
export function suggestArt50Obligations(
  facts: TransparencyFacts,
): Art50Suggestion[] {
  const screening = screenAnnexIii(facts);
  const byRule = new Map(
    screening.transparency.map((hit) => [hit.ruleId, hit.matched]),
  );

  const interactionMatch = byRule.get("art50_interaction") ?? null;
  const emotionMatch = byRule.get("art50_emotion") ?? null;
  const deepfakeMatch = byRule.get("art50_deepfake") ?? null;

  // Marking (50(2)): a synthetic-content keyword, the screening's generative
  // fallback, a deepfake hit (deepfakes ARE synthetic content), or the
  // GENERATIVE_AI technique directly. The direct technique check matters:
  // screenAnnexIii suppresses its generative fallback whenever any other
  // transparency rule matched, so a generative chatbot would otherwise lose
  // its marking suggestion.
  const markingMatch =
    byRule.get("art50_synthetic") ??
    byRule.get("art50_generative_technique") ??
    deepfakeMatch ??
    (facts.technique === "GENERATIVE_AI" ? "generative_ai" : null);

  const emotionProhibitedOverlap = screening.prohibited.some((hit) =>
    EMOTION_PROHIBITED_RULE_IDS.has(hit.ruleId),
  );

  return [
    {
      obligation: "art50_interaction",
      article: "Art. 50(1)",
      actor: "provider",
      suggested: interactionMatch !== null,
      matched: interactionMatch,
      prohibitedOverlap: false,
    },
    {
      obligation: "art50_marking",
      article: "Art. 50(2)",
      actor: "provider",
      suggested: markingMatch !== null,
      matched: markingMatch,
      prohibitedOverlap: false,
    },
    {
      obligation: "art50_emotion",
      article: "Art. 50(3)",
      actor: "deployer",
      suggested: emotionMatch !== null,
      matched: emotionMatch,
      prohibitedOverlap: emotionProhibitedOverlap,
    },
    {
      obligation: "art50_deepfake",
      article: "Art. 50(4)",
      actor: "deployer",
      suggested: deepfakeMatch !== null,
      matched: deepfakeMatch,
      prohibitedOverlap: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Marking deadline
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Compute the Art. 50(2) marking deadline for a system. Returns null when the
 * marking obligation is not applicable (no deadline story to tell).
 */
export function computeMarkingDeadline(input: {
  placedOnMarketBefore2Aug2026: boolean | null | undefined;
  markingStatus: TransparencyObligationStatusValue | null;
  now?: Date;
}): MarkingDeadline | null {
  if (!input.markingStatus || input.markingStatus === "NOT_APPLICABLE") {
    return null;
  }

  const now = input.now ?? new Date();
  const graceApplies = input.placedOnMarketBefore2Aug2026 === true;
  const deadline = graceApplies
    ? ART50_MARKING_GRACE_DEADLINE
    : ART50_APPLICABLE_FROM;

  return {
    deadline,
    graceApplies,
    overdue:
      input.markingStatus === "REQUIRED" && now.getTime() >= deadline.getTime(),
    daysRemaining: Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS),
  };
}
