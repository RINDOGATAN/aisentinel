// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory database fake for the tests */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/server/services/pilot/caps", () => ({ pilotRemaining: async () => Infinity }));
vi.mock("@/server/services/ai-system/number", () => ({ nextSystemNumber: async () => 1 }));

import {
  createLink,
  importFromDpoCentral,
  jurisdictionsFromLaws,
  readLink,
  removeLink,
  syncRound,
  type DpcLinkSystem,
} from "../dpc-link";

type Row = Record<string, any>;

function getPath(obj: any, path: string[]) {
  return path.reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
}
function matches(row: Row, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]: [string, any]) => {
    if (k === "OR") return (v as any[]).some((w) => matches(row, w));
    if (k === "NOT") return !matches(row, v);
    if (v && typeof v === "object" && "path" in v) return getPath(row[k], v.path) === v.equals;
    if (v && typeof v === "object" && "in" in v) return (v.in as any[]).includes(row[k]);
    if (v && typeof v === "object" && "not" in v) return row[k] !== v.not;
    if (v && typeof v === "object" && "startsWith" in v) return String(row[k] ?? "").startsWith(v.startsWith);
    if (v && typeof v === "object" && "equals" in v) return String(row[k]).toLowerCase() === String(v.equals).toLowerCase();
    return row[k] === v;
  });
}
function table(rows: Row[], prefix: string) {
  return {
    rows,
    findFirst: async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null,
    findMany: async ({ where }: any = {}) => rows.filter((r) => matches(r, where)),
    findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
    count: async ({ where }: any = {}) => rows.filter((r) => matches(r, where)).length,
    create: async ({ data }: any) => {
      const row = { id: `${prefix}-${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const row = rows.find((r) => r.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
  };
}

let db: any;
beforeEach(() => {
  db = {
    aIVendor: table([], "ven"),
    aISystem: table([], "sys"),
    vendorCatalog: table([{ id: "c1", slug: "openai" }], "cat"),
    organization: table([{ id: "org-1", name: "Acme", settings: {}, operatingJurisdictions: ["US_CA"] }], "org"),
    auditLog: { rows: [] as Row[], createMany: async ({ data }: any) => db.auditLog.rows.push(...data), create: async ({ data }: any) => db.auditLog.rows.push(data) },
  };
});

const system = (over: Partial<DpcLinkSystem> = {}): DpcLinkSystem => ({
  dpcId: "dpc-s1",
  name: "Support chatbot",
  vendorDpcId: "dpc-v1",
  vendorName: "OpenAI",
  processing: {
    activities: [{ id: "pa1", name: "Customer support" }],
    dataCategories: [{ code: "CONTACT", en: "Contact details", es: "Datos de contacto" }],
    dataSubjects: ["Customers"],
    legalBases: [{ code: "CONTRACT", en: "Contract", es: "Contrato" }],
  },
  dpia: { state: "due", url: "https://dpc.example/privacy/assessments" },
  ...over,
});

describe("declared laws", () => {
  it("maps DPO Central regions, national EU laws to the EU, and leaves out unknown ones", () => {
    expect(
      jurisdictionsFromLaws([
        { code: "GDPR", region: "EU" },
        { code: "LOPDGDD", region: "ES" },
        { code: "CCPA", region: "US-CA" },
        { code: "MCDPA", region: "US-MT" },
        { code: "UK-GDPR", region: "UK" },
      ]).sort(),
    ).toEqual(["EU", "UK", "US_CA"]);
  });
});

describe("import from DPO Central", () => {
  it("creates vendors and systems as imported drafts with the processing context, once", async () => {
    const vendors = [{ dpcId: "dpc-v1", name: "OpenAI", catalogSlug: "openai" }];
    const first = await importFromDpoCentral(db, "org-1", "u1", vendors, [system()]);
    expect(first.createdVendors).toBe(1);
    expect(first.createdSystems).toBe(1);
    const v = db.aIVendor.rows[0];
    expect(v).toMatchObject({ provenance: "IMPORTED", catalogSlug: "openai", dpoCentralVendorId: "dpc-v1", status: "UNDER_REVIEW" });
    const s = db.aISystem.rows[0];
    expect(s).toMatchObject({ provenance: "IMPORTED", status: "DRAFT", vendorId: v.id, processesPersonalData: true });
    expect(s.metadata.dpoCentral.dpia.state).toBe("due");
    expect(s.metadata.dpoCentral.legalBases[0].es).toBe("Contrato");

    const second = await importFromDpoCentral(db, "org-1", "u1", vendors, [system()]);
    expect(second.createdVendors).toBe(0);
    expect(second.createdSystems).toBe(0);
    expect(db.aIVendor.rows).toHaveLength(1);
    expect(db.aISystem.rows).toHaveLength(1);
  });

  it("does not set a catalogue slug that this catalogue does not have", async () => {
    await importFromDpoCentral(db, "org-1", null, [{ dpcId: "v9", name: "Local tool", catalogSlug: "nope" }], []);
    expect(db.aIVendor.rows[0].catalogSlug).toBeNull();
  });
});

describe("the link", () => {
  it("records the link, adds the declared laws, and refuses a second DPO Central organisation", async () => {
    const out = await createLink(db, {
      organizationId: "org-1",
      userId: "u1",
      email: "o@x.test",
      settings: {},
      dpc: { id: "dpc-org", name: "Acme ES", laws: [{ code: "GDPR", region: "EU" }] },
      vendors: [],
      systems: [system({ vendorDpcId: null })],
    });
    expect(out.ok).toBe(true);
    const org = db.organization.rows[0];
    expect(readLink(org.settings)).toMatchObject({ active: true, dpcOrganizationId: "dpc-org" });
    expect(org.operatingJurisdictions.sort()).toEqual(["EU", "US_CA"]);
    expect(db.auditLog.rows.some((r: Row) => r.action === "SUITE_LINK_CREATED")).toBe(true);

    const again = await createLink(db, {
      organizationId: "org-1",
      userId: "u1",
      email: "o@x.test",
      settings: org.settings,
      dpc: { id: "other", name: "Other", laws: [] },
      vendors: [],
      systems: [],
    });
    expect(again.ok).toBe(false);
  });

  it("unlinking keeps the imported records", async () => {
    await createLink(db, {
      organizationId: "org-1", userId: "u1", email: "o@x.test", settings: {},
      dpc: { id: "dpc-org", name: "Acme ES", laws: [] }, vendors: [], systems: [system({ vendorDpcId: null })],
    });
    await removeLink(db, "org-1", "u1", "aisentinel");
    expect(readLink(db.organization.rows[0].settings)?.active).toBe(false);
    expect(db.aISystem.rows).toHaveLength(1);
  });
});

describe("sync round", () => {
  it("notes systems removed in DPO Central, never deletes, and returns what was created here", async () => {
    await importFromDpoCentral(db, "org-1", null, [], [system({ vendorDpcId: null })]);
    db.aISystem.rows.push({ id: "own-1", organizationId: "org-1", name: "Own tool", status: "DRAFT", metadata: null, vendorId: null, vendor: null });
    const round = await syncRound(db, {
      organizationId: "org-1",
      vendors: [],
      systems: [],
      knownAisSystemIds: ["own-1", "gone"],
      knownAisVendorIds: [],
    });
    const imported = db.aISystem.rows.find((r: Row) => r.metadata?.importedFrom === "dpocentral");
    expect(imported.metadata.suiteNote.kind).toBe("removedInDpoCentral");
    expect(db.aISystem.rows).toHaveLength(2);
    expect(round.aisSystems.map((s) => s.aisId)).toEqual(["own-1"]);
    expect(round.presentAisSystemIds).toEqual(["own-1"]);
  });
});
