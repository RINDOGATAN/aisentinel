// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Seeds the customer-facing chatbot overlay's eight control rows
 * (src/config/chatbot-overlay.ts) under the CHATBOT_OVERLAY framework.
 *
 * Idempotent upserts keyed on stable ids. Every row seeds with
 * `applicableTo: []`, so the EU risk-tier auto-mapping never reaches it, and
 * with the one overlay tag. Seeding adds no compliance mapping: rows reach a
 * system only through the requirement sync, and only while
 * CHATBOT_OVERLAY_ENABLED is "true". With the switch off the framework is
 * hidden from every list, so running this changes nothing anyone sees.
 */
import { PrismaClient } from "@prisma/client";
import { CHATBOT_FRAMEWORK, CHATBOT_REQUIREMENTS } from "../src/config/chatbot-overlay";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding the customer-facing chatbot overlay...\n");
  const framework = await prisma.complianceFramework.upsert({
    where: { code: CHATBOT_FRAMEWORK.code },
    update: { name: CHATBOT_FRAMEWORK.name, version: CHATBOT_FRAMEWORK.version, description: CHATBOT_FRAMEWORK.description },
    create: {
      code: CHATBOT_FRAMEWORK.code,
      name: CHATBOT_FRAMEWORK.name,
      version: CHATBOT_FRAMEWORK.version,
      description: CHATBOT_FRAMEWORK.description,
    },
  });
  for (const req of CHATBOT_REQUIREMENTS) {
    await prisma.complianceRequirement.upsert({
      where: { id: req.id },
      update: {
        code: req.code,
        title: req.title.en,
        description: req.description.en,
        applicabilityTags: [...req.applicabilityTags],
        sortOrder: req.sortOrder,
        parentId: null,
      },
      create: {
        id: req.id,
        frameworkId: framework.id,
        code: req.code,
        title: req.title.en,
        description: req.description.en,
        applicableTo: [],
        applicabilityTags: [...req.applicabilityTags],
        sortOrder: req.sortOrder,
        parentId: null,
      },
    });
  }
  const seeded = await prisma.complianceRequirement.count({ where: { frameworkId: framework.id } });
  const leaked = await prisma.complianceRequirement.count({
    where: { frameworkId: framework.id, NOT: { applicableTo: { isEmpty: true } } },
  });
  console.log(`  ${CHATBOT_FRAMEWORK.name}: ${seeded} rows (config ${CHATBOT_REQUIREMENTS.length})`);
  if (leaked > 0) {
    console.error(`\nFAIL: ${leaked} overlay requirement(s) have a non-empty applicableTo.`);
    process.exit(1);
  }
  if (seeded < CHATBOT_REQUIREMENTS.length) {
    console.error(`\nFAIL: seeded ${seeded} rows but the config defines ${CHATBOT_REQUIREMENTS.length}.`);
    process.exit(1);
  }
  console.log("\nDone. The overlay's legal sign-off is PENDING.");
}

main()
  .catch((e) => {
    console.error("Error seeding the chatbot overlay:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
