// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Who may vouch for a governance record, and what an ordinary edit does to
 * the confirmed stamp (confirmedBy / confirmedAt).
 *
 * Confirming is an approval: provenance.confirm is limited to the approver
 * roles below. The ordinary update paths of the five confirmable records
 * (risk classification, compliance mapping, oversight gate, policy,
 * transparency profile) follow the same rule, so an edit cannot reach the
 * stamp that the confirm action withholds:
 *
 *   - an approver's edit sets the stamp (the editor vouches for what they wrote);
 *   - anyone else's edit clears it. The record now says something no approver
 *     has looked at, so an auto-derived record returns to the review queue and
 *     the assurance summary stops counting it. Provenance (where the row came
 *     from) is never changed.
 *
 * The stamp on those five records also tells "Remove all template items" that
 * a person worked on the AI system (template-items/remove.ts). A writer's edit
 * no longer sets it, so the edit marks the AI system itself as touched
 * instead (markConfirmed, first touch only), and the removal keeps it.
 */

import type { PrismaClient } from "@prisma/client";
import { markConfirmed } from "@/server/services/template-items/mark";

/** The roles that may confirm (vouch for) a record. */
export const APPROVER_ROLES: readonly string[] = ["OWNER", "ADMIN", "AI_OFFICER"];

export function canConfirm(role: string): boolean {
  return APPROVER_ROLES.includes(role);
}

/** The confirmed-stamp fields an ordinary edit writes, by the editor's role. */
export function editConfirmation(
  role: string,
  userId: string,
  now: Date = new Date(),
): { confirmedBy: string | null; confirmedAt: Date | null } {
  return canConfirm(role)
    ? { confirmedBy: userId, confirmedAt: now }
    : { confirmedBy: null, confirmedAt: null };
}

/**
 * After a non-approver's edit of a record that belongs to an AI system, mark
 * the system as touched so template removal keeps it. No-op for approvers
 * (their edit stamps the record itself) and for records without a system.
 */
export async function keepSystemAfterEdit(
  prisma: PrismaClient,
  args: { role: string; aiSystemId: string | null | undefined; organizationId: string; userId: string },
): Promise<void> {
  if (canConfirm(args.role) || !args.aiSystemId) return;
  await markConfirmed(prisma, {
    model: "aiSystem",
    id: args.aiSystemId,
    organizationId: args.organizationId,
    userId: args.userId,
  });
}
