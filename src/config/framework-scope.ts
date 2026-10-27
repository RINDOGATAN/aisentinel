// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Which frameworks the organisation's own answers rule out.
 *
 * The applicability check (src/config/applicability.ts) turns the declared
 * places and a few answers into "these apply to you". The regime laws (GDPR,
 * California, Colorado, Texas, Washington) already follow the places through
 * their own scope rules. Three frameworks did not: the EU AI Act, ISO/IEC
 * 42001 and NIST AI RMF are attached to every classified system by risk tier,
 * whatever the answers say. This module states, in one place, when an answer
 * takes one of them out, so the requirements, the counts and the tabs all read
 * the same decision.
 *
 * Only a definite answer rules a framework out. Undeclared places and "not
 * sure yet" never do: an undetermined scope must not read as "does not apply"
 * (the same doctrine as the regime rules).
 *
 * Pure module: no Prisma, no React.
 */

import type { ApplicabilityAnswers } from "@/config/applicability";
import { ROLE_QUESTIONS } from "@/config/applicability";

/** The frameworks whose requirements are attached by risk tier (`applicableTo`). */
export const TIERED_FRAMEWORKS = ["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001"] as const;

export type RuledOutFramework = "EU_AI_ACT" | "ISO_42001";

/**
 * The frameworks the answers rule out, in a fixed order.
 *
 * - EU AI Act: places are declared and none is the EU or the EEA, or every
 *   role question is answered "no" (the organisation neither builds nor uses
 *   AI). Both are the cases in which the applicability check lists no EU AI
 *   Act line at all.
 * - ISO/IEC 42001: the organisation has said it does not want a certifiable
 *   management system. The check lists the standard on "yes" and as worth
 *   checking on "not sure yet".
 *
 * NIST AI RMF is never ruled out: no question asks about it.
 */
export function frameworksRuledOut(
  jurisdictions: readonly string[],
  answers: ApplicabilityAnswers,
): RuledOutFramework[] {
  const out: RuledOutFramework[] = [];
  const declared = jurisdictions.length > 0;
  const europe = jurisdictions.includes("EU") || jurisdictions.includes("EEA");
  const noRole = ROLE_QUESTIONS.every((q) => answers[q] === "NO");
  if ((declared && !europe) || noRole) out.push("EU_AI_ACT");
  if (answers.wantsCertification === "NO") out.push("ISO_42001");
  return out;
}
