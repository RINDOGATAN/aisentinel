// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Hermetic: the snapshot file read is mocked so no real vendors/ artifact is
// required, and a fake Prisma is injected so no database is touched.
vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));

import { readFileSync } from "node:fs";
import { seedCatalogFromSnapshot } from "../seed-catalog-from-snapshot";
import type { VendorWatchVendor } from "../vendor-watch-types";
import fixture from "../../../tests/fixtures/catalog-snapshot.json";

const sampleVendors = fixture.vendors as unknown as VendorWatchVendor[];

/** Build a snapshot with `count` unique vendors by cloning the fixture rows. */
function makeSnapshot(count: number) {
  const vendors = Array.from({ length: count }, (_, i) => ({
    ...sampleVendors[i % sampleVendors.length],
    slug: `vendor-${i}`,
  }));
  return { ...fixture, count: vendors.length, vendors };
}

function mockSnapshot(snapshot: unknown) {
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(snapshot));
}

interface FakePrisma {
  upsert: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
}

function makePrisma(): { prisma: PrismaClient; catalog: FakePrisma } {
  const catalog: FakePrisma = {
    // Same created/updated timestamps => counted as "created".
    upsert: vi.fn().mockResolvedValue({
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }),
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
  const prisma = { vendorCatalog: catalog } as unknown as PrismaClient;
  return { prisma, catalog };
}

describe("seedCatalogFromSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts every vendor in the snapshot by slug with source vendor-watch", async () => {
    const snapshot = makeSnapshot(320);
    mockSnapshot(snapshot);
    const { prisma, catalog } = makePrisma();

    const result = await seedCatalogFromSnapshot(prisma);

    expect(catalog.upsert).toHaveBeenCalledTimes(320);
    expect(result.total).toBe(320);
    expect(result.created).toBe(320);
    expect(result.pruned).toBe(0);

    const firstCall = catalog.upsert.mock.calls[0][0];
    expect(firstCall.where).toEqual({ slug: "vendor-0" });
    expect(firstCall.create.slug).toBe("vendor-0");
    expect(firstCall.create.source).toBe("vendor-watch");
    // vendor-0 clones fixture[0] whose dataProcessingTransparency is boolean
    // true; the mapper coerces boolean -> String for AI Sentinel's String? col.
    expect(firstCall.create.dataProcessingTransparency).toBe("true");
    expect(firstCall.update.source).toBe("vendor-watch");
  });

  it("does not prune when prune is not requested", async () => {
    mockSnapshot(makeSnapshot(320));
    const { prisma, catalog } = makePrisma();

    await seedCatalogFromSnapshot(prisma);

    expect(catalog.findMany).not.toHaveBeenCalled();
    expect(catalog.deleteMany).not.toHaveBeenCalled();
  });

  it("prunes only stale pipeline-owned rows, protecting verified and foreign-source rows", async () => {
    const snapshot = makeSnapshot(320);
    mockSnapshot(snapshot);
    const { prisma, catalog } = makePrisma();

    catalog.findMany.mockResolvedValue([
      // In snapshot -> kept regardless.
      { id: "keep-in-snapshot", slug: "vendor-0", source: "vendor-watch", isVerified: false, verifiedBy: null },
      // Stale + pipeline source + unverified -> the only deletable row.
      { id: "stale-seed", slug: "gone-1", source: "seed", isVerified: false, verifiedBy: null },
      // Stale but verified -> protected.
      { id: "verified", slug: "gone-2", source: "vendor-watch", isVerified: true, verifiedBy: null },
      // Stale but has a verifiedBy stamp -> protected.
      { id: "stamped", slug: "gone-3", source: "vendor-watch", isVerified: false, verifiedBy: "reviewer@nel" },
      // Stale but foreign source -> protected.
      { id: "manual", slug: "gone-4", source: "manual", isVerified: false, verifiedBy: null },
      // Stale but null source -> protected.
      { id: "nullsrc", slug: "gone-5", source: null, isVerified: false, verifiedBy: null },
    ]);
    catalog.deleteMany.mockResolvedValue({ count: 1 });

    const result = await seedCatalogFromSnapshot(prisma, { prune: true });

    expect(catalog.deleteMany).toHaveBeenCalledTimes(1);
    const deleteArg = catalog.deleteMany.mock.calls[0][0];
    expect(deleteArg.where.id.in).toEqual(["stale-seed"]);
    expect(result.pruned).toBe(1);
  });

  it("throws on an undersized snapshot and never writes", async () => {
    // The fixture itself has only 3 vendors, well under the 300 floor.
    mockSnapshot(fixture);
    const { prisma, catalog } = makePrisma();

    await expect(seedCatalogFromSnapshot(prisma)).rejects.toThrow(/truncated snapshot/);
    expect(catalog.upsert).not.toHaveBeenCalled();
    expect(catalog.deleteMany).not.toHaveBeenCalled();
  });

  it("throws when the vendors array is missing", async () => {
    mockSnapshot({ version: "1.0.0", count: 0 });
    const { prisma } = makePrisma();

    await expect(seedCatalogFromSnapshot(prisma)).rejects.toThrow(/no "vendors" array/);
  });
});
