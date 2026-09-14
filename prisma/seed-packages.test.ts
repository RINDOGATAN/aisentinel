// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The skill packages the base seed writes: every priced package at 60 a year,
 * and a seed run without STRIPE_PRICE_* never blanks a stored price id.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { seedDatabase, skillPackageUpdate } from "./seed";

type Upsert = { where: { id: string }; update: Record<string, unknown>; create: Record<string, unknown> };

function capturePackages() {
  const upserts: Upsert[] = [];
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => async (arg: Upsert) => {
          if (name === "skillPackage" && method === "upsert") upserts.push(arg);
          return { id: (arg?.create as { id?: string })?.id ?? `${name}-id` };
        },
      },
    );
  const prisma = new Proxy({}, { get: (_t, name: string) => model(name) }) as unknown as PrismaClient;
  return { prisma, upserts };
}

const PRICE_VARS = [
  "STRIPE_PRICE_ID",
  "STRIPE_PRICE_CONFORMITY",
  "STRIPE_PRICE_BIAS",
  "STRIPE_PRICE_SHADOW",
  "STRIPE_PRICE_VENDOR_CATALOG",
  "STRIPE_PRICE_IMPACT_ASSESSMENT",
  "STRIPE_PRICE_PROGRAM_REPORT",
];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const v of [...PRICE_VARS, "DEMO_SEED"]) {
    saved[v] = process.env[v];
    delete process.env[v];
  }
});

afterEach(() => {
  for (const [v, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[v];
    else process.env[v] = value;
  }
});

describe("seeded skill packages", () => {
  it("prices every package at 6000 minor units a year", async () => {
    const { prisma, upserts } = capturePackages();
    await seedDatabase(prisma);

    expect(upserts.length).toBe(6);
    for (const u of upserts) {
      expect(u.create).toMatchObject({ priceAmount: 6000, priceCurrency: "eur", billingInterval: "YEAR" });
    }
  });

  it("leaves the stored price id alone when no STRIPE_PRICE_* is set", async () => {
    const { prisma, upserts } = capturePackages();
    await seedDatabase(prisma);

    for (const u of upserts) {
      expect(u.update).not.toHaveProperty("stripePriceId");
      expect(u.update).toMatchObject({ priceAmount: 6000 });
    }
  });

  it("writes the price id when one is configured", async () => {
    process.env.STRIPE_PRICE_SHADOW = "price_yearly_shadow";
    const { prisma, upserts } = capturePackages();
    await seedDatabase(prisma);

    const shadow = upserts.find((u) => u.where.id === "skill-shadow-ai")!;
    expect(shadow.update.stripePriceId).toBe("price_yearly_shadow");
    const other = upserts.find((u) => u.where.id === "skill-conformity")!;
    expect(other.update).not.toHaveProperty("stripePriceId");
  });

  it("skillPackageUpdate drops only a null price id", () => {
    expect(skillPackageUpdate({ id: "a", stripePriceId: null })).toEqual({ id: "a" });
    expect(skillPackageUpdate({ id: "a", stripePriceId: "price_1" })).toEqual({ id: "a", stripePriceId: "price_1" });
  });
});
