import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface VendorWatchVendor {
  id: string;
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
  hipaaCompliant: boolean | null;
  dataLocations: string[];
  hasEuDataCenter: boolean | null;
  subprocessors: unknown;
  euAiActCompliant: boolean | null;
  aiCapabilities: string[];
  modelHosting: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SyncResponse {
  vendors: VendorWatchVendor[];
  nextCursor: string | undefined;
  count: number;
}

async function main() {
  const apiUrl = process.env.VENDORWATCH_CATALOG_API_URL;
  const apiKey = process.env.VENDORWATCH_CATALOG_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("Missing VENDORWATCH_CATALOG_API_URL or VENDORWATCH_CATALOG_API_KEY");
    process.exit(1);
  }

  console.log(`Syncing vendor catalog from ${apiUrl}...`);

  let cursor: string | undefined;
  let totalSynced = 0;
  let totalCreated = 0;
  let totalUpdated = 0;

  do {
    const url = new URL(apiUrl);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      console.error(`API error: ${res.status} ${res.statusText}`);
      const body = await res.text();
      console.error(body);
      process.exit(1);
    }

    const data: SyncResponse = await res.json();
    console.log(`Fetched ${data.count} vendors (cursor: ${cursor || "start"})`);

    for (const v of data.vendors) {
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

  console.log(`\nSync complete: ${totalSynced} total, ${totalCreated} created, ${totalUpdated} updated`);
}

main()
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
