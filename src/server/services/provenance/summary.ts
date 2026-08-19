// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Assurance (confirmation) counts for an organization.
 *
 * Shared by the provenance router, the program scorecard and the PDF report so
 * every surface quotes the same numbers. The maths lives in the pure module
 * src/lib/provenance/state.ts; this file only supplies the counts.
 */

import type { PrismaClient } from "@prisma/client";
import {
  computeConfirmationSummary,
  needsConfirmation as needsConfirmationPure,
} from "@/lib/provenance/state";
import type {
  ArtifactClass,
  ClassCount,
  ConfirmationSummary,
} from "@/lib/provenance/types";

/**
 * An artifact is unconfirmed when it was auto-derived and nobody has taken
 * ownership. Expressed as a Prisma filter so the count runs in the database —
 * mirrors `needsConfirmation()` in the pure module, which is the source of
 * truth for the same rule in TypeScript.
 */
export const UNCONFIRMED_WHERE = {
  provenance: { not: "USER_ENTERED" as const },
  confirmedAt: null,
};

/** Re-exported so callers can classify an in-memory row with the same rule. */
export const needsConfirmation = needsConfirmationPure;

/**
 * Assurance measures how much of what the program *asserts* a human stands
 * behind. A NOT_ASSESSED compliance mapping asserts nothing — the quickstart
 * bulk-creates one empty slot per applicable requirement, hundreds per system.
 * Counting those would both drown the review queue and, because rows default
 * to USER_ENTERED, silently inflate the confirmed percentage with placeholders
 * no person ever looked at. They are excluded from numerator and denominator
 * alike; they re-enter the moment someone gives them a real status.
 */
const ASSERTED_MAPPING_WHERE = {
  status: { not: "NOT_ASSESSED" as const },
};

export async function getConfirmationCounts(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Record<ArtifactClass, ClassCount>> {
  const orgScope = { organizationId };
  const unconfirmedScope = { organizationId, ...UNCONFIRMED_WHERE };

  const [
    riskTotal,
    riskUnconfirmed,
    complianceTotal,
    complianceUnconfirmed,
    policyTotal,
    policyUnconfirmed,
    oversightTotal,
    oversightUnconfirmed,
    transparencyTotal,
    transparencyUnconfirmed,
  ] = await Promise.all([
    prisma.riskClassification.count({ where: orgScope }),
    prisma.riskClassification.count({ where: unconfirmedScope }),
    prisma.complianceMapping.count({
      where: { ...orgScope, ...ASSERTED_MAPPING_WHERE },
    }),
    prisma.complianceMapping.count({
      where: { ...unconfirmedScope, ...ASSERTED_MAPPING_WHERE },
    }),
    prisma.aIPolicy.count({ where: orgScope }),
    prisma.aIPolicy.count({ where: unconfirmedScope }),
    prisma.oversightGate.count({ where: orgScope }),
    prisma.oversightGate.count({ where: unconfirmedScope }),
    prisma.transparencyProfile.count({ where: orgScope }),
    prisma.transparencyProfile.count({ where: unconfirmedScope }),
  ]);

  return {
    riskClassification: { confirmed: riskTotal - riskUnconfirmed, total: riskTotal },
    compliance: { confirmed: complianceTotal - complianceUnconfirmed, total: complianceTotal },
    policy: { confirmed: policyTotal - policyUnconfirmed, total: policyTotal },
    oversight: { confirmed: oversightTotal - oversightUnconfirmed, total: oversightTotal },
    transparency: {
      confirmed: transparencyTotal - transparencyUnconfirmed,
      total: transparencyTotal,
    },
  };
}

export async function getConfirmationSummary(
  prisma: PrismaClient,
  organizationId: string,
): Promise<ConfirmationSummary> {
  return computeConfirmationSummary(await getConfirmationCounts(prisma, organizationId));
}
