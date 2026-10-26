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
 *   also confirms the policy; an earlier confirmation is kept as it was.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
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
