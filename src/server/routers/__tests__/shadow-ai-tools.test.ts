// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "AI tools in use", through the real router: one tab lists several statuses,
 * the counts give the number still to review, and a tool added to a system is
 * shown on that system only within the organisation.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  // Scalars must be equal; `{ in: [...] }` must contain the value; other
  // nested filters are ignored.
  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const inList = (value as { in?: unknown[] }).in;
        if (inList && !inList.includes(row[key])) return false;
        continue;
      }
      if (row[key] !== value) return false;
    }
    return true;
  }

  function table(seed: Row[]) {
    let rows = seed.map((r) => ({ ...r }));
    return {
      __set(next: Row[]) {
        rows = next.map((r) => ({ ...r }));
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((r) => matches(r, where)) ?? null,
      findMany: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)),
      count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)).length,
    };
  }

  const shadowAIReport = table([]);
  const aISystem = table([]);
  const memberRows: Row[] = [];
  const orgs = [
    { id: "org-a", name: "Org A" },
    { id: "org-b", name: "Org B" },
  ];
  const db = {
    shadowAIReport,
    aISystem,
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
  };

  function reset() {
    memberRows.length = 0;
    memberRows.push({ organizationId: "org-a", userId: "user-a", role: "OWNER" });
    shadowAIReport.__set([
      { id: "r1", organizationId: "org-a", toolName: "Chat", status: "DISCOVERED", registeredSystemId: null },
      { id: "r2", organizationId: "org-a", toolName: "Notes", status: "UNDER_REVIEW", registeredSystemId: null },
      { id: "r3", organizationId: "org-a", toolName: "Draw", status: "APPROVED", registeredSystemId: null },
      { id: "r4", organizationId: "org-a", toolName: "Code", status: "REGISTERED", registeredSystemId: "sys-a" },
      { id: "r5", organizationId: "org-b", toolName: "Other", status: "REGISTERED", registeredSystemId: "sys-a" },
      { id: "r6", organizationId: "org-a", toolName: "Stray", status: "REGISTERED", registeredSystemId: "sys-b" },
    ]);
    aISystem.__set([
      { id: "sys-a", organizationId: "org-a", name: "Hiring screen" },
      { id: "sys-b", organizationId: "org-b", name: "Someone else's" },
    ]);
  }

  return { db, reset };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/server/services/licensing/entitlement", () => ({
  hasShadowAiAccess: async () => true,
}));

import { createInnerTRPCContext } from "@/server/trpc";
import { shadowAiRouter } from "@/server/routers/governance/shadowAi";
import { TOOL_TAB_STATUSES } from "@/lib/ai-tool-triage";

const session = {
  user: { id: "user-a", email: "user-a@example.test", name: "user-a" },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
} as unknown as Session;
const caller = () =>
  shadowAiRouter.createCaller(createInnerTRPCContext({ session, getCookie: () => undefined }));

beforeEach(() => H.reset());

describe("AI tools in use", () => {
  it("the 'to review' tab lists reported and under-review tools, and nothing else", async () => {
    const { items } = await caller().listReports({
      organizationId: "org-a",
      statuses: [...TOOL_TAB_STATUSES.toReview],
    });
    expect(items.map((r) => r.id).sort()).toEqual(["r1", "r2"]);
  });

  it("the registered tab lists only this organisation's registered tools", async () => {
    const { items } = await caller().listReports({
      organizationId: "org-a",
      statuses: [...TOOL_TAB_STATUSES.registered],
    });
    expect(items.map((r) => r.id).sort()).toEqual(["r4", "r6"]);
  });

  it("counts the tools still to review", async () => {
    const stats = await caller().getStats({ organizationId: "org-a" });
    expect(stats.toReview).toBe(2);
    expect(stats.approved).toBe(1);
    expect(stats.registered).toBe(2);
    expect(stats.total).toBe(5);
  });

  it("a system lists the tools added to it, from its own organisation only", async () => {
    const tools = await caller().listForSystem({ organizationId: "org-a", aiSystemId: "sys-a" });
    expect(tools.map((r) => r.id)).toEqual(["r4"]);
  });

  it("names the system a tool belongs to, never one from another organisation", async () => {
    const mine = await caller().getReportById({ organizationId: "org-a", id: "r4" });
    expect(mine.registeredSystem).toEqual(expect.objectContaining({ id: "sys-a", name: "Hiring screen" }));
    const stray = await caller().getReportById({ organizationId: "org-a", id: "r6" });
    expect(stray.registeredSystem).toBeNull();
  });
});
