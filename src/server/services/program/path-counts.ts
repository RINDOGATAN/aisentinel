// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The counts the program path reads (src/components/guided/path-config.ts).
 *
 * Counts only, every one scoped to the organisation, all issued at once: no
 * record leaves the database, so the menu stays cheap to fill in. The rules
 * that turn these numbers into "done / started / not started" live next to
 * each step in the path config, not here.
 */

import type { PrismaClient } from "@prisma/client";
import type { PathCounts } from "@/components/guided/path-config";
import { UNCONFIRMED_WHERE } from "@/server/services/provenance/summary";

const HIGH_RISK = { riskLevel: { in: ["HIGH" as const, "UNACCEPTABLE" as const] } };
const APPROVED_POLICY = { status: { in: ["APPROVED" as const, "PUBLISHED" as const] } };
/** A NOT_ASSESSED mapping asserts nothing, so it is nothing to confirm (see provenance/summary.ts). */
const ASSERTED_MAPPING = { status: { not: "NOT_ASSESSED" as const } };
const OPEN_PROCEEDING = { status: { notIn: ["DECIDED" as const, "CLOSED" as const] } };

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
  const highRiskSystem = { organizationId, riskClassification: { is: HIGH_RISK } };

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
    evidence,
    sensitiveAssessments,
    personalDataSystemsAssessed,
    incidents,
    proceedings,
    openProceedings,
    unconfirmed,
    boardReports,
    auditEntries,
  ] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: organizationId },
      select: { operatingJurisdictions: true, settings: true },
    }),
    prisma.aIPolicy.count({ where: org }),
    prisma.aIPolicy.count({ where: { ...org, type: "AI_USAGE", ...APPROVED_POLICY } }),
    prisma.aIPolicy.count({ where: { ...org, type: "AI_INCIDENT_RESPONSE", ...APPROVED_POLICY } }),
    prisma.aIPolicy.count({ where: { ...org, type: "AI_INCIDENT_RESPONSE" } }),
    prisma.aISystem.count({ where: org }),
    prisma.aISystem.count({ where: { ...org, businessOwner: { not: null }, NOT: { businessOwner: "" } } }),
    prisma.aISystem.count({ where: { ...org, processesPersonalData: true } }),
    prisma.shadowAIReport.count({ where: org }),
    prisma.shadowAIReport.count({ where: { ...org, status: "DISCOVERED" } }),
    prisma.aIVendor.count({ where: org }),
    prisma.aIVendor.count({ where: { ...org, assessments: { some: { status: "COMPLETED" } } } }),
    prisma.aIVendorAssessment.count({ where: org }),
    prisma.riskClassification.count({ where: org }),
    prisma.aISystem.count({ where: highRiskSystem }),
    prisma.aISystem.count({
      where: { ...highRiskSystem, assessments: { some: { status: "APPROVED" } } },
    }),
    prisma.aIAssessment.count({ where: org }),
    prisma.aIAssessment.count({ where: { ...org, status: "APPROVED" } }),
    prisma.threatModel.count({ where: org }),
    prisma.threatModel.count({ where: { ...org, status: { not: "DRAFT" } } }),
    prisma.oversightGate.count({ where: org }),
    prisma.aISystem.count({ where: { ...highRiskSystem, oversightGates: { some: {} } } }),
    prisma.transparencyProfile.count({ where: org }),
    prisma.complianceMapping.count({ where: org }),
    prisma.complianceMapping.count({ where: { ...org, status: "NOT_ASSESSED" } }),
    prisma.complianceEvidence.count({ where: org }),
    prisma.sensitiveDataAssessment.count({ where: org }),
    prisma.aISystem.count({
      where: { ...org, processesPersonalData: true, sensitiveDataAssessments: { some: {} } },
    }),
    prisma.aIIncident.count({ where: org }),
    prisma.regulatoryProceeding.count({ where: org }),
    prisma.regulatoryProceeding.count({ where: { ...org, ...OPEN_PROCEEDING } }),
    countUnconfirmed(prisma, organizationId),
    prisma.boardReport.count({ where: org }),
    prisma.auditLog.count({ where: org, take: 1 }),
  ]);

  const settings = settingsObject(organization?.settings);
  const quickstart = settingsObject(settings.quickstart);
  const regimes = settingsObject(settings.regimes);

  return {
    quickstartCompleted: typeof quickstart.completedAt === "string",
    jurisdictions: organization?.operatingJurisdictions.length ?? 0,
    // Unanswered questions are stored as NOT_ASSESSED; only YES or NO is an answer.
    regimeScreeningAnswered: Object.values(regimes).some((v) => v === "YES" || v === "NO"),
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
    evidence,
    sensitiveAssessments,
    personalDataSystemsAssessed,
    incidents,
    proceedings,
    openProceedings,
    unconfirmed,
    // The five kinds the review queue holds, counted as provenance/summary.ts does.
    confirmable:
      classified + (mappings - mappingsNotAssessed) + oversightGates + policies + transparencyProfiles,
    boardReports,
    auditEntries,
  };
}

/** Auto-derived items nobody has confirmed: what the review queue holds. */
async function countUnconfirmed(prisma: PrismaClient, organizationId: string): Promise<number> {
  const scope = { organizationId, ...UNCONFIRMED_WHERE };
  const counts = await Promise.all([
    prisma.riskClassification.count({ where: scope }),
    prisma.complianceMapping.count({ where: { ...scope, ...ASSERTED_MAPPING } }),
    prisma.oversightGate.count({ where: scope }),
    prisma.aIPolicy.count({ where: scope }),
    prisma.transparencyProfile.count({ where: scope }),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}
