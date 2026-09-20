// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Deleting an organisation, proved two ways.
 *
 * 1. THE SCHEMA. Real deletion depends on PostgreSQL, not on application code:
 *    every table that carries an `organizationId` must declare its relation to
 *    Organization with `onDelete: Cascade`, so one DELETE removes the lot. The
 *    single exception is `audit_logs`, which is SET NULL on purpose so the
 *    tombstone entry outlives the rows it describes. This half of the proof
 *    reads prisma/schema.prisma, so a new module that forgets the cascade fails
 *    here rather than leaving orphans in a customer's database.
 *
 * 2. THE ROUTER, with two organisations seeded. A fake Prisma whose
 *    `organization.delete` cascades the way Postgres is declared to: org A is
 *    deleted with rows in eleven tables, org B has rows in the same tables, and
 *    afterwards every row of A is gone and every row of B is untouched. The
 *    tombstone audit entry is written BEFORE the rows go and survives with the
 *    organisation's name and slug in `changes`; the organisation's own audit
 *    history goes with it, because an audit row holding the content of a
 *    deleted organisation would make "it is really deleted" untrue.
 *
 * What this cannot prove without a database: that Postgres honours the
 * constraints as declared. That check belongs to the owner, on a copy; see
 * STATUS.md.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Session } from "next-auth";

// --- The tables an organisation owns, as the fixtures use them ---------------

/** Prisma delegate name -> the rows seeded for each organisation. */
const OWNED_TABLES = [
  "aISystem",
  "aIAssessment",
  "aIIncident",
  "aIVendor",
  "aIPolicy",
  "oversightGate",
  "complianceMapping",
  "shadowAiReport",
  "threatModel",
  "boardReport",
  "programSnapshot",
] as const;

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  const TABLES = [
    "aISystem",
    "aIAssessment",
    "aIIncident",
    "aIVendor",
    "aIPolicy",
    "oversightGate",
    "complianceMapping",
    "shadowAiReport",
    "threatModel",
    "boardReport",
    "programSnapshot",
    "auditLog",
  ] as const;

  function matches(row: Row, where: Record<string, unknown> = {}): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (key === "id" && value && typeof value === "object") {
        const not = (value as { not?: unknown }).not;
        if (not !== undefined && row.id === not) return false;
        continue;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) continue;
      if (row[key] !== value) return false;
    }
    return true;
  }

  function makeTable() {
    let rows: Row[] = [];
    let seq = 0;
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
        seq += 1;
        const row = { id: data.id ?? `gen-${seq}`, ...data };
        rows.push(row);
        return row;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
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
    };
  }

  const tables = Object.fromEntries(TABLES.map((name) => [name, makeTable()])) as Record<
    (typeof TABLES)[number],
    ReturnType<typeof makeTable>
  >;

  const orgRows: Row[] = [];
  const memberRows: Row[] = [];

  /** The order of events during a delete, so "audit first" can be asserted. */
  const events: string[] = [];

  const organization = {
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      orgRows.find((r) => matches(r, where)) ?? null,
    /**
     * What Postgres does with ON DELETE CASCADE / SET NULL, in memory: every
     * owned table loses the organisation's rows, audit_logs keeps them with a
     * null organizationId.
     */
    delete: async ({ where }: { where: { id: string } }) => {
      events.push("delete");
      const index = orgRows.findIndex((r) => r.id === where.id);
      const removed = orgRows[index];
      orgRows.splice(index, 1);
      for (const name of TABLES) {
        if (name === "auditLog") continue;
        await tables[name].deleteMany({ where: { organizationId: where.id } });
      }
      await tables.auditLog.updateMany({
        where: { organizationId: where.id },
        data: { organizationId: null },
      });
      for (let i = memberRows.length - 1; i >= 0; i--) {
        if (memberRows[i].organizationId === where.id) memberRows.splice(i, 1);
      }
      return removed;
    },
  };

  const organizationMember = {
    findUnique: async ({
      where,
    }: {
      where: { organizationId_userId: { organizationId: string; userId: string } };
    }) => {
      const key = where.organizationId_userId;
      const m = memberRows.find(
        (r) => r.organizationId === key.organizationId && r.userId === key.userId,
      );
      if (!m) return null;
      return { ...m, organization: orgRows.find((o) => o.id === m.organizationId) };
    },
  };

  const auditLog = {
    ...tables.auditLog,
    create: async (args: { data: Row }) => {
      events.push("audit");
      return tables.auditLog.create(args);
    },
    deleteMany: async (args: { where: Record<string, unknown> }) => {
      events.push("audit-prune");
      return tables.auditLog.deleteMany(args);
    },
  };

  const db = {
    ...tables,
    auditLog,
    organization,
    organizationMember,
    legalHold: { findMany: async () => [], count: async () => 0 },
  };

  function reset() {
    events.length = 0;
    orgRows.length = 0;
    orgRows.push(
      { id: "org-a", name: "Acme Sample", slug: "acme-sample" },
      { id: "org-b", name: "Other Org", slug: "other-org" },
    );
    memberRows.length = 0;
    memberRows.push(
      { organizationId: "org-a", userId: "user-a", role: "OWNER" },
      { organizationId: "org-b", userId: "user-b", role: "OWNER" },
    );
    for (const name of TABLES) {
      tables[name].__set([
        { id: `${name}-a`, organizationId: "org-a" },
        { id: `${name}-b`, organizationId: "org-b" },
      ]);
    }
  }

  return { db, reset, events, tables, orgRows };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { createInnerTRPCContext } from "@/server/trpc";
import { organizationRouter } from "@/server/routers/governance/organization";

function sessionFor(userId: string): Session {
  return {
    user: { id: userId, email: `${userId}@example.test`, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
}

const ctxFor = (session: Session) =>
  createInnerTRPCContext({ session, getCookie: () => undefined });

beforeEach(() => H.reset());

// ── 1. The schema: every owned table cascades ────────────────────────────────

describe("the schema makes deletion real", () => {
  const schema = readFileSync(join(__dirname, "../../../../prisma/schema.prisma"), "utf8");

  /** Every model block, with its body. */
  const models = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map((m) => ({
    name: m[1],
    body: m[2],
  }));

  it("finds the models to check (guard against a regex that silently matches nothing)", () => {
    expect(models.length).toBeGreaterThan(40);
    expect(models.map((m) => m.name)).toContain("AISystem");
  });

  it("every model with an organizationId cascades from Organization, except the audit trail", () => {
    const owned = models.filter((m) => /^\s*organizationId\s/m.test(m.body));
    expect(owned.length).toBeGreaterThan(30);

    const offenders: string[] = [];
    for (const model of owned) {
      const relation = /organization\s+Organization\??\s+@relation\(([^)]*)\)/.exec(model.body);
      if (!relation) {
        offenders.push(`${model.name}: organizationId with no Organization relation`);
        continue;
      }
      const expected = model.name === "AuditLog" ? "onDelete: SetNull" : "onDelete: Cascade";
      if (!relation[1].includes(expected)) {
        offenders.push(`${model.name}: expected ${expected}, got ${relation[1].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the audit trail is the only survivor, and it survives without its organisation", () => {
    const audit = models.find((m) => m.name === "AuditLog");
    expect(audit).toBeDefined();
    expect(audit!.body).toMatch(/organizationId\s+String\?/);
    expect(audit!.body).toMatch(/onDelete: SetNull/);
  });
});

// ── 2. The router: two organisations, one deleted ────────────────────────────

describe("organization.delete with two organisations seeded", () => {
  it("removes every row of the organisation deleted and touches no row of the other", async () => {
    const caller = organizationRouter.createCaller(ctxFor(sessionFor("user-a")));
    await caller.delete({ organizationId: "org-a", confirmName: "Acme Sample" });

    for (const name of OWNED_TABLES) {
      const rows = H.tables[name].__rows();
      expect(rows.filter((r) => r.organizationId === "org-a"), `${name} still holds org-a`).toEqual([]);
      expect(rows.filter((r) => r.organizationId === "org-b"), `${name} lost org-b`).toHaveLength(1);
    }
    expect(H.orgRows.map((o) => o.id)).toEqual(["org-b"]);
  });

  it("writes the tombstone to the audit trail before the rows go, and keeps only that", async () => {
    const caller = organizationRouter.createCaller(ctxFor(sessionFor("user-a")));
    await caller.delete({ organizationId: "org-a", confirmName: "Acme Sample" });

    // Written first, then the organisation's own history pruned, then the rows.
    expect(H.events.indexOf("audit")).toBeLessThan(H.events.indexOf("delete"));
    expect(H.events.indexOf("audit-prune")).toBeLessThan(H.events.indexOf("delete"));

    const audit = H.tables.auditLog.__rows();
    // The other organisation's history is untouched.
    expect(audit.filter((r) => r.organizationId === "org-b")).toHaveLength(1);
    // Exactly one row survives the deleted organisation: the tombstone, now
    // detached, carrying the name and slug so the deletion can be evidenced.
    const survivors = audit.filter((r) => r.organizationId === null);
    expect(survivors).toHaveLength(1);
    expect(survivors[0].action).toBe("DELETE");
    expect(survivors[0].changes).toMatchObject({ name: "Acme Sample", slug: "acme-sample" });
    // And none of the deleted organisation's content is left in the trail.
    expect(audit.some((r) => r.id === "auditLog-a")).toBe(false);
  });

  it("refuses a name that does not match, and deletes nothing", async () => {
    const caller = organizationRouter.createCaller(ctxFor(sessionFor("user-a")));
    await expect(
      caller.delete({ organizationId: "org-a", confirmName: "acme sample" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(H.orgRows).toHaveLength(2);
    expect(H.tables.aISystem.__rows()).toHaveLength(2);
  });

  it("refuses a member of another organisation, and deletes nothing", async () => {
    const caller = organizationRouter.createCaller(ctxFor(sessionFor("user-b")));
    await expect(
      caller.delete({ organizationId: "org-a", confirmName: "Acme Sample" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.orgRows).toHaveLength(2);
  });

  it("refuses a non-owner of the organisation itself", async () => {
    H.db.organizationMember.findUnique = async ({
      where,
    }: {
      where: { organizationId_userId: { organizationId: string; userId: string } };
    }) => ({
      organizationId: where.organizationId_userId.organizationId,
      userId: where.organizationId_userId.userId,
      role: "ADMIN",
      organization: H.orgRows.find((o) => o.id === where.organizationId_userId.organizationId),
    });
    const caller = organizationRouter.createCaller(ctxFor(sessionFor("user-a")));
    await expect(
      caller.delete({ organizationId: "org-a", confirmName: "Acme Sample" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.orgRows).toHaveLength(2);
  });
});
