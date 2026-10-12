// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Authorization hardening, through the real routers over an in-memory fake.
 *
 *   - Decision statuses (policy APPROVED/PUBLISHED, gate PASSED/FAILED/DEFERRED)
 *     need the same roles through `update` as through the dedicated actions;
 *     the working statuses stay open to every writer.
 *   - Create paths that link an AI system (oversight gate, incident,
 *     assessment) or a template (assessment) check that it is the
 *     organization's own (or, for a template, a system template).
 *   - Billing actions are for owners and admins.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  // Scalar keys must be equal; an OR of scalar alternatives must match one.
  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (key === "OR" && Array.isArray(value)) {
        if (!value.some((alt) => matches(row, alt as Record<string, unknown>))) return false;
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) continue;
      if (row[key] !== value) return false;
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
    aIPolicy: makeTable(),
    aIPolicyVersion: makeTable(),
    oversightGate: makeTable(),
    oversightDecision: makeTable(),
    aIIncident: makeTable(),
    aIIncidentTimeline: makeTable(),
    aIAssessment: makeTable(),
    aIAssessmentTemplate: makeTable(),
    customerOrganization: makeTable(),
    skillEntitlement: makeTable(),
    auditLog: makeTable(),
  };

  function reset() {
    memberRows.length = 0;
    for (const role of ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"]) {
      memberRows.push({ organizationId: "org-a", userId: role.toLowerCase(), role });
    }
    db.aISystem.__set([
      { id: "sys-a", organizationId: "org-a", name: "A System" },
      { id: "sys-b", organizationId: "org-b", name: "B System" },
    ]);
    db.aIPolicy.__set([
      { id: "pol-a", organizationId: "org-a", title: "Policy", status: "UNDER_REVIEW", content: "x", currentVersion: 0 },
    ]);
    db.oversightGate.__set([
      { id: "gate-a", organizationId: "org-a", aiSystemId: "sys-a", status: "IN_REVIEW", gateType: "PRE_DEPLOYMENT" },
    ]);
    db.aIAssessmentTemplate.__set([
      { id: "tpl-system", organizationId: null, isSystem: true },
      { id: "tpl-a", organizationId: "org-a", isSystem: false },
      { id: "tpl-b", organizationId: "org-b", isSystem: false },
    ]);
    for (const t of [db.aIPolicyVersion, db.oversightDecision, db.aIIncident, db.aIIncidentTimeline, db.aIAssessment, db.customerOrganization, db.skillEntitlement, db.auditLog]) {
      t.__set([]);
    }
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
vi.mock("@/server/services/licensing/entitlement", () => ({
  checkAssessmentEntitlement: async () => ({ entitled: true }),
  getEntitledAssessmentTypes: async () => [],
}));
const stripe = vi.hoisted(() => ({
  retrieve: vi.fn(async () => ({ payment_status: "unpaid" })),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: stripe.retrieve } } }),
  getSubscription: vi.fn(),
  removeSubscriptionItem: vi.fn(),
}));

import { createInnerTRPCContext } from "@/server/trpc";
import { policyRouter } from "@/server/routers/governance/policy";
import { oversightRouter } from "@/server/routers/governance/oversight";
import { incidentRouter } from "@/server/routers/governance/incident";
import { assessmentRouter } from "@/server/routers/governance/assessment";
import { billingRouter } from "@/server/routers/billing";

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
  stripe.retrieve.mockClear();
});

describe("policy.update: decision statuses need the approver roles", () => {
  for (const status of ["APPROVED", "PUBLISHED"] as const) {
    it(`a member cannot set ${status}`, async () => {
      const caller = policyRouter.createCaller(ctxAs("member"));
      await expect(caller.update({ organizationId: org, id: "pol-a", status })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(H.db.aIPolicy.__rows()[0].status).toBe("UNDER_REVIEW");
    });

    it(`an AI officer may set ${status}`, async () => {
      const caller = policyRouter.createCaller(ctxAs("ai_officer"));
      await caller.update({ organizationId: org, id: "pol-a", status });
      expect(H.db.aIPolicy.__rows()[0].status).toBe(status);
    });
  }

  it("a member may still submit, archive and revise", async () => {
    const caller = policyRouter.createCaller(ctxAs("member"));
    for (const status of ["DRAFT", "UNDER_REVIEW", "ARCHIVED"] as const) {
      await caller.update({ organizationId: org, id: "pol-a", status });
      expect(H.db.aIPolicy.__rows()[0].status).toBe(status);
    }
  });

  it("approve keeps its role check", async () => {
    const caller = policyRouter.createCaller(ctxAs("member"));
    await expect(caller.approve({ organizationId: org, id: "pol-a" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("oversight.update: decision statuses need the decider roles", () => {
  for (const status of ["PASSED", "FAILED", "DEFERRED"] as const) {
    it(`a member cannot set ${status}`, async () => {
      const caller = oversightRouter.createCaller(ctxAs("member"));
      await expect(caller.update({ organizationId: org, id: "gate-a", status })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(H.db.oversightGate.__rows()[0].status).toBe("IN_REVIEW");
    });
  }

  it("an admin may set PASSED", async () => {
    const caller = oversightRouter.createCaller(ctxAs("admin"));
    await caller.update({ organizationId: org, id: "gate-a", status: "PASSED" });
    expect(H.db.oversightGate.__rows()[0].status).toBe("PASSED");
  });

  it("a member may still reopen a gate or put it in review", async () => {
    const caller = oversightRouter.createCaller(ctxAs("member"));
    await caller.update({ organizationId: org, id: "gate-a", status: "PENDING" });
    expect(H.db.oversightGate.__rows()[0].status).toBe("PENDING");
    await caller.update({ organizationId: org, id: "gate-a", status: "IN_REVIEW" });
    expect(H.db.oversightGate.__rows()[0].status).toBe("IN_REVIEW");
  });
});

describe("create paths check the linked AI system", () => {
  it("oversight.create refuses another organization's system", async () => {
    const caller = oversightRouter.createCaller(ctxAs("member"));
    await expect(
      caller.create({ organizationId: org, aiSystemId: "sys-b", gateType: "PRE_DEPLOYMENT" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.oversightGate.__rows()).toHaveLength(1);
  });

  it("oversight.create accepts the organization's own system", async () => {
    const caller = oversightRouter.createCaller(ctxAs("member"));
    await caller.create({ organizationId: org, aiSystemId: "sys-a", gateType: "PRE_DEPLOYMENT" });
    expect(H.db.oversightGate.__rows()).toHaveLength(2);
  });

  it("incident.create refuses another organization's system", async () => {
    const caller = incidentRouter.createCaller(ctxAs("member"));
    await expect(
      caller.create({
        organizationId: org,
        aiSystemId: "sys-b",
        title: "t",
        description: "d",
        type: "OTHER",
        severity: "LOW",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.aIIncident.__rows()).toHaveLength(0);
  });

  it("incident.create still works with no system, or with the organization's own", async () => {
    const caller = incidentRouter.createCaller(ctxAs("member"));
    const base = { organizationId: org, title: "t", description: "d", type: "OTHER" as const, severity: "LOW" as const };
    await caller.create(base);
    await caller.create({ ...base, aiSystemId: "sys-a" });
    expect(H.db.aIIncident.__rows()).toHaveLength(2);
  });

  it("assessment.create refuses another organization's system", async () => {
    const caller = assessmentRouter.createCaller(ctxAs("member"));
    await expect(
      caller.create({ organizationId: org, aiSystemId: "sys-b", templateId: "tpl-system", title: "t", type: "AI_RISK" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.aIAssessment.__rows()).toHaveLength(0);
  });

  it("assessment.create refuses another organization's template", async () => {
    const caller = assessmentRouter.createCaller(ctxAs("member"));
    await expect(
      caller.create({ organizationId: org, aiSystemId: "sys-a", templateId: "tpl-b", title: "t", type: "AI_RISK" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(H.db.aIAssessment.__rows()).toHaveLength(0);
  });

  it("assessment.create accepts a system template or the organization's own", async () => {
    const caller = assessmentRouter.createCaller(ctxAs("member"));
    await caller.create({ organizationId: org, aiSystemId: "sys-a", templateId: "tpl-system", title: "t", type: "AI_RISK" });
    await caller.create({ organizationId: org, aiSystemId: "sys-a", templateId: "tpl-a", title: "t", type: "AI_RISK" });
    expect(H.db.aIAssessment.__rows()).toHaveLength(2);
  });
});

describe("billing actions are for owners and admins", () => {
  for (const user of ["viewer", "member", "ai_officer"]) {
    it(`${user}: cancelFeature and verifyCheckout are refused`, async () => {
      const caller = billingRouter.createCaller(ctxAs(user));
      await expect(
        caller.cancelFeature({ organizationId: org, entitlementId: "ent-1" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.verifyCheckout({ organizationId: org, sessionId: "cs_1" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(stripe.retrieve).not.toHaveBeenCalled();
    });
  }

  for (const user of ["owner", "admin"]) {
    it(`${user}: passes the role check`, async () => {
      const caller = billingRouter.createCaller(ctxAs(user));
      // No billing customer in the fixture: the call gets past the role check.
      await expect(
        caller.cancelFeature({ organizationId: org, entitlementId: "ent-1" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(caller.verifyCheckout({ organizationId: org, sessionId: "cs_1" })).resolves.toMatchObject({
        activated: false,
      });
    });
  }

  it("every member may still read the billing page", async () => {
    const caller = billingRouter.createCaller(ctxAs("viewer"));
    await expect(caller.getSubscriptionStatus({ organizationId: org })).resolves.toMatchObject({ hasCustomer: false });
  });
});
