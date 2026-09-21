// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Reaching a pilot limit is the one moment we know an organisation is
 * serious, so it is counted. When a limit refuses an action, one audit row
 * is written, at most once per organisation, per limit, per calendar day
 * (UTC):
 *
 *   entityType = "Organization", entityId = organizationId = the organisation,
 *   action = "PILOT_LIMIT_REACHED", metadata = { limit: <fixed name> }.
 *
 * The storefront's daily digest reads exactly this contract (a count of
 * distinct organisations over the last day), and scripts/count-accounts.mjs
 * counts it for the board. Do not rename anything. No person, no free text:
 * the row carries an id and one fixed name.
 *
 * Writing the row must never make the refusal fail: every error here is
 * swallowed, and the caller returns the refusal either way.
 */

import type { PilotLimitName } from "./caps";

export const PILOT_LIMIT_REACHED_ACTION = "PILOT_LIMIT_REACHED";

export interface PilotLimitAuditDb {
  auditLog: {
    findFirst(args: {
      where: {
        organizationId: string;
        entityType: string;
        entityId: string;
        action: string;
        createdAt: { gte: Date };
        metadata: { path: string[]; equals: string };
      };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        organizationId: string;
        entityType: string;
        entityId: string;
        action: string;
        metadata: { limit: string };
      };
    }): Promise<unknown>;
  };
}

/** Midnight UTC at the start of `now`'s calendar day. */
export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Write the day's row for this organisation and limit unless it is already
 * there. Returns whether a row was written; never throws.
 */
export async function recordPilotLimitReached(
  db: PilotLimitAuditDb,
  organizationId: string,
  limit: PilotLimitName,
  now: Date = new Date(),
): Promise<boolean> {
  try {
    const existing = await db.auditLog.findFirst({
      where: {
        organizationId,
        entityType: "Organization",
        entityId: organizationId,
        action: PILOT_LIMIT_REACHED_ACTION,
        createdAt: { gte: startOfUtcDay(now) },
        metadata: { path: ["limit"], equals: limit },
      },
      select: { id: true },
    });
    if (existing) return false;
    await db.auditLog.create({
      data: {
        organizationId,
        entityType: "Organization",
        entityId: organizationId,
        action: PILOT_LIMIT_REACHED_ACTION,
        metadata: { limit },
      },
    });
    return true;
  } catch {
    return false;
  }
}
