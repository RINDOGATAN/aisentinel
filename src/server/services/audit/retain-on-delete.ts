// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What happens to an organisation's audit trail when the organisation is
 * deleted: the trail is kept, with the personal data removed.
 *
 * A governance record is evidence of what was decided and when, so the trail
 * outlives the organisation. What it said about people does not. Before the
 * organisation row goes (and the SET NULL on audit_logs detaches every entry
 * from it), each of its entries except the deletion tombstone is rewritten in
 * one statement:
 *
 *   kept      action, entityType, createdAt, the entry's id, and entityId
 *             (a record id) unless the record is about a person
 *   removed   userId, ipAddress, userAgent; entityId of person records
 *             (members, users, invitations) becomes "[removed]"
 *   changes   reduced to the names of the fields that changed
 *             ({"fields": [...]}): the values (titles, notes, names, e-mail
 *             addresses) are dropped
 *   metadata  replaced by {"deletedOrganizationId", "personalDataRemoved"}
 *
 * Once detached, an entry has no organizationId, and every tenant read of the
 * trail filters by the reader's organisation, so no tenant can reach it.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** Entity types whose ids identify a person; matched case-insensitively. */
export const PERSON_ENTITY_PATTERN = "(member|user|invit)";

export async function retainAnonymisedTrail(
  db: Db,
  organizationId: string,
  tombstoneId: string,
): Promise<number> {
  return db.$executeRaw`
    UPDATE audit_logs SET
      "userId" = NULL,
      "ipAddress" = NULL,
      "userAgent" = NULL,
      "entityId" = CASE WHEN "entityType" ~* ${PERSON_ENTITY_PATTERN} THEN '[removed]' ELSE "entityId" END,
      "changes" = CASE
        WHEN "changes" IS NULL THEN NULL
        WHEN jsonb_typeof("changes") = 'object' THEN jsonb_build_object(
          'fields',
          COALESCE((SELECT jsonb_agg(k ORDER BY k) FROM jsonb_object_keys("changes") AS k), '[]'::jsonb)
        )
        ELSE jsonb_build_object('fields', '[]'::jsonb)
      END,
      "metadata" = jsonb_build_object('deletedOrganizationId', ${organizationId}::text, 'personalDataRemoved', true)
    WHERE "organizationId" = ${organizationId} AND "id" <> ${tombstoneId}
  `;
}
