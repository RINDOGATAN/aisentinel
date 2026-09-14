// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The writes Stripe makes to entitlements, in one place.
 *
 * Used by the webhook and by billing.verifyCheckout (which repeats the
 * webhook's work so a purchase activates even when the webhook is late), so
 * the two can never disagree about what a payment does.
 *
 * Every write here leaves a PERPETUAL row alone, and the condition sits in
 * the UPDATE statement itself, so an offline activation landing between a
 * read and a write cannot be overwritten.
 */

import { Prisma, type EntitlementStatus, type PrismaClient } from "@prisma/client";

export type Db = PrismaClient | Prisma.TransactionClient;

const NOT_PERPETUAL = { not: "PERPETUAL" } as const;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Keep only the package ids that belong to this app. With one Stripe account
 * serving several apps, every webhook endpoint receives every app's events;
 * another app's package ids must be ignored, not written (they would violate
 * the foreign key, fail with a 500 and be retried by Stripe for days).
 */
export async function ownPackageIds(db: Db, skillPackageIds: string[]): Promise<string[]> {
  if (!skillPackageIds.length) return [];
  const rows = await db.skillPackage.findMany({
    where: { id: { in: skillPackageIds } },
    select: { id: true },
  });
  const own = new Set(rows.map((r) => r.id));
  return skillPackageIds.filter((id) => own.has(id));
}

export interface StripeGrant {
  customerId: string;
  skillPackageIds: string[];
  subscriptionId: string;
  status: EntitlementStatus;
  expiresAt: Date | null;
}

/**
 * Record a subscription's effect on each of its modules. Creates the row when
 * none exists, turns a TRIAL (grace) row into the subscription that replaces
 * it, and refuses to touch a PERPETUAL row.
 */
export async function applyStripeEntitlements(
  db: Db,
  grant: StripeGrant,
): Promise<{ written: string[]; skipped: string[] }> {
  const written: string[] = [];
  const skipped: string[] = [];
  const data = {
    status: grant.status,
    licenseType: "SUBSCRIPTION" as const,
    stripeSubscriptionId: grant.subscriptionId,
    expiresAt: grant.expiresAt,
  };

  for (const skillPackageId of grant.skillPackageIds) {
    const updated = await db.skillEntitlement.updateMany({
      where: { customerId: grant.customerId, skillPackageId, licenseType: NOT_PERPETUAL },
      data,
    });
    if (updated.count > 0) {
      written.push(skillPackageId);
      continue;
    }

    const existing = await db.skillEntitlement.findUnique({
      where: { customerId_skillPackageId: { customerId: grant.customerId, skillPackageId } },
      select: { licenseType: true },
    });
    if (existing) {
      // The only row the update skips is a perpetual one.
      skipped.push(skillPackageId);
      continue;
    }

    // ON CONFLICT DO NOTHING rather than catching a unique violation: inside a
    // PostgreSQL transaction a raised violation aborts everything after it.
    const created = await db.skillEntitlement.createMany({
      data: [{ customerId: grant.customerId, skillPackageId, ...data }],
      skipDuplicates: true,
    });
    if (created.count > 0) {
      written.push(skillPackageId);
    } else {
      // Created concurrently (an offline activation, or the other of webhook
      // and verifyCheckout). Leave it: if it is perpetual it must stay so, and
      // if it is ours the next delivery or verification brings it up to date.
      skipped.push(skillPackageId);
    }
  }

  return { written, skipped };
}

/** A deleted subscription ends only the rows it created. */
export async function expireSubscriptionEntitlements(
  db: Db,
  args: { customerId: string; skillPackageIds: string[]; subscriptionId: string },
): Promise<number> {
  const result = await db.skillEntitlement.updateMany({
    where: {
      customerId: args.customerId,
      skillPackageId: { in: args.skillPackageIds },
      stripeSubscriptionId: args.subscriptionId,
      licenseType: NOT_PERPETUAL,
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

/**
 * A failed invoice suspends the modules of the subscription that failed and
 * nothing else: not another subscription's modules, not a perpetual licence.
 * An invoice with no subscription suspends nothing.
 */
export async function suspendForFailedPayment(
  db: Db,
  args: { customerId: string; subscriptionId: string | null },
): Promise<number> {
  if (!args.subscriptionId) return 0;
  const result = await db.skillEntitlement.updateMany({
    where: {
      customerId: args.customerId,
      stripeSubscriptionId: args.subscriptionId,
      status: "ACTIVE",
      licenseType: NOT_PERPETUAL,
    },
    data: { status: "SUSPENDED" },
  });
  return result.count;
}

/**
 * Apply a webhook event at most once. The event id is recorded in the same
 * transaction as the writes, so a crash leaves neither and Stripe's retry
 * applies both; a second delivery (sequential or concurrent) writes nothing.
 */
export async function runStripeEventOnce(
  prisma: PrismaClient,
  event: { id: string; type: string },
  apply: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<"applied" | "duplicate"> {
  const seen = await prisma.processedStripeEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (seen) return "duplicate";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.processedStripeEvent.create({ data: { id: event.id, type: event.type } });
      await apply(tx);
    });
    return "applied";
  } catch (error) {
    if (isUniqueViolation(error)) {
      // A concurrent delivery of the same event committed first. Confirm it,
      // so a unique violation from anything else is not mistaken for one.
      const committed = await prisma.processedStripeEvent.findUnique({
        where: { id: event.id },
        select: { id: true },
      });
      if (committed) return "duplicate";
    }
    throw error;
  }
}
