// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The in-app plan offer for a request, from one decision: the currency the
 * customer will be charged (visitorCurrency: euros only for the 27 EU member
 * states, US dollars everywhere else, whatever the interface language) and
 * the payment link "Move to the paid plan" uses for that currency (null when
 * the automatic upgrade is off or the link is not set).
 *
 * The signed-in layout hands `currency` to every in-app price hint
 * (ChargeCurrencyProvider) and shows the button from `link`; the checkout
 * route charges `currency`. The hint and the button therefore cannot
 * disagree.
 */

import { autoUpgradeActive, planCloudLink, type PlanEuEnv } from "./config";
import { visitorCurrency, type Currency } from "./currency";

export interface InAppPlanOffer {
  currency: Currency;
  link: string | null;
}

export function inAppPlanOffer(
  headers: { get(name: string): string | null },
  env: PlanEuEnv = process.env,
): InAppPlanOffer {
  const currency = visitorCurrency(headers);
  return { currency, link: autoUpgradeActive(env) ? planCloudLink(currency, env) : null };
}
