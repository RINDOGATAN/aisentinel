// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Server side of the end-of-pilot bar: renders it only on the hosted pilot,
 * in the reader's language. Mounted once, in the signed-in layout
 * (src/app/(dashboard)/layout.tsx), so it is on every page of the hosted
 * application once a person has signed in, and on no public page (landing,
 * documentation, product pages, sign-in) and no page of the kit. Whether it
 * shows anything depends on the organisation's clock (pilot-banner.tsx).
 *
 * "Move to the paid plan" is offered only when the automatic upgrade is on
 * (AUTO_UPGRADE_ENABLED and PLAN_SYNC_SECRET) and a payment link is set for
 * the charge currency. The layout decides both from the request headers with
 * inAppPlanOffer (src/server/services/plan-eu/offer.ts), the same decision
 * that sets the currency of the bar's price, and passes `upgrade` (and
 * `upgradeMonthly` when the monthly link is set as well). Neither
 * the secret nor the link reaches the browser.
 */

import { getLocale } from "next-intl/server";
import { hostedPilotActive, type PilotLocale } from "@/config/pilot";
import { OrganizationPilotEndBar } from "./pilot-banner";

export async function HostedPilotBanner({
  upgrade = false,
  upgradeMonthly = false,
}: {
  upgrade?: boolean;
  upgradeMonthly?: boolean;
}) {
  if (!hostedPilotActive()) return null;
  const locale: PilotLocale = (await getLocale()) === "es" ? "es" : "en";
  return <OrganizationPilotEndBar locale={locale} upgrade={upgrade} upgradeMonthly={upgrade && upgradeMonthly} />;
}
