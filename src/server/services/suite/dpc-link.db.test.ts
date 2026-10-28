// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The outbound half of a DPO Central sync round, against a real Postgres:
 * which AI systems created here are returned for DPO Central to take as
 * drafts. The in-memory fake in __tests__/dpc-link.test.ts treats a missing
 * JSON key as "not equal"; Postgres treats it as NULL, so a negated JSON path
 * filter silently drops rows whose metadata is NULL or lacks the key. This
 * test pins the real behaviour.
 *
 * Skipped unless SEED_TEST_DATABASE_URL is set, and refused unless it points
 * at localhost (the same guard as the other *.db.test.ts files). It creates
 * one organisation of its own and deletes it at the end.
 *   npx tsx e2e/with-env.ts npx vitest run src/server/services/suite/dpc-link.db.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { notImportedFromDpoCentral, syncRound } from "./dpc-link";

const url = process.env.SEED_TEST_DATABASE_URL;
const local = !!url && /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);

describe.skipIf(!local)("DPO Central sync round on a real database (local only)", () => {
  const prisma = new PrismaClient({ datasourceUrl: url });
  let orgId = "";
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: "Suite sync test", slug: `suite-sync-test-${Date.now()}` },
    });
    orgId = org.id;
    const rows: Array<[string, Prisma.InputJsonValue | typeof Prisma.DbNull | typeof Prisma.JsonNull, string?]> = [
      ["nullMetadata", Prisma.DbNull],
      ["jsonNullMetadata", Prisma.JsonNull],
      ["emptyMetadata", {}],
      ["importedFromNull", { importedFrom: null }],
      ["otherKeys", { source: "quickstart" }],
      ["fromVendorWatch", { importedFrom: "vendorwatch" }],
      ["fromDpoCentral", { importedFrom: "dpocentral", dpoCentralSystemId: "dpc-1" }],
      ["retired", Prisma.DbNull, "RETIRED"],
    ];
    let number = 1;
    for (const [name, metadata, status] of rows) {
      const created = await prisma.aISystem.create({
        data: {
          organizationId: orgId,
          number: number++,
          name,
          technique: "OTHER",
          role: "DEPLOYER",
          metadata,
          ...(status ? { status: status as "RETIRED" } : {}),
        },
        select: { id: true },
      });
      ids[name] = created.id;
    }
  });

  afterAll(async () => {
    if (orgId) {
      await prisma.aISystem.deleteMany({ where: { organizationId: orgId } });
      await prisma.organization.delete({ where: { id: orgId } });
    }
    await prisma.$disconnect();
  });

  it("the filter keeps every system that is not a DPO Central copy, NULL metadata included", async () => {
    const rows = await prisma.aISystem.findMany({
      where: { organizationId: orgId, ...notImportedFromDpoCentral },
      select: { name: true },
    });
    expect(rows.map((r) => r.name).sort()).toEqual(
      [
        "emptyMetadata",
        "fromVendorWatch",
        "importedFromNull",
        "jsonNullMetadata",
        "nullMetadata",
        "otherKeys",
        "retired",
      ].sort(),
    );
  });

  it("a sync round sends native systems with NULL metadata to DPO Central, and never a DPO Central copy", async () => {
    const round = await syncRound(prisma, {
      organizationId: orgId,
      vendors: [],
      systems: [],
      knownAisSystemIds: [],
      knownAisVendorIds: [],
    });
    const sent = new Set(round.aisSystems.map((s) => s.aisId));
    expect(sent.has(ids.nullMetadata)).toBe(true);
    expect(sent.has(ids.jsonNullMetadata)).toBe(true);
    expect(sent.has(ids.emptyMetadata)).toBe(true);
    expect(sent.has(ids.importedFromNull)).toBe(true);
    expect(sent.has(ids.otherKeys)).toBe(true);
    expect(sent.has(ids.fromVendorWatch)).toBe(true);
    expect(sent.has(ids.fromDpoCentral)).toBe(false);
    expect(sent.has(ids.retired)).toBe(false);
    expect(sent.size).toBe(6);
  });
});
