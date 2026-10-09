// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The rows behind two organisation-wide PDFs, read in one place so the
 * single downloads (/api/export/assessment-portfolio, /api/export/model-inventory)
 * and the program pack produce the same documents.
 */

import type { PrismaClient } from "@prisma/client";
import type { AssessmentExportData } from "@/server/services/export/assessment-portfolio";
import type { ModelExportData } from "@/server/services/export/model-inventory";

export async function loadAssessmentPortfolioData(
  prisma: PrismaClient,
  organizationId: string,
): Promise<AssessmentExportData[]> {
  const assessments = await prisma.aIAssessment.findMany({
    where: { organizationId },
    include: {
      aiSystem: { select: { name: true } },
      template: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return assessments.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    status: a.status,
    riskScore: a.riskScore,
    aiSystemName: a.aiSystem.name,
    templateName: a.template?.name ?? null,
    createdBy: a.createdBy,
    reviewedBy: a.reviewedBy,
    approvedBy: a.approvedBy,
    createdAt: a.createdAt,
    reviewedAt: a.reviewedAt,
    approvedAt: a.approvedAt,
  }));
}

export async function loadModelInventoryData(
  prisma: PrismaClient,
  organizationId: string,
): Promise<ModelExportData[]> {
  const models = await prisma.aIModel.findMany({
    where: { organizationId },
    include: {
      aiSystem: {
        include: { riskClassification: true },
      },
    },
    orderBy: [{ aiSystem: { name: "asc" } }, { name: "asc" }],
  });
  return models.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    modelType: m.modelType,
    version: m.version,
    trainingDataSummary: m.trainingDataSummary,
    knownLimitations: m.knownLimitations,
    aiSystemName: m.aiSystem.name,
    aiSystemStatus: m.aiSystem.status,
    riskLevel: m.aiSystem.riskClassification?.riskLevel ?? null,
  }));
}
