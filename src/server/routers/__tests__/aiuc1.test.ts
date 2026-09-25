// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The AIUC-1 router: scoped to the organisation, agents only, decisions for
 * the deciding roles, a test never changes the compliance status, and an
 * AIUC-1 record can never be deleted through the compliance router.
 * No database: `@/lib/prisma` is a small fake.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = {
    role: "OWNER",
    systems: [] as Row[],
    mappings: [] as Row[],
    evidence: [] as Row[],
    audit: [] as Row[],
    deleted: [] as string[],
  };
  const org = { id: "org-a", name: "Org A", slug: "a", settings: {}, pilotFirstSignInAt: null };

  const pick = (rows: Row[], where: Row) =>
    rows.find((r) =>
      Object.entries(where).every(([k, v]) => (v && typeof v === "object" ? true : r[k] === v)),
    ) ?? null;

  const tables: Record<string, Record<string, unknown>> = {
    organizationMember: {
      findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string } } }) =>
        where.organizationId_userId.organizationId === "org-a"
          ? { organizationId: "org-a", userId: "user-a", role: state.role, organization: org }
          : null,
    },
    aISystem: {
      findFirst: async ({ where }: { where: Row }) => {
        const s = pick(state.systems, { id: where.id, organizationId: where.organizationId });
        return s ? { ...s, agentProfile: s.autonomy ? { autonomy: s.autonomy } : null } : null;
      },
    },
    complianceRequirement: {
      findFirst: async ({ where }: { where: Row }) => ({ id: where.id }),
      count: async () => 51,
    },
    complianceMapping: {
      upsert: async ({ where, create, update }: { where: { aiSystemId_requirementId: Row }; create: Row; update: Row }) => {
        const key = where.aiSystemId_requirementId;
        const existing = pick(state.mappings, { aiSystemId: key.aiSystemId, requirementId: key.requirementId });
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `map-${state.mappings.length + 1}`, ...create };
        state.mappings.push(row);
        return row;
      },
      findFirst: async ({ where }: { where: Row }) => {
        const m = pick(state.mappings, where);
        return m
          ? { ...m, evidenceItems: state.evidence.filter((e) => e.complianceMappingId === m.id) }
          : null;
      },
      findMany: async () => [],
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const m = pick(state.mappings, { id: where.id })!;
        Object.assign(m, data);
        return m;
      },
    },
    complianceEvidence: {
      create: async ({ data }: { data: Row }) => {
        const row = { id: `ev-${state.evidence.length + 1}`, addedAt: new Date(), ...data };
        state.evidence.push(row);
        return row;
      },
      findFirst: async ({ where }: { where: Row }) => pick(state.evidence, where),
      delete: async ({ where }: { where: Row }) => {
        state.deleted.push(where.id as string);
        return {};
      },
    },
    auditLog: {
      create: async ({ data }: { data: Row }) => {
        state.audit.push(data);
        return data;
      },
    },
    user: { findMany: async () => [] },
    legalHold: { findFirst: async () => null, count: async () => 0 },
  };

  const db: Record<string, unknown> = new Proxy(tables, {
    get(target, prop: string) {
      if (prop === "then") return undefined;
      if (!(prop in target)) {
        target[prop] = new Proxy({}, {
          get: (_t, m: string) => async () => (m === "count" ? 0 : m === "findMany" ? [] : null),
        });
      }
      return target[prop];
    },
  });
  return { db, state };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));

import { createInnerTRPCContext } from "@/server/trpc";
import { aiuc1Router } from "@/server/routers/governance/aiuc1";
import { complianceRouter } from "@/server/routers/governance/compliance";

const session = { user: { id: "user-a", email: "a@example.test" }, expires: "2999-01-01" } as unknown as Session;
const ctx = () => createInnerTRPCContext({ session, getCookie: () => undefined });
const aiuc1 = () => aiuc1Router.createCaller(ctx());
const compliance = () => complianceRouter.createCaller(ctx());

const TEST = {
  organizationId: "org-a",
  aiSystemId: "agent-1",
  code: "B001",
  method: "Ran the jailbreak suite against the chat endpoint.",
  result: "PARTIAL" as const,
};

beforeEach(() => {
  H.state.role = "OWNER";
  H.state.systems = [
    { id: "agent-1", organizationId: "org-a", name: "Support agent", technique: "AGENTIC_AI", status: "DEPLOYED" },
    { id: "model-1", organizationId: "org-a", name: "Scoring model", technique: "MACHINE_LEARNING", status: "DEPLOYED" },
    { id: "agent-b", organizationId: "org-b", name: "Other org agent", technique: "AGENTIC_AI", status: "DEPLOYED" },
  ];
  H.state.mappings = [];
  H.state.evidence = [];
  H.state.audit = [];
  H.state.deleted = [];
});

describe("aiuc1.recordTest", () => {
  it("appends a TEST_RESULT evidence row and an audit entry, and leaves the status alone", async () => {
    H.state.mappings.push({ id: "map-x", organizationId: "org-a", aiSystemId: "agent-1", requirementId: "aiuc1-b001", status: "COMPLIANT" });
    await aiuc1().recordTest(TEST);
    expect(H.state.evidence).toHaveLength(1);
    expect(H.state.evidence[0]).toMatchObject({ type: "TEST_RESULT", organizationId: "org-a", complianceMappingId: "map-x", addedBy: "user-a" });
    expect(JSON.parse(H.state.evidence[0].description as string)).toMatchObject({ kind: "aiuc1-test", code: "B001", result: "PARTIAL" });
    expect(H.state.mappings[0].status).toBe("COMPLIANT");
    expect(H.state.audit[0]).toMatchObject({ action: "AIUC1_TEST_RECORDED", organizationId: "org-a" });
  });

  it("creates the mapping as not assessed when there is none", async () => {
    await aiuc1().recordTest(TEST);
    expect(H.state.mappings[0]).toMatchObject({ status: "NOT_ASSESSED", organizationId: "org-a", requirementId: "aiuc1-b001" });
  });

  it("refuses another organisation's system, a system that is not an agent, and a future date", async () => {
    await expect(aiuc1().recordTest({ ...TEST, aiSystemId: "agent-b" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(aiuc1().recordTest({ ...TEST, aiSystemId: "model-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      aiuc1().recordTest({ ...TEST, testedAt: new Date(Date.now() + 86_400_000) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(H.state.evidence).toHaveLength(0);
  });

  it("refuses a code that is not a requirement in force, and a method too short to repeat", async () => {
    await expect(aiuc1().recordTest({ ...TEST, code: "E007" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(aiuc1().recordTest({ ...TEST, method: "tested" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is closed to a viewer", async () => {
    H.state.role = "VIEWER";
    await expect(aiuc1().recordTest(TEST)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("decisions", () => {
  it("accepts the latest partial once, for the deciding roles only", async () => {
    await aiuc1().recordTest(TEST);
    const testId = H.state.evidence[0].id as string;
    const accept = { organizationId: "org-a", aiSystemId: "agent-1", code: "B001", testId, reason: "Residual risk covered by review." };

    H.state.role = "MEMBER";
    await expect(aiuc1().acceptPartial(accept)).rejects.toMatchObject({ code: "FORBIDDEN" });

    H.state.role = "AI_OFFICER";
    await aiuc1().acceptPartial(accept);
    expect(H.state.evidence[1]).toMatchObject({ type: "APPROVAL" });
    await expect(aiuc1().acceptPartial(accept)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("refuses to accept a test that is not the latest, or not a partial", async () => {
    await aiuc1().recordTest({ ...TEST, testedAt: new Date("2026-09-01T00:00:00Z") });
    const older = H.state.evidence[0].id as string;
    await aiuc1().recordTest({ ...TEST, result: "FAIL", testedAt: new Date("2026-09-10T00:00:00Z") });
    const newer = H.state.evidence[1].id as string;
    const base = { organizationId: "org-a", aiSystemId: "agent-1", code: "B001", reason: "Residual risk covered by review." };
    await expect(aiuc1().acceptPartial({ ...base, testId: older })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(aiuc1().acceptPartial({ ...base, testId: newer })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("marks not applicable with the reason, and undoes only that", async () => {
    const base = { organizationId: "org-a", aiSystemId: "agent-1", code: "A008" };
    H.state.role = "MEMBER";
    await expect(
      aiuc1().setApplicability({ ...base, applicable: false, reason: "The agent writes no code." }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    H.state.role = "ADMIN";
    await aiuc1().setApplicability({ ...base, applicable: false, reason: "The agent writes no code." });
    expect(H.state.mappings[0]).toMatchObject({ status: "NOT_APPLICABLE", notes: "The agent writes no code." });
    await aiuc1().setApplicability({ ...base, applicable: true });
    expect(H.state.mappings[0]).toMatchObject({ status: "NOT_ASSESSED", notes: null });
    // A status a person set otherwise is not touched by "it applies after all".
    H.state.mappings[0].status = "NON_COMPLIANT";
    await expect(aiuc1().setApplicability({ ...base, applicable: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(H.state.mappings[0].status).toBe("NON_COMPLIANT");
  });
});

describe("append-only", () => {
  it("compliance.removeEvidence refuses an AIUC-1 record and deletes nothing", async () => {
    await aiuc1().recordTest(TEST);
    const id = H.state.evidence[0].id as string;
    await expect(compliance().removeEvidence({ organizationId: "org-a", evidenceId: id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(H.state.deleted).toEqual([]);
  });
});
