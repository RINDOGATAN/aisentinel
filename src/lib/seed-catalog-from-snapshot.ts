/**
 * Seeds AI Sentinel's vendorCatalog from a release-generated catalog snapshot
 * (vendors/catalog-snapshot.json, produced by vendor.watch). The snapshot shape
 * is the shared cross-app contract:
 *
 *   { version, generatedAt, sourceCommit, count, vendors: VendorWatchVendor[] }
 *
 * Each vendor is mapped through the shared mapVendorToUpsert() and upserted by
 * slug with source "vendor-watch". Used by scripts/seed-vendor-catalog.ts, which
 * the sovereign first-boot migrate.sh runs.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { VendorWatchVendor } from "./vendor-watch-types";
import { mapVendorToUpsert } from "./vendor-watch-mapper";

const SNAPSHOT_PATH = join(process.cwd(), "vendors", "catalog-snapshot.json");

// A healthy release snapshot carries the full catalog. A short read means a
// truncated or partial artifact; we refuse to seed (and never prune) from it.
const MIN_VENDOR_COUNT = 300;

// Prune only ever removes rows this seed pipeline itself owns. Rows from any
// other source (e.g. "manual") are left untouched.
const PRUNABLE_SOURCES = new Set(["vendor-watch", "processors.json", "seed"]);

interface CatalogSnapshot {
  version?: string;
  generatedAt?: string;
  sourceCommit?: string;
  count?: number;
  vendors?: VendorWatchVendor[];
}

export interface SeedCatalogResult {
  created: number;
  updated: number;
  pruned: number;
  total: number;
}

export async function seedCatalogFromSnapshot(
  prisma: PrismaClient,
  opts: { prune?: boolean } = {},
): Promise<SeedCatalogResult> {
  // Fail loudly if the snapshot is missing (readFileSync throws), unparseable,
  // or missing its vendors array.
  const raw = readFileSync(SNAPSHOT_PATH, "utf-8");

  let snapshot: CatalogSnapshot;
  try {
    snapshot = JSON.parse(raw) as CatalogSnapshot;
  } catch (err) {
    throw new Error(
      `Catalog snapshot at ${SNAPSHOT_PATH} is not valid JSON: ${(err as Error).message}`,
    );
  }

  const vendors = snapshot.vendors;
  if (!Array.isArray(vendors)) {
    throw new Error(
      `Catalog snapshot at ${SNAPSHOT_PATH} has no "vendors" array.`,
    );
  }

  if (vendors.length < MIN_VENDOR_COUNT) {
    throw new Error(
      `Catalog snapshot only has ${vendors.length} vendors (expected at least ${MIN_VENDOR_COUNT}). ` +
        `Refusing to seed from a truncated snapshot.`,
    );
  }

  let created = 0;
  let updated = 0;

  for (const v of vendors) {
    const data = mapVendorToUpsert(v);
    const result = await prisma.vendorCatalog.upsert({
      where: { slug: v.slug },
      create: { slug: v.slug, ...data },
      update: data,
    });
    // A freshly created row has identical created/updated timestamps.
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  let pruned = 0;

  // Prune is opt-in and never runs against a small snapshot (already guarded by
  // the MIN_VENDOR_COUNT throw above). It removes only stale rows this pipeline
  // owns and NEVER deletes verified rows, rows with a verifiedBy stamp, or rows
  // from a foreign source. (AI Sentinel has no publicProfileEnabled column, so
  // that protection is not applicable here.)
  if (opts.prune && vendors.length >= MIN_VENDOR_COUNT) {
    const snapshotSlugs = new Set(vendors.map((v) => v.slug));

    const existing = await prisma.vendorCatalog.findMany({
      select: {
        id: true,
        slug: true,
        source: true,
        isVerified: true,
        verifiedBy: true,
      },
    });

    const toDelete = existing.filter(
      (row) =>
        !snapshotSlugs.has(row.slug) &&
        row.source != null &&
        PRUNABLE_SOURCES.has(row.source) &&
        row.isVerified !== true &&
        row.verifiedBy == null,
    );

    if (toDelete.length > 0) {
      const res = await prisma.vendorCatalog.deleteMany({
        where: { id: { in: toDelete.map((r) => r.id) } },
      });
      pruned = res.count;
    }
  }

  return { created, updated, pruned, total: vendors.length };
}
