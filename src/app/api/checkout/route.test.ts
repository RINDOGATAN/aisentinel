// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The checkout route, with billing switched on for the test only.
 *
 * Pins three S-01 corrections: a grace (TRIAL) or expired row does not block
 * the purchase it exists to lead to; a Stripe price that does not match the
 * package is refused before anything is created; and a new buyer's Stripe
 * customer is resolved by e-mail rather than always created.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    organizationMember: { findFirst: vi.fn() },
    skillPackage: { findMany: vi.fn() },
    customerOrganization: { findFirst: vi.fn(), create: vi.fn() },
    customer: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
  stripe: {
    createCheckoutSession: vi.fn(),
    findOrCreateCustomerByEmail: vi.fn(),
    getPrice: vi.fn(),
  },
  session: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mocks.prisma, prisma: mocks.prisma }));
vi.mock("@/lib/stripe", () => mocks.stripe);
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/config/features", () => ({
  features: { stripeEnabled: true, selfServiceUpgrade: true },
}));

import { POST } from "./route";

const PKG = {
  id: "skill-shadow-ai",
  skillId: "com.todolaw.aisentinel.shadow-ai",
  name: "SHADOW_AI",
  stripePriceId: "price_year",
  priceAmount: 6000,
  priceCurrency: "eur",
  billingInterval: "YEAR",
};
const YEARLY_PRICE = { id: "price_year", unit_amount: 6000, currency: "eur", recurring: { interval: "year" } };
const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

function request(): NextRequest {
  return new Request("https://example.test/api/checkout", {
    method: "POST",
    body: JSON.stringify({ skillPackageIds: [PKG.id], organizationId: "org-1" }),
    headers: { "content-type": "application/json", origin: "https://example.test" },
  }) as unknown as NextRequest;
}

function linkedCustomerWith(entitlements: object[]) {
  mocks.prisma.customerOrganization.findFirst.mockResolvedValue({
    customer: { id: "cust-1", email: "buyer@test.example", name: "Buyer", stripeCustomerId: "cus_1", entitlements },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { email: "buyer@test.example", name: "Buyer" } });
  mocks.prisma.organizationMember.findFirst.mockResolvedValue({ id: "m-1" });
  mocks.prisma.skillPackage.findMany.mockResolvedValue([PKG]);
  mocks.stripe.getPrice.mockResolvedValue(YEARLY_PRICE);
  mocks.stripe.createCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.test/s" });
});

describe("POST /api/checkout", () => {
  it("lets an organisation in its grace period buy the module", async () => {
    linkedCustomerWith([{ skillPackageId: PKG.id, licenseType: "TRIAL", status: "ACTIVE", expiresAt: FUTURE }]);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.stripe.createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it("does not treat an expired row as already bought", async () => {
    linkedCustomerWith([{ skillPackageId: PKG.id, licenseType: "SUBSCRIPTION", status: "ACTIVE", expiresAt: PAST }]);
    expect((await POST(request())).status).toBe(200);
  });

  it("refuses a second purchase of a live subscription", async () => {
    linkedCustomerWith([{ skillPackageId: PKG.id, licenseType: "SUBSCRIPTION", status: "ACTIVE", expiresAt: FUTURE }]);
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Already entitled/);
    expect(mocks.stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("refuses a monthly price on a yearly package before creating anything", async () => {
    mocks.prisma.customerOrganization.findFirst.mockResolvedValue(null);
    mocks.stripe.getPrice.mockResolvedValue({ ...YEARLY_PRICE, unit_amount: 900, recurring: { interval: "month" } });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mocks.stripe.findOrCreateCustomerByEmail).not.toHaveBeenCalled();
    expect(mocks.prisma.customer.create).not.toHaveBeenCalled();
    expect(mocks.stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("resolves a new buyer's Stripe customer by e-mail", async () => {
    mocks.prisma.customerOrganization.findFirst.mockResolvedValue(null);
    mocks.prisma.customer.findUnique.mockResolvedValue(null);
    mocks.stripe.findOrCreateCustomerByEmail.mockResolvedValue({ id: "cus_shared" });
    mocks.prisma.customer.create.mockResolvedValue({ id: "cust-new" });

    expect((await POST(request())).status).toBe(200);
    expect(mocks.stripe.findOrCreateCustomerByEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "buyer@test.example" }),
    );
    expect(mocks.stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_shared" }),
    );
  });

  it("gives an existing local customer with no Stripe id the e-mail-resolved one", async () => {
    mocks.prisma.customerOrganization.findFirst.mockResolvedValue(null);
    mocks.prisma.customer.findUnique.mockResolvedValue({
      id: "cust-offline",
      email: "buyer@test.example",
      name: "Buyer",
      stripeCustomerId: null,
    });
    mocks.stripe.findOrCreateCustomerByEmail.mockResolvedValue({ id: "cus_shared" });

    expect((await POST(request())).status).toBe(200);
    expect(mocks.prisma.customer.update).toHaveBeenCalledWith({
      where: { id: "cust-offline" },
      data: { stripeCustomerId: "cus_shared" },
    });
    expect(mocks.stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_shared" }),
    );
  });
});
