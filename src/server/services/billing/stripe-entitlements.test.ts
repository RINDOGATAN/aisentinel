// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The writes Stripe makes to entitlements, against an in-memory table that
 * applies `where` the way the database does. These lock the S-01 defects:
 *   D1  a failed payment suspends only that subscription's modules, never a
 *       perpetual licence and never another subscription's modules;
 *   D2  a Stripe write never downgrades a perpetual licence;
 *   D3  a webhook event is applied at most once.
 */

import { describe, it, expect, vi } from "vitest";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  applyStripeEntitlements,
  expireSubscriptionEntitlements,
  ownPackageIds,
  runStripeEventOnce,
  suspendForFailedPayment,
  type Db,
} from "./stripe-entitlements";

type Row = {
  customerId: string;
  skillPackageId: string;
  licenseType: "TRIAL" | "SUBSCRIPTION" | "PERPETUAL";
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  stripeSubscriptionId: string | null;
  expiresAt: Date | null;
};

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key];
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { not?: unknown; in?: unknown[] };
      if ("not" in c) return value !== c.not;
      if ("in" in c) return c.in!.includes(value);
    }
    return value === cond;
  });
}

function fakeDb(initial: Row[], packages = ["pkg-a", "pkg-b"]) {
  const rows: Row[] = initial.map((r) => ({ ...r }));
  const db = {
    skillPackage: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        packages.filter((id) => where.id.in.includes(id)).map((id) => ({ id })),
    },
    skillEntitlement: {
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      findUnique: async ({ where }: { where: { customerId_skillPackageId: { customerId: string; skillPackageId: string } } }) =>
        rows.find(
          (r) =>
            r.customerId === where.customerId_skillPackageId.customerId &&
            r.skillPackageId === where.customerId_skillPackageId.skillPackageId,
        ) ?? null,
      createMany: async ({ data }: { data: Row[] }) => {
        let count = 0;
        for (const d of data) {
          if (!rows.some((r) => r.customerId === d.customerId && r.skillPackageId === d.skillPackageId)) {
            rows.push({ ...d });
            count++;
          }
        }
        return { count };
      },
    },
  };
  return { db: db as unknown as Db, rows };
}

const row = (over: Partial<Row>): Row => ({
  customerId: "cust-1",
  skillPackageId: "pkg-a",
  licenseType: "SUBSCRIPTION",
  status: "ACTIVE",
  stripeSubscriptionId: "sub_1",
  expiresAt: null,
  ...over,
});

const PERIOD_END = new Date("2027-09-13T00:00:00Z");

describe("applyStripeEntitlements (D2)", () => {
  it("leaves a perpetual licence exactly as it was", async () => {
    const perpetual = row({ licenseType: "PERPETUAL", stripeSubscriptionId: null });
    const { db, rows } = fakeDb([perpetual]);

    const result = await applyStripeEntitlements(db, {
      customerId: "cust-1",
      skillPackageIds: ["pkg-a"],
      subscriptionId: "sub_new",
      status: "ACTIVE",
      expiresAt: PERIOD_END,
    });

    expect(result).toEqual({ written: [], skipped: ["pkg-a"] });
    expect(rows[0]).toEqual(perpetual);
  });

  it("turns a grace (TRIAL) row into the subscription that replaces it", async () => {
    const { db, rows } = fakeDb([
      row({ licenseType: "TRIAL", stripeSubscriptionId: null, expiresAt: new Date("2026-10-13") }),
    ]);

    await applyStripeEntitlements(db, {
      customerId: "cust-1",
      skillPackageIds: ["pkg-a"],
      subscriptionId: "sub_new",
      status: "ACTIVE",
      expiresAt: PERIOD_END,
    });

    expect(rows[0]).toMatchObject({
      licenseType: "SUBSCRIPTION",
      stripeSubscriptionId: "sub_new",
      expiresAt: PERIOD_END,
    });
  });

  it("creates the row when none exists, and writes the rest of a mixed purchase", async () => {
    const { db, rows } = fakeDb([row({ skillPackageId: "pkg-b", licenseType: "PERPETUAL", stripeSubscriptionId: null })]);

    const result = await applyStripeEntitlements(db, {
      customerId: "cust-1",
      skillPackageIds: ["pkg-a", "pkg-b"],
      subscriptionId: "sub_new",
      status: "ACTIVE",
      expiresAt: PERIOD_END,
    });

    expect(result).toEqual({ written: ["pkg-a"], skipped: ["pkg-b"] });
    expect(rows.find((r) => r.skillPackageId === "pkg-a")).toMatchObject({
      licenseType: "SUBSCRIPTION",
      status: "ACTIVE",
      stripeSubscriptionId: "sub_new",
    });
    expect(rows.find((r) => r.skillPackageId === "pkg-b")?.licenseType).toBe("PERPETUAL");
  });
});

describe("suspendForFailedPayment (D1)", () => {
  it("suspends only the failed subscription's modules", async () => {
    const { db, rows } = fakeDb([
      row({ skillPackageId: "pkg-a", stripeSubscriptionId: "sub_failed" }),
      row({ skillPackageId: "pkg-b", stripeSubscriptionId: "sub_healthy" }),
    ]);

    const count = await suspendForFailedPayment(db, { customerId: "cust-1", subscriptionId: "sub_failed" });

    expect(count).toBe(1);
    expect(rows.map((r) => r.status)).toEqual(["SUSPENDED", "ACTIVE"]);
  });

  it("never suspends a perpetual licence, even one still carrying the subscription id", async () => {
    const { db, rows } = fakeDb([
      row({ licenseType: "PERPETUAL", stripeSubscriptionId: "sub_failed" }),
    ]);

    await suspendForFailedPayment(db, { customerId: "cust-1", subscriptionId: "sub_failed" });

    expect(rows[0].status).toBe("ACTIVE");
  });

  it("suspends nothing for an invoice no subscription generated", async () => {
    const { db, rows } = fakeDb([row({})]);

    expect(await suspendForFailedPayment(db, { customerId: "cust-1", subscriptionId: null })).toBe(0);
    expect(rows[0].status).toBe("ACTIVE");
  });
});

describe("expireSubscriptionEntitlements", () => {
  it("ends only rows the deleted subscription created", async () => {
    const { db, rows } = fakeDb([
      row({ skillPackageId: "pkg-a", stripeSubscriptionId: "sub_gone" }),
      row({ skillPackageId: "pkg-b", licenseType: "PERPETUAL", stripeSubscriptionId: null }),
    ]);

    await expireSubscriptionEntitlements(db, {
      customerId: "cust-1",
      skillPackageIds: ["pkg-a", "pkg-b"],
      subscriptionId: "sub_gone",
    });

    expect(rows.map((r) => r.status)).toEqual(["EXPIRED", "ACTIVE"]);
  });
});

describe("ownPackageIds", () => {
  it("drops another app's package ids arriving on the shared Stripe account", async () => {
    const { db } = fakeDb([]);
    expect(await ownPackageIds(db, ["pkg-a", "dpo-central-pkg", "pkg-b"])).toEqual(["pkg-a", "pkg-b"]);
    expect(await ownPackageIds(db, [])).toEqual([]);
  });
});

describe("runStripeEventOnce (D3)", () => {
  function prismaWith(seen: Set<string>, opts: { raceOnCreate?: boolean } = {}) {
    const tx = {
      processedStripeEvent: {
        create: vi.fn(async ({ data }: { data: { id: string } }) => {
          if (seen.has(data.id) || opts.raceOnCreate) {
            if (opts.raceOnCreate) seen.add(data.id);
            throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
              code: "P2002",
              clientVersion: "test",
            });
          }
          seen.add(data.id);
          return data;
        }),
      },
    };
    const prisma = {
      processedStripeEvent: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (seen.has(where.id) ? { id: where.id } : null)),
      },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    };
    return prisma as unknown as PrismaClient;
  }

  it("applies a new event once and ignores its redelivery", async () => {
    const seen = new Set<string>();
    const prisma = prismaWith(seen);
    const apply = vi.fn(async () => {});
    const event = { id: "evt_1", type: "invoice.payment_failed" };

    expect(await runStripeEventOnce(prisma, event, apply)).toBe("applied");
    expect(await runStripeEventOnce(prisma, event, apply)).toBe("duplicate");
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("treats a concurrent delivery that committed first as a duplicate", async () => {
    const seen = new Set<string>();
    const prisma = prismaWith(seen, { raceOnCreate: true });
    const apply = vi.fn(async () => {});

    expect(await runStripeEventOnce(prisma, { id: "evt_2", type: "x" }, apply)).toBe("duplicate");
    expect(apply).not.toHaveBeenCalled();
  });

  it("does not record the event when the writes fail, so Stripe's retry applies it", async () => {
    const seen = new Set<string>();
    const prisma = prismaWith(seen);
    // The real transaction rolls back the event row with the writes.
    (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new Error("database unavailable");
    });

    await expect(runStripeEventOnce(prisma, { id: "evt_3", type: "x" }, async () => {})).rejects.toThrow(
      "database unavailable",
    );
    expect(seen.has("evt_3")).toBe(false);
  });
});
