// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One currency per visitor, for the paid plan's payment link (owner, 11
 * October 2026: English visitors get a USD plan; Europe keeps the EUR plan).
 * The same rule as Dealroom's checkout:
 *   1. the platform's country header (x-vercel-ip-country): a two-letter
 *      country on the European list means EUR, any other two-letter country USD;
 *   2. without a two-letter country there, the region of the first
 *      Accept-Language tag that carries one (es-ES -> ES): European means EUR;
 *   3. otherwise USD.
 *
 * EUROPE_COUNTRIES MUST MATCH Dealroom's src/lib/currency.ts and the
 * storefront's api/lib/eur-countries.ts. Change all three together.
 */

export type Currency = "USD" | "EUR";

/** ISO 3166-1 alpha-2 codes that see euros (copied from Dealroom's src/lib/currency.ts). */
export const EUROPE_COUNTRIES: ReadonlySet<string> = new Set([
  // European Union (27)
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // European Economic Area outside the EU
  "IS", "LI", "NO",
  // United Kingdom, Switzerland
  "GB", "CH",
  // Aliases seen in the wild: EL (the EU's own code for Greece), UK
  "EL", "UK",
  // Euro microstates and the British Crown dependencies and Gibraltar
  "AD", "MC", "SM", "VA", "GI", "JE", "GG", "IM",
  // Montenegro and Kosovo use the euro
  "ME", "XK",
]);

const TWO_LETTERS = /^[A-Za-z]{2}$/;

/** The region of the first Accept-Language tag that carries a two-letter region, by preference. */
export function regionFromAcceptLanguage(header: string | null | undefined): string | null {
  const tags = (header ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((t) => t.tag && t.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of tags) {
    const region = tag
      .split(/[-_]/)
      .slice(1)
      .find((sub) => TWO_LETTERS.test(sub));
    if (region) return region.toUpperCase();
  }
  return null;
}

/** The visitor's currency from the request headers. */
export function visitorCurrency(headers: {
  get(name: string): string | null;
}): Currency {
  const country = (headers.get("x-vercel-ip-country") ?? "").trim();
  const region = TWO_LETTERS.test(country)
    ? country.toUpperCase()
    : regionFromAcceptLanguage(headers.get("accept-language"));
  return region && EUROPE_COUNTRIES.has(region) ? "EUR" : "USD";
}
