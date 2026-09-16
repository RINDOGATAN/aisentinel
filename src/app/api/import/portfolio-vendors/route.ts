// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardImportRequest } from "@/lib/import-auth";
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

  // Look up user and their organization
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      organizationMemberships: {
        include: { organization: true },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const membership = user.organizationMemberships[0];
  if (!membership) {
    return NextResponse.json(
      { error: "User has no organization" },
      { status: 404 }
    );
  }

  const orgId = membership.organizationId;
  const orgName = membership.organization.name;

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

      await prisma.aIVendor.create({
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
    } catch (err) {
      // Skip the row but keep the reason observable — a silent counter made
      // partial imports impossible to debug.
      console.error(`[import/portfolio-vendors] skipped "${vendor.name}":`, err);
      skipped++;
    }
  }

  return NextResponse.json({
    exported,
    alreadyExisted,
    skipped,
    orgName,
    ceilingReached,
  });
}
