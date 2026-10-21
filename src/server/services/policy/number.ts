// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Policy numbers: 1, 2, 3... within an organization, shown as "POL-001" in the
 * policy heading and its exports. A number is assigned when the policy is
 * created and never reused, so a deleted policy leaves a gap rather than
 * renumbering the others.
 *
 * Rows created without one (seed scripts, an older release) are numbered the
 * first time the list or the policy is read, after the highest number in use,
 * in creation order.
 */

import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "aIPolicy">;

export async function nextPolicyNumber(db: Db, organizationId: string): Promise<number> {
  const top = await db.aIPolicy.findFirst({
    where: { organizationId, number: { not: null } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (top?.number ?? 0) + 1;
}

/** Number the organization's unnumbered policies. Idempotent; a no-op when none is missing. */
export async function fillMissingPolicyNumbers(db: Db, organizationId: string): Promise<number> {
  const missing = await db.aIPolicy.findMany({
    where: { organizationId, number: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (missing.length === 0) return 0;
  let next = await nextPolicyNumber(db, organizationId);
  for (const row of missing) {
    // Guarded by number: null, so a concurrent fill never overwrites a number.
    await db.aIPolicy.updateMany({ where: { id: row.id, organizationId, number: null }, data: { number: next++ } });
  }
  return missing.length;
}
