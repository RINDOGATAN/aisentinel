// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The actions on the screens that complete a program path step must write
 * what the step's rule reads (src/components/guided/path-config.ts).
 *
 * - Threat model step: done when a model is past DRAFT. The model's page
 *   offers "Mark as reviewed" and nothing else, so marking a draft reviewed
 *   takes it to ACTIVE. An archived model stays archived.
 * - Review step: done when no drafted item waits for confirmation. Approving
 *   or publishing a drafted policy is a decision by an approver role, so it
 *   also confirms the policy; an earlier confirmation is kept as it was. The
 *   same holds for approving or rejecting an oversight gate.
 * - Evidence step: the requirements of a system can be given one status at
 *   once (approver roles), each change confirmed, one audit entry recorded.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        const ids = (value as { in?: unknown[] }).in;
        if (ids && !ids.includes(row[key])) return false;
        continue;
      }
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
      // A copy, as the database returns: a later update must not change it.
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const row = rows.find((r) => matches(r, where));
        return row ? { ...row } : null;
      },
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
      findMany: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)).map((r) => ({ ...r })),
      // The compound unique key of a compliance mapping (aiSystemId, requirementId).
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { aiSystemId_requirementId: { aiSystemId: string; requirementId: string } };
        create: Row;
        update: Row;
      }) => {
        const key = where.aiSystemId_requirementId;
        const row = rows.find((r) => r.aiSystemId === key.aiSystemId && r.requirementId === key.requirementId);
        if (row) return Object.assign(row, update);
        const created = { id: `gen-${rows.length + 1}`, ...create };
        rows.push(created);
        return created;
      },
    };
  }

  const orgs = [{ id: "org-a", name: "Org A", pilotFirstSignInAt: new Date(0) }];
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
    threatModel: makeTable(),
    aIPolicy: makeTable(),
    aIPolicyVersion: makeTable(),
    auditLog: makeTable(),
    oversightGate: makeTable(),
    oversightDecision: makeTable(),
    aISystem: makeTable(),
    complianceRequirement: makeTable(),
    complianceMapping: makeTable(),
  };

  const EARLIER = { confirmedBy: "earlier-approver", confirmedAt: new Date("2026-01-01") };

  function reset() {
    memberRows.length = 0;
    for (const role of ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER"]) {
      memberRows.push({ organizationId: "org-a", userId: role.toLowerCase(), role });
    }
    db.threatModel.__set([
      { id: "tm-draft", organizationId: "org-a", status: "DRAFT", capabilities: [], reviewedAt: null },
      { id: "tm-archived", organizationId: "org-a", status: "ARCHIVED", capabilities: [], reviewedAt: null },
    ]);
    db.aIPolicy.__set([
      {
        id: "pol-draft",
        organizationId: "org-a",
        status: "DRAFT",
        content: "Text",
        currentVersion: 0,
        reviewIntervalMonths: null,
        provenance: "AUTO_TEMPLATE",
        confirmedBy: null,
        confirmedAt: null,
      },
      {
        id: "pol-confirmed",
        organizationId: "org-a",
        status: "DRAFT",
        content: "Text",
        currentVersion: 0,
        reviewIntervalMonths: null,
        provenance: "AUTO_TEMPLATE",
        ...EARLIER,
      },
    ]);
    db.aIPolicyVersion.__set([]);
    db.auditLog.__set([]);
    const gate = {
      organizationId: "org-a",
      aiSystemId: "sys-1",
      gateType: "PRE_DEPLOYMENT",
      status: "PENDING",
      reviewCadence: null,
      nextReviewDate: null,
      provenance: "AUTO_TEMPLATE",
    };
    db.oversightGate.__set([
      { id: "gate-draft", ...gate, confirmedBy: null, confirmedAt: null },
      { id: "gate-confirmed", ...gate, ...EARLIER },
    ]);
    db.oversightDecision.__set([]);
    db.aISystem.__set([
      { id: "sys-1", organizationId: "org-a" },
      { id: "sys-other", organizationId: "org-b" },
    ]);
    db.complianceRequirement.__set([{ id: "req-1" }, { id: "req-2" }, { id: "req-3" }, { id: "req-4" }]);
    db.complianceMapping.__set([
      { id: "map-1", organizationId: "org-a", aiSystemId: "sys-1", requirementId: "req-1", status: "NOT_ASSESSED" },
      { id: "map-2", organizationId: "org-a", aiSystemId: "sys-1", requirementId: "req-2", status: "COMPLIANT" },
    ]);
  }

  return { db, reset, EARLIER };
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
import { threatModelRouter } from "@/server/routers/governance/threatModel";
import { policyRouter } from "@/server/routers/governance/policy";
import { oversightRouter } from "@/server/routers/governance/oversight";
import { complianceRouter } from "@/server/routers/governance/compliance";
import { AI_SENTINEL_PATH, EMPTY_PATH_COUNTS } from "@/components/guided/path-config";
import { evaluatePath } from "@/components/guided/path";

function ctxAs(userId: string) {
  const session = {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return createInnerTRPCContext({ session, getCookie: () => undefined });
}

const org = "org-a";
const threatModel = (id: string) => H.db.threatModel.__rows().find((r) => r.id === id)!;
const policy = (id: string) => H.db.aIPolicy.__rows().find((r) => r.id === id)!;

beforeEach(() => H.reset());

describe("threat model: Mark as reviewed completes the step", () => {
  it("takes a draft model to ACTIVE and records the review", async () => {
    await threatModelRouter
      .createCaller(ctxAs("member"))
      .update({ organizationId: org, id: "tm-draft", markReviewed: true });
    const row = threatModel("tm-draft");
    expect(row.status).toBe("ACTIVE");
    expect(row.reviewedAt).toBeInstanceOf(Date);
    const audit = H.db.auditLog.__rows()[0];
    expect(audit.changes).toMatchObject({ statusBefore: "DRAFT", statusAfter: "ACTIVE", reviewed: true });

    // What the step reads: one model past draft.
    const statuses = evaluatePath(AI_SENTINEL_PATH, {
      ...EMPTY_PATH_COUNTS,
      providerSystems: 1,
      threatModels: 1,
      threatModelsActive: 1,
    });
    expect(statuses.threatModel).toBe("done");
  });

  it("leaves an archived model archived", async () => {
    await threatModelRouter
      .createCaller(ctxAs("member"))
      .update({ organizationId: org, id: "tm-archived", markReviewed: true });
    expect(threatModel("tm-archived").status).toBe("ARCHIVED");
    expect(threatModel("tm-archived").reviewedAt).toBeInstanceOf(Date);
  });

  it("an edit that is not a review leaves a draft in draft", async () => {
    await threatModelRouter
      .createCaller(ctxAs("member"))
      .update({ organizationId: org, id: "tm-draft", name: "Renamed" });
    expect(threatModel("tm-draft").status).toBe("DRAFT");
  });
});

describe("policy: approving or publishing a drafted policy confirms it", () => {
  it("approve confirms an unconfirmed policy", async () => {
    await policyRouter.createCaller(ctxAs("ai_officer")).approve({ organizationId: org, id: "pol-draft" });
    const row = policy("pol-draft");
    expect(row.status).toBe("APPROVED");
    expect(row.confirmedBy).toBe("ai_officer");
    expect(row.confirmedAt).toBeInstanceOf(Date);
    expect(row.provenance).toBe("AUTO_TEMPLATE");
  });

  it("publish confirms an unconfirmed policy", async () => {
    await policyRouter.createCaller(ctxAs("admin")).publishVersion({ organizationId: org, id: "pol-draft" });
    const row = policy("pol-draft");
    expect(row.status).toBe("PUBLISHED");
    expect(row.confirmedBy).toBe("admin");
    expect(row.confirmedAt).toBeInstanceOf(Date);
  });

  it("keeps an earlier confirmation as it was", async () => {
    await policyRouter.createCaller(ctxAs("owner")).approve({ organizationId: org, id: "pol-confirmed" });
    const row = policy("pol-confirmed");
    expect(row.confirmedBy).toBe(H.EARLIER.confirmedBy);
    expect(row.confirmedAt).toEqual(H.EARLIER.confirmedAt);
  });

  it("a member still cannot approve, so nothing is confirmed", async () => {
    await expect(
      policyRouter.createCaller(ctxAs("member")).approve({ organizationId: org, id: "pol-draft" }),
    ).rejects.toThrow();
    expect(policy("pol-draft").confirmedAt).toBeNull();
  });
});

const gate = (id: string) => H.db.oversightGate.__rows().find((r) => r.id === id)!;
const mapping = (requirementId: string) =>
  H.db.complianceMapping.__rows().find((r) => r.aiSystemId === "sys-1" && r.requirementId === requirementId);

describe("oversight: an approver's decision confirms the gate", () => {
  for (const decision of ["APPROVE", "REJECT"] as const) {
    it(`${decision} confirms an unconfirmed gate and the audit entry records it`, async () => {
      await oversightRouter
        .createCaller(ctxAs("ai_officer"))
        .addDecision({ organizationId: org, gateId: "gate-draft", decision, rationale: "Reviewed." });
      const row = gate("gate-draft");
      expect(row.status).toBe(decision === "APPROVE" ? "PASSED" : "FAILED");
      expect(row.confirmedBy).toBe("ai_officer");
      expect(row.confirmedAt).toBeInstanceOf(Date);
      expect(row.provenance).toBe("AUTO_TEMPLATE");
      expect(H.db.auditLog.__rows()[0].changes).toMatchObject({ gateId: "gate-draft", gateConfirmed: true });
    });
  }

  it("deferring decides nothing, so it confirms nothing", async () => {
    await oversightRouter
      .createCaller(ctxAs("admin"))
      .addDecision({ organizationId: org, gateId: "gate-draft", decision: "DEFER", rationale: "Later." });
    expect(gate("gate-draft").confirmedAt).toBeNull();
    expect(H.db.auditLog.__rows()[0].changes).toMatchObject({ gateConfirmed: false });
  });

  it("keeps an earlier confirmation as it was", async () => {
    await oversightRouter
      .createCaller(ctxAs("owner"))
      .addDecision({ organizationId: org, gateId: "gate-confirmed", decision: "APPROVE", rationale: "Fine." });
    expect(gate("gate-confirmed").confirmedBy).toBe(H.EARLIER.confirmedBy);
    expect(gate("gate-confirmed").confirmedAt).toEqual(H.EARLIER.confirmedAt);
    expect(H.db.auditLog.__rows()[0].changes).toMatchObject({ gateConfirmed: false });
  });

  it("a member still cannot decide, so nothing is confirmed", async () => {
    await expect(
      oversightRouter
        .createCaller(ctxAs("member"))
        .addDecision({ organizationId: org, gateId: "gate-draft", decision: "APPROVE", rationale: "x" }),
    ).rejects.toThrow();
    expect(gate("gate-draft").confirmedAt).toBeNull();
  });
});

describe("evidence: several requirements given one status at once", () => {
  it("sets every requirement without a status to not applicable, confirmed, with one audit entry", async () => {
    const res = await complianceRouter.createCaller(ctxAs("ai_officer")).bulkSetStatus({
      organizationId: org,
      aiSystemId: "sys-1",
      requirementIds: ["req-1", "req-2", "req-3"],
      status: "NOT_APPLICABLE",
      onlyUnset: true,
    });
    // req-2 already has a status and is left as it was; req-3 had no mapping yet.
    expect(res.updated).toBe(2);
    expect(mapping("req-1")).toMatchObject({ status: "NOT_APPLICABLE", confirmedBy: "ai_officer", assessedBy: "ai_officer" });
    expect(mapping("req-2")?.status).toBe("COMPLIANT");
    expect(mapping("req-3")).toMatchObject({ status: "NOT_APPLICABLE", organizationId: org });
    const audit = H.db.auditLog.__rows();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ entityType: "AISystem", entityId: "sys-1", action: "BULK_SET_REQUIREMENT_STATUS" });
    expect(audit[0].changes).toMatchObject({ status: "NOT_APPLICABLE", updated: 2, requirementIds: ["req-1", "req-3"] });
  });

  it("sets the selected requirements to an assessed status, whatever they held", async () => {
    const res = await complianceRouter.createCaller(ctxAs("owner")).bulkSetStatus({
      organizationId: org,
      aiSystemId: "sys-1",
      requirementIds: ["req-1", "req-2", "req-unknown"],
      status: "PARTIALLY_COMPLIANT",
    });
    expect(res.updated).toBe(2);
    expect(mapping("req-1")?.status).toBe("PARTIALLY_COMPLIANT");
    expect(mapping("req-2")?.status).toBe("PARTIALLY_COMPLIANT");
    // An id that is no requirement is ignored.
    expect(mapping("req-unknown")).toBeUndefined();
  });

  it("refuses a member, and changes nothing", async () => {
    await expect(
      complianceRouter.createCaller(ctxAs("member")).bulkSetStatus({
        organizationId: org,
        aiSystemId: "sys-1",
        requirementIds: ["req-1"],
        status: "NOT_APPLICABLE",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mapping("req-1")?.status).toBe("NOT_ASSESSED");
    expect(H.db.auditLog.__rows()).toHaveLength(0);
  });

  it("refuses a system of another organisation", async () => {
    await expect(
      complianceRouter.createCaller(ctxAs("admin")).bulkSetStatus({
        organizationId: org,
        aiSystemId: "sys-other",
        requirementIds: ["req-1"],
        status: "NOT_APPLICABLE",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cannot set NOT_ASSESSED: a bulk action only records a decision", async () => {
    await expect(
      complianceRouter.createCaller(ctxAs("admin")).bulkSetStatus({
        organizationId: org,
        aiSystemId: "sys-1",
        requirementIds: ["req-2"],
        status: "NOT_ASSESSED" as never,
      }),
    ).rejects.toThrow();
    expect(mapping("req-2")?.status).toBe("COMPLIANT");
  });
});
