// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The billing router's reading of entitlement rows: a grace (TRIAL) row is
 * access, not a purchase, so the package stays on sale and the plan stays
 * free; an expired row is neither. Real router and middleware over a mocked
 * Prisma.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

const mocks = vi.hoisted(() => ({
  prisma: {
    organizationMember: { findUnique: vi.fn() },
    skillPackage: { findMany: vi.fn() },
    customerOrganization: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mocks.prisma, prisma: mocks.prisma }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { billingRouter } from "@/server/routers/billing";
import { createInnerTRPCContext } from "@/server/trpc";

const ORG = { id: "org-1", name: "Org", slug: "org" };
const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
const pkg = (id: string, skillId: string) => ({
  id,
  skillId,
  displayName: id,
  description: null,
  priceAmount: 6000,
  priceCurrency: "eur",
  billingInterval: "YEAR",
  stripePriceId: "price_year",
});
const SHADOW = pkg("skill-shadow-ai", "com.todolaw.aisentinel.shadow-ai");
const CONFORMITY = pkg("skill-conformity", "com.todolaw.aisentinel.conformity");
const EXPIRED = pkg("skill-bias", "com.todolaw.aisentinel.bias-fairness");

function caller() {
  mocks.prisma.organizationMember.findUnique.mockResolvedValue({
    id: "member-1",
    userId: "user-1",
    organizationId: ORG.id,
    role: "OWNER",
    organization: ORG,
  });
  return billingRouter.createCaller(
    createInnerTRPCContext({
      session: {
        user: { id: "user-1", email: "owner@test.example", name: "Owner", image: null },
        expires: new Date(Date.now() + 3_600_000).toISOString(),
      } as Session,
      getCookie: () => undefined,
    }),
  );
}

const rows = [
  { id: "e-trial", skillPackageId: SHADOW.id, skillPackage: SHADOW, licenseType: "TRIAL", status: "ACTIVE", expiresAt: FUTURE, stripeSubscriptionId: null },
  { id: "e-sub", skillPackageId: CONFORMITY.id, skillPackage: CONFORMITY, licenseType: "SUBSCRIPTION", status: "ACTIVE", expiresAt: FUTURE, stripeSubscriptionId: "sub_1" },
  { id: "e-old", skillPackageId: EXPIRED.id, skillPackage: EXPIRED, licenseType: "SUBSCRIPTION", status: "ACTIVE", expiresAt: PAST, stripeSubscriptionId: "sub_0" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.skillPackage.findMany.mockResolvedValue([SHADOW, CONFORMITY, EXPIRED]);
});

describe("billing.getAvailablePlans", () => {
  it("counts a subscription as bought, and neither a grace row nor an expired row", async () => {
    mocks.prisma.customerOrganization.findFirst.mockResolvedValue({ customer: { entitlements: rows } });

    const plans = await caller().getAvailablePlans({ organizationId: ORG.id });
    const bought = Object.fromEntries(plans.map((p) => [p.id, p.isEntitled]));

    expect(bought).toEqual({ [SHADOW.id]: false, [CONFORMITY.id]: true, [EXPIRED.id]: false });
    expect(plans[0]).toMatchObject({ priceAmount: 6000, billingInterval: "YEAR" });
  });
});

describe("billing.getSubscriptionStatus", () => {
  it("lists live rows, marks grace, and is free when only grace is held", async () => {
    mocks.prisma.customerOrganization.findFirst.mockResolvedValue({
      customer: { stripeCustomerId: null, entitlements: [rows[0], rows[2]] },
    });

    const status = await caller().getSubscriptionStatus({ organizationId: ORG.id });

    expect(status.plan).toBe("free");
    expect(status.entitlements).toHaveLength(1);
    expect(status.entitlements[0]).toMatchObject({ id: "e-trial", inGrace: true, priceAmount: 6000 });
  });

  it("is premium once something is bought", async () => {
    mocks.prisma.customerOrganization.findFirst.mockResolvedValue({
      customer: { stripeCustomerId: "cus_1", entitlements: rows },
    });

    const status = await caller().getSubscriptionStatus({ organizationId: ORG.id });

    expect(status.plan).toBe("premium");
    expect(status.entitlements.map((e) => e.id)).toEqual(["e-trial", "e-sub"]);
  });
});
