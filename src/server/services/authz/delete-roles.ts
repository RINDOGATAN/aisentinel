// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Who may delete a register record (an AI system, a vendor, a draft
 * assessment, a policy, an oversight gate): owners and admins. Other writers
 * may create and edit these records but not remove them. One list, mirrored
 * by `canDelete` in src/lib/organization-context.tsx so the screens offer the
 * button only to the roles the server accepts.
 */
import { TRPCError } from "@trpc/server";

export const DELETE_ROLES: readonly string[] = ["OWNER", "ADMIN"];

export function canDeleteRecords(role: string | null | undefined): boolean {
  return !!role && DELETE_ROLES.includes(role);
}

export function assertCanDeleteRecords(role: string | null | undefined): void {
  if (!canDeleteRecords(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only owners and admins can delete records in this organization.",
    });
  }
}
