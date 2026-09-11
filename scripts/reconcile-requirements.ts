// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Runs the superseded-requirement reconciliation on its own.
 *
 * It already runs at the end of `npm run db:seed-frameworks`, which is the
 * normal path (self-hosted migrator boot, hosted content seeds). Use this to
 * see what it WOULD do against a database before seeding it:
 *
 *   npm run db:reconcile-requirements -- --dry-run
 *
 * Run standalone, it cannot see the titles rows had before a seed, so it
 * judges re-used codes on the titles now in the database. Run the framework
 * seed for the real thing.
 */

import { PrismaClient } from "@prisma/client";
import { reconcileSupersededRequirements } from "../src/lib/requirement-reconciliation";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await reconcileSupersededRequirements(prisma, { dryRun });
}

main()
  .catch((e) => {
    console.error("Requirement reconciliation failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
