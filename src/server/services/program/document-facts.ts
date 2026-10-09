// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The facts the document register reads (src/config/document-register.ts):
 * the path's counts plus the few the documents need. Counts only, every one
 * scoped to the organisation, all issued at once; no record leaves the
 * database. The rules that turn them into "ready / draft / needs an input"
 * live next to each document in the register, not here.
 */

import type { PrismaClient } from "@prisma/client";
import type { DocumentFacts } from "@/config/document-register";
import type { PathCounts } from "@/components/guided/path-config";
import { features } from "@/config/features";
import { UNCONFIRMED_WHERE } from "@/server/services/provenance/summary";
import { isAIConfigured } from "@/server/services/ai/llm-door";
import { postureLane } from "@/server/services/ai/posture";
import { checkShowcaseAccess } from "@/server/services/licensing/showcase-gate";
import { loadPathCounts } from "./path-counts";

const APPROVED_POLICY = { status: { in: ["APPROVED" as const, "PUBLISHED" as const] } };

export async function loadDocumentFacts(
  prisma: PrismaClient,
  organizationId: string,
  /** The path's counts when the caller already holds them (All clients). */
  pathCounts?: PathCounts,
): Promise<DocumentFacts> {
  const org = { organizationId };
  const [
    counts,
    policiesApproved,
    policiesUnconfirmed,
    systemsWithApprovedAssessment,
    models,
    sensitiveOpen,
    aiSettings,
    impactAccess,
    reportAccess,
  ] = await Promise.all([
    pathCounts ?? loadPathCounts(prisma, organizationId),
    prisma.aIPolicy.count({ where: { ...org, ...APPROVED_POLICY } }),
    prisma.aIPolicy.count({ where: { ...org, ...UNCONFIRMED_WHERE } }),
    prisma.aISystem.count({ where: { ...org, assessments: { some: { status: "APPROVED" } } } }),
    prisma.aIModel.count({ where: org }),
    prisma.sensitiveDataAssessment.count({ where: { ...org, completedAt: null } }),
    prisma.organizationAiSettings.findUnique({ where: { organizationId }, select: { posture: true } }),
    checkShowcaseAccess(organizationId, "impact-assessment-document"),
    checkShowcaseAccess(organizationId, "program-report"),
  ]);

  const posture = aiSettings?.posture ?? "off";
  return {
    ...counts,
    policiesApproved,
    policiesUnconfirmed,
    systemsWithApprovedAssessment,
    models,
    sensitiveOpen,
    aiAssistOn: features.aiAssistEnabled && posture !== "off" && isAIConfigured(postureLane(posture)),
    impactAssessmentLocked: !impactAccess.allowed,
    programReportLocked: !reportAccess.allowed,
  };
}
