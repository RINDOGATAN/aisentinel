// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Which frameworks are out of the organisation's scope.
 *
 * The organisation chooses the frameworks that shape its program, legal and
 * standard-based alike (src/config/applicability.ts, CHOOSABLE_FRAMEWORKS).
 * A framework not chosen is out. A chosen framework is still subject to the
 * applicability rules: the EU AI Act is out when places are declared and none
 * is the EU or the EEA, or when every role question asked is answered "no".
 * The state laws keep their own scope rules (src/config/regimes), which an
 * undeclared place or an unanswered screening question never satisfies.
 *
 * This module states the decision in one place, so the requirements, the
 * counts and the tabs all read the same one. The GDPR is not a choice and
 * never appears here: it follows the declared places.
 *
 * Pure module: no Prisma, no React.
 */

import type { ApplicabilityAnswers, ChoosableFramework } from "@/config/applicability";
import { CHOOSABLE_FRAMEWORKS, askedRoleQuestions } from "@/config/applicability";

/** The frameworks whose requirements are attached by risk tier (`applicableTo`). */
export const TIERED_FRAMEWORKS = ["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001"] as const;

export type RuledOutFramework = ChoosableFramework;

/**
 * The frameworks out of scope, in the fixed order of CHOOSABLE_FRAMEWORKS:
 * those not in `frameworks` (the choice in force, from
 * readApplicabilitySettings), and the EU AI Act when the applicability rules
 * rule it out.
 *
 * AIUC-1 is never attached by tier; ruling it out hides it from the tabs and
 * the path, and the requirement sync leaves its rows to agent testing.
 */
export function frameworksRuledOut(
  jurisdictions: readonly string[],
  answers: ApplicabilityAnswers,
  frameworks: readonly string[],
): RuledOutFramework[] {
  const declared = jurisdictions.length > 0;
  const europe = jurisdictions.includes("EU") || jurisdictions.includes("EEA");
  const noRole = askedRoleQuestions(jurisdictions).every((q) => answers[q] === "NO");
  const euRuledOut = (declared && !europe) || noRole;
  return CHOOSABLE_FRAMEWORKS.filter(
    (code) => !frameworks.includes(code) || (code === "EU_AI_ACT" && euRuledOut),
  );
}

/** Why a chosen EU AI Act reaches no system, for the screen; null when it can. */
export function euAiActRuleOutReason(
  jurisdictions: readonly string[],
  answers: ApplicabilityAnswers,
): "noEuropeanPlace" | "noRole" | null {
  if (jurisdictions.length > 0 && !jurisdictions.includes("EU") && !jurisdictions.includes("EEA")) {
    return "noEuropeanPlace";
  }
  if (askedRoleQuestions(jurisdictions).every((q) => answers[q] === "NO")) return "noRole";
  return null;
}
