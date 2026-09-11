// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Writes parsed spreadsheet rows into the AI inventory.
 *
 * - A row whose name matches an existing system (case-insensitive) is skipped,
 *   so importing the same sheet twice creates nothing the second time.
 * - Vendors are matched by name (case-insensitive) and created when missing,
 *   UNDER_REVIEW, the way a vendor typed into the registry would be.
 * - A stated risk tier becomes a classification marked IMPORTED and
 *   unconfirmed: it is what the source file says, not a judgment made here,
 *   and it waits for a person to confirm it. The tier's compliance
 *   requirements are attached as NOT_ASSESSED, exactly as a manual
 *   classification would attach them, and so are the cross-border regimes.
 * - A system without a stated tier stays unclassified and appears as a gap.
 */

import type { AIRiskLevel, PrismaClient } from "@prisma/client";
import type { ImportRow } from "@/lib/inventory-import";
import { attachRegimeMappings } from "@/server/services/scope/attach-regimes";

export interface ImportResult {
  created: number;
  skippedExisting: string[];
  vendorsCreated: number;
  classified: number;
  complianceMappings: number;
  createdSystemIds: string[];
}

export async function importInventoryRows(
  prisma: PrismaClient,
  args: { organizationId: string; userId: string; rows: ImportRow[]; fileName?: string },
): Promise<ImportResult> {
  const { organizationId, userId } = args;
  const result: ImportResult = {
    created: 0,
    skippedExisting: [],
    vendorsCreated: 0,
    classified: 0,
    complianceMappings: 0,
    createdSystemIds: [],
  };
  const sourceRef = `spreadsheet:${(args.fileName ?? "import").slice(0, 120)}`;

  const existing = await prisma.aISystem.findMany({
    where: { organizationId },
    select: { name: true },
  });
  const seen = new Set(existing.map((s) => s.name.trim().toLowerCase()));

  const vendors = await prisma.aIVendor.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });
  const vendorByName = new Map(vendors.map((v) => [v.name.trim().toLowerCase(), v.id]));

  const requirementsByTier = new Map<string, string[]>();
  const requirementsFor = async (tier: AIRiskLevel) => {
    if (!requirementsByTier.has(tier)) {
      const reqs = await prisma.complianceRequirement.findMany({
        where: { applicableTo: { has: tier } },
        select: { id: true },
      });
      requirementsByTier.set(tier, reqs.map((r) => r.id));
    }
    return requirementsByTier.get(tier)!;
  };

  const audit: { entityType: string; entityId: string; changes: object }[] = [];

  for (const row of args.rows) {
    const key = row.name.trim().toLowerCase();
    if (seen.has(key)) {
      result.skippedExisting.push(row.name);
      continue;
    }
    seen.add(key);

    let vendorId: string | undefined;
    if (row.vendor) {
      const vKey = row.vendor.trim().toLowerCase();
      vendorId = vendorByName.get(vKey);
      if (!vendorId) {
        const vendor = await prisma.aIVendor.create({
          data: {
            organizationId,
            name: row.vendor.trim(),
            status: "UNDER_REVIEW",
            metadata: { source: "spreadsheet-import" },
          },
        });
        vendorId = vendor.id;
        vendorByName.set(vKey, vendor.id);
        result.vendorsCreated++;
        audit.push({ entityType: "AIVendor", entityId: vendor.id, changes: { name: vendor.name, source: "spreadsheet-import" } });
      }
    }

    const system = await prisma.aISystem.create({
      data: {
        organizationId,
        name: row.name,
        description: row.description,
        purpose: row.purpose,
        technique: row.technique,
        role: row.role,
        status: row.status,
        businessOwner: row.businessOwner,
        technicalOwner: row.technicalOwner,
        processesPersonalData: row.processesPersonalData ?? false,
        vendorId,
        metadata: {
          source: "spreadsheet-import",
          // The column was empty or unreadable: record that we do not know,
          // rather than letting `false` read as an answer.
          ...(row.processesPersonalData === null ? { personalDataStated: false } : {}),
        },
      },
    });
    result.created++;
    result.createdSystemIds.push(system.id);
    audit.push({ entityType: "AISystem", entityId: system.id, changes: { name: row.name, source: "spreadsheet-import" } });

    if (row.riskLevel) {
      await prisma.riskClassification.create({
        data: {
          aiSystemId: system.id,
          organizationId,
          riskLevel: row.riskLevel,
          rationale:
            "Tier as stated in the imported spreadsheet. Not yet reviewed: confirm it against the EU AI Act classification rules (Art. 5, Art. 6 and Annex III, Art. 50).",
          classifiedBy: userId,
          provenance: "IMPORTED",
          sourceRef,
        },
      });
      result.classified++;
      const reqIds = await requirementsFor(row.riskLevel);
      if (reqIds.length > 0) {
        const { count } = await prisma.complianceMapping.createMany({
          data: reqIds.map((requirementId) => ({
            organizationId,
            aiSystemId: system.id,
            requirementId,
            status: "NOT_ASSESSED" as const,
          })),
          skipDuplicates: true,
        });
        result.complianceMappings += count;
      }
    }
  }

  // Cross-border regimes, per system; one failing must not lose the import.
  for (const systemId of result.createdSystemIds) {
    try {
      const attached = await attachRegimeMappings(prisma, organizationId, systemId);
      result.complianceMappings += attached.created;
    } catch {
      // The system's Cross-border tab still offers the attach action.
    }
  }

  if (audit.length > 0) {
    await prisma.auditLog.createMany({
      data: audit.map((a) => ({
        organizationId,
        userId,
        entityType: a.entityType,
        entityId: a.entityId,
        action: "CREATE",
        changes: a.changes,
        metadata: { source: "spreadsheet-import", sourceRef },
      })),
    });
  }

  return result;
}
