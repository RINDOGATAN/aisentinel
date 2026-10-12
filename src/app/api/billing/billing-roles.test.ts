// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The checkout and billing-portal routes act on the organization's billing:
 * owners and admins only, the same rule as the billing router.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const H = vi.hoisted(() => ({
  session: { user: { email: "someone@example.test", name: "Someone" } } as unknown,
  role: "VIEWER",
  createPortalSession: vi.fn(async () => ({ url: "https://billing.example.test/portal" })),
  createCheckoutSession: vi.fn(async () => ({ url: "https://billing.example.test/checkout" })),
}));

vi.mock("next-auth", () => ({ getServerSession: async () => H.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/config/features", () => ({ features: { stripeEnabled: true, selfServiceUpgrade: true } }));
vi.mock("@/lib/stripe", () => ({
  createPortalSession: H.createPortalSession,
  createCheckoutSession: H.createCheckoutSession,
  createCustomer: vi.fn(async () => ({ id: "cus_1" })),
  getCustomer: vi.fn(async () => ({ currency: null })),
}));
vi.mock("@/lib/prisma", () => {
  const db = {
    organizationMember: {
      findFirst: async () => ({ id: "m1", organizationId: "org-a", role: H.role }),
    },
    customerOrganization: {
      findFirst: async () => ({ customer: { id: "c1", stripeCustomerId: "cus_1", entitlements: [] } }),
    },
    skillPackage: {
      findMany: async () => [{ id: "pkg-1", name: "Pack", stripePriceId: "price_1" }],
    },
  };
  return { default: db, prisma: db };
});

import { POST as portal } from "@/app/api/billing/portal/route";
import { POST as checkout } from "@/app/api/checkout/route";
import { NextRequest } from "next/server";

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  H.createPortalSession.mockClear();
  H.createCheckoutSession.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("billing routes: owners and admins only", () => {
  for (const role of ["VIEWER", "MEMBER", "AI_OFFICER"]) {
    it(`${role} cannot open the portal or start a checkout`, async () => {
      H.role = role;
      const p = await portal(req("/api/billing/portal", { organizationId: "org-a" }));
      expect(p.status).toBe(403);
      expect(H.createPortalSession).not.toHaveBeenCalled();

      const c = await checkout(req("/api/checkout", { organizationId: "org-a", skillPackageId: "pkg-1" }));
      expect(c.status).toBe(403);
      expect(H.createCheckoutSession).not.toHaveBeenCalled();
    });
  }

  for (const role of ["OWNER", "ADMIN"]) {
    it(`${role} can open the portal and start a checkout`, async () => {
      H.role = role;
      const p = await portal(req("/api/billing/portal", { organizationId: "org-a" }));
      expect(p.status).toBe(200);
      expect(H.createPortalSession).toHaveBeenCalledTimes(1);

      const c = await checkout(req("/api/checkout", { organizationId: "org-a", skillPackageId: "pkg-1" }));
      expect(c.status).toBe(200);
      expect(H.createCheckoutSession).toHaveBeenCalledTimes(1);
    });
  }
});
