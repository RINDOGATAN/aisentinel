// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The rules hosted billing applies to an entitlement row. Pure: no Prisma, no
 * Stripe client, no Next, so every rule is tested on its own.
 *
 * Three kinds of row share `skill_entitlements`, one per buyer per module:
 *   SUBSCRIPTION  written by Stripe checkout and the webhook.
 *   PERPETUAL     written by an offline licence file. Paid for once; nothing
 *                 Stripe later says about a card is evidence about it.
 *   TRIAL         written by scripts/grant-paywall-grace.ts on the day billing
 *                 is switched on. A grace period, not a purchase.
 */

import type { EntitlementStatus, LicenseType } from "@prisma/client";
import type { PricedPackage } from "@/lib/package-price";

export interface EntitlementLike {
  licenseType: LicenseType;
  status: EntitlementStatus;
  expiresAt: Date | null;
}

/** ACTIVE and not past its expiry: the same test every entitlement gate uses. */
export function isLive(e: EntitlementLike, now: Date = new Date()): boolean {
  if (e.status !== "ACTIVE") return false;
  if (e.expiresAt && e.expiresAt < now) return false;
  return true;
}

/**
 * Live and actually acquired. A grace row is live but was never bought, so it
 * must neither block checkout nor show the module as purchased.
 */
export function isBought(e: EntitlementLike, now: Date = new Date()): boolean {
  return isLive(e, now) && e.licenseType !== "TRIAL";
}

/** Live, and only because of the grace period. */
export function isInGrace(e: EntitlementLike, now: Date = new Date()): boolean {
  return isLive(e, now) && e.licenseType === "TRIAL";
}

/**
 * May a Stripe write touch this row? Never a perpetual licence: a webhook
 * would otherwise turn a grant paid for once into a subscription with an
 * expiry, and a failed card elsewhere would suspend it.
 */
export function stripeMayWrite(existing: Pick<EntitlementLike, "licenseType"> | null): boolean {
  return existing?.licenseType !== "PERPETUAL";
}

/** Stripe subscription status → entitlement status. */
export function entitlementStatusFor(subscriptionStatus: string): EntitlementStatus {
  if (subscriptionStatus === "past_due" || subscriptionStatus === "unpaid") {
    return "SUSPENDED";
  }
  if (subscriptionStatus === "canceled" || subscriptionStatus === "incomplete_expired") {
    return "EXPIRED";
  }
  return "ACTIVE";
}

/**
 * The subscription an invoice belongs to. API 2025-03-31 and later carry it
 * under `parent.subscription_details`; older payloads at the top level.
 * Null for an invoice that no subscription generated.
 */
export function invoiceSubscriptionId(invoice: {
  parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
  subscription?: string | { id: string } | null;
}): string | null {
  const ref = invoice.parent?.subscription_details?.subscription ?? invoice.subscription ?? null;
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

/**
 * When a subscription's current period ends, as a Date. Moved from the
 * subscription to its items in API 2025-03-31; both shapes are read.
 */
export function subscriptionPeriodEnd(subscription: {
  items?: { data?: Array<{ current_period_end?: number }> };
}): Date | null {
  const legacy = (subscription as { current_period_end?: number }).current_period_end;
  const end = legacy ?? subscription.items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000) : null;
}

/** The subset of a Stripe Price the check below reads. */
export interface StripePriceLike {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string } | null;
}

/**
 * Refuse to sell a package through a Stripe price that does not match what
 * the app shows. The price ids in use before this change are monthly; pointing
 * a yearly package at one would charge a different amount on a different
 * cycle from the one on screen. Returns a reason, or null when it matches.
 *
 * `amountMayDiffer` is for the geo-IP USD override, which is one price in
 * another currency: only its interval can be compared.
 */
export function priceMismatch(
  pkg: PricedPackage,
  price: StripePriceLike,
  options: { amountMayDiffer?: boolean } = {},
): string | null {
  const wanted = pkg.billingInterval === "MONTH" ? "month" : "year";
  if (price.recurring?.interval !== wanted) {
    return `Stripe price ${price.id} recurs every ${price.recurring?.interval ?? "never"}, the package every ${wanted}`;
  }
  if (options.amountMayDiffer) return null;
  if (pkg.priceAmount != null && price.unit_amount !== pkg.priceAmount) {
    return `Stripe price ${price.id} charges ${price.unit_amount}, the package shows ${pkg.priceAmount}`;
  }
  if (pkg.priceCurrency && price.currency.toLowerCase() !== pkg.priceCurrency.toLowerCase()) {
    return `Stripe price ${price.id} is in ${price.currency}, the package in ${pkg.priceCurrency}`;
  }
  return null;
}
