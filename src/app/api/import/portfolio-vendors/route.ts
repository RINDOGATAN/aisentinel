import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateImportApiKey } from "@/lib/import-auth";

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
  description?: string | null;
  website?: string | null;
  criticality?: string;
  certifications?: string[];
  dataLocations?: string[];
  aiCapabilities?: string[];
  modelHosting?: string | null;
}

export async function POST(request: Request) {
  if (!validateImportApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  for (const vendor of vendors) {
    if (!vendor.name) {
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
            certifications: vendor.certifications ?? [],
            dataLocations: vendor.dataLocations ?? [],
            aiCapabilities: vendor.aiCapabilities ?? [],
            modelHosting: vendor.modelHosting ?? null,
          },
        },
      });
      exported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    exported,
    alreadyExisted,
    skipped,
    orgName,
  });
}
