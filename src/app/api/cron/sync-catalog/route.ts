import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface VendorWatchVendor {
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  tags: string[];
  website: string | null;
  privacyPolicyUrl: string | null;
  trustCenterUrl: string | null;
  dpaUrl: string | null;
  securityPageUrl: string | null;
  certifications: string[];
  frameworks: string[];
  gdprCompliant: boolean | null;
  ccpaCompliant: boolean | null;
  euAiActCompliant: boolean | null;
  hipaaCompliant: boolean | null;
  dpaComplianceScore: number | null;
  dpaGdprScore: number | null;
  dpaCcpaScore: number | null;
  dataLocations: string[];
  hasEuDataCenter: boolean | null;
  subprocessors: unknown;
  aiCapabilities: string[];
  modelHosting: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env.VENDORWATCH_CATALOG_API_URL;
  const apiKey = process.env.VENDORWATCH_CATALOG_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { error: "Missing VENDORWATCH_CATALOG_API_URL or VENDORWATCH_CATALOG_API_KEY" },
      { status: 500 }
    );
  }

  let cursor: string | undefined;
  let totalSynced = 0;
  let totalCreated = 0;
  let totalUpdated = 0;

  try {
    do {
      const url = new URL(apiUrl);
      url.searchParams.set("limit", "100");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url.toString(), {
        headers: { "x-api-key": apiKey },
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      for (const v of data.vendors as VendorWatchVendor[]) {
        const mapped = {
          name: v.name,
          category: v.category,
          subcategory: v.subcategory,
          description: v.description,
          tags: v.tags || [],
          website: v.website,
          privacyPolicyUrl: v.privacyPolicyUrl,
          trustCenterUrl: v.trustCenterUrl,
          dpaUrl: v.dpaUrl,
          securityPageUrl: v.securityPageUrl,
          certifications: v.certifications || [],
          frameworks: v.frameworks || [],
          gdprCompliant: v.gdprCompliant,
          ccpaCompliant: v.ccpaCompliant,
          euAiActCompliant: v.euAiActCompliant,
          hipaaCompliant: v.hipaaCompliant,
          dpaComplianceScore: v.dpaComplianceScore,
          dpaGdprScore: v.dpaGdprScore,
          dpaCcpaScore: v.dpaCcpaScore,
          dataLocations: v.dataLocations || [],
          hasEuDataCenter: v.hasEuDataCenter,
          subprocessors: v.subprocessors ?? undefined,
          aiCapabilities: v.aiCapabilities || [],
          modelHosting: v.modelHosting,
          logoUrl: v.logoUrl,
          isVerified: v.isVerified,
          verifiedAt: v.verifiedAt ? new Date(v.verifiedAt) : null,
          verifiedBy: v.verifiedBy,
          source: "vendor-watch",
        };

        const existing = await prisma.vendorCatalog.findUnique({
          where: { slug: v.slug },
        });

        if (existing) {
          await prisma.vendorCatalog.update({
            where: { slug: v.slug },
            data: mapped,
          });
          totalUpdated++;
        } else {
          await prisma.vendorCatalog.create({
            data: { slug: v.slug, ...mapped },
          });
          totalCreated++;
        }

        totalSynced++;
      }

      cursor = data.nextCursor;
    } while (cursor);

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      created: totalCreated,
      updated: totalUpdated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
