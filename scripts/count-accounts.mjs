// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Print one JSON object of account counts for this instance.
 *
 * Read-only by construction: the only Prisma calls here are `count` and an
 * aggregate `findMany` that selects a single foreign key. Nothing is written.
 *
 * No name and no e-mail address ever leaves this script. Only integers.
 *
 * Definitions, because the words are ambiguous:
 *   users          every row in User, including people who joined an
 *                  organization by e-mail domain and never returned.
 *   organizations  every row in Organization.
 *   paying         distinct Customers holding at least one entitlement that is
 *                  ACTIVE and not past its expiry. Stripe is switched off on
 *                  the hosted instance, so in practice this counts offline
 *                  licence holders. It is the honest answer to "who has bought
 *                  something", not a recurring-revenue figure.
 *   installs       null, always. Self-hosted installs are not tracked by
 *                  design: the published images report to nobody, and this
 *                  script has no way of counting them. The field exists so a
 *                  reader knows the absence is deliberate, not an oversight.
 *
 * Usage: node --env-file=.env.local scripts/count-accounts.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.ais_DATABASE_URL) {
    throw new Error(
      "ais_DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/count-accounts.mjs",
    );
  }

  const now = new Date();

  const [users, organizations, payingRows] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    // Distinct customers with a live entitlement. Selecting only the foreign
    // key keeps every name and address out of this process.
    prisma.skillEntitlement.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        // scripts/seed-demo-entitlements.ts upserts this one fixed id and hands
        // it every package. It is a seed artefact, never a buyer, so counting
        // it would overstate the figure on any instance that has been seeded.
        customerId: { not: "demo-customer" },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
  ]);

  return {
    product: "AI SENTINEL",
    users,
    organizations,
    paying: payingRows.length,
    installs: null,
    as_of: now.toISOString(),
    source: "hosted DB, read-only, licence holders",
  };
}

main()
  .then((result) => {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  })
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
