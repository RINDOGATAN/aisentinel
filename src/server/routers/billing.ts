/**
 * Billing Router
 *
 * Provides subscription status and available plans for the billing page.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure } from "../trpc";
import { getStripe, getSubscription, removeSubscriptionItem } from "@/lib/stripe";

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

export const billingRouter = createTRPCRouter({
  getSubscriptionStatus: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const orgId = ctx.organization.id;

      const customerOrg = await ctx.prisma.customerOrganization.findFirst({
        where: { organizationId: orgId },
        include: {
          customer: {
            include: {
              entitlements: {
                where: { status: "ACTIVE" },
                include: { skillPackage: true },
              },
            },
          },
        },
      });

      if (!customerOrg) {
        return {
          hasCustomer: false,
          stripeCustomerId: null,
          entitlements: [],
          plan: "free" as const,
        };
      }

      const customer = customerOrg.customer;
      const entitlements = customer.entitlements.map((e) => ({
        id: e.id,
        skillId: e.skillPackage.skillId,
        skillName: e.skillPackage.displayName,
        licenseType: e.licenseType,
        expiresAt: e.expiresAt,
        stripeSubscriptionId: e.stripeSubscriptionId,
      }));

      const plan = entitlements.length > 0
        ? ("premium" as const)
        : ("free" as const);

      return {
        hasCustomer: true,
        stripeCustomerId: customer.stripeCustomerId,
        entitlements,
        plan,
      };
    }),

  getAvailablePlans: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const orgId = ctx.organization.id;

      const packages = await ctx.prisma.skillPackage.findMany({
        where: { isActive: true },
        orderBy: { priceAmount: "asc" },
      });

      const customerOrg = await ctx.prisma.customerOrganization.findFirst({
        where: { organizationId: orgId },
        include: {
          customer: {
            include: {
              entitlements: {
                where: { status: "ACTIVE" },
                select: { skillPackageId: true },
              },
            },
          },
        },
      });

      const entitledPackageIds = new Set(
        customerOrg?.customer.entitlements.map((e) => e.skillPackageId) ?? []
      );

      const defaultPriceId = process.env.STRIPE_PRICE_ID;
      return packages.map((pkg) => ({
        id: pkg.id,
        skillId: pkg.skillId,
        name: pkg.displayName,
        description: pkg.description,
        priceAmount: pkg.priceAmount,
        priceCurrency: pkg.priceCurrency,
        stripePriceId: pkg.stripePriceId || defaultPriceId || null,
        isEntitled: entitledPackageIds.has(pkg.id),
      }));
    }),

  cancelFeature: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        entitlementId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organization.id;

      const customerOrg = await ctx.prisma.customerOrganization.findFirst({
        where: { organizationId: orgId },
        include: { customer: true },
      });

      if (!customerOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No billing customer found for this organization",
        });
      }

      const entitlement = await ctx.prisma.skillEntitlement.findFirst({
        where: {
          id: input.entitlementId,
          customerId: customerOrg.customer.id,
          status: "ACTIVE",
        },
        include: { skillPackage: true },
      });

      if (!entitlement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entitlement not found or already inactive",
        });
      }

      if (!entitlement.stripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This entitlement was not purchased via Stripe and cannot be self-cancelled",
        });
      }

      if (!entitlement.skillPackage.stripePriceId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Skill package has no Stripe price configured",
        });
      }

      const result = await removeSubscriptionItem(
        entitlement.stripeSubscriptionId,
        entitlement.skillPackage.stripePriceId
      );

      await ctx.prisma.skillEntitlement.update({
        where: { id: entitlement.id },
        data: { status: "EXPIRED" },
      });

      if (result.cancelled) {
        await ctx.prisma.skillEntitlement.updateMany({
          where: {
            stripeSubscriptionId: entitlement.stripeSubscriptionId,
            status: "ACTIVE",
            id: { not: entitlement.id },
          },
          data: { status: "EXPIRED" },
        });
      }

      return { cancelled: result.cancelled };
    }),

  verifyCheckout: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(input.sessionId);

      if (session.payment_status !== "paid") {
        return { activated: false, reason: "Payment not yet completed" };
      }

      const { organizationId, customerId } =
        (session.metadata as Record<string, string>) || {};
      const skillPackageIds = parseSkillPackageIds(
        session.metadata as Record<string, string> | null
      );

      if (!organizationId || !skillPackageIds.length) {
        return { activated: false, reason: "Invalid session metadata" };
      }

      if (organizationId !== ctx.organization.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Session does not belong to this organization",
        });
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) {
        return { activated: false, reason: "No subscription found" };
      }

      // Find customer
      let customer = customerId
        ? await ctx.prisma.customer.findUnique({ where: { id: customerId } })
        : null;

      if (!customer && session.customer_email) {
        customer = await ctx.prisma.customer.findUnique({
          where: { email: session.customer_email },
        });
      }

      if (!customer) {
        return { activated: false, reason: "Customer not found" };
      }

      // Ensure Stripe customer ID is synced
      const stripeCustomerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      if (stripeCustomerId && customer.stripeCustomerId !== stripeCustomerId) {
        await ctx.prisma.customer.update({
          where: { id: customer.id },
          data: { stripeCustomerId },
        });
      }

      // Ensure customer-org link
      await ctx.prisma.customerOrganization.upsert({
        where: {
          customerId_organizationId: {
            customerId: customer.id,
            organizationId,
          },
        },
        update: {},
        create: {
          customerId: customer.id,
          organizationId,
        },
      });

      // Retrieve subscription for period end
      const subscription = await getSubscription(subscriptionId);
      const periodEnd = (
        subscription as unknown as { current_period_end?: number }
      ).current_period_end;

      // Create or update entitlements
      for (const skillPackageId of skillPackageIds) {
        await ctx.prisma.skillEntitlement.upsert({
          where: {
            customerId_skillPackageId: {
              customerId: customer.id,
              skillPackageId,
            },
          },
          update: {
            status: "ACTIVE",
            licenseType: "SUBSCRIPTION",
            stripeSubscriptionId: subscriptionId,
            expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
          },
          create: {
            customerId: customer.id,
            skillPackageId,
            licenseType: "SUBSCRIPTION",
            status: "ACTIVE",
            stripeSubscriptionId: subscriptionId,
            expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
          },
        });
      }

      return { activated: true, skillCount: skillPackageIds.length };
    }),
});
