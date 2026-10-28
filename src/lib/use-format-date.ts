// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The screen-side hook over ./format-date. The plain formatDate/formatDateTime
 * in ./utils stay English for code that runs outside a translated screen
 * (exports, e-mail, logs).
 */

import { useLocale } from "next-intl";
import { formatCalendarDayIn, formatDateIn, formatDateTimeIn } from "./format-date";

export { dateLocaleTag, formatCalendarDayIn, formatDateIn, formatDateTimeIn, formatDayIn, missingDate } from "./format-date";

export function useFormatDate() {
  const locale = useLocale();
  return {
    formatDate: (date: Date | string | null | undefined) => formatDateIn(locale, date),
    formatDateTime: (date: Date | string | null | undefined) => formatDateTimeIn(locale, date),
    /** A date-only value stored at 00:00 UTC: the same calendar day in every time zone. */
    formatDay: (date: Date | string | null | undefined) => formatCalendarDayIn(locale, date),
  };
}
