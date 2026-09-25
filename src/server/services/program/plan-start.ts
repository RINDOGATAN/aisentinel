// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Day 1 of the 30/60/90-day plan (src/components/guided/plan.ts): the day the
 * quick start was first completed for the organisation. Derived from data the
 * product already keeps; nothing new is stored.
 *
 * In order:
 * 1. the earliest audit entry the quick start wrote (every completed run
 *    writes its entries in the same transaction as its records, with
 *    `metadata.source = "quickstart"`);
 * 2. otherwise the quick start profile's `completedAt` in the settings (the
 *    last run, which is the first one when the audit trail has no entry);
 * 3. otherwise, when the quick start step is done because the work it would
 *    do already exists (path-config.ts), the day that became true: the latest
 *    of the first system, the first vendor and the first policy.
 * Null when none holds: the plan has not started.
 */

import type { PrismaClient } from "@prisma/client";

function settingsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadPlanStart(
  prisma: PrismaClient,
  organizationId: string,
  /** Whether the quick start step is done (its status from the path). */
  quickstartDone: boolean,
): Promise<Date | null> {
  const [firstEntry, organization] = await Promise.all([
    prisma.auditLog.findFirst({
      where: { organizationId, metadata: { path: ["source"], equals: "quickstart" } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.organization.findFirst({
      where: { id: organizationId },
      select: { settings: true },
    }),
  ]);
  if (firstEntry) return firstEntry.createdAt;

  const completedAt = settingsObject(settingsObject(organization?.settings).quickstart).completedAt;
  if (typeof completedAt === "string") {
    const date = new Date(completedAt);
    if (!Number.isNaN(date.getTime())) return date;
  }

  if (!quickstartDone) return null;
  const earliest = { orderBy: { createdAt: "asc" as const }, select: { createdAt: true } };
  const firsts = await Promise.all([
    prisma.aISystem.findFirst({ where: { organizationId }, ...earliest }),
    prisma.aIVendor.findFirst({ where: { organizationId }, ...earliest }),
    prisma.aIPolicy.findFirst({ where: { organizationId }, ...earliest }),
  ]);
  if (firsts.some((row) => !row)) return null;
  return new Date(Math.max(...firsts.map((row) => row!.createdAt.getTime())));
}
