// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Reads a database the seeds have run against and checks what they wrote.
 *
 * Skipped unless SEED_TEST_DATABASE_URL is set, and refused unless it points at
 * localhost: a developer's env files may name a hosted database, and this test
 * must never read one. Read-only. Run after the fresh install:
 *   npx tsx e2e/with-env.ts sh deploy/sovereign/migrate.sh
 *   npx tsx e2e/with-env.ts npx vitest run src/config/aiuc1-seed.db.test.ts
 */
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { SEEDED_CHOSEN_FRAMEWORKS, SEEDED_TIER_FRAMEWORKS, docsCounts } from "./docs-counts";
import { AIUC1_DOMAINS, aiuc1CrossMappings, allAiuc1Requirements } from "./aiuc1-requirements";

const url = process.env.SEED_TEST_DATABASE_URL;
const local = !!url && /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);

describe.skipIf(!local)("seeded database (local only)", () => {
  const prisma = new PrismaClient({ datasourceUrl: url });
  afterAll(() => prisma.$disconnect());

  it("holds every framework the docs count, AIUC-1 among them", async () => {
    const frameworks = await prisma.complianceFramework.findMany({ select: { code: true } });
    const codes = frameworks.map((f) => f.code).sort();
    expect(codes).toContain("AIUC_1");
    expect(codes).toHaveLength(docsCounts().frameworks);
    for (const code of [...Object.keys(SEEDED_TIER_FRAMEWORKS), ...Object.keys(SEEDED_CHOSEN_FRAMEWORKS)]) {
      expect(codes).toContain(code);
    }
  });

  it("seeds AIUC-1 as six domains over the 51 requirements in force, none tied to a risk tier", async () => {
    const rows = await prisma.complianceRequirement.findMany({
      where: { framework: { code: "AIUC_1" } },
      select: { code: true, parentId: true, applicableTo: true, applicabilityTags: true },
    });
    expect(rows).toHaveLength(SEEDED_CHOSEN_FRAMEWORKS.AIUC_1);
    expect(rows.filter((r) => r.parentId === null).map((r) => r.code).sort()).toEqual(AIUC1_DOMAINS.map((d) => d.code));
    expect(rows.filter((r) => r.parentId !== null).map((r) => r.code).sort()).toEqual(
      allAiuc1Requirements().map((r) => r.code).sort(),
    );
    expect(rows.every((r) => r.applicableTo.length === 0 && r.applicabilityTags.length === 0)).toBe(true);
    const framework = await prisma.complianceFramework.findUnique({ where: { code: "AIUC_1" } });
    expect(framework?.version).toBe("2026-Q3");
  });

  it("links AIUC-1 to the other frameworks exactly as its crosswalks say", async () => {
    const rows = await prisma.crossFrameworkMapping.findMany({
      where: { requirementAId: { startsWith: "aiuc1-" } },
      select: { requirementAId: true, requirementBId: true, relationship: true },
    });
    const expected = aiuc1CrossMappings().map((m) => `${m.a}|${m.b}`).sort();
    expect(rows.map((r) => `${r.requirementAId}|${r.requirementBId}`).sort()).toEqual(expected);
    expect(rows.every((r) => r.relationship === "related")).toBe(true);
    expect(await prisma.crossFrameworkMapping.count()).toBe(docsCounts().crossMappings);
  });
});
