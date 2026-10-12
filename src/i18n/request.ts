// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { requestLocale } from "@/lib/landing-locale";

export default getRequestConfig(async () => {
  // The `locale` cookie (the last value wins when the browser sends more than
  // one), else the browser's language (src/lib/landing-locale.ts).
  const h = await headers();
  const locale = requestLocale(h.get("cookie"), h.get("accept-language"));

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
