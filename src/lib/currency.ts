// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The currency rule, shared by the middleware, the checkout routes, the
 * landing's pricing block and the in-app price lines.
 *
 * - A visitor whose geo-IP country is one of the 27 EU member states sees
 *   euros. Every other visitor sees US dollars: the United States, the
 *   United Kingdom, Switzerland, Norway, Iceland, Liechtenstein, the rest of
 *   the world, and any request without a usable country code.
 * - Spanish public pages always show euros, wherever the visitor is
 *   (displayCurrency).
 * - Inside the product (signed-in screens) every price is in the currency
 *   the customer will be charged, whatever the language: the region's
 *   (useChargeCurrency in src/components/charge-currency.tsx, set from
 *   inAppPlanOffer in src/server/services/plan-eu/offer.ts).
 *
 * The middleware records the visitor's currency in the `currency` cookie and
 * re-evaluates it on every page request, so a value written under an earlier
 * rule is corrected on the next page load. Client components read the cookie;
 * the server reads the geo header directly, with the same functions.
 *
 * Pure helpers, safe on the server, the edge and the client.
 */

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

/** The currency a public page shows: euros on a Spanish page, otherwise the visitor's. */
export function displayCurrency(locale: string | null | undefined, visitor: Currency): Currency {
  return locale === "es" ? "EUR" : visitor;
}

/** The visitor's currency recorded in a Cookie header; dollars when there is none. */
export function currencyFromCookie(cookie: string | null | undefined): Currency {
  const match = cookie?.match(/(?:^|;\s*)currency=(\w+)/);
  return match?.[1] === "EUR" ? "EUR" : "USD";
}

/**
 * "$60" / "€60" in English; "60 US$" / "60 €" in Spanish ("US$" because "$"
 * alone reads as a local peso in much of the Spanish-speaking world). The
 * caller passes the currency: inside the product, useChargeCurrency().
 */
export function formatPrice(amount: number, currency: Currency, locale: string = "en"): string {
  if (locale === "es") return `${amount} ${currency === "USD" ? "US$" : "€"}`;
  return `${currency === "USD" ? "$" : "€"}${amount}`;
}
