// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Which organisation an import call acts on.
 *
 * The import routes are called by sibling applications holding one shared key,
 * and they name the account by its email. The key says "a sibling is calling";
 * it says nothing about which of the account's organisations is meant, or
 * whether that account may write there. This resolver answers both, and refuses
 * where it cannot:
 *
 *   - the sender may name the organisation (`organizationId`, the `orgId` that
 *     check-account returns); the account must be a member of it;
 *   - with no organisation named, an account with exactly one membership acts
 *     on it, and an account with several is refused for a write (no guessing);
 *     a read takes the oldest membership, so the answer never changes between
 *     two calls;
 *   - a write needs a role that may write. The list is an allow-list: a role
 *     this file does not know is refused.
 */
import { prisma } from "@/lib/prisma";

/** Roles that may write, mirroring `orgWriteProcedure` (everyone but VIEWER). */
const IMPORT_WRITE_ROLES: readonly string[] = ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER"];

export type ImportAccount =
  | { ok: true; userId: string; organizationId: string; organizationName: string; role: string }
  | { ok: false; status: 403 | 404 | 409; error: string };

export async function resolveImportAccount(
  userEmail: string,
  organizationId: unknown,
  access: "read" | "write",
): Promise<ImportAccount> {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      organizationMemberships: {
        include: { organization: true },
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!user) return { ok: false, status: 404, error: "User not found" };

  const memberships = user.organizationMemberships;
  if (memberships.length === 0) {
    return { ok: false, status: 404, error: "User has no organization" };
  }

  let membership = memberships[0];
  if (organizationId !== undefined && organizationId !== null) {
    const named = memberships.find((m) => m.organizationId === organizationId);
    // Same answer whether the organisation does not exist or is someone else's.
    if (!named) return { ok: false, status: 404, error: "User has no such organization" };
    membership = named;
  } else if (memberships.length > 1 && access === "write") {
    return {
      ok: false,
      status: 409,
      error: "organizationId is required: the account belongs to more than one organization",
    };
  }

  if (access === "write" && !IMPORT_WRITE_ROLES.includes(membership.role)) {
    return { ok: false, status: 403, error: "The account's role does not allow writes" };
  }

  return {
    ok: true,
    userId: user.id,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    role: membership.role,
  };
}
