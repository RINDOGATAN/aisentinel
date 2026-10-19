// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// Department scope for a member. A member with no department assignment sees the
// whole organization, exactly as before this feature existed. A member limited
// to one or more departments sees only systems in those departments.
//
// This never widens what the organization guard already allows: it is a second
// AND on top of `organizationId: ctx.organization.id`, and it can only narrow.
// The pure part (`businessUnitScopeWhere`) is tested without a database; the
// loader is thin plumbing over it.

import type { Prisma, PrismaClient } from "@prisma/client";

/// The whole organization (a member with no department limit), or a fixed set of
/// department ids. An empty id list is still a limit: it matches nothing, which
/// is the honest result for a member limited to departments that were all
/// deleted — never a silent fall-back to the whole organization.
export type BusinessUnitScope = { all: true } | { all: false; businessUnitIds: string[] };

/// The extra AISystem condition this scope imposes, or null when it imposes
/// none (a member who sees the whole organization). A limited member is confined
/// to systems whose department is in their set; unassigned systems (no
/// department) are not "their" department and so are not shown to a limited
/// member.
export function businessUnitScopeWhere(
  scope: BusinessUnitScope,
): Prisma.AISystemWhereInput | null {
  if (scope.all) return null;
  return { businessUnitId: { in: scope.businessUnitIds } };
}

/// Roles that always see the whole organization. A department limit stored for
/// one of them (before limits on these roles were refused) is ignored, so an
/// owner or admin can never be locked out of records they manage.
export const SCOPE_EXEMPT_ROLES: readonly string[] = ["OWNER", "ADMIN"];

export function isScopeExemptRole(role: string): boolean {
  return SCOPE_EXEMPT_ROLES.includes(role);
}

/// The department a limited member's new record is placed in, so that what
/// they create stays inside what they can see. Null for a whole-organization
/// member (the record keeps whatever department was asked for, or none).
export function defaultBusinessUnitId(scope: BusinessUnitScope): string | null {
  if (scope.all) return null;
  return scope.businessUnitIds[0] ?? null;
}

/// The department a new system is stored with. A whole-organization member
/// keeps what they asked for (or none). A limited member keeps a department
/// inside their scope and otherwise gets their first department: a system
/// they create outside their own scope would vanish from their view.
export function businessUnitForNewSystem(
  scope: BusinessUnitScope,
  requested: string | null | undefined,
): string | null {
  if (scope.all) return requested ?? null;
  if (requested && scope.businessUnitIds.includes(requested)) return requested;
  return defaultBusinessUnitId(scope);
}

/// Load the department scope for one organization member. Returns `{ all: true }`
/// when the member has no department assignment (the default and common case)
/// and always for owners and admins.
export async function loadBusinessUnitScope(
  prisma: PrismaClient,
  member: { id: string; role: string },
): Promise<BusinessUnitScope> {
  if (isScopeExemptRole(member.role)) return { all: true };
  const rows = await prisma.businessUnitMember.findMany({
    where: { memberId: member.id },
    select: { businessUnitId: true },
    orderBy: { createdAt: "asc" },
  });
  if (rows.length === 0) return { all: true };
  return { all: false, businessUnitIds: rows.map((r) => r.businessUnitId) };
}
