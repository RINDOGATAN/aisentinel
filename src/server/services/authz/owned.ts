// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Checks that an id taken from a request names a row of the caller's own
 * organization before it is written into a link. NOT_FOUND either way, so
 * the answer is the same whether the row does not exist or is another
 * organization's.
 */
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "aISystem" | "aIVendor">;

export async function assertOwnedAiSystem(db: Db, organizationId: string, aiSystemId: string) {
  const system = await db.aISystem.findFirst({
    where: { id: aiSystemId, organizationId },
    select: { id: true },
  });
  if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
}

export async function assertOwnedVendor(db: Db, organizationId: string, vendorId: string) {
  const vendor = await db.aIVendor.findFirst({
    where: { id: vendorId, organizationId },
    select: { id: true },
  });
  if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
}
