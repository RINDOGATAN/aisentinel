// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardImportRequest } from "@/lib/import-auth";
import { resolveImportAccount } from "@/lib/import-account";
import { pilotRemaining } from "@/server/services/pilot/caps";

const CRITICALITY_TO_RISK: Record<string, string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};

interface VendorPayload {
  name: string;
  slug?: string;
  category?: string;
  subcategory?: string | null;
  description?: string | null;
  website?: string | null;
  criticality?: string;
  certifications?: string[];
  dataLocations?: string[];
  aiCapabilities?: string[];
  modelHosting?: string | null;
  dpaUrl?: string | null;
  dpaComplianceScore?: number | null;
  dpaGdprScore?: number | null;
  dpaCcpaScore?: number | null;
}

export async function POST(request: Request) {
  const blocked = guardImportRequest(request);
  if (blocked) return blocked;

  const body = await request.json();
  const { userEmail, vendors } = body as {
    userEmail: string;
    vendors: VendorPayload[];
  };

  if (!userEmail || typeof userEmail !== "string") {
    return NextResponse.json(
      { error: "userEmail is required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(vendors) || vendors.length === 0) {
    return NextResponse.json(
      { error: "vendors array is required" },
      { status: 400 }
    );
  }

  // Resolve the organization the push acts on, and refuse an account that may
  // not write there (src/lib/import-account.ts).
  const account = await resolveImportAccount(userEmail, body.organizationId, "write");
  if (!account.ok) {
    return NextResponse.json({ error: account.error }, { status: account.status });
  }

  const orgId = account.organizationId;
  const orgName = account.organizationName;
  const imported: { id: string; name: string }[] = [];

  let exported = 0;
  let alreadyExisted = 0;
  let skipped = 0;
  // Hosted pilot: the records ceiling applies to pushes from sibling apps
  // too. Rows past it are skipped and reported, never half-written.
  let room = await pilotRemaining(prisma, orgId, "vendors");
  let ceilingReached = false;

  for (const vendor of vendors) {
    if (!vendor.name) {
      skipped++;
      continue;
    }
    if (room <= 0) {
      ceilingReached = true;
      skipped++;
      continue;
    }

    try {
      // Check for existing vendor by catalogSlug + orgId, or name + orgId
      const existing = await prisma.aIVendor.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            ...(vendor.slug ? [{ catalogSlug: vendor.slug }] : []),
            { name: vendor.name },
          ],
        },
      });

      if (existing) {
        alreadyExisted++;
        continue;
      }

      const created = await prisma.aIVendor.create({
        data: {
          organizationId: orgId,
          name: vendor.name,
          website: vendor.website ?? null,
          description: vendor.description ?? null,
          catalogSlug: vendor.slug ?? null,
          riskLevel: CRITICALITY_TO_RISK[vendor.criticality ?? "medium"] as
            | "LOW"
            | "MEDIUM"
            | "HIGH"
            | "CRITICAL",
          status: "UNDER_REVIEW",
          metadata: {
            importedFrom: "vendorwatch",
            category: vendor.category ?? null,
            subcategory: vendor.subcategory ?? null,
            certifications: vendor.certifications ?? [],
            dataLocations: vendor.dataLocations ?? [],
            aiCapabilities: vendor.aiCapabilities ?? [],
            modelHosting: vendor.modelHosting ?? null,
            dpaUrl: vendor.dpaUrl ?? null,
            dpaComplianceScore: vendor.dpaComplianceScore ?? null,
            dpaGdprScore: vendor.dpaGdprScore ?? null,
            dpaCcpaScore: vendor.dpaCcpaScore ?? null,
          },
        },
      });
      exported++;
      room -= 1;
      imported.push({ id: created.id, name: vendor.name });
    } catch (err) {
      // Skip the row but keep the reason observable — a silent counter made
      // partial imports impossible to debug.
      console.error(`[import/portfolio-vendors] skipped "${vendor.name}":`, err);
      skipped++;
    }
  }

  if (imported.length > 0) {
    await prisma.auditLog.createMany({
      data: imported.map((row) => ({
        organizationId: orgId,
        userId: account.userId,
        entityType: "AIVendor",
        entityId: row.id,
        action: "CREATE",
        changes: { name: row.name, status: "UNDER_REVIEW" },
        metadata: { source: "api-import", route: "portfolio-vendors" },
      })),
    });
  }

  return NextResponse.json({
    exported,
    alreadyExisted,
    skipped,
    orgName,
    ceilingReached,
  });
}
