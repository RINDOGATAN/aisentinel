// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Who may act on an organization's billing: buy, cancel, confirm a checkout
 * or open the payment provider's portal. Owners and admins only; every
 * member may still read the billing page. One list, used by the billing
 * router and by the checkout and portal routes, so they cannot drift.
 */
export const BILLING_ROLES: readonly string[] = ["OWNER", "ADMIN"];

export function canManageBilling(role: string | null | undefined): boolean {
  return !!role && BILLING_ROLES.includes(role);
}

export const BILLING_FORBIDDEN_MESSAGE =
  "Only owners and admins can manage billing for this organization";
