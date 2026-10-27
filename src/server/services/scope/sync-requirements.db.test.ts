// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * syncRequirements against a real, seeded database: the queries, not only the
 * rule. Skipped unless SEED_TEST_DATABASE_URL is set, and refused unless it
 * points at localhost (the same guard as src/config/aiuc1-seed.db.test.ts).
 * It creates one organisation of its own and deletes it at the end.
 *   npx tsx e2e/with-env.ts npx vitest run src/server/services/scope/sync-requirements.db.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { syncRequirements } from "./sync-requirements";

const url = process.env.SEED_TEST_DATABASE_URL;
const local = !!url && /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);

describe.skipIf(!local)("syncRequirements on a seeded database (local only)", () => {
  const prisma = new PrismaClient({ datasourceUrl: url });
  let orgId = "";
  let systemId = "";

  const byFramework = async () => {
    const rows = await prisma.complianceMapping.findMany({
      where: { organizationId: orgId },
      select: { requirement: { select: { framework: { select: { code: true } } } } },
    });
    const out: Record<string, number> = {};
    for (const r of rows) out[r.requirement.framework.code] = (out[r.requirement.framework.code] ?? 0) + 1;
    return out;
  };
  const answers = (wantsCertification: string) => ({
    applicability: {
      answers: {
        buildsForOthers: "NO",
        usesAi: "YES",
        generalPurposeModel: "NO",
        meetsPeople: "YES",
        decidesAboutPeople: "YES",
        usesAgents: "NO",
        wantsCertification,
      },
    },
  });

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: {
        name: "Scope sync test",
        slug: `scope-sync-test-${Date.now()}`,
        operatingJurisdictions: ["EU"],
        settings: answers("UNSURE"),
      },
    });
    orgId = org.id;
    const system = await prisma.aISystem.create({
      data: {
        organizationId: orgId,
        number: 1,
        name: "Scoring",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        processesPersonalData: true,
      },
    });
    systemId = system.id;
    await prisma.riskClassification.create({
      data: { organizationId: orgId, aiSystemId: systemId, riskLevel: "HIGH", rationale: "test", classifiedBy: "test" },
    });
  });

  afterAll(async () => {
    if (orgId) await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it("adds the tier's and the regimes' requirements, and a second run changes nothing", async () => {
    const first = await syncRequirements(prisma, orgId, { reason: "test" });
    expect(first.created).toBeGreaterThan(0);
    const counts = await byFramework();
    expect(counts.EU_AI_ACT).toBeGreaterThan(0);
    expect(counts.NIST_AI_RMF).toBeGreaterThan(0);
    expect(counts.ISO_42001).toBeGreaterThan(0);
    expect(counts.EU_GDPR).toBeGreaterThan(0);
    expect(counts.TX_TRAIGA).toBeUndefined();
    const second = await syncRequirements(prisma, orgId, { reason: "test" });
    expect(second).toMatchObject({ created: 0, removed: 0 });
  });

  it("a no to certification takes ISO/IEC 42001 out, and a yes brings it back", async () => {
    await prisma.organization.update({ where: { id: orgId }, data: { settings: answers("NO") } });
    const out = await syncRequirements(prisma, orgId, { reason: "test" });
    expect(out.byFramework.ISO_42001?.removed).toBeGreaterThan(0);
    expect((await byFramework()).ISO_42001).toBeUndefined();
    await prisma.organization.update({ where: { id: orgId }, data: { settings: answers("YES") } });
    await syncRequirements(prisma, orgId, { reason: "test" });
    expect((await byFramework()).ISO_42001).toBeGreaterThan(0);
  });

  it("a framework not chosen loses its empty rows, the GDPR stays, and choosing it again brings it back", async () => {
    const choose = (frameworks: string[]) => {
      const base = answers("UNSURE");
      return { applicability: { ...base.applicability, frameworks } };
    };
    await prisma.organization.update({
      where: { id: orgId },
      data: { settings: choose(["EU_AI_ACT", "ISO_42001", "AIUC_1"]) },
    });
    const out = await syncRequirements(prisma, orgId, { reason: "test" });
    expect(out.byFramework.NIST_AI_RMF?.removed).toBeGreaterThan(0);
    const without = await byFramework();
    expect(without.NIST_AI_RMF).toBeUndefined();
    expect(without.EU_GDPR).toBeGreaterThan(0);
    await prisma.organization.update({
      where: { id: orgId },
      data: { settings: choose(["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001", "AIUC_1"]) },
    });
    await syncRequirements(prisma, orgId, { reason: "test" });
    expect((await byFramework()).NIST_AI_RMF).toBeGreaterThan(0);
    // An empty choice takes every chosen framework out; the GDPR still follows the places.
    await prisma.organization.update({ where: { id: orgId }, data: { settings: choose([]) } });
    await syncRequirements(prisma, orgId, { reason: "test" });
    const none = await byFramework();
    expect(none.EU_AI_ACT ?? 0).toBe(0);
    expect(none.EU_GDPR).toBeGreaterThan(0);
    // Back to no stored choice: what was in scope before the question existed.
    await prisma.organization.update({ where: { id: orgId }, data: { settings: answers("UNSURE") } });
    await syncRequirements(prisma, orgId, { reason: "test" });
    expect((await byFramework()).EU_AI_ACT).toBeGreaterThan(0);
  });

  it("leaving Europe removes the empty EU rows and keeps the ones worked on", async () => {
    const [noted, withEvidence] = await prisma.complianceMapping.findMany({
      where: { organizationId: orgId, requirement: { framework: { code: "EU_AI_ACT" } } },
      take: 2,
      select: { id: true },
    });
    await prisma.complianceMapping.update({ where: { id: noted.id }, data: { notes: "kept" } });
    await prisma.complianceEvidence.create({
      data: { complianceMappingId: withEvidence.id, organizationId: orgId, type: "DOCUMENT", title: "kept", addedBy: "test" },
    });
    await prisma.organization.update({ where: { id: orgId }, data: { operatingJurisdictions: ["US_TX"] } });
    const out = await syncRequirements(prisma, orgId, { reason: "test" });
    expect(out.byFramework.EU_AI_ACT?.removed).toBeGreaterThan(0);
    const left = await prisma.complianceMapping.findMany({
      where: { organizationId: orgId, requirement: { framework: { code: "EU_AI_ACT" } } },
      select: { id: true },
    });
    expect(left.map((r) => r.id).sort()).toEqual([noted.id, withEvidence.id].sort());
    expect((await byFramework()).EU_GDPR).toBeUndefined();
  });

  it("a legal hold stops every removal", async () => {
    await prisma.legalHold.create({
      data: { organizationId: orgId, matter: "test", reason: "test", issuedBy: "test" },
    });
    await prisma.organization.update({ where: { id: orgId }, data: { settings: answers("NO") } });
    const out = await syncRequirements(prisma, orgId, { reason: "test" });
    expect(out.removed).toBe(0);
  });
});
