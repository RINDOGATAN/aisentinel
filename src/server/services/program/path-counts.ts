// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The counts the program path reads (src/components/guided/path-config.ts).
 *
 * Counts only, every one scoped to the organisation, all issued at once: no
 * record leaves the database, so the menu stays cheap to fill in. The rules
 * that turn these numbers into "done / started / not started" live next to
 * each step in the path config, not here.
 *
 * What is counted at all (pathScope below):
 *
 *   - The worked example's records never count. The example lists everything
 *     it creates in `sample_records`; those ids, and every record hanging off
 *     an example system or vendor, are left out of every count, so adding the
 *     example completes no step and removing it moves no number.
 *   - A retired system and a terminated vendor are out of the "every system"
 *     and "every vendor" rules: nothing is asked of them any more.
 *   - Systems and vendors imported from DPO Central are ordinary records here
 *     and count like any other.
 */

import type { Prisma, PrismaClient, ShadowAIStatus } from "@prisma/client";
import { STILL_TO_REVIEW } from "@/lib/ai-tool-triage";
import type { PathCounts } from "@/components/guided/path-config";
import { UNCONFIRMED_WHERE } from "@/server/services/provenance/summary";
import { COUNTED_INCIDENT } from "@/server/services/incident/counted";
import { obligationScreenings } from "@/config/obligation-screenings";
import { readApplicabilitySettings } from "@/config/applicability";
import { frameworksRuledOut } from "@/config/framework-scope";
import { disclosureLawsFor } from "@/config/disclosure-laws";
import { loadAgentTestingCounts } from "@/server/services/aiuc1/readiness";
import {
  CLIENT_TEMPLATE_REF,
  TEMPLATE_COPY_PENDING_WHERE,
  hasTemplateCopyMark,
} from "@/config/client-template";

const HIGH_RISK = { riskLevel: { in: ["HIGH" as const, "UNACCEPTABLE" as const] } };
const APPROVED_POLICY = { status: { in: ["APPROVED" as const, "PUBLISHED" as const] } };
/** A NOT_ASSESSED mapping asserts nothing, so it is nothing to confirm (see provenance/summary.ts). */
const ASSERTED_MAPPING = { status: { not: "NOT_ASSESSED" as const } };
const OPEN_PROCEEDING = { status: { notIn: ["DECIDED" as const, "CLOSED" as const] } };

/** The sample rows the scope reads: what the worked example created. */
export interface SampleRow {
  entityType: string;
  entityId: string;
  createdAt: Date;
}

/**
 * The places step 1.2 counts. The worked example declares places only when
 * none are declared, and removing it puts that empty value back, so while its
 * declaration stands the places are the example's and count as none. Once the
 * organisation saves its places again (which stamps jurisdictionsReviewedAt),
 * they are its own.
 */
export function countedJurisdictions(
  scope: Pick<PathScope, "exampleDeclaredAt">,
  organization: { operatingJurisdictions: readonly string[]; jurisdictionsReviewedAt: Date | null } | null,
): string[] {
  const declared = [...(organization?.operatingJurisdictions ?? [])] as string[];
  if (!scope.exampleDeclaredAt) return declared;
  const reviewedAt = organization?.jurisdictionsReviewedAt;
  const savedSince = !!reviewedAt && reviewedAt.getTime() > scope.exampleDeclaredAt.getTime();
  return savedSince ? declared : [];
}

/**
 * The record filters every count goes through. Pure, so the rules are tested
 * without a database (path-counts.test.ts).
 */
export function pathScope(sample: readonly SampleRow[]) {
  const ids = (type: string) => sample.filter((r) => r.entityType === type).map((r) => r.entityId);
  const sampleSystems = ids("AISystem");
  const sampleVendors = ids("AIVendor");

  /** Leave these ids out; no filter at all when there are none. */
  const notIn = (list: string[]) => (list.length > 0 ? { id: { notIn: list } } : {});
  /**
   * For a nullable link to a system: a record with no system is kept (a plain
   * `notIn` on a nullable column drops its null rows too).
   */
  const notOnSampleSystem = () =>
    sampleSystems.length > 0
      ? { OR: [{ aiSystemId: null }, { aiSystemId: { notIn: sampleSystems } }] }
      : {};

  /** Any system that is not the example's. */
  const system = { ...notIn(sampleSystems) } satisfies Prisma.AISystemWhereInput;
  /** The systems the "every system" rules run over: not the example's, not retired. */
  const activeSystem = {
    ...notIn(sampleSystems),
    status: { not: "RETIRED" as const },
  } satisfies Prisma.AISystemWhereInput;
  /** The vendors the vendor rules run over: not the example's, not terminated. */
  const activeVendor = {
    ...notIn(sampleVendors),
    status: { not: "TERMINATED" as const },
  } satisfies Prisma.AIVendorWhereInput;

  return {
    /**
     * When the example declared where the organisation operates (removal puts
     * the old value back); null when it did not.
     */
    exampleDeclaredAt: sample.find((r) => r.entityType === "Organization")?.createdAt ?? null,
    sampleSystemIds: sampleSystems,
    system,
    activeSystem,
    activeVendor,
    policy: notIn(ids("AIPolicy")) satisfies Prisma.AIPolicyWhereInput,
    /** Records that belong to one system, through the relation. */
    onSystem: { aiSystem: { is: system } },
    onActiveSystem: { aiSystem: { is: activeSystem } },
    gate: { ...notIn(ids("OversightGate")), aiSystem: { is: system } } satisfies Prisma.OversightGateWhereInput,
    classification: notIn(ids("RiskClassification")) satisfies Prisma.RiskClassificationWhereInput,
    assessment: {
      ...notIn(ids("AIAssessment")),
      aiSystem: { is: system },
    } satisfies Prisma.AIAssessmentWhereInput,
    incident: { ...notIn(ids("AIIncident")), ...notOnSampleSystem() } satisfies Prisma.AIIncidentWhereInput,
    sensitive: notOnSampleSystem() satisfies Prisma.SensitiveDataAssessmentWhereInput,
    vendorAssessment: { vendor: { is: notIn(sampleVendors) } } satisfies Prisma.AIVendorAssessmentWhereInput,
  };
}

export type PathScope = ReturnType<typeof pathScope>;

function settingsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadPathCounts(
  prisma: PrismaClient,
  organizationId: string,
): Promise<PathCounts> {
  const org = { organizationId };
  const scope = pathScope(
    await prisma.sampleRecord.findMany({
      where: { organizationId },
      select: { entityType: true, entityId: true, createdAt: true },
    }),
  );
  const system = { ...org, ...scope.activeSystem };
  const vendor = { ...org, ...scope.activeVendor };
  const highRiskSystem = { ...system, riskClassification: { is: HIGH_RISK } };
  /** Requirements mapped to a high-risk system: the evidence step's scope. */
  const highRiskMapping = {
    ...org,
    aiSystem: { is: { ...scope.activeSystem, riskClassification: { is: HIGH_RISK } } },
  };

  // Copied from another client's template and not reviewed yet. Issued with
  // the counts below, but kept apart so that list's order stays as it is.
  const copied = Promise.all([
    prisma.aISystem.count({ where: { ...system, ...TEMPLATE_COPY_PENDING_WHERE } }),
    prisma.aIVendor.count({ where: { ...vendor, ...TEMPLATE_COPY_PENDING_WHERE } }),
    prisma.oversightGate.count({
      where: { ...org, ...scope.gate, sourceRef: CLIENT_TEMPLATE_REF, ...UNCONFIRMED_WHERE },
    }),
  ]);
  // Handled here too, so a failure while the counts below are awaited is not left unobserved.
  copied.catch(() => undefined);
  // Systems the organisation provides (it builds them): the threat-model step
  // is shown to these organisations. Kept apart for the same reason as above.
  const providerSystemsCount = prisma.aISystem.count({
    where: { ...org, ...scope.system, role: "PROVIDER" },
  });
  providerSystemsCount.catch(() => undefined);
  // Classifications and profiles of every system, retired ones included: the
  // review step counts what the review queue can hold, as `unconfirmed` does.
  const reviewable = Promise.all([
    prisma.riskClassification.count({ where: { ...org, ...scope.classification, ...scope.onSystem } }),
    prisma.transparencyProfile.count({ where: { ...org, ...scope.onSystem } }),
  ]);
  reviewable.catch(() => undefined);

  const [
    organization,
    policies,
    acceptableUseApproved,
    incidentPoliciesApproved,
    incidentPolicies,
    systems,
    systemsWithOwner,
    systemsProcessingPersonalData,
    shadowReports,
    shadowReportsUntriaged,
    vendors,
    vendorsAssessed,
    vendorAssessments,
    classified,
    highRisk,
    highRiskAssessed,
    assessments,
    assessmentsApproved,
    threatModels,
    threatModelsActive,
    oversightGates,
    highRiskWithGate,
    transparencyProfiles,
    mappings,
    mappingsNotAssessed,
    highRiskMappings,
    highRiskMappingsNotAssessed,
    evidence,
    highRiskEvidence,
    sensitiveAssessments,
    personalDataSystemsAssessed,
    incidents,
    proceedings,
    openProceedings,
    unconfirmed,
    boardReports,
    auditEntries,
    agentTesting,
  ] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: organizationId },
      select: { operatingJurisdictions: true, jurisdictionsReviewedAt: true, settings: true },
    }),
    prisma.aIPolicy.count({ where: { ...org, ...scope.policy } }),
    prisma.aIPolicy.count({ where: { ...org, ...scope.policy, type: "AI_USAGE", ...APPROVED_POLICY } }),
    prisma.aIPolicy.count({
      where: { ...org, ...scope.policy, type: "AI_INCIDENT_RESPONSE", ...APPROVED_POLICY },
    }),
    prisma.aIPolicy.count({ where: { ...org, ...scope.policy, type: "AI_INCIDENT_RESPONSE" } }),
    prisma.aISystem.count({ where: system }),
    prisma.aISystem.count({ where: { ...system, businessOwner: { not: null }, NOT: { businessOwner: "" } } }),
    prisma.aISystem.count({ where: { ...system, processesPersonalData: true } }),
    prisma.shadowAIReport.count({ where: org }),
    // Still to review: reported or under review, with no decision yet.
    prisma.shadowAIReport.count({
      where: { ...org, status: { in: [...STILL_TO_REVIEW] as ShadowAIStatus[] } },
    }),
    prisma.aIVendor.count({ where: vendor }),
    prisma.aIVendor.count({ where: { ...vendor, assessments: { some: { status: "COMPLETED" } } } }),
    prisma.aIVendorAssessment.count({ where: { ...org, ...scope.vendorAssessment } }),
    prisma.riskClassification.count({ where: { ...org, ...scope.classification, ...scope.onActiveSystem } }),
    prisma.aISystem.count({ where: highRiskSystem }),
    prisma.aISystem.count({
      where: { ...highRiskSystem, assessments: { some: { status: "APPROVED" } } },
    }),
    prisma.aIAssessment.count({ where: { ...org, ...scope.assessment } }),
    prisma.aIAssessment.count({ where: { ...org, ...scope.assessment, status: "APPROVED" } }),
    prisma.threatModel.count({ where: org }),
    prisma.threatModel.count({ where: { ...org, status: { not: "DRAFT" } } }),
    prisma.oversightGate.count({ where: { ...org, ...scope.gate } }),
    prisma.aISystem.count({ where: { ...highRiskSystem, oversightGates: { some: {} } } }),
    prisma.transparencyProfile.count({ where: { ...org, ...scope.onActiveSystem } }),
    prisma.complianceMapping.count({ where: { ...org, ...scope.onSystem } }),
    prisma.complianceMapping.count({ where: { ...org, ...scope.onSystem, status: "NOT_ASSESSED" } }),
    prisma.complianceMapping.count({ where: highRiskMapping }),
    prisma.complianceMapping.count({ where: { ...highRiskMapping, status: "NOT_ASSESSED" } }),
    prisma.complianceEvidence.count({ where: { ...org, complianceMapping: { is: scope.onSystem } } }),
    prisma.complianceEvidence.count({ where: { ...org, complianceMapping: { is: highRiskMapping } } }),
    prisma.sensitiveDataAssessment.count({ where: { ...org, ...scope.sensitive } }),
    prisma.aISystem.count({
      where: { ...system, processesPersonalData: true, sensitiveDataAssessments: { some: {} } },
    }),
    prisma.aIIncident.count({ where: { ...org, ...scope.incident, ...COUNTED_INCIDENT } }),
    prisma.regulatoryProceeding.count({ where: org }),
    prisma.regulatoryProceeding.count({ where: { ...org, ...OPEN_PROCEEDING } }),
    loadUnconfirmed(prisma, organizationId, scope),
    prisma.boardReport.count({ where: org }),
    prisma.auditLog.count({ where: org, take: 1 }),
    // Not a count: readiness is a rule over each agent's evidence. Two small
    // queries, and the second is skipped when there is no agent.
    loadAgentTestingCounts(prisma, organizationId, { excludeSystemIds: scope.sampleSystemIds }),
  ]);
  const [copiedSystemsPending, copiedVendorsPending, copiedGatesPending] = await copied;
  const providerSystems = await providerSystemsCount;
  const [classifiedAny, transparencyProfilesAny] = await reviewable;

  const settings = settingsObject(organization?.settings);
  const quickstart = settingsObject(settings.quickstart);
  const jurisdictions = countedJurisdictions(scope, organization);
  const screenings = obligationScreenings(jurisdictions, settings);
  // The organisation's own declared places and answers, as the requirement
  // sync reads them (src/config/framework-scope.ts).
  const declared = [...(organization?.operatingJurisdictions ?? [])] as string[];
  const { answers, frameworks } = readApplicabilitySettings(organization?.settings, declared);
  const ruledOut = frameworksRuledOut(declared, answers, frameworks);

  return {
    quickstartCompleted: typeof quickstart.completedAt === "string",
    jurisdictions: jurisdictions.length,
    // The screenings this organisation is shown, and those still open
    // (src/config/obligation-screenings.ts): step 1.2's rule.
    screeningsShown: screenings.shown,
    screeningsOpen: screenings.open,
    screeningQuestionsOpen: screenings.openQuestions,
    policies,
    acceptableUsePolicyApproved: acceptableUseApproved > 0,
    incidentPolicyApproved: incidentPoliciesApproved > 0,
    incidentPolicies,
    systems,
    systemsWithOwner,
    systemsProcessingPersonalData,
    shadowReports,
    shadowReportsUntriaged,
    vendors,
    vendorsAssessed,
    vendorAssessments,
    providerSystems,
    classified,
    highRisk,
    highRiskAssessed,
    assessments,
    assessmentsApproved,
    threatModels,
    threatModelsActive,
    ...agentTesting,
    frameworksChosen: frameworks.length > 0,
    aiuc1Followed: !ruledOut.includes("AIUC_1"),
    disclosureLaws: disclosureLawsFor(declared, ruledOut),
    oversightGates,
    highRiskWithGate,
    transparencyProfiles,
    mappings,
    mappingsNotAssessed,
    highRiskMappings,
    highRiskMappingsNotAssessed,
    evidence,
    highRiskEvidence,
    sensitiveAssessments,
    personalDataSystemsAssessed,
    incidents,
    proceedings,
    openProceedings,
    unconfirmed: unconfirmed.total,
    classificationsUnconfirmed: unconfirmed.classifications,
    gatesUnconfirmed: unconfirmed.gates,
    transparencyUnconfirmed: unconfirmed.transparency,
    // The five kinds the review queue holds, counted as provenance/summary.ts does.
    confirmable:
      classifiedAny + (mappings - mappingsNotAssessed) + oversightGates + policies + transparencyProfilesAny,
    boardReports,
    auditEntries,
    copiedSystemsPending,
    copiedVendorsPending,
    copiedGatesPending,
    copiedObligationsPending: hasTemplateCopyMark(settings),
  };
}

/**
 * Auto-derived items nobody has confirmed: what the review queue holds, in
 * total and for the three kinds a step's rule reads (a step met only by such
 * drafts is "to confirm", never "done").
 */
async function loadUnconfirmed(
  prisma: PrismaClient,
  organizationId: string,
  path: PathScope,
): Promise<{ total: number; classifications: number; gates: number; transparency: number }> {
  const scope = { organizationId, ...UNCONFIRMED_WHERE };
  const [classifications, classificationsActive, mappings, gates, policies, transparency, transparencyActive] =
    await Promise.all([
      prisma.riskClassification.count({ where: { ...scope, ...path.classification, ...path.onSystem } }),
      prisma.riskClassification.count({ where: { ...scope, ...path.classification, ...path.onActiveSystem } }),
      prisma.complianceMapping.count({ where: { ...scope, ...path.onSystem, ...ASSERTED_MAPPING } }),
      prisma.oversightGate.count({ where: { ...scope, ...path.gate } }),
      prisma.aIPolicy.count({ where: { ...scope, ...path.policy } }),
      prisma.transparencyProfile.count({ where: { ...scope, ...path.onSystem } }),
      prisma.transparencyProfile.count({ where: { ...scope, ...path.onActiveSystem } }),
    ]);
  return {
    // The review step: everything waiting, retired systems included (the
    // review queue still holds them), the worked example's records left out.
    total: classifications + mappings + gates + policies + transparency,
    // The classification and transparency steps run over active systems only.
    classifications: classificationsActive,
    gates,
    transparency: transparencyActive,
  };
}
