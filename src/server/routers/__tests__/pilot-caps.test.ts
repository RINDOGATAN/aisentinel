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
  const auditFails = { on: false };

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
      // Enough of the conditional stamp: `pilotFirstSignInAt: null` must still hold.
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const hit = organizations.filter((o) => matches(o, where) && (o.pilotFirstSignInAt ?? null) === null);
        for (const o of hit) Object.assign(o, data);
        return { count: hit.length };
      },
      findFirst: async ({ where }: { where: Row }) => organizations.find((o) => matches(o, where)) ?? null,
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
      findMany: async ({ where }: { where: Row }) => systems.filter((s) => matches(s, where)),
      create: async ({ data }: { data: Row }) => {
        const row = { id: `sys-${systems.length + 1}`, ...data };
        systems.push(row);
        return row;
      },
    },
    auditLog: {
      create: async ({ data }: { data: Row }) => {
        if (auditFails.on) throw new Error("audit store down");
        // An id, because deleting an organisation writes its tombstone and then
        // prunes the rest of the trail by "everything but this row".
        const row = { id: `audit-${audit.length + 1}`, createdAt: new Date(), ...data };
        audit.push(row);
        return row;
      },
      // Enough of the PILOT_LIMIT_REACHED lookup: the day floor and the JSON path.
      findFirst: async ({ where }: { where: Row & { createdAt?: { gte: Date }; metadata?: { path: string[]; equals: unknown } } }) => {
        if (auditFails.on) throw new Error("audit store down");
        const { createdAt, metadata, ...plain } = where;
        return (
          audit.find(
            (r) =>
              matches(r, plain) &&
              (!createdAt || (r.createdAt as Date).getTime() >= createdAt.gte.getTime()) &&
              (!metadata || (r.metadata as Row | undefined)?.[metadata.path[0]] === metadata.equals),
          ) ?? null
        );
      },
      deleteMany: async () => ({ count: 0 }),
    },
    legalHold: { findMany: async () => [], count: async () => 0 },
  };

  /**
   * `signedInDaysAgo` is the recorded first sign-in (null: none yet). The
   * organisation itself is always 400 days old: its age must play no part.
   */
  function reset(opts: { signedInDaysAgo: number | null; systemCount: number }) {
    organizations.length = 0;
    members.length = 0;
    systems.length = 0;
    audit.length = 0;
    auditFails.on = false;
    organizations.push({
      id: "org-a",
      name: "Org A",
      slug: "org-a",
      createdAt: new Date(Date.now() - 400 * DAY),
      pilotFirstSignInAt:
        opts.signedInDaysAgo === null ? null : new Date(Date.now() - opts.signedInDaysAgo * DAY),
    });
    members.push({ organizationId: "org-a", userId: "user-a", role: "OWNER" });
    for (let i = 0; i < opts.systemCount; i += 1) {
      systems.push({ id: `seed-${i}`, organizationId: "org-a", name: `System ${i}` });
    }
  }

  return { db, reset, organizations, members, systems, audit, auditFails };
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
    // The clock never starts before the pilot went live (PILOT_LIVE_FROM), so
    // "a first sign-in 91 days ago" needs a present well past it.
    vi.useFakeTimers({ now: new Date("2027-03-01T12:00:00.000Z"), toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("one organisation per account: a second create is refused, the first stands", async () => {
    H.reset({ signedInDaysAgo: 1, systemCount: 0 });
    const caller = organizationRouter.createCaller(ctx());
    await expect(caller.create({ name: "Second", slug: "second" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("one organisation per account"),
    });
    expect(H.organizations).toHaveLength(1);
  });

  it("an account with no organisation may create its one", async () => {
    H.reset({ signedInDaysAgo: 1, systemCount: 0 });
    H.members.length = 0;
    const caller = organizationRouter.createCaller(ctx());
    const org = await caller.create({ name: "First", slug: "first" });
    expect(org.id).toBeTruthy();
    expect(H.members).toHaveLength(1);
  });

  it("the ninety-day switch: writes are refused with the two ways out, reads still work", async () => {
    H.reset({ signedInDaysAgo: 91, systemCount: 0 });
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

  it("an old organisation with no recorded first sign-in gets its window from now, not from its creation", async () => {
    H.reset({ signedInDaysAgo: null, systemCount: 0 });
    const caller = aiSystemRouter.createCaller(ctx());
    await expect(caller.create(newSystem)).resolves.toBeTruthy();
    expect(H.organizations[0].pilotFirstSignInAt).toEqual(new Date());
  });

  it("the ninety-day switch does not close the way out: the owner can still delete the organisation", async () => {
    H.reset({ signedInDaysAgo: 400, systemCount: 0 });
    const caller = organizationRouter.createCaller(ctx());
    await expect(caller.delete({ organizationId: "org-a", confirmName: "Org A" })).resolves.toEqual({
      deleted: true,
    });
    expect(H.organizations).toHaveLength(0);
  });

  it("the records ceiling: the twenty-sixth system is refused and nothing is written", async () => {
    H.reset({ signedInDaysAgo: 1, systemCount: PILOT_CEILINGS.systems });
    const caller = aiSystemRouter.createCaller(ctx());
    await expect(caller.create(newSystem)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining(`ceiling of ${PILOT_CEILINGS.systems} AI systems`),
    });
    expect(H.systems).toHaveLength(PILOT_CEILINGS.systems);
  });

  it("below the ceiling and inside the window, a create goes through", async () => {
    H.reset({ signedInDaysAgo: 89, systemCount: PILOT_CEILINGS.systems - 1 });
    const caller = aiSystemRouter.createCaller(ctx());
    const created = await caller.create(newSystem);
    expect(created.id).toBeTruthy();
    expect(H.systems).toHaveLength(PILOT_CEILINGS.systems);
    expect(limitRows()).toHaveLength(0);
  });
});

/** The PILOT_LIMIT_REACHED rows written so far. */
const limitRows = () => H.audit.filter((r) => r.action === "PILOT_LIMIT_REACHED");

describe("a pilot limit becomes a lead: the refusal carries the link and is counted", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
    vi.useFakeTimers({ now: new Date("2027-03-01T12:00:00.000Z"), toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each([
    ["en", "Keep going on your own instance (https://www.todo.law/contact/managed)."],
    ["es", "Sigue en tu propia instancia (https://www.todo.law/es/contact/managed)."],
  ])("the ceiling's refusal carries the one keep-going link (%s)", async (locale, link) => {
    H.reset({ signedInDaysAgo: 1, systemCount: PILOT_CEILINGS.systems });
    const caller = aiSystemRouter.createCaller(ctx(locale));
    await expect(caller.create(newSystem)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining(link),
    });
  });

  it("writes exactly the contract row, once per organisation, per limit, per day", async () => {
    H.reset({ signedInDaysAgo: 1, systemCount: PILOT_CEILINGS.systems });
    const caller = aiSystemRouter.createCaller(ctx());
    for (let i = 0; i < 3; i += 1) await expect(caller.create(newSystem)).rejects.toBeTruthy();
    expect(limitRows()).toHaveLength(1);
    const { id: _id, createdAt: _at, ...row } = limitRows()[0];
    expect(row).toEqual({
      organizationId: "org-a",
      entityType: "Organization",
      entityId: "org-a",
      action: "PILOT_LIMIT_REACHED",
      metadata: { limit: "systems" },
    });

    // The next calendar day (UTC), one more row; the same day again, none.
    vi.setSystemTime(new Date("2027-03-02T00:00:01.000Z"));
    await expect(caller.create(newSystem)).rejects.toBeTruthy();
    await expect(caller.create(newSystem)).rejects.toBeTruthy();
    expect(limitRows()).toHaveLength(2);
    expect(H.systems).toHaveLength(PILOT_CEILINGS.systems);
  });

  it("counts each limit on its own: the editing days are a second limit, with their own row", async () => {
    H.reset({ signedInDaysAgo: 1, systemCount: PILOT_CEILINGS.systems });
    const caller = aiSystemRouter.createCaller(ctx());
    await expect(caller.create(newSystem)).rejects.toBeTruthy();
    H.organizations[0].pilotFirstSignInAt = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    await expect(caller.create(newSystem)).rejects.toMatchObject({
      message: expect.stringContaining("Keep going on your own instance (https://www.todo.law/contact/managed)."),
    });
    await expect(caller.create(newSystem)).rejects.toBeTruthy();
    expect(limitRows().map((r) => r.metadata)).toEqual([{ limit: "systems" }, { limit: "editing_days" }]);
  });

  it("a failure to write the row does not change the refusal", async () => {
    H.reset({ signedInDaysAgo: 1, systemCount: PILOT_CEILINGS.systems });
    H.auditFails.on = true;
    const caller = aiSystemRouter.createCaller(ctx());
    await expect(caller.create(newSystem)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining(`ceiling of ${PILOT_CEILINGS.systems} AI systems`),
    });
    expect(limitRows()).toHaveLength(0);
  });

  it("an organisation at its limit still reads everything, and a read writes no row", async () => {
    H.reset({ signedInDaysAgo: 1, systemCount: PILOT_CEILINGS.systems });
    const caller = aiSystemRouter.createCaller(ctx());
    await expect(caller.create(newSystem)).rejects.toBeTruthy();
    const { items } = await caller.list({ organizationId: "org-a", limit: 50 });
    expect(items).toHaveLength(PILOT_CEILINGS.systems);
    // Export: no export route imports the guard (src/server/services/pilot/caps.test.ts).
    expect(limitRows()).toHaveLength(1);
  });

  it("an organisation past its editing days still reads everything", async () => {
    H.reset({ signedInDaysAgo: 91, systemCount: 3 });
    const caller = aiSystemRouter.createCaller(ctx());
    const { items } = await caller.list({ organizationId: "org-a" });
    expect(items).toHaveLength(3);
    expect(limitRows()).toHaveLength(0);
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
    H.reset({ signedInDaysAgo: 400, systemCount: PILOT_CEILINGS.systems + 10 });
    const orgs = organizationRouter.createCaller(ctx());
    await expect(orgs.create({ name: "Second", slug: "second" })).resolves.toBeTruthy();
    const sys = aiSystemRouter.createCaller(ctx());
    await expect(sys.create(newSystem)).resolves.toBeTruthy();
  });
});
