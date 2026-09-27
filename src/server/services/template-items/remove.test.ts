// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Remove all template items" removes exactly the template-created rows nobody
 * has edited, keeps everything a person touched, and never reaches another
 * organisation's data. Tested against an in-memory Prisma that honours the
 * where-operators the service uses (equality, null, not, in, notIn, OR).
 */

import { describe, expect, it } from "vitest";
import { planTemplateRemoval, removeTemplateItems } from "./remove";

type Row = Record<string, unknown>;

function matchOne(row: Row, key: string, cond: unknown): boolean {
  if (key === "OR") return (cond as Row[]).some((c) => matches(row, c));
  if (cond === null) return row[key] === null || row[key] === undefined;
  if (cond && typeof cond === "object" && !Array.isArray(cond)) {
    const c = cond as Record<string, unknown>;
    if ("in" in c) return (c.in as unknown[]).includes(row[key]);
    if ("notIn" in c) return !(c.notIn as unknown[]).includes(row[key]);
    if ("not" in c) return c.not === null ? row[key] != null : row[key] !== c.not;
    return true;
  }
  return row[key] === cond;
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, v]) => matchOne(row, k, v));
}

interface FakeTable {
  findMany: (args?: { where?: Row }) => Promise<Row[]>;
  count: (args?: { where?: Row }) => Promise<number>;
  create: (args: { data: Row }) => Promise<Row>;
  deleteMany: (args?: { where?: Row }) => Promise<{ count: number }>;
  __rows: () => Row[];
}

function table(initial: Row[] = []): FakeTable {
  let rows = initial.map((r) => ({ ...r }));
  return {
    findMany: async ({ where }: { where?: Row } = {}) => rows.filter((r) => matches(r, where)),
    count: async ({ where }: { where?: Row } = {}) => rows.filter((r) => matches(r, where)).length,
    create: async ({ data }: { data: Row }) => {
      rows.push({ ...data });
      return { ...data };
    },
    deleteMany: async ({ where }: { where?: Row } = {}) => {
      const before = rows.length;
      rows = rows.filter((r) => !matches(r, where));
      return { count: before - rows.length };
    },
    __rows: () => rows,
  };
}

function makePrisma() {
  const tables = {
    aISystem: table(),
    aIVendor: table(),
    aIAssessment: table(),
    riskClassification: table(),
    oversightGate: table(),
    complianceMapping: table(),
    transparencyProfile: table(),
    aIVendorAssessment: table(),
    legalHold: table(),
    auditLog: table(),
  };
  return Object.assign(tables, {
    $transaction: async (fn: (tx: typeof tables) => Promise<unknown>) => fn(tables),
  });
}

const ORG = "o1";
const OTHER = "o2";
const T = { provenance: "AUTO_TEMPLATE" as const, confirmedAt: null as Date | null };

function seed() {
  const p = makePrisma();
  // Systems ------------------------------------------------------------------
  p.aISystem.create({ data: { id: "sysA", organizationId: ORG, ...T } }); // removable
  p.aISystem.create({ data: { id: "sysB", organizationId: ORG, provenance: "AUTO_TEMPLATE", confirmedAt: new Date() } }); // edited → not a candidate
  p.aISystem.create({ data: { id: "sysC", organizationId: ORG, provenance: "USER_ENTERED", confirmedAt: null } }); // not template
  p.aISystem.create({ data: { id: "sysD", organizationId: ORG, ...T } }); // kept: confirmed risk child
  p.aISystem.create({ data: { id: "sysE", organizationId: ORG, ...T } }); // kept: submitted assessment
  p.aISystem.create({ data: { id: "sysO2", organizationId: OTHER, ...T } }); // other org — never touched
  // Confirmed child keeps sysD.
  p.riskClassification.create({ data: { id: "rcD", organizationId: ORG, aiSystemId: "sysD", confirmedAt: new Date() } });
  // A submitted assessment keeps sysE.
  p.aIAssessment.create({ data: { id: "assE", organizationId: ORG, aiSystemId: "sysE", ...T, status: "UNDER_REVIEW" } });
  // Vendors ------------------------------------------------------------------
  p.aIVendor.create({ data: { id: "venA", organizationId: ORG, ...T } }); // removable
  p.aIVendor.create({ data: { id: "venB", organizationId: ORG, ...T } }); // kept: completed review
  p.aIVendor.create({ data: { id: "venC", organizationId: ORG, ...T } }); // kept: linked to kept sysB
  p.aIVendorAssessment.create({ data: { id: "revB", organizationId: ORG, vendorId: "venB", completedAt: new Date() } });
  // sysB (kept) references venC.
  p.aISystem.create({ data: { id: "sysBlink", organizationId: ORG, provenance: "USER_ENTERED", confirmedAt: null, vendorId: "venC" } });
  // Standalone assessments ---------------------------------------------------
  p.aIAssessment.create({ data: { id: "assStandalone", organizationId: ORG, aiSystemId: "sysC", ...T, status: "DRAFT" } }); // removable
  p.aIAssessment.create({ data: { id: "assOnSysA", organizationId: ORG, aiSystemId: "sysA", ...T, status: "DRAFT" } }); // cascade, not counted
  return p;
}

describe("planTemplateRemoval", () => {
  it("splits template items into remove vs keep by the edited signal", async () => {
    const p = seed();
    const plan = await planTemplateRemoval(p as never, ORG);

    expect(plan.removeIds.systems).toEqual(["sysA"]);
    expect(plan.systems).toEqual({ remove: 1, keep: 2 }); // sysD, sysE kept
    expect(plan.removeIds.vendors).toEqual(["venA"]);
    expect(plan.vendors).toEqual({ remove: 1, keep: 2 }); // venB, venC kept
    expect(plan.removeIds.assessments).toEqual(["assStandalone"]);
    // assE is a submitted template assessment on a kept system → kept.
    expect(plan.assessments).toEqual({ remove: 1, keep: 1 });
    expect(plan.totalRemove).toBe(3);
  });
});

describe("removeTemplateItems", () => {
  it("removes only the unedited template rows and records it", async () => {
    const p = seed();
    const res = await removeTemplateItems(p as never, { organizationId: ORG, userId: "u1" });
    expect(res).toEqual({ systems: 1, vendors: 1, assessments: 1, total: 3 });

    const systemIds = p.aISystem.__rows().map((r) => r.id);
    expect(systemIds).not.toContain("sysA");
    expect(systemIds).toContain("sysB");
    expect(systemIds).toContain("sysD");
    expect(systemIds).toContain("sysO2"); // other org untouched

    expect(p.aIVendor.__rows().map((r) => r.id)).not.toContain("venA");
    expect(p.aIVendor.__rows().map((r) => r.id)).toEqual(expect.arrayContaining(["venB", "venC"]));
    expect(p.aIAssessment.__rows().map((r) => r.id)).not.toContain("assStandalone");

    const audit = p.auditLog.__rows();
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe("DELETE_TEMPLATE_ITEMS");
  });

  it("refuses while a legal hold is in force", async () => {
    const p = seed();
    p.legalHold.create({ data: { id: "h1", organizationId: ORG, releasedAt: null, aiSystemId: null, matter: "Matter X", issuedAt: new Date() } });
    await expect(removeTemplateItems(p as never, { organizationId: ORG, userId: "u1" })).rejects.toThrow();
    // Nothing deleted.
    expect(p.aISystem.__rows().map((r) => r.id)).toContain("sysA");
  });
});
