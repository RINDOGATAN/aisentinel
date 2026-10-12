// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Dates in the screen's language, with the month as a word: "Oct 10, 2026" in
 * English, "10 oct 2026" in Spanish. No React here, so configuration modules,
 * server code and screens can share it; screens use the hook in
 * ./use-format-date.
 */

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

/**
 * A calendar day written "YYYY-MM-DD" (a law's review date, a statutory
 * deadline), read in UTC so that no time zone moves it to the day before.
 */
export function formatDayIn(locale: string, isoDay: string): string {
  const at = new Date(`${isoDay.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(at.getTime())) return isoDay;
  return tidy(locale, at.toLocaleDateString(dateLocaleTag(locale), { ...OPTIONS_DATE, timeZone: "UTC" }));
}
