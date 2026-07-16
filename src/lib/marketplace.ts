// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// Storefront links for premium skills (mirrors DPO Central's src/lib/marketplace.ts).
//
// On the cloud tier premium skills unlock in-app via Stripe. A deployment
// without Stripe (sovereign/self-host) has no checkout, so locked skills point
// at the todo.law marketplace instead, which sells Ed25519-signed offline
// licence files activated on /governance/skills.
import { features } from "@/config/features";

export const MARKETPLACE_URL = (
  process.env.NEXT_PUBLIC_MARKETPLACE_URL || "https://todo.law/marketplace"
).replace(/\/+$/, "");

// The storefront pre-filters its catalogue by application via ?app=<slug>.
export const MARKETPLACE_APP_URL = `${MARKETPLACE_URL}?app=aisentinel`;

// The storefront is the buy path only when Stripe checkout isn't. (DPO reads
// NEXT_PUBLIC_STRIPE_ENABLED directly; here features.ts already encodes this
// app's default-on env semantics, so derive from it.)
export const STOREFRONT_BUY = !features.stripeEnabled;
