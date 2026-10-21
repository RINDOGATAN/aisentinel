// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Deleting register records, through the real routers over an in-memory fake:
 * AI systems, vendors, draft assessments, policies and oversight gates.
 *
 *   - Owners and admins only; AI officers, members and viewers are refused
 *     and nothing is deleted.
 *   - Org scoping: another organization's record answers NOT_FOUND.
 *   - A legal hold in force (organisation-wide, or on the record's system)
 *     refuses the deletion; a hold on another system does not.
 *   - An assessment can be deleted only before it is submitted.
 *   - A vendor still named by an AI system is refused.
 *   - Every deletion writes a DELETE audit entry.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  // Scalar keys must be equal (undefined means "no filter", as in Prisma);
  // an OR of alternatives must match one; nested filters are ignored.
  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      if (key === "OR" && Array.isArray(value)) {
        if (!value.some((alt) => matches(row, alt as Record<string, unknown>))) return false;
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) continue;
      if ((row[key] ?? null) !== value) return false;
    }
    return true;
  }

  function makeTable() {
    let rows: Row[] = [];
    return {
      __set(next: Row[]) {
        rows = next.map((r) => ({ ...r }));
      },
      __rows: () => rows,
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((r) => matches(r, where)) ?? null,
      findMany: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)),
      count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)).length,
      create: async ({ data }: { data: Row }) => {
        const row = { id: `gen-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = rows.length;
        rows = rows.filter((r) => !matches(r, where));
        return { count: before - rows.length };
      },
    };
  }

  const orgs = [
    { id: "org-a", name: "Org A", pilotFirstSignInAt: new Date(0) },
    { id: "org-b", name: "Org B", pilotFirstSignInAt: new Date(0) },
  ];
  const memberRows: Row[] = [];

  const db = {
    organizationMember: {
      findUnique: async ({
        where,
      }: {
        where: { organizationId_userId: { organizationId: string; userId: string } };
      }) => {
        const key = where.organizationId_userId;
        const m = memberRows.find(
          (r) => r.organizationId === key.organizationId && r.userId === key.userId,
        );
        return m ? { ...m, organization: orgs.find((o) => o.id === m.organizationId) } : null;
      },
    },
    aISystem: makeTable(),
    aIVendor: makeTable(),
    dataRecipient: makeTable(),
    aIAssessment: makeTable(),
    aIPolicy: makeTable(),
    oversightGate: makeTable(),
    legalHold: makeTable(),
    auditLog: makeTable(),
  };

  function reset() {
    memberRows.length = 0;
    for (const role of ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"]) {
      memberRows.push({ organizationId: "org-a", userId: role.toLowerCase(), role });
    }
    db.aISystem.__set([
      { id: "sys-a", organizationId: "org-a", name: "A System", vendorId: null },
      { id: "sys-a2", organizationId: "org-a", name: "Other System", vendorId: null },
      { id: "sys-b", organizationId: "org-b", name: "B System", vendorId: null },
    ]);
    db.aIVendor.__set([
      { id: "ven-a", organizationId: "org-a", name: "Vendor A" },
      { id: "ven-b", organizationId: "org-b", name: "Vendor B" },
    ]);
    db.aIAssessment.__set([
      { id: "asm-a", organizationId: "org-a", aiSystemId: "sys-a", title: "Draft", status: "DRAFT", submittedAt: null },
      { id: "asm-b", organizationId: "org-b", aiSystemId: "sys-b", title: "Draft", status: "DRAFT", submittedAt: null },
    ]);
    db.aIPolicy.__set([
      { id: "pol-a", organizationId: "org-a", title: "Policy", status: "PUBLISHED", systemLinks: [{ aiSystemId: "sys-a" }] },
      { id: "pol-b", organizationId: "org-b", title: "Policy", status: "DRAFT", systemLinks: [] },
    ]);
    db.oversightGate.__set([
      { id: "gate-a", organizationId: "org-a", aiSystemId: "sys-a", gateType: "PRE_DEPLOYMENT", status: "PASSED" },
      { id: "gate-b", organizationId: "org-b", aiSystemId: "sys-b", gateType: "PRE_DEPLOYMENT", status: "PENDING" },
    ]);
    for (const t of [db.dataRecipient, db.legalHold, db.auditLog]) t.__set([]);
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
vi.mock("@/server/services/pilot/first-sign-in", () => ({
  ensurePilotFirstSignIn: async (_db: unknown, org: { pilotFirstSignInAt: Date | null }) => org.pilotFirstSignInAt,
}));

import { createInnerTRPCContext } from "@/server/trpc";
import { aiSystemRouter } from "@/server/routers/governance/aiSystem";
import { vendorRouter } from "@/server/routers/governance/vendor";
import { assessmentRouter } from "@/server/routers/governance/assessment";
import { policyRouter } from "@/server/routers/governance/policy";
import { oversightRouter } from "@/server/routers/governance/oversight";

function ctxAs(userId: string) {
  const session = {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return createInnerTRPCContext({ session, getCookie: () => undefined });
}

const org = "org-a";

type Case = {
  name: string;
  entityType: string;
  table: { __rows: () => Record<string, unknown>[] };
  ownId: string;
  otherOrgId: string;
  del: (user: string, id: string) => Promise<unknown>;
};

const cases: Case[] = [
  {
    name: "aiSystem.delete",
    entityType: "AISystem",
    table: H.db.aISystem,
    ownId: "sys-a",
    otherOrgId: "sys-b",
    del: (user, id) => aiSystemRouter.createCaller(ctxAs(user)).delete({ organizationId: org, id }),
  },
  {
    name: "vendor.delete",
    entityType: "AIVendor",
    table: H.db.aIVendor,
    ownId: "ven-a",
    otherOrgId: "ven-b",
    del: (user, id) => vendorRouter.createCaller(ctxAs(user)).delete({ organizationId: org, id }),
  },
  {
    name: "assessment.delete",
    entityType: "AIAssessment",
    table: H.db.aIAssessment,
    ownId: "asm-a",
    otherOrgId: "asm-b",
    del: (user, id) => assessmentRouter.createCaller(ctxAs(user)).delete({ organizationId: org, id }),
  },
  {
    name: "policy.delete",
    entityType: "AIPolicy",
    table: H.db.aIPolicy,
    ownId: "pol-a",
    otherOrgId: "pol-b",
    del: (user, id) => policyRouter.createCaller(ctxAs(user)).delete({ organizationId: org, id }),
  },
  {
    name: "oversight.delete",
    entityType: "OversightGate",
    table: H.db.oversightGate,
    ownId: "gate-a",
    otherOrgId: "gate-b",
    del: (user, id) => oversightRouter.createCaller(ctxAs(user)).delete({ organizationId: org, id }),
  },
];

const has = (c: Case, id: string) => c.table.__rows().some((r) => r.id === id);

function hold(aiSystemId: string | null) {
  H.db.legalHold.__set([
    { id: "hold-1", organizationId: org, aiSystemId, matter: "Matter 1", releasedAt: null, issuedAt: new Date() },
  ]);
}

beforeEach(() => {
  H.reset();
});

for (const c of cases) {
  describe(c.name, () => {
    for (const user of ["ai_officer", "member", "viewer"]) {
      it(`refuses ${user} and deletes nothing`, async () => {
        await expect(c.del(user, c.ownId)).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(has(c, c.ownId)).toBe(true);
        expect(H.db.auditLog.__rows()).toHaveLength(0);
      });
    }

    for (const user of ["owner", "admin"]) {
      it(`lets ${user} delete it and writes a DELETE audit entry`, async () => {
        await c.del(user, c.ownId);
        expect(has(c, c.ownId)).toBe(false);
        expect(H.db.auditLog.__rows()).toEqual([
          expect.objectContaining({
            organizationId: org,
            userId: user,
            entityType: c.entityType,
            entityId: c.ownId,
            action: "DELETE",
          }),
        ]);
      });
    }

    it("answers NOT_FOUND for another organization's record and leaves it", async () => {
      await expect(c.del("owner", c.otherOrgId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(has(c, c.otherOrgId)).toBe(true);
    });

    it("is refused by an organisation-wide legal hold", async () => {
      hold(null);
      await expect(c.del("owner", c.ownId)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(has(c, c.ownId)).toBe(true);
      expect(H.db.auditLog.__rows()).toHaveLength(0);
    });

    it("is not refused by a hold on another system", async () => {
      hold("sys-a2");
      await c.del("owner", c.ownId);
      expect(has(c, c.ownId)).toBe(false);
    });
  });
}

describe("a hold on the record's own system refuses the deletion", () => {
  for (const c of cases.filter((x) => x.name !== "vendor.delete")) {
    it(c.name, async () => {
      hold("sys-a");
      await expect(c.del("owner", c.ownId)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(has(c, c.ownId)).toBe(true);
    });
  }
});

describe("assessment.delete: only before submission", () => {
  for (const status of ["UNDER_REVIEW", "APPROVED", "REJECTED"]) {
    it(`refuses a ${status} assessment`, async () => {
      H.db.aIAssessment.__set([
        { id: "asm-a", organizationId: org, aiSystemId: "sys-a", title: "T", status, submittedAt: new Date() },
      ]);
      await expect(
        assessmentRouter.createCaller(ctxAs("owner")).delete({ organizationId: org, id: "asm-a" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(H.db.aIAssessment.__rows()).toHaveLength(1);
    });
  }

  it("deletes an IN_PROGRESS assessment that was never submitted", async () => {
    H.db.aIAssessment.__set([
      { id: "asm-a", organizationId: org, aiSystemId: "sys-a", title: "T", status: "IN_PROGRESS", submittedAt: null },
    ]);
    await assessmentRouter.createCaller(ctxAs("admin")).delete({ organizationId: org, id: "asm-a" });
    expect(H.db.aIAssessment.__rows()).toHaveLength(0);
  });
});

describe("vendor.delete: links to systems and data recipients", () => {
  it("refuses a vendor still named by an AI system", async () => {
    H.db.aISystem.__set([{ id: "sys-a", organizationId: org, name: "A", vendorId: "ven-a" }]);
    await expect(
      vendorRouter.createCaller(ctxAs("owner")).delete({ organizationId: org, id: "ven-a" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.db.aIVendor.__rows().some((r) => r.id === "ven-a")).toBe(true);
  });

  it("refuses when a data recipient naming it belongs to a system on hold", async () => {
    H.db.dataRecipient.__set([{ id: "rec-1", organizationId: org, aiSystemId: "sys-a", vendorId: "ven-a" }]);
    hold("sys-a");
    await expect(
      vendorRouter.createCaller(ctxAs("owner")).delete({ organizationId: org, id: "ven-a" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.db.aIVendor.__rows().some((r) => r.id === "ven-a")).toBe(true);
  });
});
