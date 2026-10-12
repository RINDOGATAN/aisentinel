// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The currency rule, shared by the middleware, the checkout route, the
 * landing's pricing block and the in-app price lines.
 *
 * - A visitor whose geo-IP country is one of the 27 EU member states sees
 *   euros. Every other visitor sees US dollars: the United States, the
 *   United Kingdom, Switzerland, Norway, Iceland, Liechtenstein, the rest of
 *   the world, and any request without a usable country code.
 * - Spanish pages always show euros, wherever the visitor is.
 *
 * The middleware records the visitor's currency in the `currency` cookie and
 * re-evaluates it on every page request, so a value written under an earlier
 * rule is corrected on the next page load. Client components read the cookie;
 * the server reads the geo header directly, with the same functions.
 *
 * Pure helpers, safe on the server, the edge and the client.
 */

import { readLocale } from "@/lib/locale-cookie";

export type Currency = "USD" | "EUR";

/** The cookie that records the visitor's currency (before the language rule). */
export const CURRENCY_COOKIE = "currency";

/** The geo header the platform sets on each request. */
export const COUNTRY_HEADER = "x-vercel-ip-country";

/** The yearly price of one premium module in the kit, in either currency. */
export const PREMIUM_KIT_PRICE_PER_YEAR = 60;

/** The 27 member states of the European Union, as ISO 3166-1 alpha-2 codes. */
export const EU_COUNTRIES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

/** True only for a country code of an EU member state. */
export function isEuCountry(country: string | null | undefined): boolean {
  return EU_COUNTRIES.has((country ?? "").trim().toUpperCase());
}

/** The visitor's currency for a geo-IP country code: euros only inside the EU. */
export function currencyForCountry(country: string | null | undefined): Currency {
  return isEuCountry(country) ? "EUR" : "USD";
}

/** The currency a page shows: euros on a Spanish page, otherwise the visitor's. */
export function displayCurrency(locale: string | null | undefined, visitor: Currency): Currency {
  return locale === "es" ? "EUR" : visitor;
}

/** The visitor's currency recorded in a Cookie header; dollars when there is none. */
export function currencyFromCookie(cookie: string | null | undefined): Currency {
  const match = cookie?.match(/(?:^|;\s*)currency=(\w+)/);
  return match?.[1] === "EUR" ? "EUR" : "USD";
}

/**
 * The currency a page shows for a request, on the server: the language from
 * the `locale` cookie and the visitor's currency from the geo header, exactly
 * as the middleware records it for the client.
 */
export function requestCurrency(cookieHeader: string | null | undefined, country: string | null | undefined): Currency {
  return displayCurrency(readLocale(cookieHeader), currencyForCountry(country));
}

/** The currency the current page shows, in the browser. */
export function getCurrency(): Currency {
  if (typeof document === "undefined") return "USD";
  return displayCurrency(readLocale(document.cookie), currencyFromCookie(document.cookie));
}

/** "$60" / "€60" in English; "60 $" / "60 €" in Spanish. */
export function formatPrice(amount: number, currency: Currency = getCurrency(), locale: string = "en"): string {
  const symbol = currency === "USD" ? "$" : "€";
  return locale === "es" ? `${amount} ${symbol}` : `${symbol}${amount}`;
}
