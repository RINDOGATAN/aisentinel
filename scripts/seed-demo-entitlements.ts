// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Seed premium entitlements for the demo organization (acme-ai).
 *
 * Creates:
 *  1. A Customer record for the demo org
 *  2. A CustomerOrganization link
 *  3. SkillEntitlement records (ACTIVE, PERPETUAL) for all 4 premium skills
 *
 * Safe to run multiple times — uses upserts.
 */

import { PrismaClient, EntitlementStatus, LicenseType, CustomerType } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ORG_SLUG = "acme-ai";

const SKILL_IDS = [
  "com.todolaw.aisentinel.shadow-ai",
  "com.todolaw.aisentinel.vendor-catalog",
  "com.todolaw.aisentinel.conformity",
  "com.todolaw.aisentinel.bias-fairness",
];

async function main() {
  console.log("Seeding premium entitlements for demo org...\n");

  // 1. Find the demo org
  const org = await prisma.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
  });

  if (!org) {
    throw new Error(`Organization with slug "${DEMO_ORG_SLUG}" not found. Run "npx prisma db seed" first.`);
  }

  console.log(`  Found org: ${org.name} (${org.id})`);

  // 2. Create or find the demo customer
  const customer = await prisma.customer.upsert({
    where: { email: "demo@aisentinel.example" },
    update: {},
    create: {
      id: "demo-customer",
      name: "Acme AI Corp (Demo)",
      email: "demo@aisentinel.example",
      type: CustomerType.SAAS,
    },
  });

  console.log(`  Customer: ${customer.name} (${customer.id})`);

  // 3. Link customer to the demo org
  await prisma.customerOrganization.upsert({
    where: {
      customerId_organizationId: {
        customerId: customer.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      id: "demo-customer-org",
      customerId: customer.id,
      organizationId: org.id,
    },
  });

  console.log(`  Linked customer to org "${org.slug}"`);

  // 4. Create ACTIVE entitlements for every premium skill
  for (const skillId of SKILL_IDS) {
    const pkg = await prisma.skillPackage.findUnique({
      where: { skillId },
    });

    if (!pkg) {
      console.warn(`  ⚠ SkillPackage "${skillId}" not found — skipping`);
      continue;
    }

    await prisma.skillEntitlement.upsert({
      where: {
        customerId_skillPackageId: {
          customerId: customer.id,
          skillPackageId: pkg.id,
        },
      },
      update: {
        status: EntitlementStatus.ACTIVE,
        licenseType: LicenseType.PERPETUAL,
        expiresAt: null,
      },
      create: {
        customerId: customer.id,
        skillPackageId: pkg.id,
        licenseType: LicenseType.PERPETUAL,
        status: EntitlementStatus.ACTIVE,
        expiresAt: null,
      },
    });

    console.log(`  Entitled: ${pkg.displayName} (${skillId}) — ACTIVE / PERPETUAL`);
  }

  console.log("\nDone! Demo org now has all 4 premium features unlocked.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
