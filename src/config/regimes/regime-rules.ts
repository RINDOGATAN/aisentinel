// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Deterministic scope rules for the regime frameworks (GDPR, Colorado
 * SB 26-189, Texas TRAIGA, Washington domain instruments).
 *
 * Same contract as the California ADMT resolver: a regime emits tags only when
 * the facts positively put a system in scope. An undeclared jurisdiction or an
 * unanswered screening question yields UNDETERMINED with open questions, never
 * a quiet "nothing applies" and never a flood of requirements. Jurisdiction
 * tags say whether a regime reaches the organisation; selector tags pick the
 * rows. Pure — no DB, no network.
 */

import type { JurisdictionId } from "@/config/jurisdictions";
import type { RegimeFrameworkCode } from "./types";

export const REGIME_RULES_VERSION = "2026.09.1";
export const REGIME_RULES_LAW_REVIEWED_AS_OF = "2026-09-08";

export type ScreeningAnswer = "YES" | "NO" | "NOT_ASSESSED";

/** Organisation-level screening facts, stored under `Organization.settings.regimes`. */
export interface RegimeOrgFacts {
  operatingJurisdictions: readonly JurisdictionId[];
  /** Washington RCW 43.105 / Texas TRAIGA government duties. */
  isPublicAgency: ScreeningAnswer;
  /** Washington SB 5395 / RCW 48.43.830: a health carrier deciding prior authorisation. */
  isHealthCarrier: ScreeningAnswer;
  /** Texas TRAIGA § 552.051(b): health care service providers disclosing AI use in treatment. */
  isHealthcareProvider: ScreeningAnswer;
  /** Washington HB 1170 covered provider: a generative AI system with more than one million monthly users. */
  isCoveredGenAiProvider: ScreeningAnswer;
  /** Washington MHMDA: processes consumer health data of Washington consumers, including inferred health data. */
  processesConsumerHealthData: ScreeningAnswer;
}

/** System-level screening facts, stored under `AISystem.metadata.regimeFacts`. */
export interface RegimeSystemFacts {
  jurisdictionOverride: readonly JurisdictionId[];
  technique: string;
  role: string;
  processesPersonalData: boolean;
  riskLevel: string | null;
  annexIiiCategory: string | null;
  /** From the ADMT profile when one exists. */
  admtDetermination: string | null;
  significantDecisionDomains: readonly string[];
  admtSoleFactor: string | null;
  /** GDPR Art. 22: a decision based solely on automated processing with legal or similarly significant effects. */
  solelyAutomatedLegalEffect: ScreeningAnswer;
  /** GDPR Art. 9 / MHMDA: processes special-category or health data. */
  processesSpecialCategoryData: ScreeningAnswer;
  /** Colorado: the system materially influences a consequential decision about a consumer. */
  materiallyInfluencesConsequentialDecision: ScreeningAnswer;
  /** Washington HB 2225: an AI companion chatbot (sustained, human-like relationship). */
  isCompanionChatbot: ScreeningAnswer;
  /** Washington SB 5395: used in prior-authorisation determinations. */
  usedInPriorAuthorization: ScreeningAnswer;
  /** Texas / Colorado: consumers interact with the system directly. */
  interactsWithConsumers: ScreeningAnswer;
  /**
   * Does this system hand its output to an autonomous downstream agent that
   * can act without a person? Drives the agentic overlay and stress test. Not
   * a regime scope input: no statute keys off it yet, which is precisely the
   * gap the agentic addendum documents.
   */
  handsOffToAutonomousAgent: ScreeningAnswer;
}

export type RegimeScopeState = "IN_SCOPE" | "OUT_OF_SCOPE" | "UNDETERMINED";

export type RegimeOpenQuestion =
  | "declare-jurisdictions"
  | "solely-automated"
  | "special-category"
  | "consequential-decision"
  | "public-agency"
  | "health-carrier"
  | "healthcare-provider"
  | "covered-genai-provider"
  | "consumer-health-data"
  | "companion-chatbot"
  | "prior-authorization"
  | "interacts-with-consumers";

export interface RegimeScope {
  framework: RegimeFrameworkCode;
  state: RegimeScopeState;
  tags: string[];
  /** Why it applies, or why it does not. Keys are translated in the UI. */
  reasons: string[];
  openQuestions: RegimeOpenQuestion[];
}

const GDPR_JURISDICTIONS: readonly JurisdictionId[] = ["EU", "EEA", "UK"];

function effectiveJurisdictions(org: RegimeOrgFacts, sys: RegimeSystemFacts): readonly JurisdictionId[] {
  if (sys.jurisdictionOverride.length > 0) return sys.jurisdictionOverride;
  return org.operatingJurisdictions;
}

function hasAny(list: readonly JurisdictionId[], wanted: readonly JurisdictionId[]): boolean {
  return wanted.some((j) => list.includes(j));
}

/** Screening answers that were never given block a positive finding. */
function pending(...answers: ScreeningAnswer[]): boolean {
  return answers.some((a) => a === "NOT_ASSESSED");
}

const ADMT_POSITIVE = new Set(["ADMT"]);

export function resolveGdprScope(org: RegimeOrgFacts, sys: RegimeSystemFacts): RegimeScope {
  const framework = "EU_GDPR";
  const jurisdictions = effectiveJurisdictions(org, sys);
  if (jurisdictions.length === 0) {
    return { framework, state: "UNDETERMINED", tags: [], reasons: ["no-jurisdictions"], openQuestions: ["declare-jurisdictions"] };
  }
  if (!hasAny(jurisdictions, GDPR_JURISDICTIONS)) {
    return { framework, state: "OUT_OF_SCOPE", tags: [], reasons: ["no-eu-nexus"], openQuestions: [] };
  }
  if (!sys.processesPersonalData) {
    return { framework, state: "OUT_OF_SCOPE", tags: [], reasons: ["no-personal-data"], openQuestions: [] };
  }
  const tags = ["jurisdiction:EU", "gdpr:core"];
  const reasons = ["personal-data-in-eu"];
  const openQuestions: RegimeOpenQuestion[] = [];

  // Art. 22: an explicit answer wins; the ADMT sole-factor finding is a
  // reliable proxy when the explicit question was never asked.
  const soleFactorProxy = sys.admtSoleFactor === "SOLE_FACTOR" && sys.admtDetermination !== null && ADMT_POSITIVE.has(sys.admtDetermination);
  if (sys.solelyAutomatedLegalEffect === "YES" || (sys.solelyAutomatedLegalEffect === "NOT_ASSESSED" && soleFactorProxy)) {
    tags.push("gdpr:adm");
    reasons.push(sys.solelyAutomatedLegalEffect === "YES" ? "solely-automated-declared" : "solely-automated-from-admt");
  } else if (sys.solelyAutomatedLegalEffect === "NOT_ASSESSED") {
    openQuestions.push("solely-automated");
  }

  // Art. 35: high-risk processing. Annex III high-risk systems and profiling
  // with significant effects are named in the Art. 35(3) list and the EDPB
  // criteria; special-category data at scale is a second trigger.
  const dpiaFromRisk = sys.riskLevel === "HIGH" || sys.annexIiiCategory !== null;
  const dpiaFromAdm = tags.includes("gdpr:adm");
  if (dpiaFromRisk || dpiaFromAdm || sys.processesSpecialCategoryData === "YES") {
    tags.push("gdpr:dpia");
    reasons.push(dpiaFromRisk ? "dpia-high-risk" : dpiaFromAdm ? "dpia-automated-decision" : "dpia-special-category");
  }
  if (sys.processesSpecialCategoryData === "YES") {
    tags.push("gdpr:special");
  } else if (sys.processesSpecialCategoryData === "NOT_ASSESSED") {
    openQuestions.push("special-category");
  }
  return { framework, state: "IN_SCOPE", tags, reasons, openQuestions };
}

export function resolveColoradoScope(org: RegimeOrgFacts, sys: RegimeSystemFacts): RegimeScope {
  const framework = "CO_SB_26_189";
  const jurisdictions = effectiveJurisdictions(org, sys);
  if (jurisdictions.length === 0) {
    return { framework, state: "UNDETERMINED", tags: [], reasons: ["no-jurisdictions"], openQuestions: ["declare-jurisdictions"] };
  }
  if (!jurisdictions.includes("US_CO")) {
    return { framework, state: "OUT_OF_SCOPE", tags: [], reasons: ["no-colorado-nexus"], openQuestions: [] };
  }
  // Covered ADMT: materially influences a consequential decision. An explicit
  // answer wins; a positive California ADMT determination with a significant-
  // decision domain is the proxy, because the two domain lists coincide.
  const proxy = sys.admtDetermination !== null && ADMT_POSITIVE.has(sys.admtDetermination) && sys.significantDecisionDomains.length > 0;
  let covered: ScreeningAnswer = sys.materiallyInfluencesConsequentialDecision;
  let reason = "consequential-decision-declared";
  if (covered === "NOT_ASSESSED" && proxy) {
    covered = "YES";
    reason = "consequential-decision-from-admt";
  }
  if (covered === "NOT_ASSESSED") {
    return { framework, state: "UNDETERMINED", tags: [], reasons: ["consequential-decision-unknown"], openQuestions: ["consequential-decision"] };
  }
  if (covered === "NO") {
    return { framework, state: "OUT_OF_SCOPE", tags: [], reasons: ["not-covered-admt"], openQuestions: [] };
  }
  const tags = ["jurisdiction:US_CO", "co:core"];
  const reasons = [reason];
  if (sys.role === "PROVIDER") {
    tags.push("co:developer");
    reasons.push("role-developer");
  } else {
    tags.push("co:deployer");
    reasons.push("role-deployer");
  }
  return { framework, state: "IN_SCOPE", tags, reasons, openQuestions: [] };
}

export function resolveTexasScope(org: RegimeOrgFacts, sys: RegimeSystemFacts): RegimeScope {
  const framework = "TX_TRAIGA";
  const jurisdictions = effectiveJurisdictions(org, sys);
  if (jurisdictions.length === 0) {
    return { framework, state: "UNDETERMINED", tags: [], reasons: ["no-jurisdictions"], openQuestions: ["declare-jurisdictions"] };
  }
  if (!jurisdictions.includes("US_TX")) {
    return { framework, state: "OUT_OF_SCOPE", tags: [], reasons: ["no-texas-nexus"], openQuestions: [] };
  }
  // The prohibitions reach every developer and deployer doing business in
  // Texas; the disclosure duties are sector-gated.
  const tags = ["jurisdiction:US_TX", "tx:core"];
  const reasons = ["doing-business-in-texas"];
  const openQuestions: RegimeOpenQuestion[] = [];
  if (org.isPublicAgency === "YES") {
    tags.push("tx:government");
    reasons.push("public-agency");
  } else if (org.isPublicAgency === "NOT_ASSESSED") {
    openQuestions.push("public-agency");
  }
  if (org.isHealthcareProvider === "YES") {
    tags.push("tx:healthcare");
    reasons.push("healthcare-provider");
  } else if (org.isHealthcareProvider === "NOT_ASSESSED") {
    openQuestions.push("healthcare-provider");
  }
  if (sys.interactsWithConsumers === "NOT_ASSESSED" && org.isPublicAgency === "YES") {
    openQuestions.push("interacts-with-consumers");
  }
  return { framework, state: "IN_SCOPE", tags, reasons, openQuestions };
}

export function resolveWashingtonScope(org: RegimeOrgFacts, sys: RegimeSystemFacts): RegimeScope {
  const framework = "WA_AI_RULES";
  const jurisdictions = effectiveJurisdictions(org, sys);
  if (jurisdictions.length === 0) {
    return { framework, state: "UNDETERMINED", tags: [], reasons: ["no-jurisdictions"], openQuestions: ["declare-jurisdictions"] };
  }
  if (!jurisdictions.includes("US_WA")) {
    return { framework, state: "OUT_OF_SCOPE", tags: [], reasons: ["no-washington-nexus"], openQuestions: [] };
  }
  const tags: string[] = [];
  const reasons: string[] = [];
  const openQuestions: RegimeOpenQuestion[] = [];

  // My Health My Data Act: consumer health data, including health inferred
  // by algorithms from non-health data.
  const healthData = sys.processesSpecialCategoryData === "YES" || org.processesConsumerHealthData === "YES";
  if (sys.processesPersonalData && healthData) {
    tags.push("wa:mhmda");
    reasons.push("consumer-health-data");
  } else if (sys.processesPersonalData && pending(sys.processesSpecialCategoryData, org.processesConsumerHealthData)) {
    openQuestions.push("consumer-health-data");
  }

  // HB 1170: provenance data from covered generative AI providers.
  if (sys.technique === "GENERATIVE_AI" && sys.role === "PROVIDER") {
    if (org.isCoveredGenAiProvider === "YES") {
      tags.push("wa:genai-provenance");
      reasons.push("covered-genai-provider");
    } else if (org.isCoveredGenAiProvider === "NOT_ASSESSED") {
      openQuestions.push("covered-genai-provider");
    }
  }

  // HB 2225: AI companion chatbots.
  if (sys.isCompanionChatbot === "YES") {
    tags.push("wa:companion");
    reasons.push("companion-chatbot");
  } else if (sys.isCompanionChatbot === "NOT_ASSESSED" && (sys.technique === "GENERATIVE_AI" || sys.technique === "AGENTIC_AI" || sys.technique === "NLP")) {
    openQuestions.push("companion-chatbot");
  }

  // SB 5395 / RCW 48.43.830: prior authorisation by health carriers.
  if (org.isHealthCarrier === "YES") {
    if (sys.usedInPriorAuthorization === "YES") {
      tags.push("wa:prior-auth");
      reasons.push("prior-authorization");
    } else if (sys.usedInPriorAuthorization === "NOT_ASSESSED") {
      openQuestions.push("prior-authorization");
    }
  } else if (org.isHealthCarrier === "NOT_ASSESSED") {
    openQuestions.push("health-carrier");
  }

  // RCW 43.105: public agencies' automated decision systems.
  if (org.isPublicAgency === "YES") {
    tags.push("wa:public-agency");
    reasons.push("public-agency");
  } else if (org.isPublicAgency === "NOT_ASSESSED") {
    openQuestions.push("public-agency");
  }

  if (tags.length === 0) {
    return openQuestions.length > 0
      ? { framework, state: "UNDETERMINED", tags: [], reasons: ["no-instrument-yet"], openQuestions }
      : { framework, state: "OUT_OF_SCOPE", tags: [], reasons: ["no-instrument-applies"], openQuestions: [] };
  }
  return { framework, state: "IN_SCOPE", tags: ["jurisdiction:US_WA", ...tags], reasons, openQuestions };
}

export function resolveAllRegimeScopes(org: RegimeOrgFacts, sys: RegimeSystemFacts): RegimeScope[] {
  return [
    resolveGdprScope(org, sys),
    resolveColoradoScope(org, sys),
    resolveTexasScope(org, sys),
    resolveWashingtonScope(org, sys),
  ];
}

/** Every selector tag a regime pack may use; content tests check membership. */
export const REGIME_SELECTOR_TAGS = [
  "gdpr:core", "gdpr:adm", "gdpr:dpia", "gdpr:special",
  "co:core", "co:developer", "co:deployer",
  "tx:core", "tx:government", "tx:healthcare",
  "wa:mhmda", "wa:genai-provenance", "wa:companion", "wa:prior-auth", "wa:public-agency",
] as const;
export type RegimeSelectorTag = (typeof REGIME_SELECTOR_TAGS)[number];

export const DEFAULT_ORG_FACTS: Omit<RegimeOrgFacts, "operatingJurisdictions"> = {
  isPublicAgency: "NOT_ASSESSED",
  isHealthCarrier: "NOT_ASSESSED",
  isHealthcareProvider: "NOT_ASSESSED",
  isCoveredGenAiProvider: "NOT_ASSESSED",
  processesConsumerHealthData: "NOT_ASSESSED",
};

export const DEFAULT_SYSTEM_SCREENING: Pick<
  RegimeSystemFacts,
  | "solelyAutomatedLegalEffect"
  | "processesSpecialCategoryData"
  | "materiallyInfluencesConsequentialDecision"
  | "isCompanionChatbot"
  | "usedInPriorAuthorization"
  | "interactsWithConsumers"
  | "handsOffToAutonomousAgent"
> = {
  solelyAutomatedLegalEffect: "NOT_ASSESSED",
  processesSpecialCategoryData: "NOT_ASSESSED",
  materiallyInfluencesConsequentialDecision: "NOT_ASSESSED",
  isCompanionChatbot: "NOT_ASSESSED",
  usedInPriorAuthorization: "NOT_ASSESSED",
  interactsWithConsumers: "NOT_ASSESSED",
  handsOffToAutonomousAgent: "NOT_ASSESSED",
};
