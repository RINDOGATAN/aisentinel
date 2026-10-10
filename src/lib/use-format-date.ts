// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Dates in the screen's language: "Oct 10, 2026" in English, "10 oct 2026"
 * in Spanish. The plain formatDate/formatDateTime in ./utils stay English for
 * code that runs outside a translated screen (exports, e-mail, logs).
 */

import { useLocale } from "next-intl";

const OPTIONS_DATE: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
const OPTIONS_DATE_TIME: Intl.DateTimeFormatOptions = { ...OPTIONS_DATE, hour: "2-digit", minute: "2-digit" };

/** The BCP 47 tag for the app's two locales. */
export function dateLocaleTag(locale: string): string {
  return locale === "es" ? "es-ES" : "en-US";
}

/** What stands in for a missing date. */
export function missingDate(locale: string): string {
  return locale === "es" ? "N/D" : "N/A";
}

/**
 * "10 oct 2026" rather than "10 oct. 2026": Intl adds a full stop after the
 * abbreviated Spanish month, which the screens do not use elsewhere.
 */
function tidy(locale: string, text: string): string {
  return locale === "es" ? text.replace(/\b([a-zñ]{3,4})\./g, "$1") : text;
}

export function formatDateIn(locale: string, date: Date | string | null | undefined): string {
  if (!date) return missingDate(locale);
  return tidy(locale, new Date(date).toLocaleDateString(dateLocaleTag(locale), OPTIONS_DATE));
}

export function formatDateTimeIn(locale: string, date: Date | string | null | undefined): string {
  if (!date) return missingDate(locale);
  return tidy(locale, new Date(date).toLocaleString(dateLocaleTag(locale), OPTIONS_DATE_TIME));
}

export function useFormatDate() {
  const locale = useLocale();
  return {
    formatDate: (date: Date | string | null | undefined) => formatDateIn(locale, date),
    formatDateTime: (date: Date | string | null | undefined) => formatDateTimeIn(locale, date),
  };
}
