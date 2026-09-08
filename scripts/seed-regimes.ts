// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Seeds the regime frameworks: GDPR (AI provisions), Colorado SB 26-189,
 * Texas TRAIGA and the Washington domain instruments.
 *
 * Runs AFTER seed-frameworks and seed-admt (the EU/CA rows must exist for
 * cross-mapping) and BEFORE seed-cross-mappings (which resolves the ids
 * created here). Idempotent upserts keyed on stable ids.
 *
 * Every row seeds with `applicableTo: []`, which keeps these rows invisible to
 * the EU risk-tier auto-mapping; scope is carried by `applicabilityTags` and
 * resolved by src/config/regimes/regime-rules.ts. The invariant checks at the
 * end prove the EU tier counts did not move and no row leaked a tier.
 */
import { PrismaClient } from "@prisma/client";
import {
  REGIME_PACKS,
  flattenRegimeRequirements,
  regimeRequirementId,
  type RegimeFramework,
  type RegimeRequirementSeed,
} from "../src/config/regimes";

const prisma = new PrismaClient();

async function upsertRequirement(
  pack: RegimeFramework,
  frameworkId: string,
  req: RegimeRequirementSeed,
  parentId: string | null,
): Promise<void> {
  const id = regimeRequirementId(pack, req.slug);
  await prisma.complianceRequirement.upsert({
    where: { id },
    update: {
      code: req.code,
      title: req.title.en,
      description: req.description.en,
      applicabilityTags: [...req.applicabilityTags],
      sortOrder: req.sortOrder,
      parentId,
    },
    create: {
      id,
      frameworkId,
      code: req.code,
      title: req.title.en,
      description: req.description.en,
      applicableTo: [],
      applicabilityTags: [...req.applicabilityTags],
      sortOrder: req.sortOrder,
      parentId,
    },
  });
  for (const child of req.children ?? []) {
    await upsertRequirement(pack, frameworkId, child, id);
  }
}

async function main() {
  console.log("Seeding regime frameworks (GDPR, Colorado, Texas, Washington)...\n");
  const limitedBefore = await prisma.complianceRequirement.count({
    where: { applicableTo: { has: "LIMITED" } },
  });
  const highBefore = await prisma.complianceRequirement.count({
    where: { applicableTo: { has: "HIGH" } },
  });

  for (const pack of REGIME_PACKS) {
    const fw = pack.framework;
    const framework = await prisma.complianceFramework.upsert({
      where: { code: fw.code },
      update: { name: fw.name, version: fw.version, description: fw.description },
      create: { code: fw.code, name: fw.name, version: fw.version, description: fw.description },
    });
    for (const req of pack.requirements) {
      await upsertRequirement(fw, framework.id, req, null);
    }
    const inConfig = flattenRegimeRequirements(pack.requirements).length;
    const seeded = await prisma.complianceRequirement.count({ where: { frameworkId: framework.id } });
    const leaked = await prisma.complianceRequirement.count({
      where: { frameworkId: framework.id, NOT: { applicableTo: { isEmpty: true } } },
    });
    console.log(`  ${fw.name}: ${seeded} rows (config ${inConfig}, content ${fw.contentVersion}, law reviewed ${fw.lawReviewedAsOf})`);
    if (leaked > 0) {
      console.error(`\nFAIL: ${leaked} ${fw.code} requirement(s) have a non-empty applicableTo.`);
      process.exit(1);
    }
    if (seeded < inConfig) {
      console.error(`\nFAIL: ${fw.code} seeded ${seeded} rows but the config defines ${inConfig}.`);
      process.exit(1);
    }
  }

  const limitedAfter = await prisma.complianceRequirement.count({ where: { applicableTo: { has: "LIMITED" } } });
  const highAfter = await prisma.complianceRequirement.count({ where: { applicableTo: { has: "HIGH" } } });
  if (limitedAfter !== limitedBefore || highAfter !== highBefore) {
    console.error(`\nFAIL: seeding moved the EU tier counts (LIMITED ${limitedBefore} -> ${limitedAfter}, HIGH ${highBefore} -> ${highAfter}).`);
    process.exit(1);
  }
  console.log("\nDone. Regime frameworks seeded.");
  console.log("NOTE: every regime carries a PENDING legal sign-off marker.");
}

main()
  .catch((e) => {
    console.error("Error seeding regime frameworks:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
