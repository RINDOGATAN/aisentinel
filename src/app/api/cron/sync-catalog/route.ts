import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { VendorWatchVendor, VendorWatchSyncResponse } from "@/lib/vendor-watch-types";
import { mapVendorToUpsert } from "@/lib/vendor-watch-mapper";

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

      const data: VendorWatchSyncResponse = await res.json();

      for (const v of data.vendors) {
        const mapped = mapVendorToUpsert(v);

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
