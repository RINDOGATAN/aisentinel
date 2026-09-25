// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * programPath router: every count is scoped to the organisation asked about,
 * a non-member is refused, and the portfolio lists only the caller's own
 * memberships. No database: `@/lib/prisma` is a fake that records each call.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Where = Record<string, unknown>;
  const calls: { model: string; op: string; where: Where }[] = [];
  const members = [
    { organizationId: "org-a", userId: "user-a", role: "OWNER" },
    { organizationId: "org-c", userId: "user-a", role: "VIEWER" },
    { organizationId: "org-b", userId: "user-b", role: "OWNER" },
  ];
  const orgs: Record<string, { id: string; name: string; slug: string; settings: unknown; operatingJurisdictions: string[]; pilotFirstSignInAt: null }> = {
    "org-a": { id: "org-a", name: "Org A", slug: "a", settings: { quickstart: { completedAt: "2026-09-01T00:00:00Z" } }, operatingJurisdictions: ["EU"], pilotFirstSignInAt: null },
    "org-b": { id: "org-b", name: "Org B", slug: "b", settings: null, operatingJurisdictions: [], pilotFirstSignInAt: null },
    "org-c": { id: "org-c", name: "Org C", slug: "c", settings: null, operatingJurisdictions: [], pilotFirstSignInAt: null },
  };

  const model = (name: string) => ({
    count: async ({ where }: { where: Where }) => {
      calls.push({ model: name, op: "count", where });
      return 0;
    },
    // The agents for the AIUC-1 step (services/aiuc1/readiness.ts): none here.
    findMany: async ({ where }: { where: Where }) => {
      calls.push({ model: name, op: "findMany", where });
      return [];
    },
  });

  const db: Record<string, unknown> = new Proxy(
    {
      organizationMember: {
        findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
          const k = where.organizationId_userId;
          const m = members.find((r) => r.organizationId === k.organizationId && r.userId === k.userId);
          return m ? { ...m, organization: orgs[m.organizationId] } : null;
        },
        findMany: async ({ where }: { where: { userId: string } }) => {
          calls.push({ model: "organizationMember", op: "findMany", where });
          return members
            .filter((m) => m.userId === where.userId)
            .map((m) => ({ role: m.role, organization: orgs[m.organizationId] }));
        },
      },
      organization: {
        findFirst: async ({ where }: { where: { id: string } }) => {
          calls.push({ model: "organization", op: "findFirst", where });
          return orgs[where.id] ?? null;
        },
      },
    } as Record<string, unknown>,
    {
      get(target, prop: string) {
        if (!(prop in target)) target[prop] = model(prop);
        return target[prop];
      },
    },
  );

  return { db, calls };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { createInnerTRPCContext } from "@/server/trpc";
import { programPathRouter } from "@/server/routers/governance/programPath";

function caller(userId: string | null) {
  const session = userId
    ? ({ user: { id: userId, email: `${userId}@example.test` }, expires: "2999-01-01" } as unknown as Session)
    : null;
  return programPathRouter.createCaller(createInnerTRPCContext({ session, getCookie: () => undefined }));
}

beforeEach(() => {
  H.calls.length = 0;
});

describe("programPath.status", () => {
  it("scopes every count to the organisation asked about", async () => {
    const result = await caller("user-a").status({ organizationId: "org-a" });
    expect(result.steps.quickstart).toBe("done");
    expect(result.steps.prohibited).toBe("coming");
    const counts = H.calls.filter((c) => c.op === "count");
    expect(counts.length).toBeGreaterThan(30);
    for (const c of counts) expect(c.where.organizationId, c.model).toBe("org-a");
    const lists = H.calls.filter((c) => c.op === "findMany");
    expect(lists.map((c) => c.model)).toEqual(["aISystem"]);
    for (const c of lists) expect(c.where.organizationId, c.model).toBe("org-a");
    // No agent: the AIUC-1 step does not concern this organisation.
    expect(result.steps.agentTesting).toBe("hidden");
    const org = H.calls.find((c) => c.model === "organization");
    expect(org?.where).toEqual({ id: "org-a" });
  });

  it("is readable by a viewer", async () => {
    await expect(caller("user-a").status({ organizationId: "org-c" })).resolves.toBeTruthy();
  });

  it("refuses an organisation the caller does not belong to", async () => {
    await expect(caller("user-a").status({ organizationId: "org-b" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(H.calls.filter((c) => c.op === "count")).toHaveLength(0);
  });

  it("refuses without a session", async () => {
    await expect(caller(null).status({ organizationId: "org-a" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("programPath.portfolio", () => {
  it("lists only the caller's own organisations, each read in its own scope", async () => {
    const rows = await caller("user-a").portfolio();
    expect(rows.map((r) => r.organizationId).sort()).toEqual(["org-a", "org-c"]);
    const lookup = H.calls.find((c) => c.model === "organizationMember");
    expect(lookup?.where).toEqual({ userId: "user-a" });
    const scopes = new Set(H.calls.filter((c) => c.op === "count").map((c) => c.where.organizationId));
    expect([...scopes].sort()).toEqual(["org-a", "org-c"]);
  });
});
