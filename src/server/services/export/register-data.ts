// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** Loads the AI system register rows, shared by the register PDF route and the program pack. */

import type { PrismaClient } from "@prisma/client";
import type { AISystemExportData } from "@/server/services/export/ai-system-register";

export async function loadRegisterExportData(
  prisma: PrismaClient,
  organizationId: string,
): Promise<AISystemExportData[]> {
  const systems = await prisma.aISystem.findMany({
    where: { organizationId },
    include: {
      riskClassification: true,
      vendor: true,
      _count: {
        select: {
          models: true,
          dataSources: true,
          assessments: true,
          incidents: true,
          complianceMappings: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return systems.map((sys) => ({
    id: sys.id,
    name: sys.name,
    description: sys.description,
    technique: sys.technique,
    role: sys.role,
    status: sys.status,
    purpose: sys.purpose,
    businessOwner: sys.businessOwner,
    technicalOwner: sys.technicalOwner,
    deploymentDate: sys.deploymentDate,
    retirementDate: sys.retirementDate,
    processesPersonalData: sys.processesPersonalData,
    riskLevel: sys.riskClassification?.riskLevel ?? null,
    rationale: sys.riskClassification?.rationale ?? null,
    vendorName: sys.vendor?.name ?? null,
    modelCount: sys._count.models,
    dataSourceCount: sys._count.dataSources,
    assessmentCount: sys._count.assessments,
    incidentCount: sys._count.incidents,
    complianceMappingCount: sys._count.complianceMappings,
  }));
}
