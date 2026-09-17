// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The figures the public docs quote about the rule packs. The regime packs and
 * the California pack are counted from their config modules at build time; the
 * three risk-tier frameworks and the cross-framework mappings live in seed
 * scripts, so their figures are written here and docs-counts.test.ts runs those
 * scripts against a fake client to prove the numbers still hold.
 */
import { REGIME_PACKS, flattenRegimeRequirements } from "@/config/regimes";
import { ADMT_FRAMEWORK, ADMT_REQUIREMENTS, flattenAdmtRequirements } from "@/config/admt-requirements";
import { UNIFIED_ASSESSMENT_SECTIONS, allUnifiedQuestions } from "@/config/unified-assessment";
import { AGENTIC_FINDINGS } from "@/config/agentic-stress-test";
import { AI_GOVERNANCE_TEMPLATES } from "@/config/ai-governance-templates";

/** From scripts/seed-frameworks.ts. */
export const SEEDED_TIER_FRAMEWORKS = {
  EU_AI_ACT: 83,
  NIST_AI_RMF: 23,
  ISO_42001: 33,
} as const;

/** Rows of the three tier frameworks that attach to a high-risk system. */
export const HIGH_RISK_AUTO_MAPPED = 130;

/** From scripts/seed-cross-framework-mappings.ts. */
export const CROSS_MAPPINGS = { equivalent: 34, partial: 64, related: 17 } as const;

export function docsCounts() {
  const regimes = Object.fromEntries(
    REGIME_PACKS.map((p) => [p.framework.code, flattenRegimeRequirements(p.requirements).length]),
  ) as Record<string, number>;
  const admt = flattenAdmtRequirements(ADMT_REQUIREMENTS).length;
  const tier = Object.values(SEEDED_TIER_FRAMEWORKS).reduce((n, v) => n + v, 0);
  const regimeTotal = Object.values(regimes).reduce((n, v) => n + v, 0);
  const questions = allUnifiedQuestions();
  return {
    frameworks: Object.keys(SEEDED_TIER_FRAMEWORKS).length + 1 + REGIME_PACKS.length,
    requirements: tier + admt + regimeTotal,
    perFramework: { ...SEEDED_TIER_FRAMEWORKS, [ADMT_FRAMEWORK.code]: admt, ...regimes } as Record<string, number>,
    highRiskAutoMapped: HIGH_RISK_AUTO_MAPPED,
    crossMappings: CROSS_MAPPINGS.equivalent + CROSS_MAPPINGS.partial + CROSS_MAPPINGS.related,
    crossMappingBreakdown: CROSS_MAPPINGS,
    unifiedSections: UNIFIED_ASSESSMENT_SECTIONS.length,
    unifiedQuestions: questions.length,
    unifiedCoreQuestions: questions.filter((q) => q.question.overlay === null).length,
    agenticFindings: AGENTIC_FINDINGS.length,
    // The server templates plus the Legal entry, which opens the law-firm step.
    industries: AI_GOVERNANCE_TEMPLATES.length + 1,
  };
}
