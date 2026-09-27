// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Department-scope regression test.
 *
 * A member limited to one or more departments must never see another
 * department's systems, and an unlimited member must still see everything. This
 * exercises the real aiSystem.list query against a small in-memory fake whose
 * findMany honours the composed `where` (organizationId + an AND of the member's
 * department scope), so the narrowing is proven end to end rather than stubbed.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  // A matcher that understands the shapes aiSystem.list composes: scalar
  // equality, AND/OR arrays, { in: [...] }, and null equality. Enough to
  // exercise the department scope; unrelated filters are not used here.
  function matches(row: Row, where: unknown): boolean {
    if (!where || typeof where !== "object") return true;
    const w = where as Record<string, unknown>;
    for (const [key, value] of Object.entries(w)) {
      if (key === "AND") {
        const arr = value as unknown[];
        if (!arr.every((c) => matches(row, c))) return false;
      } else if (key === "OR") {
        const arr = value as unknown[];
        if (!arr.some((c) => matches(row, c))) return false;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        const op = value as Record<string, unknown>;
        if ("in" in op) {
          if (!(op.in as unknown[]).includes(row[key])) return false;
        } else {
          // Nested relation filters are not exercised here.
          continue;
        }
      } else {
        if (row[key] !== value) return false;
      }
    }
    return true;
  }

  const orgs = [{ id: "org-a", name: "Org A", operatingJurisdictions: [] as string[], pilotFirstSignInAt: null }];
  const members: Row[] = [];
  const scopeRows: Row[] = []; // businessUnitMember
  const systems: Row[] = [];

  const db = {
    organizationMember: {
      findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
        const k = where.organizationId_userId;
        const m = members.find((r) => r.organizationId === k.organizationId && r.userId === k.userId);
        return m ? { ...m, organization: orgs.find((o) => o.id === m.organizationId) } : null;
      },
    },
    businessUnitMember: {
      findMany: async ({ where }: { where: { memberId: string } }) =>
        scopeRows.filter((r) => r.memberId === where.memberId),
    },
    aISystem: {
      findMany: async ({ where }: { where: Row }) => systems.filter((s) => matches(s, where)),
      findFirst: async ({ where }: { where: Row }) => systems.find((s) => matches(s, where)) ?? null,
    },
  };

  function reset() {
    members.length = 0;
    scopeRows.length = 0;
    systems.length = 0;
    members.push({ id: "mem-limited", organizationId: "org-a", userId: "user-limited", role: "MEMBER" });
    members.push({ id: "mem-all", organizationId: "org-a", userId: "user-all", role: "ADMIN" });
    // user-limited may see department A only.
    scopeRows.push({ businessUnitId: "dept-a", memberId: "mem-limited" });
    systems.push(
      { id: "sys-a", organizationId: "org-a", businessUnitId: "dept-a", name: "A", createdAt: new Date(2) },
      { id: "sys-b", organizationId: "org-a", businessUnitId: "dept-b", name: "B", createdAt: new Date(1) },
      { id: "sys-none", organizationId: "org-a", businessUnitId: null, name: "None", createdAt: new Date(0) },
    );
  }

  return { db, reset };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { createInnerTRPCContext } from "@/server/trpc";
import { aiSystemRouter } from "@/server/routers/governance/aiSystem";

function ctxFor(userId: string) {
  const session = {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return createInnerTRPCContext({ session, getCookie: () => undefined });
}

beforeEach(() => H.reset());

describe("department scope on aiSystem.list", () => {
  it("a department-limited member sees only their department's systems", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor("user-limited"));
    const { items } = await caller.list({ organizationId: "org-a", limit: 50 });
    const ids = items.map((i) => i.id).sort();
    expect(ids).toEqual(["sys-a"]);
    // Never another department's system, and never the unassigned one.
    expect(ids).not.toContain("sys-b");
    expect(ids).not.toContain("sys-none");
  });

  it("an unlimited member sees every system in the organization", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor("user-all"));
    const { items } = await caller.list({ organizationId: "org-a", limit: 50 });
    expect(items.map((i) => i.id).sort()).toEqual(["sys-a", "sys-b", "sys-none"]);
  });

  it("a limited member cannot open another department's system by id", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor("user-limited"));
    await expect(
      caller.getById({ organizationId: "org-a", id: "sys-b" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
