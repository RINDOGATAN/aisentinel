// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The screenings that decide which laws apply, and when each one counts as
 * answered: the rule behind step 1.2 ("Where the organisation operates and
 * the rules that apply", src/components/guided/path-config.ts).
 *
 * Which screenings an organisation is shown follows the cards themselves:
 * - the applicability check is shown to every organisation;
 * - the California screening only where California is declared
 *   (california-screening-card.tsx);
 * - the Texas and Washington questions only where a jurisdiction that turns
 *   on them is declared (regime-screening-card.tsx reads `REGIME_ORG_QUESTIONS`
 *   and `regimeQuestionsFor` from here, so the card and the rule agree).
 *
 * The step is done when places are declared and every screening shown is
 * answered. "Not sure" is never an answer in the California or regime
 * screenings (an unanswered question must not decide scope); the
 * applicability check allows "not sure yet" by design, so it counts once it
 * has been saved with at least one yes or no.
 *
 * Pure: no Prisma, no React. Reads the stored `Organization.settings` shape.
 */

import {
  applicabilityQuestionsFor,
  hasAnyApplicabilityAnswer,
  readApplicabilityAnswers,
} from "@/config/applicability";

/** Ids are also i18n keys under `guided.checks`. */
export type ObligationScreening = "applicability" | "california" | "regimes";

export type RegimeOrgQuestion =
  | "isPublicAgency"
  | "isHealthCarrier"
  | "isHealthcareProvider"
  | "isCoveredGenAiProvider"
  | "processesConsumerHealthData";

/** The organisation-level regime questions, in the order they are asked. */
export const REGIME_ORG_QUESTIONS: readonly RegimeOrgQuestion[] = [
  "isPublicAgency",
  "isHealthcareProvider",
  "isHealthCarrier",
  "isCoveredGenAiProvider",
  "processesConsumerHealthData",
];

/** Which declared jurisdictions make a regime question worth asking. */
export const REGIME_QUESTION_JURISDICTIONS: Record<RegimeOrgQuestion, readonly string[]> = {
  isPublicAgency: ["US_TX", "US_WA"],
  isHealthCarrier: ["US_WA"],
  isHealthcareProvider: ["US_TX"],
  isCoveredGenAiProvider: ["US_WA"],
  processesConsumerHealthData: ["US_WA"],
};

/** The regime questions shown for these declared jurisdictions. */
export function regimeQuestionsFor(jurisdictions: readonly string[]): RegimeOrgQuestion[] {
  return REGIME_ORG_QUESTIONS.filter((q) =>
    REGIME_QUESTION_JURISDICTIONS[q].some((j) => jurisdictions.includes(j)),
  );
}

function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const isYesNo = (v: unknown) => v === "YES" || v === "NO";

export interface ObligationScreeningState {
  /** The screenings shown to this organisation, in the order they are asked. */
  shown: ObligationScreening[];
  /** Of those, the ones not yet answered. */
  open: ObligationScreening[];
  /** Regime questions shown and still without a yes or a no. */
  openRegimeQuestions: number;
  /**
   * Questions left to answer across the open screenings ("Answer 3
   * questions"): the applicability questions still "not sure yet" while that
   * check is open, the California covered-business question, and the open
   * regime questions.
   */
  openQuestions: number;
}

/**
 * Which screenings this organisation is shown and which are still open, from
 * its declared jurisdictions and its stored settings.
 */
export function obligationScreenings(
  jurisdictions: readonly string[],
  settings: unknown,
): ObligationScreeningState {
  const s = objectOf(settings);
  const shown: ObligationScreening[] = ["applicability"];
  const open: ObligationScreening[] = [];

  const applicability = objectOf(s.applicability);
  const applicabilityAnswers = readApplicabilityAnswers(applicability.answers);
  const applicabilityAnswered =
    typeof applicability.answeredAt === "string" && hasAnyApplicabilityAnswer(applicabilityAnswers);
  let openQuestions = 0;
  if (!applicabilityAnswered) {
    open.push("applicability");
    // Only the questions asked for the declared places count.
    openQuestions += applicabilityQuestionsFor(jurisdictions).filter((q) => applicabilityAnswers[q] === "UNSURE").length;
  }

  if (jurisdictions.includes("US_CA")) {
    shown.push("california");
    // The covered-business question decides whether the California rules reach
    // the organisation at all; the audit thresholds below it only date duties.
    if (!isYesNo(objectOf(s.admt).coveredBusiness)) {
      open.push("california");
      openQuestions += 1;
    }
  }

  const questions = regimeQuestionsFor(jurisdictions);
  const regimes = objectOf(s.regimes);
  const openRegimeQuestions = questions.filter((q) => !isYesNo(regimes[q])).length;
  if (questions.length > 0) {
    shown.push("regimes");
    if (openRegimeQuestions > 0) open.push("regimes");
  }

  return { shown, open, openRegimeQuestions, openQuestions: openQuestions + openRegimeQuestions };
}
