// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot's editing window is used once per account, through the
 * real routers and write middleware against an in-memory fake:
 *
 *   - deleting a read-only organisation and creating a new one does not open
 *     editing again: the new organisation starts from the old window start;
 *   - neither does leaving it (being removed by another owner) and creating
 *     a new one, whatever the member's role;
 *   - an account that never left an organisation starts its own window;
 *   - the earlier start wins when an account has left several;
 *   - on the kit nothing is recorded or inherited.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const DAY = 24 * 60 * 60 * 1000;

  const organizations: Row[] = [];
  const members: Row[] = [];
  const users: Row[] = [];
  const audit: Row[] = [];

  const matches = (row: Row, where: Row = {}) =>
    Object.entries(where).every(([k, v]) =>
      v && typeof v === "object" && !Array.isArray(v) ? true : row[k] === v,
    );

  const withOrg = (m: Row | undefined) =>
    m ? { ...m, organization: organizations.find((o) => o.id === m.organizationId) } : null;

  const db = {
    organization: {
      findMany: async () => organizations.map((o) => ({ slug: o.slug })),
      findUnique: async ({ where }: { where: Row }) => organizations.find((o) => matches(o, where)) ?? null,
      findFirst: async ({ where }: { where: Row }) => organizations.find((o) => matches(o, where)) ?? null,
      create: async ({ data }: { data: Row & { members?: { create: Row } } }) => {
        const { members: nested, ...rest } = data;
        const org = { id: `org-${organizations.length + 1}`, pilotFirstSignInAt: null, ...rest };
        organizations.push(org);
        if (nested?.create) {
          members.push({ id: `m-${members.length + 1}`, organizationId: org.id, ...nested.create });
        }
        return { ...org, members: [] };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const org = organizations.find((o) => matches(o, where))!;
        Object.assign(org, data);
        return org;
      },
      // The organisation's members go with it (onDelete: Cascade).
      delete: async ({ where }: { where: Row }) => {
        const i = organizations.findIndex((o) => matches(o, where));
        const [gone] = organizations.splice(i, 1);
        for (let j = members.length - 1; j >= 0; j -= 1) {
          if (members[j].organizationId === gone.id) members.splice(j, 1);
        }
        return gone;
      },
      // The conditional stamp: `pilotFirstSignInAt: null` must still hold.
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const hit = organizations.filter((o) => matches(o, where) && (o.pilotFirstSignInAt ?? null) === null);
        for (const o of hit) Object.assign(o, data);
        return { count: hit.length };
      },
    },
    organizationMember: {
      findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
        const key = where.organizationId_userId;
        return withOrg(members.find((r) => r.organizationId === key.organizationId && r.userId === key.userId));
      },
      findFirst: async ({ where }: { where: Row }) => members.find((m) => matches(m, where)) ?? null,
      findMany: async ({ where }: { where: Row }) => members.filter((m) => matches(m, where)),
      count: async ({ where }: { where: Row }) => members.filter((m) => matches(m, where)).length,
      delete: async ({ where }: { where: { id: string } }) => {
        const i = members.findIndex((m) => m.id === where.id);
        return members.splice(i, 1)[0];
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => users.find((u) => u.id === where.id) ?? null,
      // The keep-the-earlier rule: unset, or later than the start being kept.
      updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: { pilotTrialStartedAt: Date } }) => {
        const hit = users.filter((u) => {
          if (!where.id.in.includes(u.id as string)) return false;
          const current = u.pilotTrialStartedAt as Date | null;
          return current === null || current.getTime() > data.pilotTrialStartedAt.getTime();
        });
        for (const u of hit) u.pilotTrialStartedAt = data.pilotTrialStartedAt;
        return { count: hit.length };
      },
    },
    auditLog: {
      create: async ({ data }: { data: Row }) => {
        const row = { id: `audit-${audit.length + 1}`, createdAt: new Date(), ...data };
        audit.push(row);
        return row;
      },
      findFirst: async () => null,
      deleteMany: async () => ({ count: 0 }),
    },
    legalHold: { findMany: async () => [], count: async () => 0 },
    businessUnitMember: { findMany: async () => [] },
  };

  /** One read-only organisation (window started `startedDaysAgo`), owned by user-a. */
  function reset(startedDaysAgo: number) {
    organizations.length = 0;
    members.length = 0;
    users.length = 0;
    audit.length = 0;
    organizations.push({
      id: "org-a",
      name: "Org A",
      slug: "org-a",
      pilotFirstSignInAt: new Date(Date.now() - startedDaysAgo * DAY),
    });
    for (const id of ["user-a", "user-b"]) users.push({ id, email: `${id}@example.test`, pilotTrialStartedAt: null });
    members.push({ id: "m-a", organizationId: "org-a", userId: "user-a", role: "OWNER" });
  }

  return { db, reset, organizations, members, users, DAY };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { createInnerTRPCContext } from "@/server/trpc";
import { organizationRouter } from "@/server/routers/governance/organization";

const sessionFor = (id: string) =>
  ({
    user: { id, email: `${id}@example.test`, name: id },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  }) as unknown as Session;

const callerFor = (id: string, locale?: string) =>
  organizationRouter.createCaller(
    createInnerTRPCContext({
      session: sessionFor(id),
      getCookie: (name) => (name === "locale" ? locale : undefined),
    }),
  );

const edit = (id: string, organizationId: string, locale?: string) =>
  callerFor(id, locale).setJurisdictions({ organizationId, jurisdictions: ["EU"] });

const readOnly = { code: "FORBIDDEN", message: expect.stringContaining("read-only") };

describe("hosted pilot: one editing window per account", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
    vi.useFakeTimers({ now: new Date("2027-03-01T12:00:00.000Z"), toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("deleting a read-only organization and creating a new one does not open editing again", async () => {
    H.reset(20);
    const start = H.organizations[0].pilotFirstSignInAt as Date;
    await expect(edit("user-a", "org-a")).rejects.toMatchObject(readOnly);

    await callerFor("user-a").delete({ organizationId: "org-a", confirmName: "Org A" });
    const next = await callerFor("user-a").create({ name: "Org B", slug: "org-b", acceptDpa: true });

    expect(H.organizations.find((o) => o.id === next.id)!.pilotFirstSignInAt).toEqual(start);
    await expect(edit("user-a", next.id)).rejects.toMatchObject(readOnly);
    // In Spanish too: the existing read-only message, nothing new.
    await expect(edit("user-a", next.id, "es")).rejects.toMatchObject({ message: expect.stringContaining("solo lectura") });
  });

  it("deleting inside the window does not extend it: the new organization keeps the old end date", async () => {
    H.reset(10);
    const start = H.organizations[0].pilotFirstSignInAt as Date;
    await callerFor("user-a").delete({ organizationId: "org-a", confirmName: "Org A" });
    const next = await callerFor("user-a").create({ name: "Org B", slug: "org-b", acceptDpa: true });
    expect(H.organizations.find((o) => o.id === next.id)!.pilotFirstSignInAt).toEqual(start);
    await expect(edit("user-a", next.id)).resolves.toBeTruthy();
    vi.setSystemTime(new Date(Date.now() + 6 * H.DAY));
    await expect(edit("user-a", next.id)).rejects.toMatchObject(readOnly);
  });

  it("deleting an organization keeps its start on every member, not only the owner", async () => {
    H.reset(20);
    H.members.push({ id: "m-b", organizationId: "org-a", userId: "user-b", role: "MEMBER" });
    await callerFor("user-a").delete({ organizationId: "org-a", confirmName: "Org A" });
    const start = new Date(Date.now() - 20 * H.DAY);
    expect(H.users.map((u) => u.pilotTrialStartedAt)).toEqual([start, start]);
  });

  it.each(["OWNER", "ADMIN", "MEMBER"])(
    "leaving (removed by another owner) and creating a new organization does not open editing again (%s)",
    async (role) => {
      H.reset(20);
      const start = H.organizations[0].pilotFirstSignInAt as Date;
      H.members[0].role = role;
      H.members.push({ id: "m-b", organizationId: "org-a", userId: "user-b", role: "OWNER" });

      await callerFor("user-b").removeMember({ organizationId: "org-a", memberId: "m-a" });
      const next = await callerFor("user-a").create({ name: "Org B", slug: "org-b", acceptDpa: true });

      expect(H.organizations.find((o) => o.id === next.id)!.pilotFirstSignInAt).toEqual(start);
      await expect(edit("user-a", next.id)).rejects.toMatchObject(readOnly);
    },
  );

  it("the earlier start wins: leaving a later organization does not move the account's start forward", async () => {
    H.reset(20);
    const first = H.organizations[0].pilotFirstSignInAt as Date;
    H.users[0].pilotTrialStartedAt = first;
    H.organizations[0].pilotFirstSignInAt = new Date(Date.now() - 2 * H.DAY);
    await callerFor("user-a").delete({ organizationId: "org-a", confirmName: "Org A" });
    expect(H.users[0].pilotTrialStartedAt).toEqual(first);
  });

  it("an account that never left an organization starts its own window at its first sign-in", async () => {
    H.reset(20);
    const next = await callerFor("user-b").create({ name: "Org B", slug: "org-b", acceptDpa: true });
    expect(H.organizations.find((o) => o.id === next.id)!.pilotFirstSignInAt).toBeNull();
    await expect(edit("user-b", next.id)).resolves.toBeTruthy();
    expect(H.organizations.find((o) => o.id === next.id)!.pilotFirstSignInAt).toEqual(new Date());
  });

  it("on the kit nothing is recorded or inherited", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "false");
    H.reset(20);
    await callerFor("user-a").delete({ organizationId: "org-a", confirmName: "Org A" });
    expect(H.users[0].pilotTrialStartedAt).toBeNull();
    const next = await callerFor("user-a").create({ name: "Org B", slug: "org-b" });
    expect(H.organizations.find((o) => o.id === next.id)!.pilotFirstSignInAt).toBeNull();
    await expect(edit("user-a", next.id)).resolves.toBeTruthy();
  });
});
