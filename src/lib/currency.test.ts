// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** The storefront's currency rule: dollars unless the visitor is known to be outside the US. */
import { describe, it, expect } from "vitest";
import {
  PREMIUM_KIT_PRICE_PER_YEAR,
  currencyForCountry,
  currencyFromCookie,
  formatPrice,
} from "./currency";

describe("the currency rule", () => {
  it("is dollars for the US and for any visitor whose country is unknown", () => {
    expect(currencyForCountry("US")).toBe("USD");
    for (const unknown of [null, undefined, "", "XX", "T1", "not-a-code"]) {
      expect(currencyForCountry(unknown)).toBe("USD");
    }
  });

  it("is euros only for a visitor known to be outside the US", () => {
    for (const country of ["ES", "DE", "GB", "MX", "jp"]) {
      expect(currencyForCountry(country)).toBe("EUR");
    }
  });

  it("reads dollars from a missing or unrecognised cookie", () => {
    expect(currencyFromCookie(undefined)).toBe("USD");
    expect(currencyFromCookie("locale=es")).toBe("USD");
    expect(currencyFromCookie("locale=es; currency=EUR")).toBe("EUR");
    expect(currencyFromCookie("currency=USD")).toBe("USD");
  });

  it("writes the kit price as a pair, in each language's order", () => {
    expect(PREMIUM_KIT_PRICE_PER_YEAR).toBe(60);
    expect(formatPrice(60, "USD", "en")).toBe("$60");
    expect(formatPrice(60, "EUR", "en")).toBe("€60");
    expect(formatPrice(60, "USD", "es")).toBe("60 $");
    expect(formatPrice(60, "EUR", "es")).toBe("60 €");
  });
});
