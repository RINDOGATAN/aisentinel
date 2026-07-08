// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Seed-gate test.
 *
 * Sovereign/self-hosted first-run must be content-only: the platform-admin
 * identity and the demo organization/users are created ONLY when
 * DEMO_SEED=true. This locks that gate so a self-hosted deployment never
 * ships with an operator identity or demo tenant it did not ask for.
 *
 * `seedDatabase(prisma)` is invoked with a Proxy-based prisma double that
 * records which models had upsert/create called on them. No real database is
 * touched (the module's auto-run guard is skipped under Vitest).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { seedDatabase } from "./seed";

function makeSeedPrisma() {
  const calls: Record<string, number> = {};
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => async (arg: Record<string, unknown>) => {
          if (method === "upsert" || method === "create") {
            calls[name] = (calls[name] ?? 0) + 1;
          }
          // Every write/read resolves to an object carrying an id so downstream
          // `.id` reads in the seed keep working; findFirst stays truthy so the
          // optional assessment branches also run.
          const create = arg?.create as { id?: string } | undefined;
          const where = arg?.where as { id?: string } | undefined;
          return { id: create?.id ?? where?.id ?? `${name}-id` };
        },
      }
    );
  const prisma = new Proxy(
    {},
    { get: (_t, name: string) => model(name) }
  ) as unknown as PrismaClient;
  return { prisma, calls };
}

const originalDemoSeed = process.env.DEMO_SEED;

beforeEach(() => {
  delete process.env.DEMO_SEED;
});

afterEach(() => {
  if (originalDemoSeed === undefined) delete process.env.DEMO_SEED;
  else process.env.DEMO_SEED = originalDemoSeed;
});

describe("seedDatabase DEMO_SEED gate", () => {
  it("DEMO_SEED unset: no platform admin and no demo organization are created", async () => {
    const { prisma, calls } = makeSeedPrisma();
    await seedDatabase(prisma);

    expect(calls.platformAdmin ?? 0).toBe(0);
    expect(calls.organization ?? 0).toBe(0);
    expect(calls.user ?? 0).toBe(0);
    // Content (skill packages) is still seeded in content-only mode.
    expect(calls.skillPackage ?? 0).toBeGreaterThan(0);
  });

  it("DEMO_SEED=false: still content-only (no admin, no demo org)", async () => {
    process.env.DEMO_SEED = "false";
    const { prisma, calls } = makeSeedPrisma();
    await seedDatabase(prisma);

    expect(calls.platformAdmin ?? 0).toBe(0);
    expect(calls.organization ?? 0).toBe(0);
  });

  it("DEMO_SEED=true: platform admin and demo organization ARE created", async () => {
    process.env.DEMO_SEED = "true";
    const { prisma, calls } = makeSeedPrisma();
    await seedDatabase(prisma);

    expect(calls.platformAdmin ?? 0).toBeGreaterThan(0);
    expect(calls.organization ?? 0).toBeGreaterThan(0);
    expect(calls.user ?? 0).toBeGreaterThan(0);
  });
});
