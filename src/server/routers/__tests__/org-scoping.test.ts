/**
 * Multi-tenant org-scoping regression tests.
 *
 * The governance data model is multi-tenant: every AI system, incident and
 * vendor row carries an `organizationId`, and access is gated by two layers:
 *
 *   1. `organizationProcedure` / `orgWriteProcedure` middleware
 *      (src/server/trpc.ts) — the caller must hold an OrganizationMember row
 *      for the `organizationId` they pass, or the request is FORBIDDEN.
 *   2. Every query in the router is additionally scoped by
 *      `ctx.organization.id` (never by a raw input id), so a member of org A
 *      who passes their own organizationId but targets a row owned by org B
 *      gets NOT_FOUND on reads and a no-op (count 0) on writes.
 *
 * These tests prove a member of org A cannot read, update, or delete org B's
 * rows through the aiSystem, incident, and vendor routers. There was zero
 * automated protection for this before. No real database is touched: the
 * `@/lib/prisma` module is replaced with a small in-memory fake whose
 * findFirst/updateMany/deleteMany honour `where.id` + `where.organizationId`,
 * so the scoping is exercised for real rather than stubbed per call.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

// --- In-memory prisma fake (hoisted so vi.mock can reference it) -------------

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  // Matches a prisma `where` against a row. Scalar keys must equal; nested
  // objects (OR / contains filters, includes) are ignored — the scoping tests
  // only care about id + organizationId equality.
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
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((r) => matches(r, where)) ?? null,
      findMany: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)),
      count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
        rows.filter((r) => matches(r, where)).length,
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Row;
      }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        let count = 0;
        rows = rows.filter((r) => {
          if (matches(r, where)) {
            count += 1;
            return false;
          }
          return true;
        });
        return { count };
      },
      create: async ({ data }: { data: Row }) => {
        const row = { id: data.id ?? `gen-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      },
    };
  }

  const orgs = [
    { id: "org-a", name: "Org A" },
    { id: "org-b", name: "Org B" },
  ];

  const memberRows: Row[] = [];
  const organizationMember = {
    findUnique: async ({
      where,
    }: {
      where: { organizationId_userId: { organizationId: string; userId: string } };
    }) => {
      const key = where.organizationId_userId;
      const m = memberRows.find(
        (r) => r.organizationId === key.organizationId && r.userId === key.userId
      );
      if (!m) return null;
      return { ...m, organization: orgs.find((o) => o.id === m.organizationId) };
    },
  };

  const aISystem = makeTable();
  const aIIncident = makeTable();
  const aIVendor = makeTable();

  const db = {
    organizationMember,
    aISystem,
    aIIncident,
    aIVendor,
    aIModel: makeTable(),
    aISystemDataSource: makeTable(),
    aIIncidentTimeline: makeTable(),
    aIIncidentTask: makeTable(),
    auditLog: makeTable(),
  };

  function reset() {
    memberRows.length = 0;
    // user-a is an OWNER of org-a only; user-a is NOT a member of org-b.
    memberRows.push({ organizationId: "org-a", userId: "user-a", role: "OWNER" });
    aISystem.__set([
      { id: "sys-a", organizationId: "org-a", name: "A System", status: "DRAFT" },
      { id: "sys-b", organizationId: "org-b", name: "B System", status: "DEPLOYED" },
    ]);
    aIIncident.__set([
      { id: "inc-a", organizationId: "org-a", title: "A Incident", status: "REPORTED", severity: "LOW" },
      { id: "inc-b", organizationId: "org-b", title: "B Incident", status: "REPORTED", severity: "HIGH" },
    ]);
    aIVendor.__set([
      { id: "ven-a", organizationId: "org-a", name: "A Vendor", status: "ACTIVE" },
      { id: "ven-b", organizationId: "org-b", name: "B Vendor", status: "ACTIVE" },
    ]);
    db.auditLog.__set([]);
    db.aIIncidentTimeline.__set([]);
  }

  return { db, reset };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import { createInnerTRPCContext } from "@/server/trpc";
import { aiSystemRouter } from "@/server/routers/governance/aiSystem";
import { incidentRouter } from "@/server/routers/governance/incident";
import { vendorRouter } from "@/server/routers/governance/vendor";

// --- Helpers -----------------------------------------------------------------

function sessionFor(userId: string): Session {
  return {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
}

function ctxFor(session: Session | null) {
  return createInnerTRPCContext({
    session,
    getCookie: () => undefined,
  });
}

const userA = sessionFor("user-a");

beforeEach(() => {
  H.reset();
});

// --- aiSystem router ----------------------------------------------------------

describe("aiSystem router org-scoping", () => {
  it("FORBIDDEN: user-a cannot target org-b (no membership)", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor(userA));
    await expect(
      caller.getById({ organizationId: "org-b", id: "sys-b" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("NOT_FOUND: user-a reading org-b's system through their own org", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor(userA));
    await expect(
      caller.getById({ organizationId: "org-a", id: "sys-b" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("NOT_FOUND: user-a cannot update org-b's system", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor(userA));
    await expect(
      caller.update({ organizationId: "org-a", id: "sys-b", name: "hijacked" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    // org-b's row is untouched.
    const row = H.db.aISystem.__rows().find((r) => r.id === "sys-b");
    expect(row?.name).toBe("B System");
  });

  it("no-op: user-a deleting org-b's system removes nothing", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor(userA));
    await caller.delete({ organizationId: "org-a", id: "sys-b" });
    expect(H.db.aISystem.__rows().some((r) => r.id === "sys-b")).toBe(true);
  });

  it("positive control: user-a reads their own org's system", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor(userA));
    const sys = await caller.getById({ organizationId: "org-a", id: "sys-a" });
    expect(sys.id).toBe("sys-a");
  });
});

// --- incident router ----------------------------------------------------------

describe("incident router org-scoping", () => {
  it("FORBIDDEN: user-a cannot target org-b (no membership)", async () => {
    const caller = incidentRouter.createCaller(ctxFor(userA));
    await expect(
      caller.getById({ organizationId: "org-b", id: "inc-b" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("NOT_FOUND: user-a reading org-b's incident through their own org", async () => {
    const caller = incidentRouter.createCaller(ctxFor(userA));
    await expect(
      caller.getById({ organizationId: "org-a", id: "inc-b" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("NOT_FOUND: user-a cannot update org-b's incident", async () => {
    const caller = incidentRouter.createCaller(ctxFor(userA));
    await expect(
      caller.update({ organizationId: "org-a", id: "inc-b", status: "CLOSED" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const row = H.db.aIIncident.__rows().find((r) => r.id === "inc-b");
    expect(row?.status).toBe("REPORTED");
  });

  it("positive control: user-a reads their own org's incident", async () => {
    const caller = incidentRouter.createCaller(ctxFor(userA));
    const inc = await caller.getById({ organizationId: "org-a", id: "inc-a" });
    expect(inc.id).toBe("inc-a");
  });
});

// --- vendor router ------------------------------------------------------------

describe("vendor router org-scoping", () => {
  it("FORBIDDEN: user-a cannot target org-b (no membership)", async () => {
    const caller = vendorRouter.createCaller(ctxFor(userA));
    await expect(
      caller.getById({ organizationId: "org-b", id: "ven-b" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("NOT_FOUND: user-a reading org-b's vendor through their own org", async () => {
    const caller = vendorRouter.createCaller(ctxFor(userA));
    await expect(
      caller.getById({ organizationId: "org-a", id: "ven-b" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("NOT_FOUND: user-a cannot update org-b's vendor", async () => {
    const caller = vendorRouter.createCaller(ctxFor(userA));
    await expect(
      caller.update({ organizationId: "org-a", id: "ven-b", name: "hijacked" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const row = H.db.aIVendor.__rows().find((r) => r.id === "ven-b");
    expect(row?.name).toBe("B Vendor");
  });

  it("no-op: user-a deleting org-b's vendor removes nothing", async () => {
    const caller = vendorRouter.createCaller(ctxFor(userA));
    await caller.delete({ organizationId: "org-a", id: "ven-b" });
    expect(H.db.aIVendor.__rows().some((r) => r.id === "ven-b")).toBe(true);
  });

  it("positive control: user-a reads their own org's vendor", async () => {
    const caller = vendorRouter.createCaller(ctxFor(userA));
    const ven = await caller.getById({ organizationId: "org-a", id: "ven-a" });
    expect(ven.id).toBe("ven-a");
  });
});

// --- unauthenticated ----------------------------------------------------------

describe("unauthenticated access", () => {
  it("UNAUTHORIZED when there is no session", async () => {
    const caller = aiSystemRouter.createCaller(ctxFor(null));
    await expect(
      caller.getById({ organizationId: "org-a", id: "sys-a" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
