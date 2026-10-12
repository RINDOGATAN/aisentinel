// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One currency per visitor, for the paid plan's payment link, under the
 * app's one currency rule (owner, 12 October 2026; src/lib/currency.ts):
 * euros only for the 27 EU member states, US dollars for everyone else (the
 * UK, Switzerland, the EEA outside the EU, Latin America and the rest of the
 * world). The country is:
 *   1. the platform's country header (x-vercel-ip-country) when it is a
 *      two-letter code;
 *   2. otherwise the region of the first Accept-Language tag that carries one
 *      (es-ES -> ES);
 *   3. otherwise none, which means USD.
 *
 * The country list is src/lib/currency.ts's EU_COUNTRIES; there is no second
 * list here.
 */

import { COUNTRY_HEADER, currencyForCountry, type Currency } from "@/lib/currency";

export type { Currency };

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
  const country = (headers.get(COUNTRY_HEADER) ?? "").trim();
  const region = TWO_LETTERS.test(country)
    ? country.toUpperCase()
    : regionFromAcceptLanguage(headers.get("accept-language"));
  return currencyForCountry(region);
}
