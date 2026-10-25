// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The automatic upgrade from the free hosted pilot to the paid EU cloud plan
 * (the owner's decision of 11 October 2026: payment upgrades the account
 * automatically; checkout starts from inside the app and carries the
 * organisation, and the confirmed payment lifts the limits at once, with the
 * same records).
 *
 * The flow, end to end:
 *   1. An owner or administrator presses "Move to the paid plan".
 *      GET /api/plan/checkout signs a reference to the organisation and sends
 *      the browser to the payment link for the visitor's currency
 *      (currency.ts: EUR in Europe, USD elsewhere) with
 *      ?client_reference_id=<reference>&prefilled_email=<e-mail>.
 *   2. The payment provider tells the storefront's existing webhook endpoint;
 *      the storefront relays a short, signed instruction to
 *      POST /api/plan/stripe-sync here ("paid" or "ended").
 *   3. This app maps the instruction to its organisation and sets the plan
 *      (src/server/services/plan-eu/sync.ts), with an audit entry.
 *
 * One plan, two currencies: whichever link was paid, the organisation moves to
 * the same plan (Organization.plan = EU_CLOUD, an internal name) and the same
 * limits are lifted.
 *
 * Off by default. Nothing happens unless AUTO_UPGRADE_ENABLED is "true" AND
 * PLAN_SYNC_SECRET is set: the button is not shown, the checkout route answers
 * 404 and the sync route answers 503. The button and the checkout also need
 * the link for the visitor's currency.
 */

import type { Currency } from "./currency";

export type PlanEuEnv = Partial<Record<string, string | undefined>>;

/** This app's code inside a plan reference; DPO Central uses "dpc". */
export const PLAN_REF_APP = "ais";

export function autoUpgradeSwitchOn(env: PlanEuEnv = process.env): boolean {
  return env.AUTO_UPGRADE_ENABLED === "true";
}

export function planSyncSecret(env: PlanEuEnv = process.env): string | null {
  const s = env.PLAN_SYNC_SECRET;
  return s && s.length >= 16 ? s : null;
}

/** On only when the switch is on and the shared secret is set. */
export function autoUpgradeActive(env: PlanEuEnv = process.env): boolean {
  return autoUpgradeSwitchOn(env) && planSyncSecret(env) !== null;
}

/** How often the plan is paid: yearly (the default) or monthly. */
export type PlanInterval = "year" | "month";

/** Reads the checkout's `interval` parameter: absent means yearly; anything unknown is null. */
export function parsePlanInterval(value: string | null | undefined): PlanInterval | null {
  if (value === null || value === undefined || value === "" || value === "year") return "year";
  return value === "month" ? "month" : null;
}

/**
 * The plan's payment link for a currency and interval, from the environment
 * only. Yearly: PLAN_CLOUD_EUR_LINK (the EUR plan) and PLAN_CLOUD_USD_LINK
 * (the USD plan). Monthly: NEXT_PUBLIC_PLAN_CLOUD_EUR_MONTHLY_LINK and
 * NEXT_PUBLIC_PLAN_CLOUD_USD_MONTHLY_LINK (public: the landing's pricing block
 * shows the same links). Null when unset (or not an https link): the button is
 * then hidden and the checkout route answers 404 for that currency and interval.
 */
export function planCloudLink(
  currency: Currency,
  env: PlanEuEnv = process.env,
  interval: PlanInterval = "year",
): string | null {
  const raw =
    interval === "month"
      ? currency === "EUR"
        ? env.NEXT_PUBLIC_PLAN_CLOUD_EUR_MONTHLY_LINK
        : env.NEXT_PUBLIC_PLAN_CLOUD_USD_MONTHLY_LINK
      : currency === "EUR"
        ? env.PLAN_CLOUD_EUR_LINK
        : env.PLAN_CLOUD_USD_LINK;
  const v = raw?.trim();
  return v && v.startsWith("https://") ? v : null;
}
