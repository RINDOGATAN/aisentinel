// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Linked ids on update paths, and the AIUC-1 applicability decision, through
 * the real routers over an in-memory fake.
 *
 *   - aiSystem.create/update (vendorId), dataFlow.updateRecipient (vendorId),
 *     sensitiveData.update (aiSystemId) and shadowAi.updateReport
 *     (registeredSystemId) accept only the organization's own rows.
 *   - compliance.updateMapping may not rule an AIUC-1 requirement out, or
 *     back in, for a role that aiuc1.setApplicability would refuse.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (key === "aiSystemId_requirementId" && value && typeof value === "object") {
        const v = value as Row;
        if (row.aiSystemId !== v.aiSystemId || row.requirementId !== v.requirementId) return false;
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) continue;
      if (row[key] !== value) return false;
    }
    return true;
  }

  function makeTable() {
    let rows: Row[] = [];
    const t = {
      __set(next: Row[]) {
        rows = next.map((r) => ({ ...r }));
      },
      __rows: () => rows,
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((r) => matches(r, where)) ?? null,
      findUnique: async ({ where }: { where: Record<string, unknown> }) =>
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
      update: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
        const row = rows.find((r) => matches(r, where));
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      upsert: async ({ where, create, update }: { where: Record<string, unknown>; create: Row; update: Row }) => {
        const existing = rows.find((r) => matches(r, where));
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `gen-${rows.length + 1}`, ...create };
        rows.push(row);
        return row;
      },
    };
    return t;
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
    sensitiveDataAssessment: makeTable(),
    shadowAIReport: makeTable(),
    complianceRequirement: makeTable(),
    complianceMapping: makeTable(),
    businessUnit: makeTable(),
    businessUnitMember: makeTable(),
    auditLog: makeTable(),
  };

  function reset() {
    memberRows.length = 0;
    memberRows.push(
      { id: "m-member", organizationId: "org-a", userId: "member", role: "MEMBER" },
      { id: "m-officer", organizationId: "org-a", userId: "ai_officer", role: "AI_OFFICER" },
    );
    db.aISystem.__set([
      { id: "sys-a", organizationId: "org-a", name: "A System", metadata: null },
      { id: "sys-b", organizationId: "org-b", name: "B System", metadata: null },
    ]);
    db.aIVendor.__set([
      { id: "ven-a", organizationId: "org-a", name: "A Vendor" },
      { id: "ven-b", organizationId: "org-b", name: "B Vendor" },
    ]);
    db.dataRecipient.__set([{ id: "rec-a", organizationId: "org-a", name: "Recipient", vendorId: null }]);
    db.sensitiveDataAssessment.__set([{ id: "sda-a", organizationId: "org-a", factors: {}, aiSystemId: null }]);
    db.shadowAIReport.__set([{ id: "rep-a", organizationId: "org-a", status: "APPROVED", registeredSystemId: null }]);
    // Only the AIUC-1 requirement is seeded as such: the fake ignores the
    // framework filter, so an unseeded id stands for any other framework's.
    db.complianceRequirement.__set([{ id: "aiuc1-a001" }]);
    db.complianceMapping.__set([]);
    for (const t of [db.businessUnit, db.businessUnitMember, db.auditLog]) t.__set([]);
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
vi.mock("@/server/services/licensing/entitlement", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/services/licensing/entitlement")>();
  return { ...original, hasShadowAiAccess: async () => true };
});

import { createInnerTRPCContext } from "@/server/trpc";
import { aiSystemRouter } from "@/server/routers/governance/aiSystem";
import { dataFlowRouter } from "@/server/routers/governance/dataFlow";
import { sensitiveDataRouter } from "@/server/routers/governance/sensitiveData";
import { shadowAiRouter } from "@/server/routers/governance/shadowAi";
import { complianceRouter } from "@/server/routers/governance/compliance";

function ctxAs(userId: string) {
  const session = {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return createInnerTRPCContext({ session, getCookie: () => undefined });
}

const org = "org-a";

beforeEach(() => {
  H.reset();
});

describe("vendor links", () => {
  it("aiSystem.create refuses another organization's vendor", async () => {
    const caller = aiSystemRouter.createCaller(ctxAs("member"));
    await expect(
      caller.create({ organizationId: org, name: "New", technique: "NLP", role: "DEPLOYER", vendorId: "ven-b" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.aISystem.__rows()).toHaveLength(2);
  });

  it("aiSystem.create accepts the organization's own vendor", async () => {
    const caller = aiSystemRouter.createCaller(ctxAs("member"));
    await caller.create({ organizationId: org, name: "New", technique: "NLP", role: "DEPLOYER", vendorId: "ven-a" });
    expect(H.db.aISystem.__rows()).toHaveLength(3);
  });

  it("aiSystem.update refuses another organization's vendor, and still clears one", async () => {
    const caller = aiSystemRouter.createCaller(ctxAs("member"));
    await expect(caller.update({ organizationId: org, id: "sys-a", vendorId: "ven-b" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(H.db.aISystem.__rows()[0].vendorId).toBeUndefined();
    await caller.update({ organizationId: org, id: "sys-a", vendorId: null });
    expect(H.db.aISystem.__rows()[0].vendorId).toBeNull();
  });

  it("dataFlow.updateRecipient refuses another organization's vendor", async () => {
    const caller = dataFlowRouter.createCaller(ctxAs("member"));
    await expect(
      caller.updateRecipient({ organizationId: org, id: "rec-a", vendorId: "ven-b" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.dataRecipient.__rows()[0].vendorId).toBeNull();
  });
});

describe("AI system links", () => {
  it("sensitiveData.update refuses another organization's system", async () => {
    const caller = sensitiveDataRouter.createCaller(ctxAs("member"));
    await expect(
      caller.update({ organizationId: org, id: "sda-a", aiSystemId: "sys-b" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.sensitiveDataAssessment.__rows()[0].aiSystemId).toBeNull();
  });

  it("shadowAi.updateReport refuses another organization's system", async () => {
    const caller = shadowAiRouter.createCaller(ctxAs("member"));
    await expect(
      caller.updateReport({ organizationId: org, id: "rep-a", status: "REGISTERED", registeredSystemId: "sys-b" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.shadowAIReport.__rows()[0].status).toBe("APPROVED");
  });
});

describe("compliance.updateMapping and AIUC-1 applicability", () => {
  const base = { organizationId: org, aiSystemId: "sys-a" };

  it("a member cannot mark an AIUC-1 requirement not applicable", async () => {
    const caller = complianceRouter.createCaller(ctxAs("member"));
    await expect(
      caller.updateMapping({ ...base, requirementId: "aiuc1-a001", status: "NOT_APPLICABLE" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.db.complianceMapping.__rows()).toHaveLength(0);
  });

  it("a member cannot bring a ruled-out AIUC-1 requirement back", async () => {
    H.db.complianceMapping.__set([
      { id: "map-1", organizationId: org, aiSystemId: "sys-a", requirementId: "aiuc1-a001", status: "NOT_APPLICABLE" },
    ]);
    const caller = complianceRouter.createCaller(ctxAs("member"));
    await expect(
      caller.updateMapping({ ...base, requirementId: "aiuc1-a001", status: "NOT_ASSESSED" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.db.complianceMapping.__rows()[0].status).toBe("NOT_APPLICABLE");
  });

  it("a member may still record an AIUC-1 status other than not applicable", async () => {
    const caller = complianceRouter.createCaller(ctxAs("member"));
    await caller.updateMapping({ ...base, requirementId: "aiuc1-a001", status: "PARTIALLY_COMPLIANT" });
    expect(H.db.complianceMapping.__rows()[0].status).toBe("PARTIALLY_COMPLIANT");
  });

  it("a member may still mark another framework's requirement not applicable", async () => {
    const caller = complianceRouter.createCaller(ctxAs("member"));
    await caller.updateMapping({ ...base, requirementId: "eu-ai-act-art9", status: "NOT_APPLICABLE" });
    expect(H.db.complianceMapping.__rows()[0].status).toBe("NOT_APPLICABLE");
  });

  it("an AI officer may mark an AIUC-1 requirement not applicable", async () => {
    const caller = complianceRouter.createCaller(ctxAs("ai_officer"));
    await caller.updateMapping({ ...base, requirementId: "aiuc1-a001", status: "NOT_APPLICABLE" });
    expect(H.db.complianceMapping.__rows()[0].status).toBe("NOT_APPLICABLE");
  });
});
