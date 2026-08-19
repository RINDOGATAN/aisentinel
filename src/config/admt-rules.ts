// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * California ADMT applicability — vocabularies and the scope resolver.
 *
 * Pure module, same doctrine as transparency-rules.ts and jurisdictions.ts: no
 * Prisma, no React, no Next. It is imported by client components (the ADMT
 * panel), by the seed script (which needs the tag vocabulary), by tRPC routers,
 * and by the PDF pipeline, so it must stay free of server-only dependencies.
 * Prisma enums are mirrored as string-literal unions; admt-rules.test.ts asserts
 * the two never drift apart.
 *
 * Source of record: Cal. Code Regs. tit. 11, div. 6 (CPPA ADMT, risk-assessment
 * and cybersecurity-audit regulations), OAL-approved 22 September 2025,
 * effective 1 January 2026.
 *
 * Two regimes, one resolver:
 *
 *   * ARTICLE 11 (§§ 7200-7222 — pre-use notice, opt-out, access) is NARROW. It
 *     applies only where ADMT makes a "significant decision", and § 7001(ddd)
 *     limits that to five domains. § 7001(ddd)(6) expressly excludes
 *     advertising. Compliance is due 1 January 2027.
 *
 *   * ARTICLE 10 (§§ 7150-7157 — risk assessments) is BROAD and has been live
 *     since 1 January 2026. It attaches to any of six processing triggers, one
 *     of which is simply selling or sharing personal information.
 *
 * A system can be in Article 10 and out of Article 11. That asymmetry is the
 * reason applicability cannot be expressed as a single risk tier.
 *
 * The governing doctrine here is that ambiguity resolves to NOT_ASSESSED, never
 * to a comfortable answer. An organization that has not said where it operates
 * must not be told California is irrelevant to it.
 *
 * lawReviewedAsOf: see ADMT_RULES_LAW_REVIEWED_AS_OF. California legal sign-off
 * is PENDING — treat every rationale here as editorial until it is reviewed.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import type { JurisdictionId } from "./jurisdictions";
import { resolveEffectiveJurisdictions } from "./jurisdictions";

/**
 * Rule-pack version. Bump on any content change (vocabularies, resolver
 * behaviour, reason keys) so exported artifacts can state which revision
 * produced them. See src/config/rule-pack-versions.ts.
 */
export const ADMT_RULES_VERSION = "2026.08.1";
export const ADMT_RULES_LAW_REVIEWED_AS_OF = "2026-08-19";

export interface LocalizedText {
  en: string;
  es: string;
}

/** Appended to every rationale until California counsel signs the pack off. */
export const ADMT_RULES_REVIEW_MARKER: LocalizedText = {
  en: `Law reviewed as of ${ADMT_RULES_LAW_REVIEWED_AS_OF}; California legal sign-off pending.`,
  es: `Revisión jurídica a fecha de ${ADMT_RULES_LAW_REVIEWED_AS_OF}; pendiente de validación jurídica en California.`,
};

// ---------------------------------------------------------------------------
// Vocabularies (the seed imports these — they are the single source)
// ---------------------------------------------------------------------------

/**
 * § 7001(ddd)(1)-(5). The FINAL text narrowed this list considerably; earlier
 * drafts reached "access to" goods and services, which did not survive.
 *
 * § 7001(ddd)(6) is as important as the five that are here: "Significant
 * decision does not include advertising to a consumer." A recommender or a
 * behavioural-advertising model is therefore outside Article 11 entirely.
 */
export const SIGNIFICANT_DECISION_DOMAINS = [
  "financial_lending",
  "housing",
  "education_enrollment",
  "employment_contracting",
  "healthcare",
] as const;
export type SignificantDecisionDomain =
  (typeof SIGNIFICANT_DECISION_DOMAINS)[number];

/**
 * § 7150(b)(1)-(6). Note (1): merely selling or sharing personal information
 * triggers a risk assessment, which is why this regime reaches organizations
 * that believe they run no consequential AI at all.
 */
export const RISK_ASSESSMENT_TRIGGERS = [
  "sell_share_pi",
  "sensitive_pi",
  "admt_significant_decision",
  "work_education_profiling",
  "sensitive_location_profiling",
  "training_admt_or_biometric",
] as const;
export type RiskAssessmentTrigger = (typeof RISK_ASSESSMENT_TRIGGERS)[number];

/**
 * § 7221(b)(1)-(3), the CLOSED list of opt-out exceptions.
 *
 * There are three. Security, fraud prevention and physical safety are NOT among
 * them — in the final text they survive only as limits on what must be
 * DISCLOSED (§ 7220(d), § 7222(c)), not as grounds for withholding the opt-out.
 * Earlier drafts did treat them as an exception, which is exactly why the error
 * is common and why this list is closed.
 */
export const OPT_OUT_EXCEPTIONS = [
  "HUMAN_APPEAL_7221_B_1",
  "ADMISSION_ACCEPTANCE_HIRING_7221_B_2",
  "ALLOCATION_COMPENSATION_7221_B_3",
] as const;
export type OptOutException = (typeof OPT_OUT_EXCEPTIONS)[number];

/**
 * Tag vocabulary written onto ComplianceRequirement.applicabilityTags by the
 * seed and matched by `hasSome` at query time. The resolver returns the subset
 * a given system's facts select; an empty result creates nothing.
 */
export const ADMT_APPLICABILITY_TAGS = [
  "jurisdiction:US_CA",
  "admt:art9",
  "admt:art10",
  "admt:art10:trigger:sell_share_pi",
  "admt:art10:trigger:sensitive_pi",
  "admt:art10:trigger:admt_significant_decision",
  "admt:art10:trigger:work_education_profiling",
  "admt:art10:trigger:sensitive_location_profiling",
  "admt:art10:trigger:training_admt_or_biometric",
  "admt:art11",
  "admt:art11:optout_exception",
  "admt:org",
] as const;
export type AdmtApplicabilityTag = (typeof ADMT_APPLICABILITY_TAGS)[number];

/** Tag for one § 7150(b) trigger. */
export function triggerTag(
  trigger: RiskAssessmentTrigger,
): AdmtApplicabilityTag {
  return `admt:art10:trigger:${trigger}` as AdmtApplicabilityTag;
}

// ---------------------------------------------------------------------------
// Prisma enum mirrors
// ---------------------------------------------------------------------------

export type AdmtDeterminationValue =
  | "NOT_ASSESSED"
  | "NOT_ADMT"
  | "ADMT"
  | "ADMT_EXCLUDED_7001_E_3";

export type AdmtProngStatusValue =
  | "NOT_ASSESSED"
  | "SATISFIED"
  | "NOT_SATISFIED";

export type AdmtSoleFactorValue =
  | "NOT_ASSESSED"
  | "SOLE_FACTOR"
  | "ONE_OF_SEVERAL"
  | "NOT_USED";

export type AdmtOptOutBasisValue =
  | "NOT_ASSESSED"
  | "NONE_OPT_OUT_OFFERED"
  | OptOutException;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** Whether the org meets a CCPA "business" threshold (Civ. Code § 1798.140(d)). */
export type CoveredBusinessAnswer = "YES" | "NO" | "NOT_ASSESSED";

export type RevenueBand =
  | "OVER_100M"
  | "BETWEEN_50M_AND_100M"
  | "UNDER_50M"
  | "NOT_ASSESSED";

export interface AdmtOrgFacts {
  operatingJurisdictions: readonly JurisdictionId[];
  coveredBusiness: CoveredBusinessAnswer;
  revenueBand: RevenueBand;
}

export interface AdmtProngs {
  /** § 7001(e)(1)(A) — knows how to interpret and use the output. */
  interpretOutput: AdmtProngStatusValue;
  /** § 7001(e)(1)(B) — reviews the output and other relevant information. */
  reviewsOutputAndOtherInfo: AdmtProngStatusValue;
  /** § 7001(e)(1)(C) — has authority to make or change the decision. */
  authorityToChange: AdmtProngStatusValue;
}

export interface AdmtSystemFacts {
  /** Narrowing-only per-system jurisdictions; empty inherits the org set. */
  jurisdictionOverride: readonly JurisdictionId[];
  /** Null/absent means no profile row exists at all. */
  determination: AdmtDeterminationValue | null;
  prongs: AdmtProngs | null;
  significantDecisionDomains: readonly string[];
  riskAssessmentTriggers: readonly string[];
  soleFactor: AdmtSoleFactorValue;
  optOutBasis: AdmtOptOutBasisValue;
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export type AdmtScopeState =
  /** Nobody has said where the organization operates. NOT "out of scope". */
  | "JURISDICTION_UNDECLARED"
  /** System override ∩ org set = ∅ — a data problem for a human, not a zero. */
  | "JURISDICTION_CONFLICT"
  /** Declared jurisdictions genuinely exclude California. */
  | "OUT_OF_SCOPE_NO_CA_NEXUS"
  /** California nexus, but nobody has answered the business-threshold screen. */
  | "COVERED_BUSINESS_NOT_ASSESSED"
  /** No ADMT profile, or the § 7001(e) determination is unanswered. */
  | "PROFILE_NOT_ASSESSED"
  /** Risk-assessment duties attach; no significant decision, so no Article 11. */
  | "ARTICLE_10_ONLY"
  /** Significant decision by ADMT: notice, opt-out and access all attach. */
  | "ARTICLE_10_AND_11";

/** Machine-readable reasons; the UI renders them from i18n keys, never prose. */
export type AdmtReasonKey =
  | "jurisdictionsUndeclared"
  | "jurisdictionConflict"
  | "noCaliforniaNexus"
  | "coveredBusinessUnanswered"
  | "coveredBusinessNo"
  | "noProfile"
  | "determinationUnanswered"
  | "prongsUnresolved"
  | "excludedTechnology"
  | "humanInvolvementSubstantive"
  | "prongFailedInterpret"
  | "prongFailedReview"
  | "prongFailedAuthority"
  | "noSignificantDecision"
  | "significantDecisionPresent"
  | "riskAssessmentTriggersPresent"
  | "noRiskAssessmentTriggers"
  | "optOutExceptionRelied";

/** A question whose answer would move the system out of an undetermined state. */
export type AdmtOpenQuestionKey =
  | "declareJurisdictions"
  | "answerCoveredBusiness"
  | "createProfile"
  | "answerDetermination"
  | "answerProngs"
  | "answerSignificantDecisionDomains"
  | "answerRiskAssessmentTriggers"
  | "answerSoleFactor"
  | "answerOptOutBasis"
  | "evidenceWorksForPurpose"
  | "evidenceNonDiscrimination";

export interface AdmtDeterminationResult {
  /** null when unresolved. Never coerced to false anywhere. */
  isAdmt: boolean | null;
  decidedBy:
    | "declared"
    | "prong_failed"
    | "excluded_7001_e_3"
    | "prongs_satisfied"
    | null;
  failedProng: "A" | "B" | "C" | null;
}

export interface AdmtScopeResult {
  state: AdmtScopeState;
  /**
   * Tags to feed `applicabilityTags: { hasSome: tags }`. EMPTY unless the state
   * is ARTICLE_10_ONLY or ARTICLE_10_AND_11 — this is the mechanism that stops
   * requirement rows being created for systems the regime does not reach.
   */
  tags: AdmtApplicabilityTag[];
  determination: AdmtDeterminationResult;
  reasons: AdmtReasonKey[];
  openQuestions: AdmtOpenQuestionKey[];
  /** Effective jurisdictions after applying any per-system narrowing. */
  effectiveJurisdictions: JurisdictionId[];
}

// ---------------------------------------------------------------------------
// § 7001(e) determination
// ---------------------------------------------------------------------------

/**
 * Resolve the § 7001(e) question: does this technology replace or substantially
 * replace human decisionmaking?
 *
 * § 7001(e)(1) makes human involvement a CONJUNCTIVE test. The asymmetry that
 * matters:
 *
 *   * ONE explicit NOT_SATISFIED is enough to conclude "this IS ADMT" — a
 *     reviewer who cannot overturn the output is not meaningful involvement,
 *     whatever else is true.
 *   * Concluding "this is NOT ADMT" requires ALL THREE prongs explicitly
 *     SATISFIED. Two satisfied and one unexamined is unresolved, not a pass.
 *
 * An explicit `determination` recorded by a human wins over the prongs: someone
 * who has done the analysis may record the conclusion directly.
 */
export function evaluateAdmtDefinition(
  prongs: AdmtProngs | null,
  determination: AdmtDeterminationValue | null,
): AdmtDeterminationResult {
  if (determination === "ADMT_EXCLUDED_7001_E_3") {
    // § 7001(e)(3): web hosting, firewalls, spam filtering, spellcheck,
    // calculators, databases, spreadsheets — provided they do not replace
    // human decisionmaking.
    return { isAdmt: false, decidedBy: "excluded_7001_e_3", failedProng: null };
  }
  if (determination === "ADMT") {
    return { isAdmt: true, decidedBy: "declared", failedProng: null };
  }
  if (determination === "NOT_ADMT") {
    return { isAdmt: false, decidedBy: "declared", failedProng: null };
  }

  if (!prongs) return { isAdmt: null, decidedBy: null, failedProng: null };

  // Any single failed prong decides it. Ordered A, B, C so the reported prong
  // is deterministic when more than one fails.
  if (prongs.interpretOutput === "NOT_SATISFIED") {
    return { isAdmt: true, decidedBy: "prong_failed", failedProng: "A" };
  }
  if (prongs.reviewsOutputAndOtherInfo === "NOT_SATISFIED") {
    return { isAdmt: true, decidedBy: "prong_failed", failedProng: "B" };
  }
  if (prongs.authorityToChange === "NOT_SATISFIED") {
    return { isAdmt: true, decidedBy: "prong_failed", failedProng: "C" };
  }

  const allSatisfied =
    prongs.interpretOutput === "SATISFIED" &&
    prongs.reviewsOutputAndOtherInfo === "SATISFIED" &&
    prongs.authorityToChange === "SATISFIED";

  return allSatisfied
    ? { isAdmt: false, decidedBy: "prongs_satisfied", failedProng: null }
    : { isAdmt: null, decidedBy: null, failedProng: null };
}

// ---------------------------------------------------------------------------
// Scope resolution
// ---------------------------------------------------------------------------

const EMPTY_DETERMINATION: AdmtDeterminationResult = {
  isAdmt: null,
  decidedBy: null,
  failedProng: null,
};

function unresolved(
  state: AdmtScopeState,
  reasons: AdmtReasonKey[],
  openQuestions: AdmtOpenQuestionKey[],
  effectiveJurisdictions: JurisdictionId[],
  determination: AdmtDeterminationResult = EMPTY_DETERMINATION,
): AdmtScopeResult {
  return {
    state,
    tags: [],
    determination,
    reasons,
    openQuestions,
    effectiveJurisdictions,
  };
}

/** Keep only vocabulary members, in canonical order, deduplicated. */
function normalize<T extends string>(
  values: readonly string[],
  vocabulary: readonly T[],
): T[] {
  const present = new Set(values);
  return vocabulary.filter((v) => present.has(v));
}

/**
 * Resolve California ADMT scope for one AI system.
 *
 * The order of the gates is deliberate: jurisdiction first (cheapest and most
 * commonly missing), then the covered-business screen, then the § 7001(e)
 * determination, and only then the Article 10 / Article 11 split.
 */
export function resolveAdmtScope(
  org: AdmtOrgFacts,
  system: AdmtSystemFacts,
): AdmtScopeResult {
  const { effective, state: jurisdictionState } = resolveEffectiveJurisdictions(
    org.operatingJurisdictions,
    system.jurisdictionOverride,
  );

  // Gate 1 — jurisdiction. Undeclared is NOT out-of-scope: telling a Californian
  // company that California does not apply is the failure this whole design
  // exists to prevent.
  if (jurisdictionState === "undeclared") {
    return unresolved(
      "JURISDICTION_UNDECLARED",
      ["jurisdictionsUndeclared"],
      ["declareJurisdictions"],
      [],
    );
  }
  if (jurisdictionState === "conflict") {
    return unresolved(
      "JURISDICTION_CONFLICT",
      ["jurisdictionConflict"],
      ["declareJurisdictions"],
      [],
    );
  }
  if (!effective.includes("US_CA")) {
    return unresolved(
      "OUT_OF_SCOPE_NO_CA_NEXUS",
      ["noCaliforniaNexus"],
      [],
      effective,
    );
  }

  // Gate 2 — covered business. "NO" is a real answer and ends the analysis;
  // "NOT_ASSESSED" leaves it open rather than assuming either way.
  if (org.coveredBusiness === "NOT_ASSESSED") {
    return unresolved(
      "COVERED_BUSINESS_NOT_ASSESSED",
      ["coveredBusinessUnanswered"],
      ["answerCoveredBusiness"],
      effective,
    );
  }
  if (org.coveredBusiness === "NO") {
    return unresolved(
      "OUT_OF_SCOPE_NO_CA_NEXUS",
      ["coveredBusinessNo"],
      [],
      effective,
    );
  }

  // Gate 3 — the § 7001(e) determination.
  const determination = evaluateAdmtDefinition(
    system.prongs,
    system.determination,
  );

  if (system.determination === null) {
    return unresolved(
      "PROFILE_NOT_ASSESSED",
      ["noProfile"],
      ["createProfile"],
      effective,
      determination,
    );
  }

  const triggers = normalize(
    system.riskAssessmentTriggers,
    RISK_ASSESSMENT_TRIGGERS,
  );
  const domains = normalize(
    system.significantDecisionDomains,
    SIGNIFICANT_DECISION_DOMAINS,
  );

  if (determination.isAdmt === null) {
    // Unresolved definition. Article 10 can still attach through a
    // non-ADMT trigger (selling/sharing PI, sensitive PI, profiling), so the
    // honest answer is "we cannot tell yet" rather than "nothing applies".
    const reasons: AdmtReasonKey[] =
      system.determination === "NOT_ASSESSED"
        ? ["determinationUnanswered"]
        : ["prongsUnresolved"];
    return unresolved(
      "PROFILE_NOT_ASSESSED",
      reasons,
      ["answerDetermination", "answerProngs"],
      effective,
      determination,
    );
  }

  // ── Positive scope ──────────────────────────────────────────────────
  const reasons: AdmtReasonKey[] = [];
  const openQuestions: AdmtOpenQuestionKey[] = [];
  const tags: AdmtApplicabilityTag[] = ["jurisdiction:US_CA", "admt:org"];

  if (determination.isAdmt === false) {
    reasons.push(
      determination.decidedBy === "excluded_7001_e_3"
        ? "excludedTechnology"
        : "humanInvolvementSubstantive",
    );
  } else {
    if (determination.failedProng === "A") reasons.push("prongFailedInterpret");
    if (determination.failedProng === "B") reasons.push("prongFailedReview");
    if (determination.failedProng === "C") reasons.push("prongFailedAuthority");
  }

  // Article 10 — risk assessments. Attaches on any § 7150(b) trigger, whether
  // or not the technology is ADMT.
  if (triggers.length > 0) {
    tags.push("admt:art10", ...triggers.map(triggerTag));
    reasons.push("riskAssessmentTriggersPresent");
  } else {
    reasons.push("noRiskAssessmentTriggers");
    openQuestions.push("answerRiskAssessmentTriggers");
  }

  // Article 11 — notice, opt-out, access. Requires BOTH that the technology is
  // ADMT and that it makes a significant decision. Either alone is not enough:
  // § 7001(ddd)(6) puts advertising outside the list however automated it is.
  const article11 = determination.isAdmt === true && domains.length > 0;

  if (article11) {
    tags.push("admt:art11");
    reasons.push("significantDecisionPresent");

    if (system.optOutBasis === "NOT_ASSESSED") {
      openQuestions.push("answerOptOutBasis");
    } else if (
      (OPT_OUT_EXCEPTIONS as readonly string[]).includes(system.optOutBasis)
    ) {
      tags.push("admt:art11:optout_exception");
      reasons.push("optOutExceptionRelied");
      // § 7221(b)(2) and (b)(3) are each a TWO-part test: the ADMT must work for
      // the business's purpose AND must not unlawfully discriminate. Relying on
      // one of them without that evidence is a gap, not a clean exception.
      if (
        system.optOutBasis === "ADMISSION_ACCEPTANCE_HIRING_7221_B_2" ||
        system.optOutBasis === "ALLOCATION_COMPENSATION_7221_B_3"
      ) {
        openQuestions.push(
          "evidenceWorksForPurpose",
          "evidenceNonDiscrimination",
        );
      }
    }

    if (system.soleFactor === "NOT_ASSESSED") {
      // § 7220(c)(5)(B) and § 7222(b)(3) both require stating whether the output
      // was the sole factor. Unknown must render as a blank with its citation,
      // never as "not the sole factor".
      openQuestions.push("answerSoleFactor");
    }
  } else if (determination.isAdmt === true) {
    reasons.push("noSignificantDecision");
    if (domains.length === 0) {
      openQuestions.push("answerSignificantDecisionDomains");
    }
  }

  return {
    state: article11 ? "ARTICLE_10_AND_11" : "ARTICLE_10_ONLY",
    tags,
    determination,
    reasons,
    openQuestions,
    effectiveJurisdictions: effective,
  };
}

/**
 * Organization-level scope: the duties that attach to the business rather than
 * to one system (§ 7157 filing, § 7102 metrics, § 7011 policy disclosures, and
 * the Article 9 cybersecurity audits).
 *
 * Article 9 tags are only emitted once a revenue band is known, because the
 * audit phase-in (1 Apr 2028 / 2029 / 2030) is keyed to it. An unanswered band
 * leaves the question open rather than assuming the smallest tier.
 */
export function resolveAdmtOrgScope(
  org: AdmtOrgFacts,
  systems: readonly AdmtSystemFacts[],
): AdmtScopeResult {
  const perSystem = systems.map((system) => resolveAdmtScope(org, system));

  const positive = perSystem.filter(
    (r) => r.state === "ARTICLE_10_ONLY" || r.state === "ARTICLE_10_AND_11",
  );

  if (positive.length === 0) {
    // Mirror the most informative system-level state so the UI can explain why
    // nothing attaches — and keep "undeclared" distinct from "out of scope".
    const orgOnly: AdmtSystemFacts = {
      jurisdictionOverride: [],
      determination: null,
      prongs: null,
      significantDecisionDomains: [],
      riskAssessmentTriggers: [],
      soleFactor: "NOT_ASSESSED",
      optOutBasis: "NOT_ASSESSED",
    };
    return resolveAdmtScope(org, orgOnly);
  }

  const tags = new Set<AdmtApplicabilityTag>(["jurisdiction:US_CA", "admt:org"]);
  const reasons = new Set<AdmtReasonKey>();
  const openQuestions = new Set<AdmtOpenQuestionKey>();

  for (const result of positive) {
    for (const tag of result.tags) tags.add(tag);
    for (const reason of result.reasons) reasons.add(reason);
    for (const question of result.openQuestions) openQuestions.add(question);
  }

  if (org.revenueBand === "NOT_ASSESSED") {
    openQuestions.add("answerCoveredBusiness");
  } else {
    tags.add("admt:art9");
  }

  const anyArticle11 = positive.some((r) => r.state === "ARTICLE_10_AND_11");

  return {
    state: anyArticle11 ? "ARTICLE_10_AND_11" : "ARTICLE_10_ONLY",
    tags: ADMT_APPLICABILITY_TAGS.filter((tag) => tags.has(tag)),
    determination: EMPTY_DETERMINATION,
    reasons: [...reasons],
    openQuestions: [...openQuestions],
    effectiveJurisdictions: positive[0].effectiveJurisdictions,
  };
}
