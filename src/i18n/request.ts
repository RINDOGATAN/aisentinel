// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { readLocale } from "@/lib/locale-cookie";

export default getRequestConfig(async () => {
  // The last `locale` value wins when the browser sends more than one.
  const locale = readLocale((await headers()).get("cookie"));

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
