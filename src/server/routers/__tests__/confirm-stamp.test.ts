// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The confirmed stamp on the ordinary update paths (O14).
 *
 * Confirming is an approval (provenance.confirm: Owner, Admin, AI Officer).
 * The ordinary updates of the five confirmable records follow the same rule:
 * an approver's edit sets confirmedBy/confirmedAt, anyone else's edit clears
 * them, and the AI system the record belongs to is marked as touched so
 * "Remove all template items" still keeps it.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (key === "aiSystemId_requirementId" && value && typeof value === "object") {
        const k = value as Row;
        if (row.aiSystemId !== k.aiSystemId || row.requirementId !== k.requirementId) return false;
        continue;
      }
      if (value === null) {
        if (row[key] !== null && row[key] !== undefined) return false;
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
      create: async ({ data }: { data: Row }) => {
        const row = { id: `gen-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      },
      createMany: async ({ data }: { data: Row[] }) => {
        data.forEach((d) => rows.push({ id: `gen-${rows.length + 1}`, ...d }));
        return { count: data.length };
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
        const row = rows.find((r) => matches(r, where));
        if (row) {
          Object.assign(row, update);
          return row;
        }
        return t.create({ data: create });
      },
    };
    return t;
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
    aISystem: makeTable(),
    aIPolicy: makeTable(),
    oversightGate: makeTable(),
    complianceRequirement: makeTable(),
    complianceMapping: makeTable(),
    crossFrameworkMapping: makeTable(),
    riskClassification: makeTable(),
    riskClassificationHistory: makeTable(),
    transparencyProfile: makeTable(),
    auditLog: makeTable(),
  };

  const STAMP = { confirmedBy: "earlier-approver", confirmedAt: new Date("2026-01-01") };

  function reset() {
    memberRows.length = 0;
    for (const role of ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"]) {
      memberRows.push({ organizationId: "org-a", userId: role.toLowerCase(), role });
    }
    db.aISystem.__set([
      { id: "sys-a", organizationId: "org-a", name: "A System", provenance: "AUTO_TEMPLATE", confirmedAt: null, confirmedBy: null },
    ]);
    db.aIPolicy.__set([
      { id: "pol-a", organizationId: "org-a", title: "Policy", status: "DRAFT", provenance: "AUTO_TEMPLATE", ...STAMP },
    ]);
    db.oversightGate.__set([
      { id: "gate-a", organizationId: "org-a", aiSystemId: "sys-a", status: "PENDING", provenance: "AUTO_TEMPLATE", ...STAMP },
    ]);
    db.complianceRequirement.__set([{ id: "req-1", applicableTo: [] }]);
    db.complianceMapping.__set([
      { id: "map-a", organizationId: "org-a", aiSystemId: "sys-a", requirementId: "req-1", status: "NOT_ASSESSED", provenance: "AUTO_TEMPLATE", ...STAMP },
    ]);
    db.riskClassification.__set([
      { id: "risk-a", organizationId: "org-a", aiSystemId: "sys-a", riskLevel: "LIMITED", provenance: "AUTO_TEMPLATE", ...STAMP },
    ]);
    db.transparencyProfile.__set([
      { id: "tp-a", organizationId: "org-a", aiSystemId: "sys-a", provenance: "AUTO_TEMPLATE", ...STAMP },
    ]);
    for (const t of [db.crossFrameworkMapping, db.riskClassificationHistory, db.auditLog]) t.__set([]);
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
import { policyRouter } from "@/server/routers/governance/policy";
import { oversightRouter } from "@/server/routers/governance/oversight";
import { complianceRouter } from "@/server/routers/governance/compliance";
import { riskClassificationRouter } from "@/server/routers/governance/riskClassification";
import { transparencyRouter } from "@/server/routers/governance/transparency";
import { canConfirm, editConfirmation } from "@/server/services/provenance/edit-stamp";

function ctxAs(userId: string) {
  const session = {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return createInnerTRPCContext({ session, getCookie: () => undefined });
}

const org = "org-a";
type Row = Record<string, unknown>;

/** The five update paths, each run by `userId`, returning the row it edited. */
const PATHS: Record<string, (userId: string) => Promise<Row>> = {
  policy: async (userId) => {
    await policyRouter.createCaller(ctxAs(userId)).update({ organizationId: org, id: "pol-a", title: "Edited" });
    return H.db.aIPolicy.__rows()[0];
  },
  "oversight gate": async (userId) => {
    await oversightRouter.createCaller(ctxAs(userId)).update({ organizationId: org, id: "gate-a", description: "Edited" });
    return H.db.oversightGate.__rows()[0];
  },
  "compliance mapping": async (userId) => {
    await complianceRouter.createCaller(ctxAs(userId)).updateMapping({
      organizationId: org,
      aiSystemId: "sys-a",
      requirementId: "req-1",
      status: "PARTIALLY_COMPLIANT",
    });
    return H.db.complianceMapping.__rows()[0];
  },
  "risk classification": async (userId) => {
    await riskClassificationRouter.createCaller(ctxAs(userId)).classify({
      organizationId: org,
      aiSystemId: "sys-a",
      riskLevel: "HIGH",
      rationale: "Edited",
    });
    return H.db.riskClassification.__rows()[0];
  },
  "transparency profile": async (userId) => {
    await transparencyRouter.createCaller(ctxAs(userId)).upsert({
      organizationId: org,
      aiSystemId: "sys-a",
      art50InteractionStatus: "REQUIRED",
      art50MarkingStatus: "NOT_APPLICABLE",
      art50EmotionStatus: "NOT_APPLICABLE",
      art50DeepfakeStatus: "NOT_APPLICABLE",
    });
    return H.db.transparencyProfile.__rows()[0];
  },
};

beforeEach(() => H.reset());

describe("editConfirmation", () => {
  it("stamps for approvers only", () => {
    const now = new Date("2026-10-12");
    for (const role of ["OWNER", "ADMIN", "AI_OFFICER"]) {
      expect(canConfirm(role)).toBe(true);
      expect(editConfirmation(role, "u", now)).toEqual({ confirmedBy: "u", confirmedAt: now });
    }
    for (const role of ["MEMBER", "VIEWER", "SOMETHING_NEW"]) {
      expect(canConfirm(role)).toBe(false);
      expect(editConfirmation(role, "u", now)).toEqual({ confirmedBy: null, confirmedAt: null });
    }
  });
});

for (const [name, run] of Object.entries(PATHS)) {
  describe(`${name}: the ordinary update and the confirmed stamp`, () => {
    for (const approver of ["owner", "admin", "ai_officer"]) {
      it(`an ${approver} edit confirms the record`, async () => {
        const row = await run(approver);
        expect(row.confirmedBy).toBe(approver);
        expect(row.confirmedAt).toBeInstanceOf(Date);
        expect((row.confirmedAt as Date).getTime()).toBeGreaterThan(new Date("2026-01-01").getTime());
        expect(row.provenance).toBe("AUTO_TEMPLATE");
      });
    }

    it("a member edit leaves it unconfirmed, clearing an earlier confirmation", async () => {
      const row = await run("member");
      expect(row.confirmedBy).toBeNull();
      expect(row.confirmedAt).toBeNull();
      expect(row.provenance).toBe("AUTO_TEMPLATE");
    });

    if (name !== "policy") {
      it("a member edit marks the AI system as touched, so template removal keeps it", async () => {
        await run("member");
        const sys = H.db.aISystem.__rows()[0];
        expect(sys.confirmedBy).toBe("member");
        expect(sys.confirmedAt).toBeInstanceOf(Date);
      });

      it("an approver edit leaves the AI system's own stamp alone", async () => {
        await run("admin");
        expect(H.db.aISystem.__rows()[0].confirmedAt).toBeNull();
      });
    }
  });
}
