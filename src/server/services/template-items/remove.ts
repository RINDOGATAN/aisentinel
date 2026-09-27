// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import type { PrismaClient } from "@prisma/client";
import { assertNotOnHold } from "@/server/services/legal-hold";

/**
 * "Remove all template items": clear the systems, vendors and assessments an
 * industry template or the quickstart created silently, but only the ones a
 * person has not touched. Nothing a person edited is ever removed.
 *
 * Two facts decide it, both additive columns (see the provenance quad on
 * AISystem / AIVendor / AIAssessment):
 *   - provenance === "AUTO_TEMPLATE"  → the row was created by a template.
 *   - confirmedAt === null            → nobody has taken ownership of it.
 * A row created before these columns existed defaults to USER_ENTERED, so it is
 * treated as possibly edited and is never removed automatically.
 *
 * A template system is kept if it OR any of its confirmable children (an
 * edited/submitted assessment, a confirmed risk classification, oversight gate,
 * compliance mapping or transparency profile) shows a human touch — otherwise
 * deleting it would cascade over work someone did. A template vendor is kept if
 * it has a completed review or is still linked to a system that is being kept.
 */

export interface TemplateRemovalBucket {
  remove: number;
  keep: number;
}

export interface TemplateRemovalPlan {
  systems: TemplateRemovalBucket;
  vendors: TemplateRemovalBucket;
  assessments: TemplateRemovalBucket;
  totalRemove: number;
  totalKeep: number;
  removeIds: { systems: string[]; vendors: string[]; assessments: string[] };
}

export async function planTemplateRemoval(
  prisma: PrismaClient,
  organizationId: string,
): Promise<TemplateRemovalPlan> {
  // --- systems ---
  const candidateSystems = await prisma.aISystem.findMany({
    where: { organizationId, provenance: "AUTO_TEMPLATE", confirmedAt: null },
    select: { id: true, vendorId: true },
  });
  const candidateSystemIds = candidateSystems.map((s) => s.id);

  // Any human-touch signal on a descendant keeps the whole system.
  const touched = new Set<string>();
  if (candidateSystemIds.length > 0) {
    const [assessments, risks, gates, mappings, transparency] = await Promise.all([
      prisma.aIAssessment.findMany({
        where: {
          organizationId,
          aiSystemId: { in: candidateSystemIds },
          OR: [{ confirmedAt: { not: null } }, { status: { not: "DRAFT" } }],
        },
        select: { aiSystemId: true },
      }),
      prisma.riskClassification.findMany({
        where: { organizationId, aiSystemId: { in: candidateSystemIds }, confirmedAt: { not: null } },
        select: { aiSystemId: true },
      }),
      prisma.oversightGate.findMany({
        where: { organizationId, aiSystemId: { in: candidateSystemIds }, confirmedAt: { not: null } },
        select: { aiSystemId: true },
      }),
      prisma.complianceMapping.findMany({
        where: { organizationId, aiSystemId: { in: candidateSystemIds }, confirmedAt: { not: null } },
        select: { aiSystemId: true },
      }),
      prisma.transparencyProfile.findMany({
        where: { organizationId, aiSystemId: { in: candidateSystemIds }, confirmedAt: { not: null } },
        select: { aiSystemId: true },
      }),
    ]);
    for (const row of [...assessments, ...risks, ...gates, ...mappings, ...transparency]) {
      if (row.aiSystemId) touched.add(row.aiSystemId);
    }
  }
  const removeSystemIds = candidateSystemIds.filter((id) => !touched.has(id));
  const removeSystemSet = new Set(removeSystemIds);

  // --- vendors ---
  const candidateVendors = await prisma.aIVendor.findMany({
    where: { organizationId, provenance: "AUTO_TEMPLATE", confirmedAt: null },
    select: { id: true },
  });
  const candidateVendorIds = candidateVendors.map((v) => v.id);

  const protectedVendors = new Set<string>();
  if (candidateVendorIds.length > 0) {
    const [completedReviews, keptSystemLinks] = await Promise.all([
      prisma.aIVendorAssessment.findMany({
        where: { organizationId, vendorId: { in: candidateVendorIds }, completedAt: { not: null } },
        select: { vendorId: true },
      }),
      // Systems that reference a candidate vendor but are NOT being removed:
      // deleting the vendor would null a kept system's link, so keep it.
      prisma.aISystem.findMany({
        where: {
          organizationId,
          vendorId: { in: candidateVendorIds },
          id: { notIn: removeSystemIds.length > 0 ? removeSystemIds : ["__none__"] },
        },
        select: { vendorId: true },
      }),
    ]);
    for (const row of completedReviews) if (row.vendorId) protectedVendors.add(row.vendorId);
    for (const row of keptSystemLinks) if (row.vendorId) protectedVendors.add(row.vendorId);
  }
  const removeVendorIds = candidateVendorIds.filter((id) => !protectedVendors.has(id));

  // --- standalone assessments (whose system is not itself being removed; the
  //     rest go with their system's cascade and are not counted here) ---
  const candidateAssessments = (
    await prisma.aIAssessment.findMany({
      where: { organizationId, provenance: "AUTO_TEMPLATE" },
      select: { id: true, aiSystemId: true, confirmedAt: true, status: true },
    })
  ).filter((a) => !removeSystemSet.has(a.aiSystemId));
  // Removable = unedited draft; a submitted or edited one is kept.
  const removeAssessmentIds = candidateAssessments
    .filter((a) => a.confirmedAt == null && a.status === "DRAFT")
    .map((a) => a.id);

  const systems = { remove: removeSystemIds.length, keep: candidateSystemIds.length - removeSystemIds.length };
  const vendors = { remove: removeVendorIds.length, keep: candidateVendorIds.length - removeVendorIds.length };
  const assessments = {
    remove: removeAssessmentIds.length,
    keep: candidateAssessments.length - removeAssessmentIds.length,
  };

  return {
    systems,
    vendors,
    assessments,
    totalRemove: systems.remove + vendors.remove + assessments.remove,
    totalKeep: systems.keep + vendors.keep + assessments.keep,
    removeIds: { systems: removeSystemIds, vendors: removeVendorIds, assessments: removeAssessmentIds },
  };
}

export interface RemoveTemplateItemsResult {
  systems: number;
  vendors: number;
  assessments: number;
  total: number;
}

export async function removeTemplateItems(
  prisma: PrismaClient,
  args: { organizationId: string; userId: string },
): Promise<RemoveTemplateItemsResult> {
  const { organizationId, userId } = args;
  const plan = await planTemplateRemoval(prisma, organizationId);

  // A legal hold stops the deletion — org-wide, or scoped to any system going.
  await assertNotOnHold(prisma, organizationId, { what: "template items" });
  for (const systemId of plan.removeIds.systems) {
    await assertNotOnHold(prisma, organizationId, { aiSystemId: systemId, what: "template items" });
  }

  await prisma.$transaction(async (tx) => {
    // Systems first: their cascade removes the unedited children it created.
    if (plan.removeIds.systems.length > 0) {
      await tx.aISystem.deleteMany({
        where: { id: { in: plan.removeIds.systems }, organizationId },
      });
    }
    // Standalone assessments whose system stays.
    if (plan.removeIds.assessments.length > 0) {
      await tx.aIAssessment.deleteMany({
        where: { id: { in: plan.removeIds.assessments }, organizationId },
      });
    }
    // Vendors last: any system that referenced a removed one is already gone.
    if (plan.removeIds.vendors.length > 0) {
      await tx.aIVendor.deleteMany({
        where: { id: { in: plan.removeIds.vendors }, organizationId },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: "Organization",
        entityId: organizationId,
        action: "DELETE_TEMPLATE_ITEMS",
        changes: {
          systems: plan.systems.remove,
          vendors: plan.vendors.remove,
          assessments: plan.assessments.remove,
          kept: plan.totalKeep,
        },
      },
    });
  });

  return {
    systems: plan.systems.remove,
    vendors: plan.vendors.remove,
    assessments: plan.assessments.remove,
    total: plan.totalRemove,
  };
}
