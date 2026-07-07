// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating text evidence to structured ComplianceEvidence records...\n");

  const mappingsWithEvidence = await prisma.complianceMapping.findMany({
    where: { evidence: { not: null } },
  });

  console.log(`Found ${mappingsWithEvidence.length} mappings with text evidence.`);

  let migrated = 0;
  for (const mapping of mappingsWithEvidence) {
    if (!mapping.evidence) continue;

    // Check if already migrated (skip if evidence items exist)
    const existing = await prisma.complianceEvidence.count({
      where: { complianceMappingId: mapping.id },
    });
    if (existing > 0) {
      console.log(`  Skipping ${mapping.id} — already has ${existing} evidence items`);
      continue;
    }

    await prisma.complianceEvidence.create({
      data: {
        complianceMappingId: mapping.id,
        organizationId: mapping.organizationId,
        type: "DOCUMENT",
        title: mapping.evidence.slice(0, 80) + (mapping.evidence.length > 80 ? "…" : ""),
        description: mapping.evidence,
        addedBy: mapping.assessedBy ?? "system",
        addedAt: mapping.assessedAt ?? new Date(),
      },
    });
    migrated++;
  }

  console.log(`\nMigrated ${migrated} text evidence records to structured ComplianceEvidence.`);
  console.log("Done. You can now remove the 'evidence' column from ComplianceMapping when ready.");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
