// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  entitlementStatusFor,
  invoiceSubscriptionId,
  isBought,
  isInGrace,
  isLive,
  priceMismatch,
  stripeMayWrite,
  subscriptionPeriodEnd,
  type EntitlementLike,
} from "./entitlement-rules";

const NOW = new Date("2026-09-13T12:00:00Z");
const FUTURE = new Date("2026-10-13T12:00:00Z");
const PAST = new Date("2026-09-01T12:00:00Z");

const e = (over: Partial<EntitlementLike>): EntitlementLike => ({
  licenseType: "SUBSCRIPTION",
  status: "ACTIVE",
  expiresAt: FUTURE,
  ...over,
});

describe("liveness, purchase and grace", () => {
  it("a live subscription is live and bought", () => {
    expect(isLive(e({}), NOW)).toBe(true);
    expect(isBought(e({}), NOW)).toBe(true);
    expect(isInGrace(e({}), NOW)).toBe(false);
  });

  it("a grace row is live but not bought", () => {
    const trial = e({ licenseType: "TRIAL" });
    expect(isLive(trial, NOW)).toBe(true);
    expect(isBought(trial, NOW)).toBe(false);
    expect(isInGrace(trial, NOW)).toBe(true);
  });

  it("an expired ACTIVE row is neither live nor bought", () => {
    expect(isLive(e({ expiresAt: PAST }), NOW)).toBe(false);
    expect(isBought(e({ expiresAt: PAST }), NOW)).toBe(false);
    expect(isInGrace(e({ licenseType: "TRIAL", expiresAt: PAST }), NOW)).toBe(false);
  });

  it("a suspended row is not live; a perpetual row with no expiry is", () => {
    expect(isLive(e({ status: "SUSPENDED" }), NOW)).toBe(false);
    expect(isBought(e({ licenseType: "PERPETUAL", expiresAt: null }), NOW)).toBe(true);
  });
});

describe("stripeMayWrite", () => {
  it("refuses a perpetual row and allows every other case", () => {
    expect(stripeMayWrite({ licenseType: "PERPETUAL" })).toBe(false);
    expect(stripeMayWrite({ licenseType: "TRIAL" })).toBe(true);
    expect(stripeMayWrite({ licenseType: "SUBSCRIPTION" })).toBe(true);
    expect(stripeMayWrite(null)).toBe(true);
  });
});

describe("entitlementStatusFor", () => {
  it("maps Stripe subscription states", () => {
    expect(entitlementStatusFor("active")).toBe("ACTIVE");
    expect(entitlementStatusFor("trialing")).toBe("ACTIVE");
    expect(entitlementStatusFor("past_due")).toBe("SUSPENDED");
    expect(entitlementStatusFor("unpaid")).toBe("SUSPENDED");
    expect(entitlementStatusFor("canceled")).toBe("EXPIRED");
    expect(entitlementStatusFor("incomplete_expired")).toBe("EXPIRED");
  });
});

describe("invoiceSubscriptionId", () => {
  it("reads the current shape, the legacy shape, and nothing", () => {
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: "sub_new" } } })).toBe("sub_new");
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: { id: "sub_obj" } } } })).toBe("sub_obj");
    expect(invoiceSubscriptionId({ subscription: "sub_legacy" })).toBe("sub_legacy");
    expect(invoiceSubscriptionId({ parent: null })).toBeNull();
  });
});

describe("subscriptionPeriodEnd", () => {
  it("reads the item period end, and the legacy top-level field first", () => {
    expect(subscriptionPeriodEnd({ items: { data: [{ current_period_end: 1_800_000_000 }] } })).toEqual(
      new Date(1_800_000_000 * 1000),
    );
    expect(
      subscriptionPeriodEnd({ current_period_end: 1_700_000_000, items: { data: [] } } as never),
    ).toEqual(new Date(1_700_000_000 * 1000));
    expect(subscriptionPeriodEnd({ items: { data: [] } })).toBeNull();
  });
});

describe("priceMismatch", () => {
  const yearly = { priceAmount: 6000, priceCurrency: "eur", billingInterval: "YEAR" as const };
  const price = (over: object) => ({
    id: "price_1",
    unit_amount: 6000,
    currency: "eur",
    recurring: { interval: "year" },
    ...over,
  });

  it("accepts a price that matches the package", () => {
    expect(priceMismatch(yearly, price({}))).toBeNull();
  });

  it("refuses a monthly price id left on a yearly package", () => {
    expect(priceMismatch(yearly, price({ recurring: { interval: "month" }, unit_amount: 900 }))).toMatch(/month/);
  });

  it("refuses a different amount or currency", () => {
    expect(priceMismatch(yearly, price({ unit_amount: 1900 }))).toMatch(/1900/);
    expect(priceMismatch(yearly, price({ currency: "gbp" }))).toMatch(/gbp/);
  });

  it("refuses a one-off price for a recurring package", () => {
    expect(priceMismatch(yearly, price({ recurring: null }))).toMatch(/never/);
  });

  it("compares only the interval for the USD override", () => {
    expect(priceMismatch(yearly, price({ currency: "usd", unit_amount: 6500 }), { amountMayDiffer: true })).toBeNull();
    expect(
      priceMismatch(yearly, price({ currency: "usd", recurring: { interval: "month" } }), { amountMayDiffer: true }),
    ).not.toBeNull();
  });
});
