// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Import receiver for DPO Central AI systems.
 *
 * DPO Central's "export to AI Sentinel" (aiGovernance router) POSTs its AI-system
 * register here. We create/dedupe an AI Sentinel `AISystem` per DPO system and
 * return `mapped: [{ dpcId, aisId }]` so DPO can store `aiSentinelSystemId` and
 * deep-link the two records. Imported systems land as DRAFT for an AI officer to
 * confirm; the AI-Act classification (technique/role) is a best-effort seed —
 * see src/lib/dpc-import-mapping.ts.
 *
 * Auth: x-api-key validated against VW_IMPORT_API_KEYS (same as the other import
 * endpoints). Dedupe key: the DPO system id stashed at metadata.dpoCentralSystemId.
 */
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateImportApiKey } from "@/lib/import-auth";
import { mapRole, mapTechnique } from "@/lib/dpc-import-mapping";

interface DPCSystemPayload {
  name: string;
  description?: string | null;
  purpose?: string | null;
  riskLevel?: string | null;
  category?: string | null;
  modelType?: string | null;
  provider?: string | null;
  deployer?: string | null;
  trainingDataSources?: string[];
  aiCapabilities?: string[];
  aiTechniques?: string[];
  euAiActRole?: string | null;
  euAiActCompliant?: boolean | null;
  iso42001Certified?: boolean | null;
  humanOversight?: string | null;
  transparencyMeasures?: string | null;
  technicalDocUrl?: string | null;
  vendorName?: string | null;
  dpoCentralSystemId: string;
  dpoCentralVendorId?: string | null;
}

export async function POST(request: Request) {
  if (!validateImportApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userEmail, systems } = body as {
    userEmail: string;
    systems: DPCSystemPayload[];
  };

  if (!userEmail || typeof userEmail !== "string") {
    return NextResponse.json({ error: "userEmail is required" }, { status: 400 });
  }
  if (!Array.isArray(systems) || systems.length === 0) {
    return NextResponse.json({ error: "systems array is required" }, { status: 400 });
  }

  // Resolve the importing user's organization (same pattern as check-account).
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      organizationMemberships: { include: { organization: true }, take: 1 },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const membership = user.organizationMemberships[0];
  if (!membership) {
    return NextResponse.json({ error: "User has no organization" }, { status: 404 });
  }
  const orgId = membership.organizationId;
  const orgName = membership.organization.name;

  let exported = 0;
  let alreadyExisted = 0;
  let skipped = 0;
  const mapped: { dpcId: string; aisId: string }[] = [];

  for (const s of systems) {
    if (!s.name || !s.dpoCentralSystemId) {
      skipped++;
      continue;
    }

    try {
      // Dedupe on the DPO system id we stash in metadata, falling back to name
      // within the org so a re-export never creates a duplicate register entry.
      const existing = await prisma.aISystem.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            {
              metadata: {
                path: ["dpoCentralSystemId"],
                equals: s.dpoCentralSystemId,
              },
            },
            { name: s.name },
          ],
        },
        select: { id: true },
      });

      if (existing) {
        alreadyExisted++;
        mapped.push({ dpcId: s.dpoCentralSystemId, aisId: existing.id });
        continue;
      }

      const created = await prisma.aISystem.create({
        data: {
          organizationId: orgId,
          name: s.name,
          description: s.description ?? null,
          purpose: s.purpose ?? null,
          technique: mapTechnique(s.modelType, s.aiTechniques),
          role: mapRole(s.euAiActRole),
          status: "DRAFT",
          dpoCentralVendorId: s.dpoCentralVendorId ?? null,
          // Preserve everything DPO sent that AIS does not model as a column, so
          // the import is lossless and an officer can see the source data.
          metadata: {
            importedFrom: "dpocentral",
            dpoCentralSystemId: s.dpoCentralSystemId,
            riskLevel: s.riskLevel ?? null,
            category: s.category ?? null,
            provider: s.provider ?? null,
            deployer: s.deployer ?? null,
            vendorName: s.vendorName ?? null,
            aiCapabilities: s.aiCapabilities ?? [],
            aiTechniques: s.aiTechniques ?? [],
            trainingDataSources: s.trainingDataSources ?? [],
            euAiActRole: s.euAiActRole ?? null,
            euAiActCompliant: s.euAiActCompliant ?? null,
            iso42001Certified: s.iso42001Certified ?? null,
            humanOversight: s.humanOversight ?? null,
            transparencyMeasures: s.transparencyMeasures ?? null,
            technicalDocUrl: s.technicalDocUrl ?? null,
          } satisfies Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      exported++;
      mapped.push({ dpcId: s.dpoCentralSystemId, aisId: created.id });
    } catch (err) {
      // Skip the row but keep the reason observable — a silent counter makes
      // partial imports impossible to debug.
      console.error(`[import/dpc-ai-systems] skipped "${s.name}":`, err);
      skipped++;
    }
  }

  return NextResponse.json({ exported, alreadyExisted, skipped, mapped, orgName });
}
