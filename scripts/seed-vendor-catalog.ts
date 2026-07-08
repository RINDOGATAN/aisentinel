// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Seeds AI Sentinel's vendor catalog from the release-generated snapshot at
 * vendors/catalog-snapshot.json (produced by vendor.watch). This is a thin
 * wrapper over seedCatalogFromSnapshot(); the editorial hardcoded vendor array
 * that previously lived here has been retired in favour of the shared snapshot.
 *
 * Usage:
 *   npm run db:seed-vendor-catalog            # upsert only
 *   npm run db:seed-vendor-catalog -- --prune # also prune stale pipeline rows
 */

import { PrismaClient } from "@prisma/client";
import { seedCatalogFromSnapshot } from "../src/lib/seed-catalog-from-snapshot";

const prisma = new PrismaClient();

async function main() {
  const prune = process.argv.includes("--prune");
  console.log(
    `Seeding AI vendor catalog from snapshot${prune ? " (with prune)" : ""}...`,
  );

  const result = await seedCatalogFromSnapshot(prisma, { prune });

  console.log(
    `Done. ${result.created} created, ${result.updated} updated, ` +
      `${result.pruned} pruned. Total in snapshot: ${result.total}.`,
  );
}

main()
  .catch((e) => {
    console.error("Vendor catalog seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
