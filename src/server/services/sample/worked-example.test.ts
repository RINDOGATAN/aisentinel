// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Adding and removing the worked example, with two organisations seeded.
 *
 * The promise is precise: removing the example removes exactly what the example
 * made, nothing the person has since created themselves, and nothing belonging
 * to anyone else. Each of those is a test here, against an in-memory Prisma that
 * honours `where` on id and organizationId.
 *
 * Also tested: the example is never added twice; it declares a jurisdiction only
 * when none is declared, and puts the previous value back on removal.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  EXAMPLE_SYSTEMS,
  WORKED_EXAMPLE_JURISDICTIONS,
} from "@/config/worked-example";

type Row = Record<string, unknown>;

function matches(row: Row, where: Record<string, unknown> = {}): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (value && typeof value === "object" && !Array.isArray(value)) continue;
    if (row[key] !== value) return false;
  }
  return true;
}

function makeTable(name: string) {
  let rows: Row[] = [];
  let seq = 0;
  return {
    __set(next: Row[]) {
      rows = next.map((r) => ({ ...r }));
    },
    __rows: () => rows,
    create: async ({ data }: { data: Row }) => {
      seq += 1;
      const row = { id: `${name}-${seq}`, ...data };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = rows.find((r) => r.id === where.id);
      if (!row) throw new Error(`${name} ${where.id} not found`);
      Object.assign(row, data);
      return row;
    },
    findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      // A copy, as Prisma returns. Handing back the live row would let a caller
      // that reads a field after an update see the new value, and hide a real
      // read-before-write bug.
      const hit = rows.find((r) => matches(r, where));
      return hit ? { ...hit } : null;
    },
    findMany: async ({
      where,
      orderBy,
    }: { where?: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> } = {}) => {
      const hit = rows.filter((r) => matches(r, where));
      const key = orderBy ? Object.keys(orderBy)[0] : null;
      if (key) {
        const dir = (orderBy as Record<string, "asc" | "desc">)[key];
        hit.sort((a, b) => {
          const av = Number(a[`__seq`] ?? 0);
          const bv = Number(b[`__seq`] ?? 0);
          return dir === "asc" ? av - bv : bv - av;
        });
      }
      return hit;
    },
    count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
      rows.filter((r) => matches(r, where)).length,
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

const TABLE_NAMES = [
  "aIVendor",
  "aISystem",
  "riskClassification",
  "aIPolicy",
  "oversightGate",
  "aIIncident",
  "aIAssessment",
  "aIAssessmentTemplate",
  "auditLog",
  "legalHold",
] as const;

let db: Record<string, ReturnType<typeof makeTable>> & {
  organization: ReturnType<typeof makeTable>;
  sampleRecord: ReturnType<typeof makeTable>;
};

/**
 * The sample record table needs creation order, because removal walks it in
 * reverse. A monotonic counter stands in for createdAt.
 */
function makeSampleTable() {
  const table = makeTable("sample");
  let seq = 0;
  const create = table.create;
  return Object.assign(table, {
    create: async ({ data }: { data: Row }) => {
      seq += 1;
      return create({ data: { ...data, __seq: seq, createdAt: new Date(2026, 0, seq) } });
    },
  });
}

// createUnifiedAssessmentDraft loads a resolved scope, which needs the whole
// registry include. The example's use of it is "the product's own creation
// path"; what this file tests is the bookkeeping, so the draft is stubbed to
// return the two ids it would have created and to create those rows.
vi.mock("@/server/services/program/starter-artifacts", () => ({
  createUnifiedAssessmentDraft: async (
    prisma: { aIAssessmentTemplate: { create: (a: { data: Row }) => Promise<Row> }; aIAssessment: { create: (a: { data: Row }) => Promise<Row> } },
    args: { organizationId: string; aiSystemId: string; userId: string },
  ) => {
    const template = await prisma.aIAssessmentTemplate.create({
      data: { organizationId: args.organizationId, name: "Unified", type: "CUSTOM", sections: [] },
    });
    const assessment = await prisma.aIAssessment.create({
      data: {
        organizationId: args.organizationId,
        aiSystemId: args.aiSystemId,
        templateId: template.id,
        title: "Unified",
        type: "CUSTOM",
        createdBy: args.userId,
        responses: {},
      },
    });
    return {
      created: true as const,
      assessmentId: assessment.id as string,
      templateId: template.id as string,
      overlayTags: [],
    };
  },
}));

import {
  createWorkedExample,
  getSampleIds,
  getSampleStatus,
  removeWorkedExample,
} from "./worked-example";

type Prisma = Parameters<typeof createWorkedExample>[0];

beforeEach(() => {
  db = {
    organization: makeTable("org"),
    sampleRecord: makeSampleTable(),
  } as typeof db;
  for (const name of TABLE_NAMES) db[name] = makeTable(name);
  db.organization.__set([
    { id: "org-a", name: "A firm", operatingJurisdictions: [], jurisdictionsReviewedAt: null },
    { id: "org-b", name: "B firm", operatingJurisdictions: ["US_TX"], jurisdictionsReviewedAt: null },
  ]);
});

const prisma = () => db as unknown as Prisma;

const add = (organizationId: string) =>
  createWorkedExample(prisma(), { organizationId, userId: "user-1", locale: "en" });

describe("adding the worked example", () => {
  it("creates the systems, their classifications, the vendor, the policy, the gate, the incident and the assessment", async () => {
    const result = await add("org-a");
    expect(result.created).toBe(true);
    expect(result.counts.AISystem).toBe(EXAMPLE_SYSTEMS.length);
    expect(result.counts.RiskClassification).toBe(EXAMPLE_SYSTEMS.length);
    expect(result.counts.AIVendor).toBe(1);
    expect(result.counts.AIPolicy).toBe(1);
    expect(result.counts.OversightGate).toBe(1);
    expect(result.counts.AIIncident).toBe(1);
    expect(result.counts.AIAssessment).toBe(1);
    expect(result.counts.AIAssessmentTemplate).toBe(1);
  });

  it("records the answers on the assessment, so the document reads as a real one", async () => {
    await add("org-a");
    const assessment = db.aIAssessment.__rows()[0];
    const responses = assessment.responses as Record<string, string>;
    expect(Object.keys(responses).length).toBeGreaterThan(8);
    expect(responses.sys_description).toMatch(/gradient-boosted/);
    expect(assessment.status).toBe("IN_PROGRESS");
  });

  it("links the high-risk system to the example vendor", async () => {
    await add("org-a");
    const vendor = db.aIVendor.__rows()[0];
    const linked = db.aISystem.__rows().filter((s) => s.vendorId === vendor.id);
    expect(linked).toHaveLength(1);
    expect(String(linked[0].name)).toMatch(/screening/i);
  });

  it("registers every record it created, and nothing else", async () => {
    await add("org-a");
    const ids = await getSampleIds(prisma(), "org-a");
    expect(new Set(ids.AISystem)).toEqual(new Set(db.aISystem.__rows().map((r) => r.id)));
    expect(ids.AIVendor).toEqual(db.aIVendor.__rows().map((r) => r.id));
    // The organisation row is bookkeeping and never shown as a record.
    expect(ids.Organization).toBeUndefined();
  });

  it("writes an audit entry naming the version", async () => {
    await add("org-a");
    const entry = db.auditLog.__rows().find((r) => r.action === "CREATE_SAMPLE_DATA");
    expect(entry).toBeDefined();
    expect((entry!.changes as { version: string }).version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("is never added twice", async () => {
    await add("org-a");
    const before = db.aISystem.__rows().length;
    const second = await add("org-a");
    expect(second.created).toBe(false);
    expect(second.reason).toBe("already-present");
    expect(db.aISystem.__rows()).toHaveLength(before);
  });
});

describe("the jurisdiction it declares", () => {
  it("declares one when the organisation has declared none", async () => {
    const result = await add("org-a");
    expect(result.declaredJurisdictions).toBe(true);
    const org = db.organization.__rows().find((o) => o.id === "org-a")!;
    expect(org.operatingJurisdictions).toEqual([...WORKED_EXAMPLE_JURISDICTIONS]);
  });

  it("never overwrites a declaration the organisation has already made", async () => {
    const result = await add("org-b");
    expect(result.declaredJurisdictions).toBe(false);
    const org = db.organization.__rows().find((o) => o.id === "org-b")!;
    expect(org.operatingJurisdictions).toEqual(["US_TX"]);
  });

  it("puts the previous value back on removal", async () => {
    await add("org-a");
    const removal = await removeWorkedExample(prisma(), { organizationId: "org-a", userId: "user-1" });
    expect(removal.jurisdictionsRestored).toBe(true);
    const org = db.organization.__rows().find((o) => o.id === "org-a")!;
    expect(org.operatingJurisdictions).toEqual([]);
    expect(org.jurisdictionsReviewedAt).toBeNull();
  });

  it("leaves the organisation itself in place", async () => {
    await add("org-a");
    await removeWorkedExample(prisma(), { organizationId: "org-a", userId: "user-1" });
    expect(db.organization.__rows().map((o) => o.id)).toEqual(["org-a", "org-b"]);
  });
});

describe("removing the worked example", () => {
  it("removes every record it created", async () => {
    await add("org-a");
    const result = await removeWorkedExample(prisma(), { organizationId: "org-a", userId: "user-1" });
    expect(result.removed).toBeGreaterThan(0);
    for (const name of ["aISystem", "riskClassification", "aIVendor", "aIPolicy", "oversightGate", "aIIncident", "aIAssessment", "aIAssessmentTemplate"] as const) {
      expect(db[name].__rows().filter((r) => r.organizationId === "org-a"), name).toEqual([]);
    }
    expect(await getSampleStatus(prisma(), "org-a")).toMatchObject({ present: false, total: 0 });
  });

  it("does not touch anything the person created themselves", async () => {
    await add("org-a");
    // Their own work, in the same tables, in the same organisation.
    const mine = await db.aISystem.create({
      data: { organizationId: "org-a", name: "Our own model", technique: "NLP", role: "DEPLOYER" },
    });
    const myPolicy = await db.aIPolicy.create({
      data: { organizationId: "org-a", title: "Our own policy", type: "AI_USAGE", createdBy: "user-1" },
    });

    await removeWorkedExample(prisma(), { organizationId: "org-a", userId: "user-1" });

    expect(db.aISystem.__rows().map((r) => r.id)).toEqual([mine.id]);
    expect(db.aIPolicy.__rows().map((r) => r.id)).toEqual([myPolicy.id]);
  });

  it("does not touch another organisation's records", async () => {
    await add("org-a");
    await add("org-b");
    const bIds = new Set(db.aISystem.__rows().filter((r) => r.organizationId === "org-b").map((r) => r.id));
    expect(bIds.size).toBe(EXAMPLE_SYSTEMS.length);

    await removeWorkedExample(prisma(), { organizationId: "org-a", userId: "user-1" });

    const left = db.aISystem.__rows();
    expect(left.every((r) => r.organizationId === "org-b")).toBe(true);
    expect(new Set(left.map((r) => r.id))).toEqual(bIds);
    // And org-b still holds its own sample records.
    expect(await getSampleStatus(prisma(), "org-b")).toMatchObject({ present: true });
  });

  it("counts a record already deleted by hand rather than failing", async () => {
    await add("org-a");
    const first = db.aISystem.__rows()[0];
    await db.aISystem.deleteMany({ where: { id: first.id, organizationId: "org-a" } });
    const result = await removeWorkedExample(prisma(), { organizationId: "org-a", userId: "user-1" });
    // deleteMany on a missing row is a no-op, not a throw, so it still counts as
    // removed; what matters is that removal completes and the list is cleared.
    expect(result.removed + result.alreadyGone).toBeGreaterThan(0);
    expect(await getSampleStatus(prisma(), "org-a")).toMatchObject({ present: false });
  });

  it("writes an audit entry", async () => {
    await add("org-a");
    await removeWorkedExample(prisma(), { organizationId: "org-a", userId: "user-1" });
    expect(db.auditLog.__rows().some((r) => r.action === "DELETE_SAMPLE_DATA")).toBe(true);
  });
});
