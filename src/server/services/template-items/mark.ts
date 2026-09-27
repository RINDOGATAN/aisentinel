// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import type { PrismaClient } from "@prisma/client";

/**
 * A human has taken ownership of a record. Records the first such moment
 * (confirmedBy/confirmedAt) and never overwrites it, so "the person who edited
 * it" stays the person who edited it first. Only the first confirmation matters
 * for "Remove all template items": once confirmedAt is set, the item is kept.
 *
 * A no-op for a row already confirmed. Harmless on a USER_ENTERED row (which is
 * never removed anyway), so callers need not check provenance first.
 */
export type TemplateItemModel = "aiSystem" | "aiVendor" | "aiAssessment";

export async function markConfirmed(
  prisma: PrismaClient,
  args: { model: TemplateItemModel; id: string; organizationId: string; userId: string },
): Promise<void> {
  const where = { id: args.id, organizationId: args.organizationId, confirmedAt: null };
  const data = { confirmedBy: args.userId, confirmedAt: new Date() };
  if (args.model === "aiSystem") {
    await prisma.aISystem.updateMany({ where, data });
  } else if (args.model === "aiVendor") {
    await prisma.aIVendor.updateMany({ where, data });
  } else {
    await prisma.aIAssessment.updateMany({ where, data });
  }
}
