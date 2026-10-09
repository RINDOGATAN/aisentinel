"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { lockedMenuHrefs } from "@/lib/menu-locks";

/**
 * The menu addresses that carry a lock for the current organisation. It runs
 * the same queries, with the same input, as the Shadow AI and Vendor Catalog
 * pages, so the menu and the page share one cached answer and cannot disagree
 * (src/lib/menu-locks.ts).
 */
export function useMenuLocks(): string[] {
  const { organization } = useOrganization();
  const input = { organizationId: organization?.id ?? "" };
  const options = { enabled: !!organization?.id };
  const shadowAi = trpc.shadowAi.checkAccess.useQuery(input, options);
  const vendorCatalog = trpc.vendorCatalog.checkAccess.useQuery(input, options);
  return lockedMenuHrefs({
    shadowAi: shadowAi.data,
    vendorCatalog: vendorCatalog.data?.hasAccess,
  });
}
