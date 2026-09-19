// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useSyncExternalStore } from "react";
import { getCurrency, type Currency } from "@/lib/currency";

const noSubscription = () => () => {};

/**
 * The visitor's currency in a client component. The server render and the
 * hydrating render both say dollars (the rule's default), then the cookie is
 * read, so hydration never disagrees.
 */
export function useCurrency(): Currency {
  return useSyncExternalStore(noSubscription, getCurrency, () => "USD");
}
