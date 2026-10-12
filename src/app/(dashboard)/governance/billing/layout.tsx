// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The billing page exists only where payments are switched on
 * (NEXT_PUBLIC_STRIPE_ENABLED). Elsewhere it is not in the menu, and an
 * address typed or bookmarked goes to Settings instead of a page of plans that
 * cannot be bought.
 */

import { redirect } from "next/navigation";
import { features } from "@/config/features";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  if (!features.stripeEnabled) redirect("/governance/settings");
  return children;
}
