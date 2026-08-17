// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

"use client";

import { useTranslations } from "next-intl";

// Prisma enum values reach the UI as raw SCREAMING_SNAKE strings. Rendering
// them directly leaks English into every locale — that is how "DRAFT",
// "In Progress", "Deployer" and "Not Assessed" ended up on Spanish screens
// while the translations for all of them already existed in `common`.
//
// These helpers were previously defined inline in the AI-registry detail page,
// which is why that one page translated correctly and every list view did not.
// Import from here instead of re-declaring them.
export function useEnumLabels() {
  const tc = useTranslations("common");

  // Falls back to a de-snaked version of the key so an enum value added to the
  // schema without a translation degrades to "Material Change", never
  // "MATERIAL_CHANGE".
  const fromMap = (map: Record<string, string>, key: string | null | undefined) => {
    if (!key) return "";
    return map[key] ?? key.replace(/_/g, " ");
  };

  const statusLabel = (key?: string | null) =>
    fromMap(
      {
        DRAFT: tc("statusDraft"),
        DEVELOPMENT: tc("statusDevelopment"),
        TESTING: tc("statusTesting"),
        DEPLOYED: tc("statusDeployed"),
        RETIRED: tc("statusRetired"),
        IN_PROGRESS: tc("statusInProgress"),
        UNDER_REVIEW: tc("statusUnderReview"),
        APPROVED: tc("statusApproved"),
        REJECTED: tc("statusRejected"),
        PENDING: tc("statusPending"),
        IN_REVIEW: tc("statusInReview"),
        PASSED: tc("statusPassed"),
        FAILED: tc("statusFailed"),
        DEFERRED: tc("statusDeferred"),
        REPORTED: tc("statusReported"),
        INVESTIGATING: tc("statusInvestigating"),
        MITIGATING: tc("statusMitigating"),
        RESOLVED: tc("statusResolved"),
        CLOSED: tc("statusClosed"),
        PUBLISHED: tc("statusPublished"),
        ARCHIVED: tc("statusArchived"),
      },
      key,
    );

  const riskLabel = (key?: string | null) =>
    fromMap(
      {
        UNACCEPTABLE: tc("riskUnacceptable"),
        HIGH: tc("riskHigh"),
        LIMITED: tc("riskLimited"),
        MINIMAL: tc("riskMinimal"),
        CRITICAL: tc("riskCritical"),
        MEDIUM: tc("riskMedium"),
        LOW: tc("riskLow"),
      },
      key,
    );

  const severityLabel = (key?: string | null) =>
    fromMap(
      {
        CRITICAL: tc("severityCritical"),
        HIGH: tc("severityHigh"),
        MEDIUM: tc("severityMedium"),
        LOW: tc("severityLow"),
      },
      key,
    );

  const gateTypeLabel = (key?: string | null) =>
    fromMap(
      {
        PRE_DEPLOYMENT: tc("gateTypePreDeployment"),
        POST_DEPLOYMENT: tc("gateTypePostDeployment"),
        PERIODIC_REVIEW: tc("gateTypePeriodicReview"),
        INCIDENT_TRIGGERED: tc("gateTypeIncidentTriggered"),
        MATERIAL_CHANGE: tc("gateTypeMaterialChange"),
      },
      key,
    );

  const roleLabel = (key?: string | null) =>
    fromMap(
      {
        PROVIDER: tc("roleProvider"),
        DEPLOYER: tc("roleDeployer"),
        IMPORTER: tc("roleImporter"),
        DISTRIBUTOR: tc("roleDistributor"),
        USER: tc("roleUser"),
      },
      key,
    );

  const complianceLabel = (key?: string | null) =>
    fromMap(
      {
        COMPLIANT: tc("complianceCompliant"),
        PARTIALLY_COMPLIANT: tc("compliancePartial"),
        PARTIAL: tc("compliancePartial"),
        NON_COMPLIANT: tc("complianceNonCompliant"),
        NOT_ASSESSED: tc("complianceNotAssessed"),
      },
      key,
    );

  return {
    statusLabel,
    riskLabel,
    severityLabel,
    gateTypeLabel,
    roleLabel,
    complianceLabel,
  };
}
