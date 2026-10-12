// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useSyncExternalStore } from "react";
import { currencyFromCookie, displayCurrency, type Currency } from "@/lib/currency";

const noSubscription = () => () => {};

/**
 * The visitor's currency in a client component of the product: the rule of
 * src/lib/currency.ts applied to the language the screen is shown in (passed
 * in: it may come from the browser when no `locale` cookie was chosen) and the
 * visitor's currency cookie. The server render and the hydrating render read
 * dollars for the visitor part, then the cookie is read, so hydration never
 * disagrees.
 */
export function useCurrency(locale: string): Currency {
  const visitor = useSyncExternalStore(
    noSubscription,
    () => currencyFromCookie(document.cookie),
    (): Currency => "USD",
  );
  return displayCurrency(locale, visitor);
}
