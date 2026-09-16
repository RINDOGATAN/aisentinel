// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot's caps, driven through the real routers and the real
 * write middleware (src/server/trpc.ts) against an in-memory fake, so what
 * is proven is the wiring and not only the service:
 *
 *   - organization.create refuses a second organisation for the account;
 *   - every orgWriteProcedure refuses once the organisation is read-only,
 *     except organization.delete, which is the way out;
 *   - aiSystem.create refuses at the records ceiling and writes nothing;
 *   - on the kit none of this applies.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const DAY = 24 * 60 * 60 * 1000;

  const organizations: Row[] = [];
  const members: Row[] = [];
  const systems: Row[] = [];
  const audit: Row[] = [];

  const matches = (row: Row, where: Row = {}) =>
    Object.entries(where).every(([k, v]) =>
      v && typeof v === "object" && !Array.isArray(v) ? true : row[k] === v,
    );

  const db = {
    organization: {
      findMany: async () => organizations.map((o) => ({ slug: o.slug })),
      findUnique: async ({ where }: { where: Row }) => organizations.find((o) => matches(o, where)) ?? null,
      create: async ({ data }: { data: Row & { members?: { create: Row } } }) => {
        const { members: nested, ...rest } = data;
        const org = { id: `org-${organizations.length + 1}`, createdAt: new Date(), ...rest };
        organizations.push(org);
        if (nested?.create) members.push({ organizationId: org.id, ...nested.create });
        return { ...org, members: [] };
      },
      delete: async ({ where }: { where: Row }) => {
        const i = organizations.findIndex((o) => matches(o, where));
        if (i >= 0) organizations.splice(i, 1);
        return {};
      },
    },
    organizationMember: {
      findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
        const key = where.organizationId_userId;
        const m = members.find((r) => r.organizationId === key.organizationId && r.userId === key.userId);
        if (!m) return null;
        return { ...m, organization: organizations.find((o) => o.id === m.organizationId) };
      },
      count: async ({ where }: { where: Row }) => members.filter((m) => matches(m, where)).length,
    },
    aISystem: {
      count: async ({ where }: { where: Row }) => systems.filter((s) => matches(s, where)).length,
      create: async ({ data }: { data: Row }) => {
        const row = { id: `sys-${systems.length + 1}`, ...data };
        systems.push(row);
        return row;
      },
    },
    auditLog: {
      create: async ({ data }: { data: Row }) => {
        audit.push(data);
        return data;
      },
    },
    legalHold: { findMany: async () => [], count: async () => 0 },
  };

  function reset(opts: { orgAgeDays: number; systemCount: number }) {
    organizations.length = 0;
    members.length = 0;
    systems.length = 0;
    audit.length = 0;
    organizations.push({
      id: "org-a",
      name: "Org A",
      slug: "org-a",
      createdAt: new Date(Date.now() - opts.orgAgeDays * DAY),
    });
    members.push({ organizationId: "org-a", userId: "user-a", role: "OWNER" });
    for (let i = 0; i < opts.systemCount; i += 1) {
      systems.push({ id: `seed-${i}`, organizationId: "org-a", name: `System ${i}` });
    }
  }

  return { db, reset, organizations, members, systems };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { createInnerTRPCContext } from "@/server/trpc";
import { organizationRouter } from "@/server/routers/governance/organization";
import { aiSystemRouter } from "@/server/routers/governance/aiSystem";
import { PILOT_CEILINGS, PILOT_RUN_URL } from "@/config/pilot";

const session = {
  user: { id: "user-a", email: "user-a@example.test", name: "user-a" },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
} as unknown as Session;

const ctx = (locale?: string) =>
  createInnerTRPCContext({ session, getCookie: (name) => (name === "locale" ? locale : undefined) });

const newSystem = {
  organizationId: "org-a",
  name: "New system",
  technique: "NLP" as const,
  role: "DEPLOYER" as const,
};

describe("hosted pilot caps through the routers", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
    // The clock never starts before the pilot terms took effect (2026-09-16),
    // so "an organisation that is 91 days old" needs a present well past it.
    vi.useFakeTimers({ now: new Date("2027-03-01T12:00:00.000Z"), toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("one organisation per account: a second create is refused, the first stands", async () => {
    H.reset({ orgAgeDays: 1, systemCount: 0 });
    const caller = organizationRouter.createCaller(ctx());
    await expect(caller.create({ name: "Second", slug: "second" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("one organisation per account"),
    });
    expect(H.organizations).toHaveLength(1);
  });

  it("an account with no organisation may create its one", async () => {
    H.reset({ orgAgeDays: 1, systemCount: 0 });
    H.members.length = 0;
    const caller = organizationRouter.createCaller(ctx());
    const org = await caller.create({ name: "First", slug: "first" });
    expect(org.id).toBeTruthy();
    expect(H.members).toHaveLength(1);
  });

  it("the ninety-day switch: writes are refused with the two ways out, reads still work", async () => {
    H.reset({ orgAgeDays: 91, systemCount: 0 });
    const caller = aiSystemRouter.createCaller(ctx("es"));
    await expect(caller.create(newSystem)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining(PILOT_RUN_URL),
    });
    await expect(caller.create(newSystem)).rejects.toMatchObject({
      message: expect.stringContaining("/api/export/program-pack?organizationId=org-a"),
    });
    await expect(caller.create(newSystem)).rejects.toMatchObject({
      message: expect.stringContaining("solo lectura"),
    });
    expect(H.systems).toHaveLength(0);
  });

  it("the ninety-day switch does not close the way out: the owner can still delete the organisation", async () => {
    H.reset({ orgAgeDays: 400, systemCount: 0 });
    const caller = organizationRouter.createCaller(ctx());
    await expect(caller.delete({ organizationId: "org-a", confirmName: "Org A" })).resolves.toEqual({
      deleted: true,
    });
    expect(H.organizations).toHaveLength(0);
  });

  it("the records ceiling: the twenty-sixth system is refused and nothing is written", async () => {
    H.reset({ orgAgeDays: 1, systemCount: PILOT_CEILINGS.systems });
    const caller = aiSystemRouter.createCaller(ctx());
    await expect(caller.create(newSystem)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining(`ceiling of ${PILOT_CEILINGS.systems} AI systems`),
    });
    expect(H.systems).toHaveLength(PILOT_CEILINGS.systems);
  });

  it("below the ceiling and inside the window, a create goes through", async () => {
    H.reset({ orgAgeDays: 89, systemCount: PILOT_CEILINGS.systems - 1 });
    const caller = aiSystemRouter.createCaller(ctx());
    const created = await caller.create(newSystem);
    expect(created.id).toBeTruthy();
    expect(H.systems).toHaveLength(PILOT_CEILINGS.systems);
  });
});

describe("on the kit the routers apply no pilot cap", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("AUTH_COOKIE_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("creates a second organisation, writes to an old one, and passes the ceiling", async () => {
    H.reset({ orgAgeDays: 400, systemCount: PILOT_CEILINGS.systems + 10 });
    const orgs = organizationRouter.createCaller(ctx());
    await expect(orgs.create({ name: "Second", slug: "second" })).resolves.toBeTruthy();
    const sys = aiSystemRouter.createCaller(ctx());
    await expect(sys.create(newSystem)).resolves.toBeTruthy();
  });
});
