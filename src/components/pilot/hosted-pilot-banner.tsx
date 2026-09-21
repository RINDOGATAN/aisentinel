// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Server side of the pilot banner: decides on the server whether to render
 * it (hosted pilot, not dismissed this session) and hands the words to the
 * client component. Mounted once, in the signed-in layout
 * (src/app/(dashboard)/layout.tsx), so it is on every page of the hosted
 * application once a person has signed in, and on no public page (landing,
 * documentation, product pages, sign-in) and no page of the kit.
 */

import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import {
  PILOT_BANNER_COOKIE,
  PILOT_SENTENCE,
  pilotBannerVisible,
  type PilotLocale,
} from "@/config/pilot";
import { PilotBanner } from "./pilot-banner";

/** Whether this request renders the banner. */
export async function pilotBannerForRequest(): Promise<boolean> {
  const store = await cookies();
  return pilotBannerVisible(process.env, store.get(PILOT_BANNER_COOKIE)?.value);
}

export async function HostedPilotBanner() {
  if (!(await pilotBannerForRequest())) return null;
  const locale: PilotLocale = (await getLocale()) === "es" ? "es" : "en";
  const t = await getTranslations("pilot");
  return (
    <PilotBanner
      locale={locale}
      sentence={PILOT_SENTENCE[locale]}
      dismissLabel={t("dismiss")}
    />
  );
}
