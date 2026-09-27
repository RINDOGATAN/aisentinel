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

/// Load the department scope for one organization member. Returns `{ all: true }`
/// when the member has no department assignment (the default and common case).
export async function loadBusinessUnitScope(
  prisma: PrismaClient,
  memberId: string,
): Promise<BusinessUnitScope> {
  const rows = await prisma.businessUnitMember.findMany({
    where: { memberId },
    select: { businessUnitId: true },
  });
  if (rows.length === 0) return { all: true };
  return { all: false, businessUnitIds: rows.map((r) => r.businessUnitId) };
}
