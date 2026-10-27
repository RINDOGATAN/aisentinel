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

export const APPLICABILITY_VERSION = "2026.10.1";

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

/**
 * The places a question matters for. A question listed here feeds only the
 * laws of those places, so it is asked only when one of them is declared. A
 * question not listed here is asked of everyone. With no place declared yet
 * ("not sure yet"), every question is asked, as before.
 *
 * - general-purpose AI model: the EU AI Act's model duties (EU, EEA);
 * - talks to people: EU AI Act Art. 50 (EU, EEA) and the GDPR line (EU, EEA, UK);
 * - decides about people: the EU high-risk rules, the GDPR line, the
 *   California ADMT rules and Colorado SB 26-189.
 */
export const QUESTION_PLACES: Partial<Record<ApplicabilityQuestion, readonly JurisdictionId[]>> = {
  generalPurposeModel: ["EU", "EEA"],
  meetsPeople: ["EU", "EEA", "UK"],
  decidesAboutPeople: ["EU", "EEA", "UK", "US_CA", "US_CO"],
};

/** The questions to ask for these declared places, in the order they are asked. */
export function applicabilityQuestionsFor(jurisdictions: readonly string[]): ApplicabilityQuestion[] {
  if (jurisdictions.length === 0) return [...APPLICABILITY_QUESTIONS];
  return APPLICABILITY_QUESTIONS.filter((q) => {
    const places = QUESTION_PLACES[q];
    return !places || places.some((p) => jurisdictions.includes(p));
  });
}

/** The role questions asked for these places: a question not asked never counts. */
export function askedRoleQuestions(jurisdictions: readonly string[]): ApplicabilityQuestion[] {
  const asked = applicabilityQuestionsFor(jurisdictions);
  return ROLE_QUESTIONS.filter((q) => asked.includes(q));
}

// ─── The frameworks the organisation chooses ─────────

/**
 * The frameworks that shape the program, chosen by the organisation, legal
 * and standard-based alike. Codes are the framework codes in the database
 * and i18n keys under `applicability.frameworks.options.<code>`.
 *
 * A framework not chosen is out of scope (src/config/framework-scope.ts). A
 * chosen one still passes through its own rules: a chosen EU AI Act with no
 * EU or EEA place reaches no system, and a chosen state law still waits for
 * its place and its screening. The GDPR is not a choice: it follows the
 * declared places, as before.
 */
export const LEGAL_FRAMEWORKS = ["EU_AI_ACT", "CA_CCPA_ADMT", "CO_SB_26_189", "TX_TRAIGA", "WA_AI_RULES"] as const;
export const STANDARD_FRAMEWORKS = ["NIST_AI_RMF", "ISO_42001", "AIUC_1"] as const;
export const CHOOSABLE_FRAMEWORKS = [...LEGAL_FRAMEWORKS, ...STANDARD_FRAMEWORKS] as const;

export type ChoosableFramework = (typeof CHOOSABLE_FRAMEWORKS)[number];
export type LegalFramework = (typeof LEGAL_FRAMEWORKS)[number];

export function isChoosableFramework(code: string): code is ChoosableFramework {
  return (CHOOSABLE_FRAMEWORKS as readonly string[]).includes(code);
}

/** The places that make a legal framework likely to apply (a hint, never a choice). */
export const FRAMEWORK_PLACES: Record<LegalFramework, readonly JurisdictionId[]> = {
  EU_AI_ACT: ["EU", "EEA"],
  CA_CCPA_ADMT: ["US_CA"],
  CO_SB_26_189: ["US_CO"],
  TX_TRAIGA: ["US_TX"],
  WA_AI_RULES: ["US_WA"],
};

/**
 * The stored choice, read defensively: the chosen codes in the fixed order,
 * or null when nothing has ever been stored (not even an empty choice).
 */
export function readFrameworkChoice(value: unknown): ChoosableFramework[] | null {
  if (!Array.isArray(value)) return null;
  return CHOOSABLE_FRAMEWORKS.filter((code) => value.includes(code));
}

/**
 * The choice of an organisation that has none stored: what was in scope
 * before the question existed. The migration
 * 20261027120000_applicability_framework_choice records the same set for
 * every existing organisation; this is the fallback for a record it did not
 * reach. A new organisation is created with an empty choice instead.
 *
 * - EU AI Act: unless places are declared and none is the EU or the EEA, or
 *   every role question is answered no;
 * - a state law: its place is declared;
 * - NIST AI RMF and AIUC-1: always;
 * - ISO/IEC 42001: unless certification is answered no.
 */
export function legacyFrameworkChoice(
  jurisdictions: readonly string[],
  answers: ApplicabilityAnswers,
): ChoosableFramework[] {
  const declared = jurisdictions.length > 0;
  const europe = jurisdictions.includes("EU") || jurisdictions.includes("EEA");
  const noRole = ROLE_QUESTIONS.every((q) => answers[q] === "NO");
  const out: ChoosableFramework[] = [];
  if (!((declared && !europe) || noRole)) out.push("EU_AI_ACT");
  if (jurisdictions.includes("US_CA")) out.push("CA_CCPA_ADMT");
  if (jurisdictions.includes("US_CO")) out.push("CO_SB_26_189");
  if (jurisdictions.includes("US_TX")) out.push("TX_TRAIGA");
  if (jurisdictions.includes("US_WA")) out.push("WA_AI_RULES");
  out.push("NIST_AI_RMF");
  if (answers.wantsCertification !== "NO") out.push("ISO_42001");
  out.push("AIUC_1");
  return out;
}

/** Why a framework is likely to fit, from the places and answers. */
export type FrameworkHint = "declaredPlace" | "wantsCertification" | "usesAgents";

/** The hint shown next to a framework; null when nothing points to it. */
export function frameworkHint(
  code: ChoosableFramework,
  jurisdictions: readonly string[],
  answers: ApplicabilityAnswers,
): FrameworkHint | null {
  if (code in FRAMEWORK_PLACES) {
    const places = FRAMEWORK_PLACES[code as LegalFramework];
    return places.some((p) => jurisdictions.includes(p)) ? "declaredPlace" : null;
  }
  if (code === "ISO_42001") return answers.wantsCertification === "YES" ? "wantsCertification" : null;
  if (code === "AIUC_1") return answers.usesAgents === "YES" ? "usesAgents" : null;
  return null;
}

/**
 * The legal frameworks the declared places point to but the organisation has
 * not chosen: they may apply by law whatever the choice, so the screen says
 * so in one neutral line. Nothing is added for the organisation.
 */
export function likelyLegalNotChosen(
  frameworks: readonly string[],
  jurisdictions: readonly string[],
  answers: ApplicabilityAnswers,
): LegalFramework[] {
  return LEGAL_FRAMEWORKS.filter(
    (code) => !frameworks.includes(code) && frameworkHint(code, jurisdictions, answers) === "declaredPlace",
  );
}

/**
 * The applicability settings as stored under `Organization.settings`, read
 * defensively: the answers, the choice as stored (null if none), and the
 * choice in force (the stored one, or the legacy set without one).
 */
export function readApplicabilitySettings(
  settings: unknown,
  jurisdictions: readonly string[],
): {
  answers: ApplicabilityAnswers;
  storedFrameworks: ChoosableFramework[] | null;
  frameworks: ChoosableFramework[];
} {
  const s =
    settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  const applicability =
    s.applicability && typeof s.applicability === "object" && !Array.isArray(s.applicability)
      ? (s.applicability as Record<string, unknown>)
      : {};
  const answers = readApplicabilityAnswers(applicability.answers);
  const storedFrameworks = readFrameworkChoice(applicability.frameworks);
  return {
    answers,
    storedFrameworks,
    frameworks: storedFrameworks ?? legacyFrameworkChoice(jurisdictions, answers),
  };
}

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
  | "iso42001"
  | "nistAiRmf";

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
  | "chosenFramework"
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
 *
 * `frameworks` is the organisation's choice (`readApplicabilitySettings`): a
 * framework not chosen is never listed, and a chosen standard is listed as
 * applying (AIUC-1 only for an organisation that may use agents). Without it
 * (null), the list is what the answers alone point to, as before the choice.
 */
export function evaluateApplicability(
  jurisdictions: readonly JurisdictionId[],
  answers: ApplicabilityAnswers,
  frameworks: readonly string[] | null = null,
): ApplicabilityItem[] {
  const items: ApplicabilityItem[] = [];
  const has = (j: JurisdictionId) => jurisdictions.includes(j);

  // Any role at all. The EU AI Act and Texas reach providers and deployers
  // alike; with every role answered "no" the organisation neither builds nor
  // uses AI, and neither law is listed. A role question not asked for these
  // places (the general-purpose model question outside Europe) never counts.
  const roleAnswers = askedRoleQuestions(jurisdictions).map((q) => answers[q]);
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
          ...(answers.generalPurposeModel === "YES" && askedRoleQuestions(jurisdictions).includes("generalPurposeModel")
            ? (["generalPurpose"] as const)
            : []),
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
  if (frameworks === null) {
    // No choice given: what the answers point to.
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

  // A choice: the legal lines the organisation has not chosen go, and each
  // chosen standard is listed. AIUC-1 reaches AI agents only.
  const chosen = items.filter((i) => !isChoosableFramework(i.frameworkCode) || frameworks.includes(i.frameworkCode));
  if (frameworks.includes("AIUC_1") && agents) {
    chosen.push({
      id: "aiuc1",
      frameworkCode: "AIUC_1",
      kind: "standard",
      state: agents,
      reasons: [agents === "applies" ? "usesAgents" : "answerUnsure"],
    });
  }
  if (frameworks.includes("ISO_42001")) {
    chosen.push({ id: "iso42001", frameworkCode: "ISO_42001", kind: "standard", state: "applies", reasons: ["chosenFramework"] });
  }
  if (frameworks.includes("NIST_AI_RMF")) {
    chosen.push({ id: "nistAiRmf", frameworkCode: "NIST_AI_RMF", kind: "standard", state: "applies", reasons: ["chosenFramework"] });
  }
  return chosen;
}
