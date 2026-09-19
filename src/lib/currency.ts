// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Currency helper — reads the geo-IP currency cookie set by middleware.
 *
 * The storefront's rule: dollars unless the visitor is known to be outside
 * the US; euros only for a known non-US visitor. An unknown country (no geo
 * header, as on the kit or locally, or the platform's "unknown" codes) is
 * dollars, and so is a missing cookie.
 */

export type Currency = "USD" | "EUR";

/** The yearly price of one premium module in the kit, in either currency. */
export const PREMIUM_KIT_PRICE_PER_YEAR = 60;

/** Country codes that do not identify a country (unknown, anonymiser). */
const UNKNOWN_COUNTRIES = new Set(["XX", "T1", "A1", "A2", "O1", "EU", "AP"]);

/** The currency for a geo-IP country code: EUR only for a known non-US country. */
export function currencyForCountry(country: string | null | undefined): Currency {
  const code = (country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || UNKNOWN_COUNTRIES.has(code) || code === "US") return "USD";
  return "EUR";
}

/** The currency the cookie records; dollars when there is none. */
export function currencyFromCookie(cookie: string | undefined): Currency {
  const match = cookie?.match(/(?:^|;\s*)currency=(\w+)/);
  return match?.[1] === "EUR" ? "EUR" : "USD";
}

export function getCurrency(): Currency {
  if (typeof document === "undefined") return "USD";
  return currencyFromCookie(document.cookie);
}

/** "$60" / "€60" in English; "60 $" / "60 €" in Spanish. */
export function formatPrice(amount: number, currency: Currency = getCurrency(), locale: string = "en"): string {
  const symbol = currency === "USD" ? "$" : "€";
  return locale === "es" ? `${amount} ${symbol}` : `${symbol}${amount}`;
}
