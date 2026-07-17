// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Shared server-side context loader for the AI prompt builders.
 *
 * Loads one registered AI system WITH ORG SCOPE (findFirst + organizationId
 * — never trust input ids) and maps it to the plain AssessmentSystemContext
 * the pure prompt builders consume. The rule path (annex-iii-rules) and the
 * AI path share this loader so both always see the same facts.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import type { AnnexIiiFacts } from "@/config/annex-iii-rules";
import type { AssessmentSystemContext } from "./prompts/assessment-draft";

type PrismaLike = Pick<PrismaClient, "aISystem">;

export async function buildSystemContext(
  prisma: PrismaLike,
  organizationId: string,
  aiSystemId: string,
  organizationName: string
): Promise<{ context: AssessmentSystemContext; facts: AnnexIiiFacts }> {
  const system = await prisma.aISystem.findFirst({
    where: { id: aiSystemId, organizationId },
    include: {
      models: true,
      dataSources: true,
      riskClassification: true,
    },
  });

  if (!system) {
    throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
  }

  const context: AssessmentSystemContext = {
    organizationName,
    system: {
      name: system.name,
      description: system.description,
      purpose: system.purpose,
      technique: system.technique,
      role: system.role,
      status: system.status,
      processesPersonalData: system.processesPersonalData,
      businessOwner: system.businessOwner,
      technicalOwner: system.technicalOwner,
    },
    models: system.models.map((m) => ({
      name: m.name,
      provider: m.provider,
      modelType: m.modelType,
      version: m.version,
      trainingDataSummary: m.trainingDataSummary,
      knownLimitations: m.knownLimitations,
    })),
    dataSources: system.dataSources.map((s) => ({
      name: s.name,
      sourceType: s.sourceType,
      containsPersonalData: s.containsPersonalData,
      dataCategories: s.dataCategories,
      description: s.description,
    })),
    riskLevel: system.riskClassification?.riskLevel ?? null,
    annexIIICategory: system.riskClassification?.annexIIICategory ?? null,
  };

  const facts: AnnexIiiFacts = {
    name: system.name,
    description: system.description,
    purpose: system.purpose,
    technique: system.technique,
    processesPersonalData: system.processesPersonalData,
    dataCategories: system.dataSources.flatMap((s) => s.dataCategories),
  };

  return { context, facts };
}

/** The two-letter UI locale for prompt language selection ("en" fallback). */
export function promptLocale(cookieValue: string | undefined): "en" | "es" {
  return cookieValue === "es" ? "es" : "en";
}
