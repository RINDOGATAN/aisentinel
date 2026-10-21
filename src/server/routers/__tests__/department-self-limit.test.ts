// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Department limits can never hide records from the person who made them.
 *
 * The sequence reproduced here: an owner creates a department, limits their
 * own access to it, then registers a system with no department. Before the
 * fix the limit was accepted, the system was created outside it, and the
 * owner's list no longer showed it ("AI system not found" when opened).
 *
 * The rules proven through the real routers over an in-memory fake:
 *   - nobody can limit their own access;
 *   - owners and admins can never be limited, and a limit stored for one
 *     before this rule existed is ignored;
 *   - a limited member's new system lands in their department and stays
 *     visible to them;
 *   - a limited member cannot move a system out of their departments.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  function matches(row: Row, where: unknown): boolean {
    if (!where || typeof where !== "object") return true;
    for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
      if (key === "AND") {
        if (!(value as unknown[]).every((c) => matches(row, c))) return false;
      } else if (key === "OR") {
        if (!(value as unknown[]).some((c) => matches(row, c))) return false;
      } else if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        const op = value as Record<string, unknown>;
        if ("in" in op) {
          if (!(op.in as unknown[]).includes(row[key])) return false;
        } else if ("notIn" in op) {
          if ((op.notIn as unknown[]).includes(row[key])) return false;
        }
      } else if (row[key] !== value) {
        return false;
      }
    }
    return true;
  }

  function table() {
    let rows: Row[] = [];
    let seq = 0;
    return {
      __set(next: Row[]) {
        rows = next.map((r) => ({ ...r }));
      },
      __rows: () => rows,
      findFirst: async ({ where }: { where?: Row } = {}) => rows.find((r) => matches(r, where)) ?? null,
      findUnique: async ({ where }: { where: Row }) => rows.find((r) => matches(r, where)) ?? null,
      findMany: async ({ where }: { where?: Row } = {}) => rows.filter((r) => matches(r, where)),
      count: async ({ where }: { where?: Row } = {}) => rows.filter((r) => matches(r, where)).length,
      create: async ({ data }: { data: Row }) => {
        const row = { id: `gen-${++seq}`, createdAt: new Date(), ...data };
        rows.push(row);
        return row;
      },
      createMany: async ({ data }: { data: Row[] }) => {
        for (const d of data) rows.push({ id: `gen-${++seq}`, createdAt: new Date(), ...d });
        return { count: data.length };
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      deleteMany: async ({ where }: { where: Row }) => {
        const before = rows.length;
        rows = rows.filter((r) => !matches(r, where));
        return { count: before - rows.length };
      },
    };
  }

  const org = { id: "org-a", name: "Org A", operatingJurisdictions: [] as string[], pilotFirstSignInAt: null };
  const db = {
    organizationMember: table(),
    businessUnit: table(),
    businessUnitMember: table(),
    aISystem: table(),
    auditLog: table(),
    $transaction: async (ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops),
  };
  const findMember = db.organizationMember.findUnique;
  db.organizationMember.findUnique = async ({ where }: { where: Row }) => {
    const key = (where as { organizationId_userId?: { organizationId: string; userId: string } })
      .organizationId_userId;
    if (key) {
      const m = db.organizationMember
        .__rows()
        .find((r) => r.organizationId === key.organizationId && r.userId === key.userId);
      return m ? { ...m, organization: org } : null;
    }
    return findMember({ where });
  };

  function reset() {
    db.organizationMember.__set([
      { id: "mem-owner", organizationId: "org-a", userId: "owner", role: "OWNER" },
      { id: "mem-admin", organizationId: "org-a", userId: "admin", role: "ADMIN" },
      { id: "mem-officer", organizationId: "org-a", userId: "officer", role: "AI_OFFICER" },
      { id: "mem-member", organizationId: "org-a", userId: "member", role: "MEMBER" },
    ]);
    db.businessUnit.__set([
      { id: "dept-hr", organizationId: "org-a", name: "HR", parentId: null },
      { id: "dept-it", organizationId: "org-a", name: "IT", parentId: null },
    ]);
    db.businessUnitMember.__set([]);
    db.aISystem.__set([]);
    db.auditLog.__set([]);
  }

  return { db, reset };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/server/services/pilot/caps", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/services/pilot/caps")>();
  return { ...original, assertPilotRoom: async () => {}, assertPilotWritable: () => {} };
});

import { createInnerTRPCContext } from "@/server/trpc";
import { aiSystemRouter } from "@/server/routers/governance/aiSystem";
import { businessUnitRouter } from "@/server/routers/governance/businessUnit";

function ctxFor(userId: string) {
  const session = {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return createInnerTRPCContext({ session, getCookie: () => undefined });
}

const NEW_SYSTEM = {
  organizationId: "org-a",
  name: "Screening assistant",
  technique: "GENERATIVE_AI" as const,
  role: "DEPLOYER" as const,
};

beforeEach(() => H.reset());

describe("department limits never hide a person's own records", () => {
  it("refuses a limit on one's own access", async () => {
    const officer = businessUnitRouter.createCaller(ctxFor("officer"));
    await expect(
      officer.setMemberDepartments({ organizationId: "org-a", memberId: "mem-officer", businessUnitIds: ["dept-hr"] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.db.businessUnitMember.__rows()).toHaveLength(0);
  });

  it("refuses a limit on an owner or an admin", async () => {
    const owner = businessUnitRouter.createCaller(ctxFor("owner"));
    for (const memberId of ["mem-admin"]) {
      await expect(
        owner.setMemberDepartments({ organizationId: "org-a", memberId, businessUnitIds: ["dept-hr"] }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    const admin = businessUnitRouter.createCaller(ctxFor("admin"));
    await expect(
      admin.setMemberDepartments({ organizationId: "org-a", memberId: "mem-owner", businessUnitIds: ["dept-hr"] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("still lets a manager limit an AI officer, a member or a viewer", async () => {
    const owner = businessUnitRouter.createCaller(ctxFor("owner"));
    await owner.setMemberDepartments({ organizationId: "org-a", memberId: "mem-member", businessUnitIds: ["dept-hr"] });
    expect(H.db.businessUnitMember.__rows()).toEqual([
      expect.objectContaining({ memberId: "mem-member", businessUnitId: "dept-hr" }),
    ]);
  });

  it("the reported sequence: an owner's own system stays visible after a stored limit", async () => {
    // A limit stored on the owner before the rule above existed.
    H.db.businessUnitMember.__set([{ businessUnitId: "dept-hr", memberId: "mem-owner" }]);
    const owner = aiSystemRouter.createCaller(ctxFor("owner"));
    const created = await owner.create(NEW_SYSTEM);
    const { items } = await owner.list({ organizationId: "org-a", limit: 50 });
    expect(items.map((i) => i.id)).toContain(created.id);
    await expect(owner.getById({ organizationId: "org-a", id: created.id })).resolves.toMatchObject({
      id: created.id,
    });
  });

  it("places a limited member's new system in their department", async () => {
    H.db.businessUnitMember.__set([{ businessUnitId: "dept-it", memberId: "mem-member" }]);
    const member = aiSystemRouter.createCaller(ctxFor("member"));
    const created = await member.create(NEW_SYSTEM);
    expect(created.businessUnitId).toBe("dept-it");
    const { items } = await member.list({ organizationId: "org-a", limit: 50 });
    expect(items.map((i) => i.id)).toEqual([created.id]);
  });

  it("does not let a limited member move a system out of their departments", async () => {
    H.db.businessUnitMember.__set([{ businessUnitId: "dept-it", memberId: "mem-member" }]);
    const member = aiSystemRouter.createCaller(ctxFor("member"));
    const created = await member.create(NEW_SYSTEM);
    await expect(
      member.update({ organizationId: "org-a", id: created.id, businessUnitId: null }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not let a limited member edit another department's system by id", async () => {
    H.db.aISystem.__set([{ id: "sys-hr", organizationId: "org-a", businessUnitId: "dept-hr", name: "HR tool" }]);
    H.db.businessUnitMember.__set([{ businessUnitId: "dept-it", memberId: "mem-member" }]);
    const member = aiSystemRouter.createCaller(ctxFor("member"));
    await expect(
      member.update({ organizationId: "org-a", id: "sys-hr", name: "Renamed" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.aISystem.__rows()[0].name).toBe("HR tool");
  });
});
