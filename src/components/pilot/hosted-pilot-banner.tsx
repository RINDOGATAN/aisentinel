// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Server side of the pilot banner: decides on the server whether to render
 * it (hosted pilot, not dismissed this session) and hands the words to the
 * client component. Mounted once, in the root layout, so it is on every
 * hosted page and on no page of the kit.
 */

import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import {
  PILOT_BANNER_COOKIE,
  PILOT_RUN_URL,
  PILOT_SENTENCE,
  pilotBannerVisible,
  type PilotLocale,
} from "@/config/pilot";
import { PilotBanner } from "./pilot-banner";

/** Whether this request renders the banner; the root layout also keys a body class on it. */
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
      runUrl={PILOT_RUN_URL}
      dismissLabel={t("dismiss")}
    />
  );
}
