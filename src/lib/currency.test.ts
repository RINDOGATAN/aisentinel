// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** The currency rule: euros for the 27 EU member states and on Spanish pages, dollars everywhere else. */
import { describe, it, expect } from "vitest";
import {
  EU_COUNTRIES,
  PREMIUM_KIT_PRICE_PER_YEAR,
  currencyForCountry,
  currencyFromCookie,
  displayCurrency,
  formatPrice,
  isEuCountry,
  requestCurrency,
} from "./currency";

describe("the currency rule", () => {
  it("lists exactly the 27 EU member states", () => {
    expect(EU_COUNTRIES.size).toBe(27);
    for (const code of EU_COUNTRIES) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it("is euros for a visitor in the EU", () => {
    for (const country of ["DE", "ES", "IE", "FR", "IT", "NL", "PL", "SE", "de", " es "]) {
      expect(currencyForCountry(country)).toBe("EUR");
      expect(isEuCountry(country)).toBe(true);
    }
  });

  it("is dollars for every visitor outside the EU, the EEA and Switzerland included", () => {
    for (const country of ["US", "GB", "CH", "NO", "IS", "LI", "MX", "BR", "AR", "CA", "JP", "AU", "IN"]) {
      expect(currencyForCountry(country)).toBe("USD");
      expect(isEuCountry(country)).toBe(false);
    }
  });

  it("is dollars when the country is missing or not a country", () => {
    for (const unknown of [null, undefined, "", "XX", "T1", "A1", "EU", "not-a-code"]) {
      expect(currencyForCountry(unknown)).toBe("USD");
    }
  });

  it("shows euros on a Spanish page wherever the visitor is", () => {
    expect(displayCurrency("es", "USD")).toBe("EUR");
    expect(displayCurrency("es", "EUR")).toBe("EUR");
    expect(displayCurrency("en", "USD")).toBe("USD");
    expect(displayCurrency("en", "EUR")).toBe("EUR");
    expect(displayCurrency(undefined, "USD")).toBe("USD");
  });

  it("decides a request's currency from the language cookie and the geo header", () => {
    expect(requestCurrency(null, "DE")).toBe("EUR");
    expect(requestCurrency("locale=en", "IE")).toBe("EUR");
    expect(requestCurrency(null, "GB")).toBe("USD");
    expect(requestCurrency("locale=en", "CH")).toBe("USD");
    expect(requestCurrency(null, null)).toBe("USD");
    expect(requestCurrency("locale=es", "US")).toBe("EUR");
    expect(requestCurrency("locale=es", "MX")).toBe("EUR");
    expect(requestCurrency("locale=es", null)).toBe("EUR");
    // A cookie value carried over from an earlier rule never decides it on the server.
    expect(requestCurrency("currency=EUR; locale=en", "GB")).toBe("USD");
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
