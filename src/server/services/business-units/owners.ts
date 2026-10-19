// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { TRPCError } from "@trpc/server";

/// Owner and deputy owner: each is a member or a pending invitee of this
/// organization. Sending one of a pair clears the other (a department has one
/// owner and one deputy), and the deputy must be someone other than the owner.
export const OWNER_FIELDS = {
  ownerId: z.string().nullable().optional(),
  ownerInvitationId: z.string().nullable().optional(),
  deputyOwnerId: z.string().nullable().optional(),
  deputyInvitationId: z.string().nullable().optional(),
};

export type OwnerInput = {
  ownerId?: string | null;
  ownerInvitationId?: string | null;
  deputyOwnerId?: string | null;
  deputyInvitationId?: string | null;
};

/** The owner columns to write for this input (only the pairs that were sent). */
export function ownerColumns(input: OwnerInput): Partial<Record<keyof OwnerInput, string | null>> {
  const out: Partial<Record<keyof OwnerInput, string | null>> = {};
  if (input.ownerId !== undefined || input.ownerInvitationId !== undefined) {
    out.ownerId = input.ownerId ?? null;
    out.ownerInvitationId = input.ownerId ? null : (input.ownerInvitationId ?? null);
  }
  if (input.deputyOwnerId !== undefined || input.deputyInvitationId !== undefined) {
    out.deputyOwnerId = input.deputyOwnerId ?? null;
    out.deputyInvitationId = input.deputyOwnerId ? null : (input.deputyInvitationId ?? null);
  }
  const sameMember = !!out.ownerId && out.ownerId === out.deputyOwnerId;
  const sameInvite = !!out.ownerInvitationId && out.ownerInvitationId === out.deputyInvitationId;
  if (sameMember || sameInvite) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The deputy owner must be a different person from the owner." });
  }
  return out;
}

