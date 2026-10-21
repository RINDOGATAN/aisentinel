"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The charge currency inside the product: every price hint on a signed-in
 * screen shows the currency the customer will actually be charged, euros
 * only for the 27 EU member states and US dollars everywhere else, whatever
 * the interface language. The signed-in layout decides it on the server from
 * the request, with the same function as "Move to the paid plan"
 * (inAppPlanOffer, src/server/services/plan-eu/offer.ts), and provides it
 * here. The public landing pages keep their own rule (displayCurrency in
 * src/lib/currency.ts: Spanish pages always in euros).
 */

import { createContext, useContext, useSyncExternalStore } from "react";
import { currencyFromCookie, type Currency } from "@/lib/currency";

const ChargeCurrencyContext = createContext<Currency | null>(null);

export function ChargeCurrencyProvider({
  currency,
  children,
}: {
  currency: Currency;
  children: React.ReactNode;
}) {
  return <ChargeCurrencyContext.Provider value={currency}>{children}</ChargeCurrencyContext.Provider>;
}

const noSubscription = () => () => {};

/**
 * The currency of an in-app price: the server's decision for this request
 * inside the signed-in layout; elsewhere the visitor's region from the
 * `currency` cookie (dollars on the server render). Never the language's.
 */
export function useChargeCurrency(): Currency {
  const charge = useContext(ChargeCurrencyContext);
  const fromCookie = useSyncExternalStore(
    noSubscription,
    () => currencyFromCookie(document.cookie),
    (): Currency => "USD",
  );
  return charge ?? fromCookie;
}
