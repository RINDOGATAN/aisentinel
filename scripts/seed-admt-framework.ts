// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Seeds the California CCPA — ADMT / Risk Assessments / Cybersecurity Audits
 * framework.
 *
 * Separate from seed-frameworks.ts on purpose: that pack carries an EU-final-
 * text review stamped 2026-08-05, while this content is PENDING California
 * legal sign-off. Keeping them apart keeps the two review states separately
 * visible and stops every future California edit diffing against 400 lines of
 * EU text.
 *
 * Runs AFTER seed-frameworks (so the EU/NIST/ISO rows exist for cross-mapping)
 * and BEFORE seed-cross-mappings (which resolves the ca-* ids created here).
 *
 * Every row seeds with `applicableTo: []`. That is what makes these rows
 * structurally invisible to the five existing auto-mapping call sites, all of
 * which query `applicableTo: { has: <tier> }` with no framework filter. Scope
 * is carried by `applicabilityTags` instead, matched with `hasSome`. The
 * invariant check at the end of this script proves the EU tier counts did not
 * move.
 */

import { PrismaClient } from "@prisma/client";
import {
  ADMT_FRAMEWORK,
  ADMT_REQUIREMENTS,
  ADMT_REQUIREMENTS_VERSION,
  admtRequirementId,
  flattenAdmtRequirements,
  type AdmtRequirementSeed,
} from "../src/config/admt-requirements";

const prisma = new PrismaClient();

async function upsertRequirement(
  frameworkId: string,
  req: AdmtRequirementSeed,
  parentId: string | null,
): Promise<void> {
  const id = admtRequirementId(req.slug);

  await prisma.complianceRequirement.upsert({
    where: { id },
    update: {
      code: req.code,
      // The database columns are single-valued; English is stored and the
      // Spanish lives in src/config/admt-requirements.ts.
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
      // Deliberately empty — see the file header.
      applicableTo: [],
      applicabilityTags: [...req.applicabilityTags],
      sortOrder: req.sortOrder,
      parentId,
    },
  });

  for (const child of req.children ?? []) {
    await upsertRequirement(frameworkId, child, id);
  }
}

async function main() {
  console.log("Seeding California CCPA ADMT framework...\n");

  // Prove the structural guarantee rather than assuming it.
  const limitedBefore = await prisma.complianceRequirement.count({
    where: { applicableTo: { has: "LIMITED" } },
  });

  const framework = await prisma.complianceFramework.upsert({
    where: { code: ADMT_FRAMEWORK.code },
    update: {
      name: ADMT_FRAMEWORK.name,
      version: ADMT_FRAMEWORK.version,
      description: ADMT_FRAMEWORK.description,
    },
    create: {
      code: ADMT_FRAMEWORK.code,
      name: ADMT_FRAMEWORK.name,
      version: ADMT_FRAMEWORK.version,
      description: ADMT_FRAMEWORK.description,
    },
  });

  for (const req of ADMT_REQUIREMENTS) {
    await upsertRequirement(framework.id, req, null);
  }

  const total = flattenAdmtRequirements().length;
  const seeded = await prisma.complianceRequirement.count({
    where: { frameworkId: framework.id },
  });

  const limitedAfter = await prisma.complianceRequirement.count({
    where: { applicableTo: { has: "LIMITED" } },
  });

  console.log(`  Framework: ${ADMT_FRAMEWORK.name}`);
  console.log(`  Content version: ${ADMT_REQUIREMENTS_VERSION}`);
  console.log(`  Requirements in config: ${total}`);
  console.log(`  Requirements in database: ${seeded}`);
  console.log(
    `  applicableTo LIMITED count: ${limitedBefore} before, ${limitedAfter} after`,
  );

  if (limitedAfter !== limitedBefore) {
    console.error(
      `\nFAIL: seeding changed the LIMITED tier count (${limitedBefore} -> ${limitedAfter}). ` +
        `ADMT rows must seed with applicableTo: [] or they will be auto-mapped onto every system.`,
    );
    process.exit(1);
  }

  const leaked = await prisma.complianceRequirement.count({
    where: { frameworkId: framework.id, NOT: { applicableTo: { isEmpty: true } } },
  });
  if (leaked > 0) {
    console.error(
      `\nFAIL: ${leaked} ADMT requirement(s) have a non-empty applicableTo.`,
    );
    process.exit(1);
  }

  console.log("\nDone. California ADMT framework seeded.");
  console.log(
    "NOTE: content carries a PENDING California legal sign-off marker.",
  );
}

main()
  .catch((e) => {
    console.error("Error seeding ADMT framework:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
