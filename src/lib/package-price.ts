// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * How a skill package's price is shown. Read from the package row
 * (`priceAmount` in minor units, `priceCurrency`, `billingInterval`), never
 * assumed, so the page cannot drift from what checkout charges.
 *
 * Pure; safe on the client.
 */

export type Interval = "MONTH" | "YEAR";

export interface PricedPackage {
  priceAmount: number | null;
  priceCurrency: string | null;
  billingInterval: Interval;
}

/** Yearly cost in minor units, summed per currency. Unpriced packages count as nothing. */
export function yearlyTotals(packages: PricedPackage[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of packages) {
    if (p.priceAmount == null) continue;
    const currency = (p.priceCurrency ?? "eur").toLowerCase();
    const perYear = p.billingInterval === "MONTH" ? p.priceAmount * 12 : p.priceAmount;
    totals[currency] = (totals[currency] ?? 0) + perYear;
  }
  return totals;
}

const CURRENCY_SYMBOL: Record<string, string> = { eur: "€", usd: "$", gbp: "£" };

/** 6000 eur → "€60"; 1950 eur → "€19.50". */
export function formatMinorUnits(amount: number, currency: string | null): string {
  const code = (currency ?? "eur").toLowerCase();
  const major = amount / 100;
  const text = Number.isInteger(major) ? String(major) : major.toFixed(2);
  const symbol = CURRENCY_SYMBOL[code];
  return symbol ? `${symbol}${text}` : `${text} ${code.toUpperCase()}`;
}

/** Per-currency totals as one string: "€120", or "€60 + $60" when mixed. */
export function formatTotals(totals: Record<string, number>): string {
  const parts = Object.entries(totals).map(([currency, amount]) => formatMinorUnits(amount, currency));
  return parts.length ? parts.join(" + ") : formatMinorUnits(0, "eur");
}
