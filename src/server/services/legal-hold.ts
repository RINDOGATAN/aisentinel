// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Legal hold enforcement.
 *
 * One rule, applied at every deletion path: while an active hold covers the
 * organisation (or the system being touched), nothing within its scope may be
 * deleted, and the automatic pruning of export snapshots stops.
 *
 * The check is deliberately a hard refusal rather than a warning. A hold that
 * can be clicked past is not a hold, and the question in the witness box is
 * whether deletion was possible, not whether it was discouraged.
 */

import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface ActiveHold {
  id: string;
  matter: string;
  aiSystemId: string | null;
  issuedAt: Date;
}

/**
 * Holds in force for this organisation. An organisation-wide hold (no system)
 * covers everything; a system-scoped hold covers that system's records only.
 */
export async function activeHolds(
  db: Db,
  organizationId: string,
  aiSystemId?: string | null,
): Promise<ActiveHold[]> {
  const rows = await db.legalHold.findMany({
    where: {
      organizationId,
      releasedAt: null,
      ...(aiSystemId === undefined
        ? {}
        : { OR: [{ aiSystemId: null }, { aiSystemId: aiSystemId ?? undefined }] }),
    },
    select: { id: true, matter: true, aiSystemId: true, issuedAt: true },
    orderBy: { issuedAt: "desc" },
  });
  return rows;
}

/** True when anything at all is on hold for this organisation. */
export async function anyHoldInForce(db: Db, organizationId: string): Promise<boolean> {
  const count = await db.legalHold.count({
    where: { organizationId, releasedAt: null },
  });
  return count > 0;
}

/**
 * Refuse a deletion that a hold covers. Pass the system id where the record
 * belongs to one, so a hold scoped to another system does not block it.
 */
export async function assertNotOnHold(
  db: Db,
  organizationId: string,
  options: { aiSystemId?: string | null; what?: string } = {},
): Promise<void> {
  const holds = await activeHolds(db, organizationId, options.aiSystemId ?? null);
  const relevant = holds.filter(
    (h) => h.aiSystemId === null || h.aiSystemId === options.aiSystemId,
  );
  if (relevant.length === 0) return;

  const matters = relevant.map((h) => h.matter).join(", ");
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `A legal hold is in force (${matters}), so this cannot be deleted. Release the hold first, and record why.`,
  });
}
