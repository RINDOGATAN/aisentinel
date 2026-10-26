// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What the program path counts (path-counts.ts), against an in-memory Prisma
 * that evaluates the `where` filters the counts use (relations, `in`,
 * `notIn`, `not`, `some`, `is`, AND / OR / NOT).
 *
 * - The worked example's records, and records hanging off an example system,
 *   never count: an organisation with the example counts exactly as it does
 *   without it, so adding it completes nothing and removing it moves nothing.
 * - Systems and vendors imported from DPO Central count like any other.
 * - Retired systems and terminated vendors are out of the "every system" and
 *   "every vendor" rules.
 */

import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { countedJurisdictions, loadPathCounts, pathScope } from "./path-counts";
import { AI_SENTINEL_PATH } from "@/components/guided/path-config";
import { evaluatePath } from "@/components/guided/path";
import { buildProgressReport } from "./progress-report";

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

/** How each model reaches its relations: one row (`is`) or many (`some`). */
const RELATIONS: Record<string, Record<string, (db: Db, row: Row) => Row | Row[] | null>> = {
  aISystem: {
    riskClassification: (db, r) => db.riskClassification.find((c) => c.aiSystemId === r.id) ?? null,
    assessments: (db, r) => db.aIAssessment.filter((a) => a.aiSystemId === r.id),
    oversightGates: (db, r) => db.oversightGate.filter((g) => g.aiSystemId === r.id),
    sensitiveDataAssessments: (db, r) => db.sensitiveDataAssessment.filter((s) => s.aiSystemId === r.id),
  },
  aIVendor: { assessments: (db, r) => db.aIVendorAssessment.filter((a) => a.vendorId === r.id) },
  aIVendorAssessment: { vendor: (db, r) => db.aIVendor.find((v) => v.id === r.vendorId) ?? null },
  complianceEvidence: {
    complianceMapping: (db, r) => db.complianceMapping.find((m) => m.id === r.complianceMappingId) ?? null,
  },
};
const SYSTEM_CHILDREN = [
  "riskClassification",
  "transparencyProfile",
  "complianceMapping",
  "oversightGate",
  "aIAssessment",
  "sensitiveDataAssessment",
  "aIIncident",
];
for (const model of SYSTEM_CHILDREN) {
  RELATIONS[model] = {
    ...RELATIONS[model],
    aiSystem: (db, r) => db.aISystem.find((s) => s.id === r.aiSystemId) ?? null,
  };
}
const TARGET: Record<string, string> = {
  riskClassification: "riskClassification",
  assessments: "aIAssessment",
  oversightGates: "oversightGate",
  sensitiveDataAssessments: "sensitiveDataAssessment",
  vendor: "aIVendor",
  complianceMapping: "complianceMapping",
  aiSystem: "aISystem",
};

function scalar(value: unknown, cond: unknown): boolean {
  if (cond === null) return value === null || value === undefined;
  if (typeof cond !== "object" || Array.isArray(cond) || cond instanceof Date) return value === cond;
  const c = cond as Record<string, unknown>;
  if ("in" in c && !(c.in as unknown[]).includes(value)) return false;
  // As SQL: NOT IN never matches a null column.
  if ("notIn" in c && (value === null || value === undefined || (c.notIn as unknown[]).includes(value))) return false;
  if ("not" in c && (c.not === null ? value === null || value === undefined : value === c.not)) return false;
  if ("equals" in c && value !== c.equals) return false;
  return true;
}

function match(db: Db, model: string, row: Row | null, where: Record<string, unknown> = {}): boolean {
  if (!row) return false;
  for (const [key, cond] of Object.entries(where)) {
    if (key === "AND") {
      if (!(cond as Row[]).every((w) => match(db, model, row, w))) return false;
    } else if (key === "OR") {
      if (!(cond as Row[]).some((w) => match(db, model, row, w))) return false;
    } else if (key === "NOT") {
      const list = Array.isArray(cond) ? cond : [cond];
      if (list.some((w) => match(db, model, row, w as Row))) return false;
    } else if (RELATIONS[model]?.[key]) {
      const related = RELATIONS[model][key](db, row);
      const c = cond as Record<string, Row>;
      const target = TARGET[key];
      if ("is" in c && !match(db, target, related as Row | null, c.is)) return false;
      if ("some" in c && !(related as Row[]).some((r) => match(db, target, r, c.some))) return false;
    } else if (cond && typeof cond === "object" && "path" in (cond as Row)) {
      const c = cond as { path: string[]; equals: unknown };
      let v: unknown = row[key];
      for (const p of c.path) v = v && typeof v === "object" ? (v as Row)[p] : undefined;
      if (v !== c.equals) return false;
    } else if (cond && typeof cond === "object" && "is" in (cond as Row)) {
      // An embedded one-to-one (agentProfile).
      if (!match(db, key, (row[key] as Row) ?? null, (cond as { is: Row }).is)) return false;
    } else if (!scalar(row[key], cond)) {
      return false;
    }
  }
  return true;
}

function fakePrisma(db: Db): PrismaClient {
  const models = new Proxy({} as Record<string, unknown>, {
    get(_t, model: string) {
      const rows = () => db[model] ?? [];
      return {
        count: async ({ where }: { where?: Row } = {}) => rows().filter((r) => match(db, model, r, where)).length,
        findMany: async ({ where }: { where?: Row } = {}) => rows().filter((r) => match(db, model, r, where)),
        findFirst: async ({ where }: { where?: Row } = {}) =>
          rows().find((r) => match(db, model === "organization" ? "organization" : model, r, where)) ?? null,
      };
    },
  });
  return models as unknown as PrismaClient;
}

const ORG = "org-a";
const now = new Date("2026-10-01T10:00:00Z");

/** An organisation's own records: two systems (one high-risk), a vendor, a policy. */
function own(): Db {
  return {
    organization: [
      {
        id: ORG,
        operatingJurisdictions: ["EU"],
        jurisdictionsReviewedAt: new Date("2026-09-01"),
        settings: {},
      },
    ],
    sampleRecord: [],
    aISystem: [
      { id: "s1", organizationId: ORG, status: "DEPLOYED", businessOwner: "Ana", processesPersonalData: true, role: "DEPLOYER" },
      { id: "s2", organizationId: ORG, status: "DEPLOYED", businessOwner: "Luis", processesPersonalData: false, role: "DEPLOYER" },
    ],
    riskClassification: [
      { id: "c1", organizationId: ORG, aiSystemId: "s1", riskLevel: "HIGH", provenance: "USER_ENTERED", confirmedAt: null },
      { id: "c2", organizationId: ORG, aiSystemId: "s2", riskLevel: "MINIMAL", provenance: "USER_ENTERED", confirmedAt: null },
    ],
    aIVendor: [{ id: "v1", organizationId: ORG, status: "ACTIVE" }],
    aIVendorAssessment: [{ id: "va1", organizationId: ORG, vendorId: "v1", status: "COMPLETED" }],
    aIPolicy: [
      { id: "p1", organizationId: ORG, type: "AI_USAGE", status: "APPROVED", provenance: "USER_ENTERED", confirmedAt: null },
    ],
    oversightGate: [
      { id: "g1", organizationId: ORG, aiSystemId: "s1", provenance: "USER_ENTERED", confirmedAt: null, sourceRef: null },
    ],
    aIAssessment: [{ id: "a1", organizationId: ORG, aiSystemId: "s1", status: "APPROVED" }],
    transparencyProfile: [
      { id: "t1", organizationId: ORG, aiSystemId: "s1", provenance: "USER_ENTERED", confirmedAt: null },
      { id: "t2", organizationId: ORG, aiSystemId: "s2", provenance: "USER_ENTERED", confirmedAt: null },
    ],
    complianceMapping: [
      { id: "m1", organizationId: ORG, aiSystemId: "s1", status: "COMPLIANT", provenance: "USER_ENTERED", confirmedAt: null },
      { id: "m2", organizationId: ORG, aiSystemId: "s2", status: "NOT_ASSESSED", provenance: "USER_ENTERED", confirmedAt: null },
    ],
    complianceEvidence: [{ id: "e1", organizationId: ORG, complianceMappingId: "m1" }],
    sensitiveDataAssessment: [{ id: "sd1", organizationId: ORG, aiSystemId: "s1" }],
    aIIncident: [{ id: "i1", organizationId: ORG, aiSystemId: null, status: "OPEN" }],
    shadowAIReport: [],
    threatModel: [],
    regulatoryProceeding: [],
    boardReport: [],
    auditLog: [{ id: "log1", organizationId: ORG }],
  };
}

/**
 * The same organisation with the worked example added, as createWorkedExample
 * writes it, plus work a person did on the example's records afterwards.
 */
function withExample(): Db {
  const db = own();
  const ex = new Date("2026-10-01T09:00:00Z");
  // The example declares places only where none are declared.
  db.organization[0] = { ...db.organization[0], operatingJurisdictions: [], jurisdictionsReviewedAt: null };
  const declared = { ...db.organization[0], operatingJurisdictions: ["EU", "US_CA"], jurisdictionsReviewedAt: ex };
  db.organization[0] = declared;
  db.aIVendor.push({ id: "xv", organizationId: ORG, status: "UNDER_REVIEW" });
  db.aISystem.push(
    { id: "xs1", organizationId: ORG, status: "DEPLOYED", businessOwner: "HR", processesPersonalData: true, role: "PROVIDER" },
    { id: "xs2", organizationId: ORG, status: "TESTING", businessOwner: null, processesPersonalData: true, role: "DEPLOYER" },
  );
  db.riskClassification.push(
    { id: "xc1", organizationId: ORG, aiSystemId: "xs1", riskLevel: "HIGH", provenance: "USER_ENTERED", confirmedAt: null },
    { id: "xc2", organizationId: ORG, aiSystemId: "xs2", riskLevel: "LIMITED", provenance: "USER_ENTERED", confirmedAt: null },
  );
  db.aIPolicy.push({ id: "xp", organizationId: ORG, type: "AI_INCIDENT_RESPONSE", status: "APPROVED", provenance: "AUTO_TEMPLATE", confirmedAt: null });
  db.oversightGate.push({ id: "xg", organizationId: ORG, aiSystemId: "xs1", provenance: "AUTO_TEMPLATE", confirmedAt: null, sourceRef: null });
  db.aIIncident.push({ id: "xi", organizationId: ORG, aiSystemId: "xs1", status: "RESOLVED" });
  db.aIAssessment.push({ id: "xa", organizationId: ORG, aiSystemId: "xs1", status: "APPROVED" });
  // Work a person did afterwards on the example's records: still the example's.
  db.transparencyProfile.push({ id: "xt", organizationId: ORG, aiSystemId: "xs1", provenance: "AUTO_TEMPLATE", confirmedAt: null });
  db.complianceMapping.push({ id: "xm", organizationId: ORG, aiSystemId: "xs1", status: "NOT_ASSESSED", provenance: "USER_ENTERED", confirmedAt: null });
  db.complianceEvidence.push({ id: "xe", organizationId: ORG, complianceMappingId: "xm" });
  db.sensitiveDataAssessment.push({ id: "xsd", organizationId: ORG, aiSystemId: "xs2" });
  db.aIVendorAssessment.push({ id: "xva", organizationId: ORG, vendorId: "xv", status: "COMPLETED" });
  const sample = (entityType: string, entityId: string) => ({ organizationId: ORG, entityType, entityId, createdAt: ex });
  db.sampleRecord = [
    { ...sample("Organization", ORG), createdAt: new Date(ex.getTime() + 1000) },
    sample("AIVendor", "xv"),
    sample("AISystem", "xs1"),
    sample("RiskClassification", "xc1"),
    sample("AISystem", "xs2"),
    sample("RiskClassification", "xc2"),
    sample("AIPolicy", "xp"),
    sample("OversightGate", "xg"),
    sample("AIIncident", "xi"),
    sample("AIAssessment", "xa"),
  ];
  return db;
}

const load = (db: Db) => loadPathCounts(fakePrisma(db), ORG);

describe("the worked example never counts", () => {
  it("counts an organisation with the example exactly as without it", async () => {
    const before = await load(own());
    const after = await load(withExample());
    // The places are the example's while its declaration stands.
    expect(after).toEqual({ ...before, jurisdictions: 0, screeningsShown: ["applicability"] });
  });

  it("completes no step: the path reads the same with the example", async () => {
    const empty: Db = { ...withExample(), organization: [{ id: ORG, operatingJurisdictions: [], jurisdictionsReviewedAt: null, settings: {} }] };
    // Remove the organisation's own records: only the example is left.
    for (const model of Object.keys(empty)) {
      if (model === "organization" || model === "sampleRecord") continue;
      empty[model] = empty[model].filter((r) => String(r.id).startsWith("x"));
    }
    const counts = await load(empty);
    expect(counts).toMatchObject({ systems: 0, vendors: 0, policies: 0, highRisk: 0, incidents: 0, oversightGates: 0 });
    const statuses = evaluatePath(AI_SENTINEL_PATH, counts);
    expect(statuses.quickstart).toBe("todo");
    expect(statuses.systems).toBe("todo");
    expect(statuses.vendors).toBe("todo");
    expect(statuses.incidents).toBe("todo");
    expect(statuses.sensitiveData).toBe("todo");
    // The program report reads the same counts.
    const report = buildProgressReport(AI_SENTINEL_PATH, counts);
    expect(report.records.find((r) => r.key === "systems")?.value).toBe(0);
  });

  it("the example's records are really there: without its list they would count", async () => {
    const unlisted = { ...withExample(), sampleRecord: [] };
    const counts = await load(unlisted);
    expect(counts.systems).toBe(4);
    expect(counts.vendors).toBe(2);
    expect(counts.highRisk).toBe(2);
    expect(counts.incidentPolicyApproved).toBe(true);
  });

  it("removing the example leaves the counts as they were before it was added", async () => {
    // As removeWorkedExample does: delete the listed rows, let the database
    // cascade their children, put the places back.
    const db = withExample();
    const listed = new Set(db.sampleRecord.map((r) => r.entityId));
    const systems = new Set(db.sampleRecord.filter((r) => r.entityType === "AISystem").map((r) => r.entityId));
    const vendors = new Set(db.sampleRecord.filter((r) => r.entityType === "AIVendor").map((r) => r.entityId));
    for (const model of Object.keys(db)) {
      if (model === "organization") continue;
      db[model] = db[model].filter(
        (r) => !listed.has(r.id as string) && !systems.has(r.aiSystemId as string) && !vendors.has(r.vendorId as string),
      );
    }
    const mappings = new Set(db.complianceMapping.map((m) => m.id));
    db.complianceEvidence = db.complianceEvidence.filter((e) => mappings.has(e.complianceMappingId as string));
    db.sampleRecord = [];
    db.organization = own().organization;
    expect(await load(db)).toEqual(await load(own()));
  });

  it("counts places saved again by the organisation after the example declared them", () => {
    const scope = pathScope([{ entityType: "Organization", entityId: ORG, createdAt: now }]);
    expect(countedJurisdictions(scope, { operatingJurisdictions: ["EU"], jurisdictionsReviewedAt: now })).toEqual([]);
    expect(
      countedJurisdictions(scope, {
        operatingJurisdictions: ["EU"],
        jurisdictionsReviewedAt: new Date(now.getTime() + 60_000),
      }),
    ).toEqual(["EU"]);
    expect(countedJurisdictions(pathScope([]), { operatingJurisdictions: ["EU"], jurisdictionsReviewedAt: null })).toEqual([
      "EU",
    ]);
  });
});

describe("systems and vendors imported from DPO Central count as today", () => {
  it("counts an imported system and vendor, with or without the example present", async () => {
    for (const db of [own(), withExample()]) {
      const before = await load(db);
      db.aISystem.push({
        id: "imp1",
        organizationId: ORG,
        status: "DEPLOYED",
        businessOwner: "DPO",
        processesPersonalData: false,
        role: "DEPLOYER",
        provenance: "IMPORTED",
        metadata: { importedFrom: "dpocentral" },
      });
      db.aIVendor.push({ id: "impv", organizationId: ORG, status: "ACTIVE", provenance: "IMPORTED", sourceRef: "dpocentral:1" });
      const after = await load(db);
      expect(after.systems).toBe(before.systems + 1);
      expect(after.systemsWithOwner).toBe(before.systemsWithOwner + 1);
      expect(after.vendors).toBe(before.vendors + 1);
    }
  });
});

describe("retired systems and terminated vendors are out of the every-system and every-vendor rules", () => {
  it("leaves a retired system out of the owner, risk-level, transparency and sensitive-data rules", async () => {
    const db = own();
    db.aISystem.push({ id: "old", organizationId: ORG, status: "RETIRED", businessOwner: null, processesPersonalData: true, role: "DEPLOYER" });
    db.riskClassification.push({ id: "oldc", organizationId: ORG, aiSystemId: "old", riskLevel: "HIGH", provenance: "AUTO_TEMPLATE", confirmedAt: null });
    const counts = await load(db);
    expect(counts).toMatchObject({
      systems: 2,
      systemsWithOwner: 2,
      classified: 2,
      highRisk: 1,
      highRiskAssessed: 1,
      highRiskWithGate: 1,
      transparencyProfiles: 2,
      systemsProcessingPersonalData: 1,
      personalDataSystemsAssessed: 1,
      // Its drafted risk level does not hold the classification step back...
      classificationsUnconfirmed: 0,
    });
    // ...but the review queue still holds it.
    expect(counts.unconfirmed).toBe(1);
    const statuses = evaluatePath(AI_SENTINEL_PATH, counts);
    expect(statuses.systems).toBe("done");
    expect(statuses.classification).toBe("done");
    expect(statuses.transparency).toBe("done");
    expect(statuses.sensitiveData).toBe("done");
    expect(statuses.assessments).toBe("done");
  });

  it("leaves a terminated vendor out of the vendor and vendor-check rules", async () => {
    const db = own();
    db.aIVendor.push({ id: "gone", organizationId: ORG, status: "TERMINATED" });
    const counts = await load(db);
    expect(counts.vendors).toBe(1);
    expect(counts.vendorsAssessed).toBe(1);
    expect(evaluatePath(AI_SENTINEL_PATH, counts).vendorDueDiligence).toBe("done");
    // A vendor still under review does count.
    db.aIVendor.push({ id: "new", organizationId: ORG, status: "UNDER_REVIEW" });
    const more = await load(db);
    expect(more.vendors).toBe(2);
    expect(evaluatePath(AI_SENTINEL_PATH, more).vendorDueDiligence).toBe("started");
  });
});

describe("the evidence step counts the requirements of high-risk systems", () => {
  it("counts only the mapped requirements and evidence of high-risk systems", async () => {
    const counts = await load(own());
    expect(counts).toMatchObject({ mappings: 2, mappingsNotAssessed: 1, highRiskMappings: 1, highRiskMappingsNotAssessed: 0, highRiskEvidence: 1 });
    // The limited system's requirement without a status does not hold the step back.
    expect(evaluatePath(AI_SENTINEL_PATH, counts).evidence).toBe("done");
  });
});
