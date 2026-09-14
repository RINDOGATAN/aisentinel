// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { formatMinorUnits, formatTotals, yearlyTotals } from "./package-price";

describe("package price display (D5: read from the row, never assumed)", () => {
  it("formats minor units", () => {
    expect(formatMinorUnits(6000, "eur")).toBe("€60");
    expect(formatMinorUnits(1950, "EUR")).toBe("€19.50");
    expect(formatMinorUnits(6000, "usd")).toBe("$60");
    expect(formatMinorUnits(6000, "chf")).toBe("60 CHF");
    expect(formatMinorUnits(6000, null)).toBe("€60");
  });

  it("sums per year, per currency, from each package's own price", () => {
    const totals = yearlyTotals([
      { priceAmount: 6000, priceCurrency: "eur", billingInterval: "YEAR" },
      { priceAmount: 6000, priceCurrency: "eur", billingInterval: "YEAR" },
      { priceAmount: 900, priceCurrency: "eur", billingInterval: "MONTH" },
      { priceAmount: null, priceCurrency: "eur", billingInterval: "YEAR" },
    ]);
    expect(totals).toEqual({ eur: 6000 + 6000 + 900 * 12 });
    expect(formatTotals(totals)).toBe("€228");
  });

  it("does not add different currencies together", () => {
    const totals = yearlyTotals([
      { priceAmount: 6000, priceCurrency: "eur", billingInterval: "YEAR" },
      { priceAmount: 6000, priceCurrency: "usd", billingInterval: "YEAR" },
    ]);
    expect(formatTotals(totals)).toBe("€60 + $60");
    expect(formatTotals({})).toBe("€0");
  });
});
