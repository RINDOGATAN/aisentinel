// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One system's complete regulatory picture.
 *
 * Loads the organisation's screening facts, the system's registry facts, the
 * California ADMT profile, the risk classification and the Art. 50 profile,
 * runs every deterministic resolver over them, and returns the overlay tags
 * that select the unified assessment's questions.
 *
 * This is the single place the routers, the unified assessment and the artifact
 * generators agree on scope. Reading it twice in two places is how the
 * compliance matrix and the generated notice would come to disagree about which
 * regimes apply, which is the one inconsistency a practitioner cannot forgive.
 */

import { TRPCError } from "@trpc/server";
import type { JurisdictionId } from "@/config/jurisdictions";
import {
  resolveAdmtScope,
  type AdmtOrgFacts,
  type AdmtProngStatusValue,
  type AdmtSystemFacts,
  type AdmtScopeResult,
  type CoveredBusinessAnswer,
  type RevenueBand,
  type ScreeningAnswer as AdmtScreeningAnswer,
} from "@/config/admt-rules";
import {
  resolveAllRegimeScopes,
  type RegimeOrgFacts,
  type RegimeScope,
  type RegimeSystemFacts,
  type ScreeningAnswer,
} from "@/config/regimes";
import { deriveOverlayTags, undeterminedRegimes } from "@/lib/overlay-tags";
import {
  assessAgent,
  autonomyIsAgentic,
  EMPTY_AGENT_FACTS,
  type AgentAssessment,
  type AgentAutonomyValue,
  type AgentProfileFacts,
} from "@/config/agent-rules";
import type { OverlayTag } from "@/config/unified-assessment";

/**
 * The Prisma surface this service needs. Typed loosely on purpose: the pure
 * assembly below is what carries the logic and is tested directly, and a
 * structural type here would have to restate Prisma's generated argument types.
 */
export interface ScopePrisma {
  aISystem: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findFirst: (args: any) => Promise<any>;
  };
  organization: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: (args: any) => Promise<any>;
  };
}

function answer(v: unknown): ScreeningAnswer {
  return v === "YES" || v === "NO" ? v : "NOT_ASSESSED";
}

/**
 * Only three of the ADMT resolver's states are actual answers. The rest mean
 * nobody has decided yet, and an undecided scope must contribute no tags —
 * otherwise "we do not know" renders as "none of this applies to you".
 */
const ADMT_RESOLVED = new Set(["OUT_OF_SCOPE_NO_CA_NEXUS", "ARTICLE_10_ONLY", "ARTICLE_10_AND_11"]);

export interface SystemScope {
  system: {
    id: string;
    name: string;
    technique: string;
    role: string;
    status: string;
    processesPersonalData: boolean;
    purpose: string | null;
    description: string | null;
    businessOwner: string | null;
    technicalOwner: string | null;
  };
  organizationName: string;
  jurisdictions: JurisdictionId[];
  jurisdictionsDeclared: boolean;
  riskLevel: string | null;
  annexIiiCategory: string | null;
  hasArt50Obligation: boolean;
  admt: AdmtScopeResult;
  admtResolved: boolean;
  /** The agent facts as recorded, and what they imply. */
  agent: AgentProfileFacts;
  agentAssessment: AgentAssessment;
  regimes: RegimeScope[];
  overlayTags: OverlayTag[];
  undetermined: { framework: string; openQuestions: string[] }[];
}

const SYSTEM_INCLUDE = {
  riskClassification: { select: { riskLevel: true, annexIIICategory: true } },
  admtProfile: {
    select: {
      determination: true,
      prongInterpretOutput: true,
      prongReviewsOutputAndOtherInfo: true,
      prongAuthorityToChange: true,
      significantDecisionDomains: true,
      riskAssessmentTriggers: true,
      soleFactor: true,
      optOutBasis: true,
      designatedReviewer: true,
      appealRouteDescription: true,
    },
  },
  agentProfile: {
    select: {
      autonomy: true,
      actionScope: true,
      downstreamAgents: true,
      tools: true,
      humanSponsor: true,
      killSwitch: true,
      killSwitchTestedAt: true,
      reversalWindow: true,
      traceability: true,
    },
  },
  transparencyProfile: {
    select: {
      art50InteractionStatus: true,
      art50MarkingStatus: true,
      art50EmotionStatus: true,
      art50DeepfakeStatus: true,
      markingMethods: true,
    },
  },
} as const;

interface RawSystem {
  id: string;
  name: string;
  technique: string;
  role: string;
  status: string;
  purpose: string | null;
  description: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  processesPersonalData: boolean;
  jurisdictionOverride: string[];
  metadata: unknown;
  riskClassification: { riskLevel: string; annexIIICategory: string | null } | null;
  admtProfile: {
    determination: string;
    prongInterpretOutput: string;
    prongReviewsOutputAndOtherInfo: string;
    prongAuthorityToChange: string;
    significantDecisionDomains: string[];
    riskAssessmentTriggers: string[];
    soleFactor: string;
    optOutBasis: string;
    designatedReviewer: string | null;
    appealRouteDescription: string | null;
  } | null;
  agentProfile: {
    autonomy: string;
    actionScope: string | null;
    downstreamAgents: string | null;
    tools: string[];
    humanSponsor: string | null;
    killSwitch: string | null;
    killSwitchTestedAt: Date | null;
    reversalWindow: string | null;
    traceability: string | null;
  } | null;
  transparencyProfile: {
    art50InteractionStatus: string;
    art50MarkingStatus: string;
    art50EmotionStatus: string;
    art50DeepfakeStatus: string;
    markingMethods: string[];
  } | null;
}

interface RawOrg {
  name: string;
  operatingJurisdictions: string[];
  settings: unknown;
}

/** Pure assembly, exported so it can be tested without a database. */
export function buildSystemScope(system: RawSystem, org: RawOrg | null): SystemScope {
  const jurisdictions = (org?.operatingJurisdictions ?? []) as JurisdictionId[];
  const orgSettings = (org?.settings ?? null) as {
    admt?: Record<string, unknown>;
    regimes?: Record<string, unknown>;
  } | null;
  const admtSettings = orgSettings?.admt ?? {};
  const regimeSettings = orgSettings?.regimes ?? {};
  const meta = (system.metadata ?? null) as { regimeFacts?: Record<string, unknown> } | null;
  const systemRegimeFacts = meta?.regimeFacts ?? {};

  const admtOrgFacts: AdmtOrgFacts = {
    operatingJurisdictions: jurisdictions,
    coveredBusiness: (admtSettings.coveredBusiness as CoveredBusinessAnswer) ?? "NOT_ASSESSED",
    revenueBand: (admtSettings.revenueBand as RevenueBand) ?? "NOT_ASSESSED",
    sellShareRevenue50Plus: (admtSettings.sellShareRevenue50Plus as AdmtScreeningAnswer) ?? "NOT_ASSESSED",
    revenueOverCcpaThreshold: (admtSettings.revenueOverCcpaThreshold as AdmtScreeningAnswer) ?? "NOT_ASSESSED",
    largeProcessingVolume: (admtSettings.largeProcessingVolume as AdmtScreeningAnswer) ?? "NOT_ASSESSED",
  };

  const profile = system.admtProfile;
  const admtSystemFacts: AdmtSystemFacts = profile
    ? {
        jurisdictionOverride: system.jurisdictionOverride as JurisdictionId[],
        determination: profile.determination as AdmtSystemFacts["determination"],
        prongs: {
          interpretOutput: profile.prongInterpretOutput as AdmtProngStatusValue,
          reviewsOutputAndOtherInfo: profile.prongReviewsOutputAndOtherInfo as AdmtProngStatusValue,
          authorityToChange: profile.prongAuthorityToChange as AdmtProngStatusValue,
        },
        significantDecisionDomains: profile.significantDecisionDomains,
        riskAssessmentTriggers: profile.riskAssessmentTriggers,
        soleFactor: profile.soleFactor as AdmtSystemFacts["soleFactor"],
        optOutBasis: profile.optOutBasis as AdmtSystemFacts["optOutBasis"],
      }
    : {
        jurisdictionOverride: system.jurisdictionOverride as JurisdictionId[],
        determination: null,
        prongs: null,
        significantDecisionDomains: [],
        riskAssessmentTriggers: [],
        soleFactor: "NOT_ASSESSED",
        optOutBasis: "NOT_ASSESSED",
      };

  const admt = resolveAdmtScope(admtOrgFacts, admtSystemFacts);
  const admtResolved = ADMT_RESOLVED.has(admt.state);

  const regimeOrgFacts: RegimeOrgFacts = {
    operatingJurisdictions: jurisdictions,
    isPublicAgency: answer(regimeSettings.isPublicAgency),
    isHealthCarrier: answer(regimeSettings.isHealthCarrier),
    isHealthcareProvider: answer(regimeSettings.isHealthcareProvider),
    isCoveredGenAiProvider: answer(regimeSettings.isCoveredGenAiProvider),
    processesConsumerHealthData: answer(regimeSettings.processesConsumerHealthData),
  };

  const regimeSystemFacts: RegimeSystemFacts = {
    jurisdictionOverride: system.jurisdictionOverride as JurisdictionId[],
    technique: system.technique,
    role: system.role,
    processesPersonalData: system.processesPersonalData,
    riskLevel: system.riskClassification?.riskLevel ?? null,
    annexIiiCategory: system.riskClassification?.annexIIICategory ?? null,
    admtDetermination: profile?.determination ?? null,
    significantDecisionDomains: profile?.significantDecisionDomains ?? [],
    admtSoleFactor: profile?.soleFactor ?? null,
    solelyAutomatedLegalEffect: answer(systemRegimeFacts.solelyAutomatedLegalEffect),
    processesSpecialCategoryData: answer(systemRegimeFacts.processesSpecialCategoryData),
    materiallyInfluencesConsequentialDecision: answer(systemRegimeFacts.materiallyInfluencesConsequentialDecision),
    isCompanionChatbot: answer(systemRegimeFacts.isCompanionChatbot),
    usedInPriorAuthorization: answer(systemRegimeFacts.usedInPriorAuthorization),
    interactsWithConsumers: answer(systemRegimeFacts.interactsWithConsumers),
    handsOffToAutonomousAgent: answer(systemRegimeFacts.handsOffToAutonomousAgent),
  };

  const regimes = resolveAllRegimeScopes(regimeOrgFacts, regimeSystemFacts);

  const tp = system.transparencyProfile;
  const hasArt50Obligation = !!tp && [
    tp.art50InteractionStatus,
    tp.art50MarkingStatus,
    tp.art50EmotionStatus,
    tp.art50DeepfakeStatus,
  ].some((status) => status !== "NOT_APPLICABLE");

  const agentProfile = system.agentProfile;
  const agent: AgentProfileFacts = agentProfile
    ? {
        autonomy: agentProfile.autonomy as AgentAutonomyValue,
        actionScope: agentProfile.actionScope,
        downstreamAgents: agentProfile.downstreamAgents,
        tools: agentProfile.tools,
        humanSponsor: agentProfile.humanSponsor,
        killSwitch: agentProfile.killSwitch,
        killSwitchTestedAt: agentProfile.killSwitchTestedAt,
        reversalWindow: agentProfile.reversalWindow,
        traceability: agentProfile.traceability,
      }
    : EMPTY_AGENT_FACTS;
  const agentAssessment = assessAgent(agent);

  // The profile is the better answer where it exists. The old screening
  // answer still counts, so a system that was agentic yesterday does not
  // quietly fall out of scope today just because no profile has been filled
  // in yet.
  const agentic =
    autonomyIsAgentic(agent.autonomy) ||
    (agent.autonomy === "NOT_ASSESSED" &&
      regimeSystemFacts.handsOffToAutonomousAgent === "YES");

  const overlayTags = deriveOverlayTags({
    admtTags: admtResolved ? admt.tags : undefined,
    regimeScopes: regimes,
    riskLevel: system.riskClassification?.riskLevel ?? null,
    annexIiiCategory: system.riskClassification?.annexIIICategory ?? null,
    hasArt50Obligation,
    technique: system.technique,
    handsOffToAutonomousAgent: agentic ? "YES" : "NO",
  });

  return {
    system: {
      id: system.id,
      name: system.name,
      technique: system.technique,
      role: system.role,
      status: system.status,
      processesPersonalData: system.processesPersonalData,
      purpose: system.purpose,
      description: system.description,
      businessOwner: system.businessOwner,
      technicalOwner: system.technicalOwner,
    },
    organizationName: org?.name ?? "",
    jurisdictions,
    jurisdictionsDeclared: jurisdictions.length > 0,
    riskLevel: system.riskClassification?.riskLevel ?? null,
    annexIiiCategory: system.riskClassification?.annexIIICategory ?? null,
    hasArt50Obligation,
    admt,
    admtResolved,
    agent,
    agentAssessment,
    regimes,
    overlayTags,
    undetermined: undeterminedRegimes(regimes),
  };
}

/** Load and resolve. Always org-scoped: the system id alone is never trusted. */
export async function loadSystemScope(
  prisma: ScopePrisma,
  organizationId: string,
  aiSystemId: string,
): Promise<SystemScope> {
  const system = (await prisma.aISystem.findFirst({
    where: { id: aiSystemId, organizationId },
    include: SYSTEM_INCLUDE,
  })) as RawSystem | null;
  if (!system) {
    throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
  }
  const org = (await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, operatingJurisdictions: true, settings: true },
  })) as RawOrg | null;
  return buildSystemScope(system, org);
}
