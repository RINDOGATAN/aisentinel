"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// The department chosen with the menu's "Viewing" switch, as a view filter.
// Only for a person who sees the whole organization: a member limited to
// departments is narrowed by the server and is not offered the switch. A
// choice that no longer names a department of the organization is ignored.

import { trpc } from "@/lib/trpc";
import { useDepartmentScope } from "@/lib/use-department-scope";

/** The pure rule, for tests: the chosen department, or undefined for the whole organization. */
export function viewDepartment(
  chosen: string | null,
  data: { departments: { id: string }[]; myBusinessUnitIds: string[] | null } | undefined,
): string | undefined {
  if (!chosen || !data || data.myBusinessUnitIds) return undefined;
  return data.departments.some((d) => d.id === chosen) ? chosen : undefined;
}

export function useViewDepartment(organizationId: string | undefined): string | undefined {
  const { departmentId } = useDepartmentScope(organizationId);
  const { data } = trpc.businessUnit.listForScope.useQuery(
    { organizationId: organizationId ?? "" },
    { enabled: !!organizationId, staleTime: 60_000 },
  );
  return viewDepartment(departmentId, data);
}
