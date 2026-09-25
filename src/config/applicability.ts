// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The applicability check: a few plain questions at the start of the quick
 * start, and the rule that turns the answers into "these apply to you".
 *
 * Pure module (no Prisma, no React), imported by the quick start, the settings
 * card and the router. Display strings live in the `applicability` i18n
 * namespace and are referenced here only by id.
 *
 * Where the answers go:
 * - where the organisation operates is the existing `operatingJurisdictions`
 *   column, saved through `organization.setJurisdictions`: it is the switch the
 *   regime rules (src/config/regimes/regime-rules.ts) already read;
 * - the other answers are kept under `Organization.settings.applicability`.
 *
 * They are never copied into the regime screening facts
 * (`Organization.settings.regimes`): none of those facts asks the same legal
 * question (a "covered generative AI provider" under Washington law is not a
 * seller of a general-purpose model), and an answer given to one question must
 * never settle another.
 *
 * The same doctrine as the regime rules: an unanswered question ("not sure
 * yet") never produces "applies". It produces "check", or nothing at all.
 */

import type { JurisdictionId } from "@/config/jurisdictions";

export const APPLICABILITY_VERSION = "2026.09.1";

export type ApplicabilityAnswer = "YES" | "NO" | "UNSURE";

/** The questions, in the order they are asked. Ids are also i18n keys. */
export const APPLICABILITY_QUESTIONS = [
  "buildsForOthers",
  "usesAi",
  "generalPurposeModel",
  "meetsPeople",
  "decidesAboutPeople",
  "usesAgents",
  "wantsCertification",
] as const;

export type ApplicabilityQuestion = (typeof APPLICABILITY_QUESTIONS)[number];

export type ApplicabilityAnswers = Record<ApplicabilityQuestion, ApplicabilityAnswer>;

/** The first three questions are one group on screen: the organisation's role. */
export const ROLE_QUESTIONS: readonly ApplicabilityQuestion[] = [
  "buildsForOthers",
  "usesAi",
  "generalPurposeModel",
];

export const EMPTY_APPLICABILITY_ANSWERS: ApplicabilityAnswers = {
  buildsForOthers: "UNSURE",
  usesAi: "UNSURE",
  generalPurposeModel: "UNSURE",
  meetsPeople: "UNSURE",
  decidesAboutPeople: "UNSURE",
  usesAgents: "UNSURE",
  wantsCertification: "UNSURE",
};

/**
 * - `applies` the answers put the organisation in scope
 * - `check`   it may apply: an answer is "not sure yet", or the law turns on a
 *             fact these questions do not ask (the screening in Settings does)
 */
export type ApplicabilityState = "applies" | "check";

/** Ids are also i18n keys under `applicability.items.<id>`. */
export type ApplicabilityItemId =
  | "euAiAct"
  | "euGeneralPurpose"
  | "euTransparency"
  | "euHighRisk"
  | "gdpr"
  | "californiaAdmt"
  | "colorado"
  | "texas"
  | "washington"
  | "aiuc1"
  | "iso42001";

/** Ids are also i18n keys under `applicability.reasons.<id>`. */
export type ApplicabilityReason =
  | "operatesEu"
  | "operatesEea"
  | "operatesEuropeUk"
  | "operatesCalifornia"
  | "operatesColorado"
  | "operatesTexas"
  | "operatesWashington"
  | "provider"
  | "deployer"
  | "generalPurpose"
  | "meetsPeople"
  | "decidesAboutPeople"
  | "personalData"
  | "usesAgents"
  | "wantsCertification"
  | "roleUnsure"
  | "answerUnsure"
  | "thresholds"
  | "screeningDecides";

export interface ApplicabilityItem {
  id: ApplicabilityItemId;
  /** The framework's code in the database, so a line can be tied to its requirements. */
  frameworkCode: string;
  /** A law, or a standard the organisation chooses to follow. */
  kind: "law" | "standard";
  state: ApplicabilityState;
  /** Why, in the order the reasons are read. */
  reasons: ApplicabilityReason[];
}

function answerOf(value: unknown): ApplicabilityAnswer {
  return value === "YES" || value === "NO" ? value : "UNSURE";
}

/** Read stored answers defensively: anything unrecognised is "not sure yet". */
export function readApplicabilityAnswers(value: unknown): ApplicabilityAnswers {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const out = { ...EMPTY_APPLICABILITY_ANSWERS };
  for (const q of APPLICABILITY_QUESTIONS) out[q] = answerOf(source[q]);
  return out;
}

/** Whether any question has a yes or a no. */
export function hasAnyApplicabilityAnswer(answers: ApplicabilityAnswers): boolean {
  return APPLICABILITY_QUESTIONS.some((q) => answers[q] !== "UNSURE");
}

/** "applies" only when both sides apply; "check" when either is uncertain. */
function both(a: ApplicabilityState, b: ApplicabilityState): ApplicabilityState {
  return a === "applies" && b === "applies" ? "applies" : "check";
}

/** A yes applies, not sure is a check, a no is nothing. */
function fromAnswer(answer: ApplicabilityAnswer): ApplicabilityState | null {
  return answer === "YES" ? "applies" : answer === "UNSURE" ? "check" : null;
}

/**
 * The answers and the declared jurisdictions, turned into the list shown as
 * "These apply to you". Order: EU AI Act and its parts, then data protection
 * and the US states, then the standards. Items that do not apply are absent.
 *
 * An empty jurisdiction list is UNDECLARED: no law that depends on a place is
 * listed, not even as "check" (the screen asks where the organisation operates
 * instead). The standards do not depend on a place.
 */
export function evaluateApplicability(
  jurisdictions: readonly JurisdictionId[],
  answers: ApplicabilityAnswers,
): ApplicabilityItem[] {
  const items: ApplicabilityItem[] = [];
  const has = (j: JurisdictionId) => jurisdictions.includes(j);

  // Any role at all. The EU AI Act and Texas reach providers and deployers
  // alike; with every role answered "no" the organisation neither builds nor
  // uses AI, and neither law is listed.
  const roleAnswers = ROLE_QUESTIONS.map((q) => answers[q]);
  const role: ApplicabilityState | null = roleAnswers.includes("YES")
    ? "applies"
    : roleAnswers.includes("UNSURE")
      ? "check"
      : null;
  const roleReasons: ApplicabilityReason[] =
    role === "applies"
      ? [
          ...(answers.buildsForOthers === "YES" ? (["provider"] as const) : []),
          ...(answers.usesAi === "YES" ? (["deployer"] as const) : []),
          ...(answers.generalPurposeModel === "YES" ? (["generalPurpose"] as const) : []),
        ]
      : role === "check"
        ? ["roleUnsure"]
        : [];

  // ─── EU AI Act ─────────────────────────────────────
  // The EU is in scope; the EEA alone is a check (the Act reaches the EEA
  // only once the EEA Agreement takes it in).
  const eu: ApplicabilityState | null = has("EU") ? "applies" : has("EEA") ? "check" : null;
  const euReason: ApplicabilityReason = has("EU") ? "operatesEu" : "operatesEea";
  if (eu && role) {
    items.push({
      id: "euAiAct",
      frameworkCode: "EU_AI_ACT",
      kind: "law",
      state: both(eu, role),
      reasons: [euReason, ...roleReasons],
    });
    const parts: [ApplicabilityItemId, ApplicabilityQuestion, ApplicabilityReason][] = [
      ["euGeneralPurpose", "generalPurposeModel", "generalPurpose"],
      ["euTransparency", "meetsPeople", "meetsPeople"],
      ["euHighRisk", "decidesAboutPeople", "decidesAboutPeople"],
    ];
    for (const [id, question, reason] of parts) {
      const state = fromAnswer(answers[question]);
      if (!state) continue;
      items.push({
        id,
        frameworkCode: "EU_AI_ACT",
        kind: "law",
        state: both(eu, state),
        reasons: [euReason, state === "applies" ? reason : "answerUnsure"],
      });
    }
  }

  // ─── GDPR ──────────────────────────────────────────
  // It follows personal data, which these questions do not ask about
  // directly. AI that decides about people or talks to them uses personal
  // data, so a yes to either applies; otherwise it is a check.
  if (has("EU") || has("EEA") || has("UK")) {
    const aboutPeople =
      answers.decidesAboutPeople === "YES" || answers.meetsPeople === "YES";
    items.push({
      id: "gdpr",
      frameworkCode: "EU_GDPR",
      kind: "law",
      state: aboutPeople ? "applies" : "check",
      reasons: [
        "operatesEuropeUk",
        aboutPeople
          ? answers.decidesAboutPeople === "YES"
            ? "decidesAboutPeople"
            : "meetsPeople"
          : "personalData",
      ],
    });
  }

  // ─── US states ─────────────────────────────────────
  const decides = fromAnswer(answers.decidesAboutPeople);
  // California: the CCPA business thresholds decide first, and the
  // California screening in Settings asks them, so never more than a check.
  if (has("US_CA") && decides) {
    items.push({
      id: "californiaAdmt",
      frameworkCode: "CA_CCPA_ADMT",
      kind: "law",
      state: "check",
      reasons: [
        "operatesCalifornia",
        decides === "applies" ? "decidesAboutPeople" : "answerUnsure",
        "thresholds",
      ],
    });
  }
  if (has("US_CO") && decides) {
    items.push({
      id: "colorado",
      frameworkCode: "CO_SB_26_189",
      kind: "law",
      state: decides,
      reasons: ["operatesColorado", decides === "applies" ? "decidesAboutPeople" : "answerUnsure"],
    });
  }
  if (has("US_TX") && role) {
    items.push({
      id: "texas",
      frameworkCode: "TX_TRAIGA",
      kind: "law",
      state: role,
      reasons: ["operatesTexas", ...roleReasons],
    });
  }
  // Washington: five domain instruments, each turning on a fact the
  // screening in Settings asks (health data, public agency, and so on).
  if (has("US_WA") && role) {
    items.push({
      id: "washington",
      frameworkCode: "WA_AI_RULES",
      kind: "law",
      state: "check",
      reasons: ["operatesWashington", "screeningDecides"],
    });
  }

  // ─── Standards (chosen, not imposed) ───────────────
  const agents = fromAnswer(answers.usesAgents);
  if (agents) {
    items.push({
      id: "aiuc1",
      frameworkCode: "AIUC_1",
      kind: "standard",
      state: agents,
      reasons: [agents === "applies" ? "usesAgents" : "answerUnsure"],
    });
  }
  const certification = fromAnswer(answers.wantsCertification);
  if (certification) {
    items.push({
      id: "iso42001",
      frameworkCode: "ISO_42001",
      kind: "standard",
      state: certification,
      reasons: [certification === "applies" ? "wantsCertification" : "answerUnsure"],
    });
  }

  return items;
}
