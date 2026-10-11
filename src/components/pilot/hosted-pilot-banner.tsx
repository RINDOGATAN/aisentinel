// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Server side of the end-of-pilot bar: renders it only on the hosted pilot,
 * in the reader's language. Mounted once, in the signed-in layout
 * (src/app/(dashboard)/layout.tsx), so it is on every page of the hosted
 * application once a person has signed in, and on no public page (landing,
 * documentation, product pages, sign-in) and no page of the kit. Whether it
 * shows anything depends on the organisation's clock (pilot-banner.tsx).
 */

import { getLocale } from "next-intl/server";
import { hostedPilotActive, type PilotLocale } from "@/config/pilot";
import { OrganizationPilotEndBar } from "./pilot-banner";

export async function HostedPilotBanner() {
  if (!hostedPilotActive()) return null;
  const locale: PilotLocale = (await getLocale()) === "es" ? "es" : "en";
  return <OrganizationPilotEndBar locale={locale} />;
}
