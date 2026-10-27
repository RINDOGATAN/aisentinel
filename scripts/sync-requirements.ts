// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Brings every organisation's requirement rows in line with its scope
 * (src/server/services/scope/sync-requirements.ts), once.
 *
 * The app does this on every change of scope. Rows written before that rule
 * existed (an organisation that declared a place after its quick start, a
 * system whose risk level changed, a standard answered "no") wait for the next
 * change; this catches them all up. Empty rows only are removed, never a row
 * anyone worked on, and nothing is removed while a legal hold is in force.
 *
 *   npm run db:sync-requirements -- --dry-run   # what it would do
 *   npm run db:sync-requirements
 */

import { PrismaClient } from "@prisma/client";
import { syncRequirements } from "../src/server/services/scope/sync-requirements";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  let created = 0;
  let removed = 0;
  let changed = 0;
  for (const org of organizations) {
    const result = await syncRequirements(prisma, org.id, { reason: "backfill", dryRun });
    created += result.created;
    removed += result.removed;
    if (result.created + result.removed > 0) changed++;
  }
  console.log(
    `${dryRun ? "Would change" : "Changed"} ${changed} of ${organizations.length} organisations: ` +
      `${created} rows ${dryRun ? "to add" : "added"}, ${removed} empty rows ${dryRun ? "to remove" : "removed"}.`,
  );
}

main()
  .catch((e) => {
    console.error("Requirement sync failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
