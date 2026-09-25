// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Start from another client" (directive D5), proved against an in-memory
 * database with two organisations:
 *
 *  - the copy scope: each part copies what it names and nothing more, as
 *    drafts, with approvals, people and dates left behind;
 *  - the never-copy list: no write ever reaches a table on it, whatever is
 *    ticked (the one audit entry in the target is the copy's own);
 *  - the scrub: the source's name is replaced, other pointers are flagged;
 *  - confidentiality: nothing written to the target names or points at the
 *    source (no name, id, slug or domain);
 *  - the permission rule: owner or admin of both, and never the same one.
 *
 * All names are invented.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { COPY_PARTS, NEVER_COPY, CLIENT_TEMPLATE_REF, effectiveParts } from "@/config/client-template";
import { applyClientTemplate, assertTemplatePermission, planClientTemplate } from "./copy";

type Row = Record<string, unknown>;

const SRC = "org-src-7f3a";
const TGT = "org-tgt-19c2";
const USER = "user-1";
const NOW = new Date("2026-09-25T10:00:00Z");

function seed() {
  return {
    organization: [
      {
        id: SRC,
        name: "Northwind Holdings Ltd",
        slug: "northwind-holdings",
        domain: "northwind.example",
        operatingJurisdictions: ["EU", "US_CO"],
        settings: { regimes: { isPublicAgency: "NO", isHealthCarrier: "YES", other: "NOT_ASSESSED" } },
      },
      { id: TGT, name: "Bluefield Partners", slug: "bluefield", domain: null, operatingJurisdictions: [], settings: {} },
    ] as Row[],
    organizationMember: [
      { organizationId: SRC, userId: USER, role: "OWNER" },
      { organizationId: TGT, userId: USER, role: "ADMIN" },
    ] as Row[],
    aIPolicy: [
      {
        id: "pol-1", organizationId: SRC, title: "Northwind Holdings Ltd acceptable use", type: "AI_USAGE",
        description: "Rules for staff", content: "Staff of Northwind Holdings Ltd must ask privacy@northwind.example.",
        status: "APPROVED", approvedBy: "someone", approvedAt: new Date(), createdAt: new Date(1),
      },
      {
        id: "pol-2", organizationId: SRC, title: "Old policy", type: "CUSTOM", description: null, content: null,
        status: "ARCHIVED", createdAt: new Date(2),
      },
    ] as Row[],
    aIPolicyVersion: [] as Row[],
    aIAssessmentTemplate: [
      {
        id: "tpl-1", organizationId: SRC, name: "Vendor AI questionnaire", type: "CUSTOM", description: null,
        sections: [{ id: "s", title: "Scope", questions: [{ id: "q", text: "Is the tool used at Northwind?" }] }],
        frameworkRef: null, isSystem: false, createdAt: new Date(1),
      },
      { id: "tpl-sys", organizationId: null, name: "FRIA", type: "FRIA", sections: [], isSystem: true, createdAt: new Date(0) },
    ] as Row[],
    aIVendor: [
      {
        id: "ven-1", organizationId: SRC, name: "ChatTool", website: "https://chattool.example", description: "LLM",
        riskLevel: "HIGH", notes: null, catalogSlug: "chattool", contactName: "A Person", contactEmail: "a@chattool.example",
        contractStartDate: new Date(), dpoCentralVendorId: "dpo-9", status: "APPROVED", metadata: null, createdAt: new Date(1),
      },
    ] as Row[],
    aIVendorAssessment: [
      {
        id: "va-1", vendorId: "ven-1", organizationId: SRC, title: "Due diligence", status: "COMPLETED",
        findings: "No training on customer data.", responses: { q1: "yes" }, riskScore: 40,
        completedBy: "someone", completedAt: new Date(), createdAt: new Date(1),
      },
    ] as Row[],
    aISystem: [
      {
        id: "sys-1", organizationId: SRC, name: "Support assistant", description: "Answers tickets", technique: "GENERATIVE_AI",
        role: "DEPLOYER", purpose: "Support", processesPersonalData: true, vendorId: "ven-1",
        businessOwner: "B Person", technicalOwner: "C Person", status: "DEPLOYED", metadata: { regimeFacts: { x: "YES" } },
        createdAt: new Date(1),
      },
    ] as Row[],
    oversightGate: [
      {
        id: "g-1", organizationId: SRC, aiSystemId: "sys-1", gateType: "PRE_DEPLOYMENT", description: "Sign-off",
        reviewCadence: "quarterly", status: "PASSED", assignedTo: "D Person", provenance: "USER_ENTERED",
        confirmedAt: new Date(), createdAt: new Date(1),
      },
    ] as Row[],
    auditLog: [] as Row[],
  };
}

type Store = ReturnType<typeof seed>;

function matches(row: Row, where: Row = {}): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      const cond = v as Row;
      if ("not" in cond && row[k] === cond.not) return false;
      if ("in" in cond && !(cond.in as unknown[]).includes(row[k])) return false;
      continue;
    }
    if (row[k] !== v) return false;
  }
  return true;
}

let n = 0;
/** A fake Prisma that records every write, by delegate. */
function fakeDb(store: Store) {
  const writes: { delegate: string; method: string; data: unknown }[] = [];
  const delegate = (name: keyof Store) => ({
    findFirst: async ({ where }: { where: Row }) => store[name].find((r) => matches(r, where)) ?? null,
    findMany: async ({ where, select }: { where: Row; select?: Row }) =>
      store[name]
        .filter((r) => matches(r, where))
        .map((r) => {
          const out: Row = { ...r };
          if (name === "aIVendor" && select?.assessments) {
            out.assessments = store.aIVendorAssessment.filter((a) => a.vendorId === r.id);
          }
          if (name === "aISystem") {
            out.vendor = store.aIVendor.find((v) => v.id === r.vendorId) ?? null;
            if (select?.oversightGates) out.oversightGates = store.oversightGate.filter((g) => g.aiSystemId === r.id);
          }
          return out;
        }),
    create: async ({ data }: { data: Row }) => {
      writes.push({ delegate: name, method: "create", data });
      const row = { id: `new-${++n}`, ...data };
      store[name].push(row);
      return row;
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      writes.push({ delegate: name, method: "update", data: { where, data } });
      const row = store[name].find((r) => matches(r, where))!;
      Object.assign(row, data);
      return row;
    },
  });
  const db = Object.fromEntries(Object.keys(store).map((k) => [k, delegate(k as keyof Store)]));
  return { db: db as never, writes };
}

let store: Store;
let db: never;
let writes: { delegate: string; method: string; data: unknown }[];

beforeEach(() => {
  store = seed();
  ({ db, writes } = fakeDb(store));
});

async function copy(parts: readonly (typeof COPY_PARTS)[number][]) {
  const plan = await planClientTemplate(db, {
    sourceOrganizationId: SRC,
    targetOrganizationId: TGT,
    targetName: "Bluefield Partners",
    parts,
  });
  const result = await applyClientTemplate(db, plan, {
    targetOrganizationId: TGT,
    userId: USER,
    locale: "en",
    now: NOW,
  });
  return { plan, result };
}

const inTarget = <K extends keyof Store>(k: K) => store[k].filter((r) => r.organizationId === TGT);

describe("the copy scope", () => {
  it("copies policies as unconfirmed drafts, never approved, and skips archived ones", async () => {
    await copy(["policies"]);
    const policies = inTarget("aIPolicy");
    expect(policies).toHaveLength(1);
    expect(policies[0]).toMatchObject({
      title: "Bluefield Partners acceptable use",
      status: "DRAFT",
      provenance: "AUTO_TEMPLATE",
      sourceRef: CLIENT_TEMPLATE_REF,
      createdBy: USER,
    });
    expect(policies[0].approvedBy).toBeUndefined();
    expect(policies[0].approvedAt).toBeUndefined();
    expect(policies[0].confirmedAt).toBeUndefined();
  });

  it("copies the organisation's own assessment templates, not the built-in ones", async () => {
    await copy(["assessmentTemplates"]);
    const templates = inTarget("aIAssessmentTemplate");
    expect(templates.map((t) => t.name)).toEqual(["Vendor AI questionnaire"]);
    expect(templates[0].isSystem).toBe(false);
  });

  it("copies vendors without contacts, contract dates or links to other apps, marked for review", async () => {
    await copy(["vendors"]);
    const [vendor] = inTarget("aIVendor");
    expect(vendor).toMatchObject({ name: "ChatTool", catalogSlug: "chattool", status: "UNDER_REVIEW" });
    for (const field of ["contactName", "contactEmail", "contractStartDate", "dpoCentralVendorId"]) {
      expect(vendor[field], field).toBeUndefined();
    }
    expect(vendor.metadata).toEqual({ templateCopy: { pending: true, copiedAt: NOW.toISOString() } });
    // Reviews were not ticked.
    expect(inTarget("aIVendorAssessment")).toEqual([]);
  });

  it("copies vendor reviews' findings as drafts carrying the review note", async () => {
    await copy(["vendors", "vendorReviews"]);
    const [review] = inTarget("aIVendorAssessment");
    expect(review.status).toBe("DRAFT");
    expect(review.findings).toBe("Copied from a template. Review for this client.\n\nNo training on customer data.");
    expect(review.completedBy).toBeUndefined();
    expect(review.completedAt).toBeUndefined();
  });

  it("copies AI systems only when chosen, as drafts without owners or screening facts", async () => {
    await copy(["policies", "vendors"]);
    expect(inTarget("aISystem")).toEqual([]);

    await copy(["aiSystems"]);
    const [system] = inTarget("aISystem");
    expect(system).toMatchObject({ name: "Support assistant", status: "DRAFT", technique: "GENERATIVE_AI" });
    expect(system.businessOwner).toBeUndefined();
    expect(system.technicalOwner).toBeUndefined();
    expect(system.metadata).toEqual({ templateCopy: { pending: true, copiedAt: NOW.toISOString() } });
    // The vendor copied earlier is found by name and linked.
    expect(system.vendorId).toBe(inTarget("aIVendor")[0].id);
  });

  it("copies gate definitions with their systems, pending and unassigned", async () => {
    await copy(["aiSystems", "oversightGates"]);
    const [gate] = inTarget("oversightGate");
    expect(gate).toMatchObject({
      gateType: "PRE_DEPLOYMENT",
      reviewCadence: "quarterly",
      status: "PENDING",
      provenance: "AUTO_TEMPLATE",
      sourceRef: CLIENT_TEMPLATE_REF,
      aiSystemId: inTarget("aISystem")[0].id,
    });
    expect(gate.assignedTo).toBeUndefined();
    expect(gate.confirmedAt).toBeUndefined();
  });

  it("never copies gates or reviews without their parent", () => {
    expect(effectiveParts(["oversightGates", "vendorReviews"])).toEqual([]);
    expect(effectiveParts(["aiSystems", "oversightGates"])).toEqual(["aiSystems", "oversightGates"]);
  });

  it("copies jurisdictions and only real screening answers, marked for review", async () => {
    await copy(["obligations"]);
    const target = store.organization.find((o) => o.id === TGT)!;
    expect(target.operatingJurisdictions).toEqual(["EU", "US_CO"]);
    expect((target.settings as Row).regimes).toEqual({ isPublicAgency: "NO", isHealthCarrier: "YES" });
    expect((target.settings as Row).templateCopy).toEqual({ pending: true, copiedAt: NOW.toISOString() });
  });

  it("never overwrites what the target already has", async () => {
    const target = store.organization.find((o) => o.id === TGT)!;
    target.operatingJurisdictions = ["UK"];
    target.settings = { regimes: { isHealthCarrier: "NO" } };
    store.aIPolicy.push({ id: "own", organizationId: TGT, title: "Bluefield Partners acceptable use", type: "AI_USAGE" });

    const { plan } = await copy(["policies", "obligations"]);
    expect(plan.skipped.policies).toBe(1);
    expect(inTarget("aIPolicy")).toHaveLength(1);
    expect(target.operatingJurisdictions).toEqual(["UK"]);
    expect((target.settings as Row).regimes).toEqual({ isHealthCarrier: "NO", isPublicAgency: "NO" });
  });
});

describe("the never-copy list", () => {
  it("writes to none of its tables whatever is ticked, apart from the copy's own audit entry", async () => {
    await copy(COPY_PARTS);
    const touched = new Set(writes.map((w) => w.delegate));
    for (const table of NEVER_COPY) {
      if (table === "auditLog") continue;
      expect(touched.has(table), table).toBe(false);
    }
    expect(writes.filter((w) => w.delegate === "auditLog")).toHaveLength(1);
    // Nothing is ever written to the source.
    for (const w of writes) {
      const data = w.data as Row;
      if ("organizationId" in data) expect(data.organizationId).toBe(TGT);
    }
    expect(writes.filter((w) => w.method === "update").map((w) => (w.data as { where: Row }).where.id)).toEqual([TGT]);
  });
});

describe("confidentiality between clients", () => {
  it("records the copy in the target's audit trail, dated, naming nothing about the source", async () => {
    await copy(COPY_PARTS);
    const [entry] = store.auditLog;
    expect(entry).toMatchObject({ organizationId: TGT, userId: USER, action: "CREATE_FROM_TEMPLATE" });
    expect((entry.changes as Row).note).toBe("Created from a template on 2026-09-25");
    const text = JSON.stringify(entry);
    for (const secret of [SRC, "Northwind", "northwind"]) expect(text).not.toContain(secret);
  });

  it("writes no reference to the source's id or slug anywhere in the target", async () => {
    await copy(COPY_PARTS);
    const text = JSON.stringify(writes);
    expect(text).not.toContain(SRC);
    expect(text).not.toContain("northwind-holdings");
  });

  it("replaces the full name and lists every other pointer for review", async () => {
    const { plan, result } = await copy(COPY_PARTS);
    expect(plan.replacements).toBeGreaterThanOrEqual(2);
    const byPart = Object.fromEntries(result.flagged.map((f) => [f.part, f]));
    expect(byPart.policies.flags.map((f) => f.term)).toEqual(["northwind.example"]);
    expect(byPart.policies.id).toBe(inTarget("aIPolicy")[0].id);
    expect(byPart.assessmentTemplates.flags.map((f) => f.term)).toEqual(["Northwind"]);
  });
});

describe("the permission rule", () => {
  it("allows an owner or admin of both", async () => {
    await expect(assertTemplatePermission(db, USER, SRC, TGT)).resolves.toBeUndefined();
    await expect(assertTemplatePermission(db, USER, SRC, null)).resolves.toBeUndefined();
  });

  for (const role of ["AI_OFFICER", "MEMBER", "VIEWER"]) {
    it(`refuses a ${role} of the source`, async () => {
      store.organizationMember[0].role = role;
      await expect(assertTemplatePermission(db, USER, SRC, TGT)).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
    it(`refuses a ${role} of the target`, async () => {
      store.organizationMember[1].role = role;
      await expect(assertTemplatePermission(db, USER, SRC, TGT)).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  }

  it("refuses someone who is not a member of the source", async () => {
    await expect(assertTemplatePermission(db, "user-2", SRC, TGT)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses the same organisation as source and target", async () => {
    await expect(assertTemplatePermission(db, USER, TGT, TGT)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
