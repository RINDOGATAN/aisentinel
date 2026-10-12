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
 * the visitor's currency, decided here from the request headers. Neither the
 * secret nor the link reaches the browser.
 */

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { hostedPilotActive, type PilotLocale } from "@/config/pilot";
import { autoUpgradeActive, planCloudLink } from "@/server/services/plan-eu/config";
import { visitorCurrency } from "@/server/services/plan-eu/currency";
import { OrganizationPilotEndBar } from "./pilot-banner";

export async function HostedPilotBanner() {
  if (!hostedPilotActive()) return null;
  const locale: PilotLocale = (await getLocale()) === "es" ? "es" : "en";
  const upgrade = autoUpgradeActive() && planCloudLink(visitorCurrency(await headers())) !== null;
  return <OrganizationPilotEndBar locale={locale} upgrade={upgrade} />;
}
