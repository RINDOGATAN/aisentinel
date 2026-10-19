// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AI system numbers: 1, 2, 3... within an organization, shown as "AIS-001"
 * (src/lib/system-reference.ts). A number is assigned when the system is
 * created and never reused, so a deleted system leaves a gap rather than
 * renumbering the others.
 *
 * Rows created without one (seed scripts, an older release) are numbered the
 * first time the list or the system is read, after the highest number in use,
 * in creation order. Same rule as the policy numbers (../policy/number.ts).
 */

import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "aISystem">;

export async function nextSystemNumber(db: Db, organizationId: string): Promise<number> {
  const top = await db.aISystem.findFirst({
    where: { organizationId, number: { not: null } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (top?.number ?? 0) + 1;
}

/** Number the organization's unnumbered systems. Idempotent; a no-op when none is missing. */
export async function fillMissingSystemNumbers(db: Db, organizationId: string): Promise<number> {
  const missing = await db.aISystem.findMany({
    where: { organizationId, number: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (missing.length === 0) return 0;
  let next = await nextSystemNumber(db, organizationId);
  for (const row of missing) {
    // Guarded by number: null, so a concurrent fill never overwrites a number.
    await db.aISystem.updateMany({ where: { id: row.id, organizationId, number: null }, data: { number: next++ } });
  }
  return missing.length;
}
