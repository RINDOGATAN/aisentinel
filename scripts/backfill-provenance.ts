// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Backfill provenance for artifacts generated before the provenance columns
 * existed.
 *
 * Why a script and not SQL inside the migration: a reconstructed provenance is
 * itself a reconstruction — an inference from evidence text, system metadata
 * and the audit trail — so it has to be auditable. Running it silently inside
 * `prisma migrate deploy` would bake an unattributed guess into the record,
 * which is exactly what this feature exists to prevent. Every run writes one
 * AuditLog row per organization describing what it changed.
 *
 * Idempotent: only rows still at the USER_ENTERED default with no confirmation
 * are touched, so a second run reports 0 changes.
 *
 * Usage:
 *   npm run db:backfill-provenance -- --dry-run
 *   npm run db:backfill-provenance
 */

import { PrismaClient, type Provenance } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

/** Rule-pack revision that produced the quickstart compliance baseline. */
const BASELINE_SOURCE_REF = "quickstart-compliance-baseline@1";
const QUICKSTART_SOURCE_REF = "quickstart@1";
const VENDORWATCH_SOURCE_REF = "vendorwatch-import@1";

/**
 * The quickstart stamps its baseline evidence in the requester's locale.
 * BOTH locales must be matched — checking only English silently under-counts
 * every Spanish-locale organization.
 */
const BASELINE_EVIDENCE_EN = "Baseline set by Quick Start";
const BASELINE_EVIDENCE_ES = "Base establecida por el Inicio Rápido";

/** Only ever touch rows nobody has classified or confirmed yet. */
const UNTOUCHED = {
  provenance: "USER_ENTERED" as Provenance,
  confirmedAt: null,
};

interface OrgCounts {
  complianceMappings: number;
  riskClassifications: number;
  oversightGates: number;
  transparencyProfiles: number;
  policies: number;
  importedFromVendorWatch: number;
}

function emptyCounts(): OrgCounts {
  return {
    complianceMappings: 0,
    riskClassifications: 0,
    oversightGates: 0,
    transparencyProfiles: 0,
    policies: 0,
    importedFromVendorWatch: 0,
  };
}

function totalOf(counts: OrgCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/** Ids of systems this org created through the quickstart. */
async function quickstartSystemIds(organizationId: string): Promise<string[]> {
  const rows = await prisma.aISystem.findMany({
    where: {
      organizationId,
      metadata: { path: ["source"], equals: "quickstart" },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Ids of systems whose vendor was imported from vendor.watch. */
async function vendorWatchSystemIds(organizationId: string): Promise<string[]> {
  const vendors = await prisma.aIVendor.findMany({
    where: {
      organizationId,
      metadata: { path: ["importedFrom"], equals: "vendorwatch" },
    },
    select: { id: true },
  });
  if (vendors.length === 0) return [];
  const systems = await prisma.aISystem.findMany({
    where: { organizationId, vendorId: { in: vendors.map((v) => v.id) } },
    select: { id: true },
  });
  return systems.map((s) => s.id);
}

async function backfillOrganization(
  organizationId: string,
  orgName: string,
): Promise<OrgCounts> {
  const counts = emptyCounts();
  const [qsSystemIds, vwSystemIds] = await Promise.all([
    quickstartSystemIds(organizationId),
    vendorWatchSystemIds(organizationId),
  ]);

  // Systems imported from vendor.watch are IMPORTED; quickstart-created ones
  // that are NOT vendor.watch-derived are AUTO_TEMPLATE.
  const vwSet = new Set(vwSystemIds);
  const templateSystemIds = qsSystemIds.filter((id) => !vwSet.has(id));

  // 1. Compliance mappings — identified by the baseline evidence string, in
  //    BOTH locales.
  const mappingWhere = {
    organizationId,
    ...UNTOUCHED,
    OR: [
      { evidence: { contains: BASELINE_EVIDENCE_EN } },
      { evidence: { contains: BASELINE_EVIDENCE_ES } },
    ],
  };
  counts.complianceMappings = DRY_RUN
    ? await prisma.complianceMapping.count({ where: mappingWhere })
    : (
        await prisma.complianceMapping.updateMany({
          where: mappingWhere,
          data: { provenance: "AUTO_TEMPLATE", sourceRef: BASELINE_SOURCE_REF },
        })
      ).count;

  // 2-4. Risk classifications, oversight gates, transparency profiles — the
  //      authoritative signal is the parent system's metadata.source.
  for (const [key, ids, ref, provenance] of [
    ["template", templateSystemIds, QUICKSTART_SOURCE_REF, "AUTO_TEMPLATE"],
    ["imported", vwSystemIds, VENDORWATCH_SOURCE_REF, "IMPORTED"],
  ] as const) {
    if (ids.length === 0) continue;
    const where = { organizationId, ...UNTOUCHED, aiSystemId: { in: [...ids] } };
    const data = { provenance: provenance as Provenance, sourceRef: ref };

    const [risk, gates, profiles] = DRY_RUN
      ? await Promise.all([
          prisma.riskClassification.count({ where }),
          prisma.oversightGate.count({ where }),
          prisma.transparencyProfile.count({ where }),
        ])
      : (
          await Promise.all([
            prisma.riskClassification.updateMany({ where, data }),
            prisma.oversightGate.updateMany({ where, data }),
            prisma.transparencyProfile.updateMany({ where, data }),
          ])
        ).map((r) => r.count);

    if (key === "imported") {
      counts.importedFromVendorWatch += risk + gates + profiles;
    } else {
      counts.riskClassifications += risk;
      counts.oversightGates += gates;
      counts.transparencyProfiles += profiles;
    }
  }

  // 5. Policies have no metadata column — the audit trail is the only record
  //    of quickstart authorship.
  const quickstartPolicyLogs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      entityType: "AIPolicy",
      changes: { path: ["source"], equals: "quickstart" },
    },
    select: { entityId: true },
  });
  const policyIds = [...new Set(quickstartPolicyLogs.map((l) => l.entityId))];
  if (policyIds.length > 0) {
    const where = { organizationId, ...UNTOUCHED, id: { in: policyIds } };
    counts.policies = DRY_RUN
      ? await prisma.aIPolicy.count({ where })
      : (
          await prisma.aIPolicy.updateMany({
            where,
            data: { provenance: "AUTO_TEMPLATE", sourceRef: QUICKSTART_SOURCE_REF },
          })
        ).count;
  }

  const total = totalOf(counts);
  if (total > 0) {
    console.log(
      `  ${orgName}: ${total} row(s) — ` +
        `compliance ${counts.complianceMappings}, ` +
        `risk ${counts.riskClassifications}, ` +
        `gates ${counts.oversightGates}, ` +
        `transparency ${counts.transparencyProfiles}, ` +
        `policies ${counts.policies}, ` +
        `imported ${counts.importedFromVendorWatch}`,
    );

    // The reconstruction itself is auditable.
    if (!DRY_RUN) {
      await prisma.auditLog.create({
        data: {
          organizationId,
          entityType: "Organization",
          entityId: organizationId,
          action: "BACKFILL_PROVENANCE",
          changes: { ...counts, total },
          metadata: {
            source: "backfill-provenance",
            note: "Provenance reconstructed from evidence text, system metadata and the audit trail.",
          },
        },
      });
    }
  }

  return counts;
}

async function main() {
  console.log(
    DRY_RUN
      ? "Provenance backfill (DRY RUN — no writes)"
      : "Provenance backfill",
  );
  console.log("────────────────────────────────────────");

  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const totals = emptyCounts();
  for (const org of organizations) {
    const counts = await backfillOrganization(org.id, org.name);
    for (const key of Object.keys(totals) as (keyof OrgCounts)[]) {
      totals[key] += counts[key];
    }
  }

  const grandTotal = totalOf(totals);
  console.log("────────────────────────────────────────");
  if (grandTotal === 0) {
    console.log("0 changes — every artifact already carries a provenance.");
  } else {
    console.log(
      `${DRY_RUN ? "Would update" : "Updated"} ${grandTotal} row(s) across ${organizations.length} organization(s):`,
    );
    console.log(`  - Compliance mappings:   ${totals.complianceMappings}`);
    console.log(`  - Risk classifications:  ${totals.riskClassifications}`);
    console.log(`  - Oversight gates:       ${totals.oversightGates}`);
    console.log(`  - Transparency profiles: ${totals.transparencyProfiles}`);
    console.log(`  - Policies:              ${totals.policies}`);
    console.log(`  - Imported (vendor.watch): ${totals.importedFromVendorWatch}`);
    if (DRY_RUN) console.log("\nRe-run without --dry-run to apply.");
  }
}

main()
  .catch((e) => {
    console.error("Error backfilling provenance:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
