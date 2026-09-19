// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one `locale` cookie shared across todo.law.
 *
 * Contract (identical in the storefront, DPO Central, Dealroom and here):
 * - Name `locale`, value `en` or `es`, Path=/, one year, SameSite=Lax.
 * - On a hosted host (todo.law or a subdomain) it always carries
 *   Domain=.todo.law; anywhere else (the kit, localhost) it is host-only.
 * - This module is the only code that writes it, and only when the visitor
 *   chose a language. Before a hosted write, any host-only duplicate is
 *   expired, because a browser that holds both sends the older one first.
 * - Readers take the LAST `locale` value in the Cookie header or
 *   `document.cookie`. With no cookie the app renders English.
 *
 * Pure string helpers, safe on the server, the edge and the client.
 */

export const LOCALE_COOKIE = "locale";
export type Locale = "en" | "es";

const HOSTED_DOMAIN = "todo.law";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** True for todo.law itself and any of its subdomains (port ignored). */
export function isHostedHost(hostname: string | null | undefined): boolean {
  const host = (hostname ?? "").split(":")[0].toLowerCase();
  return host === HOSTED_DOMAIN || host.endsWith(`.${HOSTED_DOMAIN}`);
}

/** Every `locale` value in a Cookie header (or document.cookie), in order. */
export function localeCookieValues(cookieHeader: string | null | undefined): string[] {
  if (!cookieHeader) return [];
  const values: string[] = [];
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== LOCALE_COOKIE) continue;
    values.push(part.slice(eq + 1).trim());
  }
  return values;
}

/** The reading rule: the LAST `locale` value wins; anything but `es` is English. */
export function readLocale(cookieHeader: string | null | undefined): Locale {
  const values = localeCookieValues(cookieHeader);
  return values[values.length - 1] === "es" ? "es" : "en";
}

/** The cookie strings that expire the host-only duplicate (hosted only) and set the value. */
export function localeCookieStrings(locale: Locale, hostname: string | null | undefined): string[] {
  const base = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  if (!isHostedHost(hostname)) return [base];
  return [`${LOCALE_COOKIE}=; Path=/; Max-Age=0`, `${base}; Domain=.${HOSTED_DOMAIN}`];
}

/**
 * Server clean-up: the Set-Cookie values to emit when a request on a hosted
 * host carries more than one `locale` value; empty otherwise.
 */
export function localeCleanupSetCookies(
  cookieHeader: string | null | undefined,
  hostname: string | null | undefined,
): string[] {
  if (!isHostedHost(hostname)) return [];
  if (localeCookieValues(cookieHeader).length < 2) return [];
  return localeCookieStrings(readLocale(cookieHeader), hostname);
}

type CookieDocument = { cookie: string };

/** Client writer: the only code that writes `locale` in the browser. */
export function writeLocaleCookie(
  locale: Locale,
  doc: CookieDocument = document,
  hostname: string = window.location.hostname,
): void {
  for (const cookie of localeCookieStrings(locale, hostname)) doc.cookie = cookie;
}

/**
 * Client clean-up on page load: when the browser holds more than one
 * `locale` value on a hosted host, collapse them to the one the reader chose.
 * Returns the locale in force.
 */
export function normalizeLocaleCookie(
  doc: CookieDocument = document,
  hostname: string = window.location.hostname,
): Locale {
  const locale = readLocale(doc.cookie);
  if (isHostedHost(hostname) && localeCookieValues(doc.cookie).length > 1) {
    writeLocaleCookie(locale, doc, hostname);
  }
  return locale;
}
