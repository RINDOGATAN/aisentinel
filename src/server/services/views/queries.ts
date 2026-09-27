// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// The two ready lists the consultant asked for: "Needs action" (everything
// waiting for a person) and "Incomplete" (systems missing required registration
// fields). Both are org-guarded and department-scoped: a member limited to a
// department sees only that department's work, and an unlimited member can
// narrow to a department on demand.
//
// The rules themselves are pure (src/lib/needs-action.ts, registration-
// completeness.ts); this file only gathers the counts and rows they read.

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  buildNeedsAction,
  needsActionTotal,
  type NeedsActionCounts,
} from "@/lib/needs-action";
import {
  missingRegistrationFields,
  type RegistrationField,
} from "@/lib/registration-completeness";
import { getConfirmationCounts } from "../provenance/summary";
import { businessUnitScopeWhere, type BusinessUnitScope } from "../business-units/scope";
import { UNASSIGNED_DEPARTMENT } from "@/lib/system-views";

/**
 * The AISystem condition that expresses "systems this member may see, narrowed
 * to the requested department if any". Returns undefined when there is no
 * restriction at all (an unlimited member with no department chosen).
 */
export function systemScopeWhere(
  scope: BusinessUnitScope,
  requestedBusinessUnitId?: string,
): Prisma.AISystemWhereInput | undefined {
  const conditions: Prisma.AISystemWhereInput[] = [];
  const scopeWhere = businessUnitScopeWhere(scope);
  if (scopeWhere) conditions.push(scopeWhere);
  if (requestedBusinessUnitId) {
    conditions.push(
      requestedBusinessUnitId === UNASSIGNED_DEPARTMENT
        ? { businessUnitId: null }
        : { businessUnitId: requestedBusinessUnitId },
    );
  }
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

export interface NeedsActionResult {
  items: ReturnType<typeof buildNeedsAction>;
  total: number;
  /// Whether the result is narrowed to a department (so the UI can say so, and
  /// know the confirmation queue was left out).
  departmentScoped: boolean;
}

export async function collectNeedsAction(
  prisma: PrismaClient,
  organizationId: string,
  scope: BusinessUnitScope,
  requestedBusinessUnitId?: string,
): Promise<NeedsActionResult> {
  const systemWhere = systemScopeWhere(scope, requestedBusinessUnitId);
  const departmentScoped = systemWhere !== undefined;
  // The relation fragment folded into each count's where when a scope applies.
  // Cast per query because each model names its own relation-filter type.
  const rel = systemWhere ? { aiSystem: { is: systemWhere } } : {};
  const now = new Date();

  const [assessmentReview, oversightGate, overdueRetest, incidentOpen] = await Promise.all([
    prisma.aIAssessment.count({
      where: { organizationId, status: "UNDER_REVIEW", ...rel } as Prisma.AIAssessmentWhereInput,
    }),
    prisma.oversightGate.count({
      where: {
        organizationId,
        status: { in: ["PENDING", "IN_REVIEW"] },
        ...rel,
      } as Prisma.OversightGateWhereInput,
    }),
    prisma.threatModel.count({
      where: { organizationId, nextReviewDue: { lt: now }, ...rel } as Prisma.ThreatModelWhereInput,
    }),
    prisma.aIIncident.count({
      where: {
        organizationId,
        status: { in: ["REPORTED", "INVESTIGATING", "MITIGATING"] },
        ...rel,
      } as Prisma.AIIncidentWhereInput,
    }),
  ]);

  // The confirmation queue spans five models that do not all hang off a system,
  // so it is only counted for the whole-organization view; a department view
  // leaves it out rather than showing an org-wide number under a department name.
  let reviewQueue: number | null = null;
  if (!departmentScoped) {
    const counts = await getConfirmationCounts(prisma, organizationId);
    reviewQueue = Object.values(counts).reduce(
      (sum, c) => sum + (c.total - c.confirmed),
      0,
    );
  }

  const counts: NeedsActionCounts = {
    assessmentReview,
    oversightGate,
    overdueRetest,
    incidentOpen,
    reviewQueue,
  };
  const items = buildNeedsAction(counts);
  return { items, total: needsActionTotal(items), departmentScoped };
}

export interface IncompleteSystem {
  id: string;
  name: string;
  businessUnitId: string | null;
  missing: RegistrationField[];
}

const INCOMPLETE_LIMIT = 200;

export async function collectIncompleteSystems(
  prisma: PrismaClient,
  organizationId: string,
  scope: BusinessUnitScope,
  requestedBusinessUnitId?: string,
): Promise<IncompleteSystem[]> {
  const systemWhere = systemScopeWhere(scope, requestedBusinessUnitId);
  const where: Prisma.AISystemWhereInput = { organizationId, ...(systemWhere ?? {}) };

  const systems = await prisma.aISystem.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: INCOMPLETE_LIMIT,
    select: {
      id: true,
      name: true,
      description: true,
      purpose: true,
      businessOwner: true,
      technicalOwner: true,
      businessUnitId: true,
      riskClassification: { select: { id: true } },
    },
  });

  const result: IncompleteSystem[] = [];
  for (const s of systems) {
    const missing = missingRegistrationFields({
      description: s.description,
      purpose: s.purpose,
      businessOwner: s.businessOwner,
      technicalOwner: s.technicalOwner,
      hasRiskClassification: s.riskClassification !== null,
    });
    if (missing.length > 0) {
      result.push({ id: s.id, name: s.name, businessUnitId: s.businessUnitId, missing });
    }
  }
  return result;
}
