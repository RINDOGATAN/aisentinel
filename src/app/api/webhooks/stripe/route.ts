// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events to create/update entitlements.
 *
 * Each handler does its Stripe reads first and its database writes inside
 * runStripeEventOnce, so a retried or duplicated event writes nothing twice.
 * The writes themselves live in src/server/services/billing/stripe-entitlements.ts
 * and never touch a perpetual (offline licence) row.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature, getSubscription, getCustomer } from "@/lib/stripe";
import { features } from "@/config/features";
import { brand } from "@/config/brand";
import {
  entitlementStatusFor,
  invoiceSubscriptionId,
  subscriptionPeriodEnd,
} from "@/server/services/billing/entitlement-rules";
import {
  applyStripeEntitlements,
  expireSubscriptionEntitlements,
  ownPackageIds,
  runStripeEventOnce,
  suspendForFailedPayment,
} from "@/server/services/billing/stripe-entitlements";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Parse skill package IDs from metadata (supports both legacy single and new multi format)
 */
function parseSkillPackageIds(metadata: Record<string, string> | null): string[] {
  if (!metadata) return [];
  if (metadata.skillPackageIds) {
    return metadata.skillPackageIds.split(",").filter(Boolean);
  }
  if (metadata.skillPackageId) {
    return [metadata.skillPackageId];
  }
  return [];
}

function stripeIdOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

/**
 * The local customer for a Stripe customer: by the stored Stripe id, else by
 * the Stripe customer's e-mail (the customer is shared across the suite's apps
 * and may have been created by another one).
 */
async function resolveCustomer(stripeCustomerId: string) {
  const byStripeId = await prisma.customer.findFirst({ where: { stripeCustomerId } });
  if (byStripeId) return byStripeId;

  const stripeCustomer = await getCustomer(stripeCustomerId);
  if (stripeCustomer.deleted || !stripeCustomer.email) return null;
  return prisma.customer.findUnique({ where: { email: stripeCustomer.email } });
}

export async function POST(request: NextRequest) {
  if (!features.stripeEnabled) {
    return NextResponse.json(
      { error: "Stripe is not enabled" },
      { status: 403 }
    );
  }

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    let outcome: "applied" | "duplicate" | "ignored" = "ignored";

    switch (event.type) {
      case "checkout.session.completed":
        outcome = await handleCheckoutCompleted(event, event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        outcome = await handleSubscriptionChange(event, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        outcome = await handleSubscriptionDeleted(event, event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        outcome = await handlePaymentFailed(event, event.data.object as Stripe.Invoice);
        break;

      default:
        // Unhandled event types are expected (Stripe sends many); ignore quietly.
        break;
    }

    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const { organizationId, customerId } = session.metadata || {};
  const skillPackageIds = await ownPackageIds(
    prisma,
    parseSkillPackageIds(session.metadata as Record<string, string> | null),
  );

  if (!organizationId || !skillPackageIds.length) {
    // Missing metadata, or a checkout for another app on the shared account.
    return "ignored" as const;
  }

  const subscriptionId = stripeIdOf(session.subscription);
  if (!subscriptionId) {
    console.error("No subscription in checkout session:", session.id);
    return "ignored" as const;
  }

  const subscription = await getSubscription(subscriptionId);

  let customer = customerId
    ? await prisma.customer.findUnique({ where: { id: customerId } })
    : null;

  const email = session.customer_email ?? session.customer_details?.email ?? null;
  if (!customer && email) {
    customer = await prisma.customer.findUnique({ where: { email } });
  }

  if (!customer) {
    console.error("Customer not found for checkout session:", session.id);
    return "ignored" as const;
  }

  const found = customer;
  const stripeCustomerId = stripeIdOf(session.customer);

  return runStripeEventOnce(prisma, event, async (tx) => {
    if (stripeCustomerId && found.stripeCustomerId !== stripeCustomerId) {
      await tx.customer.update({
        where: { id: found.id },
        data: { stripeCustomerId },
      });
    }

    await tx.customerOrganization.upsert({
      where: {
        customerId_organizationId: {
          customerId: found.id,
          organizationId,
        },
      },
      update: {},
      create: {
        customerId: found.id,
        organizationId,
      },
    });

    await applyStripeEntitlements(tx, {
      customerId: found.id,
      skillPackageIds,
      subscriptionId,
      status: "ACTIVE",
      expiresAt: subscriptionPeriodEnd(subscription),
    });
  });
}

async function handleSubscriptionChange(event: Stripe.Event, subscription: Stripe.Subscription) {
  const { organizationId } = subscription.metadata || {};
  const skillPackageIds = await ownPackageIds(
    prisma,
    parseSkillPackageIds(subscription.metadata as Record<string, string> | null),
  );

  if (!organizationId || !skillPackageIds.length) {
    return "ignored" as const;
  }

  const stripeCustomerId = stripeIdOf(subscription.customer);
  const customer = stripeCustomerId ? await resolveCustomer(stripeCustomerId) : null;

  if (!customer) {
    console.error("Customer not found for Stripe customer:", stripeCustomerId);
    return "ignored" as const;
  }

  return runStripeEventOnce(prisma, event, async (tx) => {
    await applyStripeEntitlements(tx, {
      customerId: customer.id,
      skillPackageIds,
      subscriptionId: subscription.id,
      status: entitlementStatusFor(subscription.status),
      expiresAt: subscriptionPeriodEnd(subscription),
    });
  });
}

async function handleSubscriptionDeleted(event: Stripe.Event, subscription: Stripe.Subscription) {
  const skillPackageIds = await ownPackageIds(
    prisma,
    parseSkillPackageIds(subscription.metadata as Record<string, string> | null),
  );

  if (!skillPackageIds.length) {
    return "ignored" as const;
  }

  const stripeCustomerId = stripeIdOf(subscription.customer);
  const customer = stripeCustomerId ? await resolveCustomer(stripeCustomerId) : null;

  if (!customer) {
    return "ignored" as const;
  }

  return runStripeEventOnce(prisma, event, async (tx) => {
    await expireSubscriptionEntitlements(tx, {
      customerId: customer.id,
      skillPackageIds,
      subscriptionId: subscription.id,
    });
  });
}

async function handlePaymentFailed(event: Stripe.Event, invoice: Stripe.Invoice) {
  const stripeCustomerId = stripeIdOf(invoice.customer);
  if (!stripeCustomerId) {
    return "ignored" as const;
  }

  const customer = await resolveCustomer(stripeCustomerId);
  if (!customer) {
    return "ignored" as const;
  }

  let suspended = 0;
  const outcome = await runStripeEventOnce(prisma, event, async (tx) => {
    suspended = await suspendForFailedPayment(tx, {
      customerId: customer.id,
      subscriptionId: invoiceSubscriptionId(invoice),
    });
  });

  // Tell the buyer only when something of theirs here was actually suspended,
  // and only once: a retried event, or another app's invoice, sends nothing.
  if (outcome === "applied" && suspended > 0 && resend && customer.email) {
    try {
      await resend.emails.send({
        from: `${brand.name} by ${brand.companyName} <${brand.emailFrom}>`,
        to: customer.email,
        subject: `${brand.name} — Payment Failed`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: ${brand.colors.background}; border-radius: 12px; overflow: hidden;">
            <div style="padding: 24px 24px 16px; border-bottom: 1px solid #2a2a2a;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.05em;">${brand.name}</span>
            </div>
            <div style="padding: 32px 24px;">
              <p style="color: #e5e5e5; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">We were unable to process your latest payment. Your premium features have been temporarily suspended.</p>
              <p style="color: #e5e5e5; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">Please update your payment method to restore access.</p>
              <a href="${process.env.NEXTAUTH_URL}/governance/billing" style="display: inline-block; background: ${brand.colors.primary}; color: ${brand.colors.primaryForeground}; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 24px;">Update Payment Method</a>
            </div>
            <div style="padding: 16px 24px; border-top: 1px solid #2a2a2a;">
              <p style="color: #666666; font-size: 11px; margin: 0;">${brand.companyName}™ · ${brand.name} · <a href="${brand.siteUrl}" style="color: ${brand.colors.primary}; text-decoration: none;">${brand.siteUrl.replace(/^https?:\/\//, "")}</a></p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send payment failure email:", emailErr);
    }
  }

  return outcome;
}
