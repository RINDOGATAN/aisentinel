// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Incidents are never deleted; one entered by mistake is marked recorded in
 * error. Through the real router over an in-memory fake:
 *
 *   - Owners and admins only; the incident must be the organization's own.
 *   - A legal hold does not stop it: nothing is deleted.
 *   - The status line and the reason go on the timeline, and an audit entry
 *     is written.
 *   - The status is final: update and setStatutoryFacts are refused after it.
 *   - It leaves the totals and starts no statutory clock.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  // Scalars must be equal; { not } and { in } are honoured; OR needs one match.
  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      if (key === "OR" && Array.isArray(value)) {
        if (!value.some((alt) => matches(row, alt as Record<string, unknown>))) return false;
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        const v = value as { not?: unknown; in?: unknown[] };
        if ("not" in v && row[key] === v.not) return false;
        if (Array.isArray(v.in) && !v.in.includes(row[key])) return false;
        continue;
      }
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
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    };
  }

  const orgs = [
    { id: "org-a", name: "Org A", pilotFirstSignInAt: new Date(0), operatingJurisdictions: ["EU"] },
    { id: "org-b", name: "Org B", pilotFirstSignInAt: new Date(0), operatingJurisdictions: ["EU"] },
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
    aIIncident: makeTable(),
    aIIncidentTimeline: makeTable(),
    legalHold: makeTable(),
    auditLog: makeTable(),
  };

  const incident = (id: string, organizationId: string, extra: Row = {}) => ({
    id,
    organizationId,
    title: "Incident",
    type: "PRIVACY_VIOLATION",
    severity: "CRITICAL",
    status: "REPORTED",
    reportedAt: new Date("2026-10-01T00:00:00Z"),
    awareAt: null,
    deathOccurred: false,
    widespreadOrCriticalInfrastructure: false,
    personalDataBreach: true,
    highRiskToIndividuals: true,
    aiOfficeCompetent: false,
    aiSystem: null,
    ...extra,
  });

  function reset() {
    memberRows.length = 0;
    for (const role of ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"]) {
      memberRows.push({ organizationId: "org-a", userId: role.toLowerCase(), role });
    }
    db.aIIncident.__set([incident("inc-a", "org-a"), incident("inc-a2", "org-a"), incident("inc-b", "org-b")]);
    for (const t of [db.aIIncidentTimeline, db.legalHold, db.auditLog]) t.__set([]);
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
import { incidentRouter } from "@/server/routers/governance/incident";

function callerAs(userId: string) {
  const session = {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return incidentRouter.createCaller(createInnerTRPCContext({ session, getCookie: () => undefined }));
}

const org = "org-a";
const statusOf = (id: string) => H.db.aIIncident.__rows().find((r) => r.id === id)?.status;
const mark = (user: string, id = "inc-a") =>
  callerAs(user).markRecordedInError({ organizationId: org, id, reason: "Duplicate of inc-a2" });

beforeEach(() => {
  H.reset();
});

describe("incident.markRecordedInError", () => {
  for (const user of ["ai_officer", "member", "viewer"]) {
    it(`refuses ${user} and changes nothing`, async () => {
      await expect(mark(user)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(statusOf("inc-a")).toBe("REPORTED");
      expect(H.db.aIIncidentTimeline.__rows()).toHaveLength(0);
      expect(H.db.auditLog.__rows()).toHaveLength(0);
    });
  }

  for (const user of ["owner", "admin"]) {
    it(`lets ${user} mark it, with a timeline line, the reason and an audit entry`, async () => {
      await mark(user);
      expect(statusOf("inc-a")).toBe("RECORDED_IN_ERROR");
      expect(H.db.aIIncident.__rows()).toHaveLength(3);
      expect(H.db.aIIncidentTimeline.__rows()).toEqual([
        expect.objectContaining({
          incidentId: "inc-a",
          action: "Status changed to RECORDED_IN_ERROR",
          description: "Status updated from REPORTED to RECORDED_IN_ERROR",
          performedBy: user,
        }),
        expect.objectContaining({ incidentId: "inc-a", action: "Recorded in error", description: "Duplicate of inc-a2" }),
      ]);
      expect(H.db.auditLog.__rows()).toEqual([
        expect.objectContaining({
          organizationId: org,
          entityType: "AIIncident",
          entityId: "inc-a",
          action: "RECORDED_IN_ERROR",
          changes: { previousStatus: "REPORTED", reason: "Duplicate of inc-a2" },
        }),
      ]);
    });
  }

  it("answers NOT_FOUND for another organization's incident", async () => {
    await expect(mark("owner", "inc-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(statusOf("inc-b")).toBe("REPORTED");
  });

  it("needs a reason", async () => {
    await expect(
      callerAs("owner").markRecordedInError({ organizationId: org, id: "inc-a", reason: "   " }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is not stopped by a legal hold, because nothing is deleted", async () => {
    H.db.legalHold.__set([{ id: "h", organizationId: org, aiSystemId: null, matter: "M", releasedAt: null }]);
    await mark("owner");
    expect(statusOf("inc-a")).toBe("RECORDED_IN_ERROR");
  });

  it("is final: a second mark, update and setStatutoryFacts are refused", async () => {
    await mark("owner");
    await expect(mark("owner")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      callerAs("member").update({ organizationId: org, id: "inc-a", status: "INVESTIGATING" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      callerAs("member").setStatutoryFacts({ organizationId: org, id: "inc-a", deathOccurred: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(statusOf("inc-a")).toBe("RECORDED_IN_ERROR");
  });
});

describe("an incident recorded in error is left out", () => {
  it("of the totals", async () => {
    const before = await callerAs("viewer").getStats({ organizationId: org });
    expect(before).toMatchObject({ total: 2, critical: 2, open: 2 });
    await mark("owner");
    const after = await callerAs("viewer").getStats({ organizationId: org });
    expect(after).toMatchObject({ total: 1, critical: 1, open: 1, resolved: 0 });
  });

  it("of the statutory clocks", async () => {
    const before = await callerAs("viewer").getStatutoryDeadlines({ organizationId: org, id: "inc-a" });
    expect(before.deadlines.length).toBeGreaterThan(0);
    await mark("owner");
    const after = await callerAs("viewer").getStatutoryDeadlines({ organizationId: org, id: "inc-a" });
    expect(after.deadlines).toEqual([]);
  });

  it("but stays listed, and can be filtered for", async () => {
    await mark("owner");
    const { items } = await callerAs("viewer").list({ organizationId: org, status: "RECORDED_IN_ERROR" });
    expect(items.map((i) => i.id)).toEqual(["inc-a"]);
  });
});
