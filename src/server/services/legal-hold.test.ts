// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect, vi } from "vitest";
import { activeHolds, anyHoldInForce, assertNotOnHold } from "./legal-hold";

type Row = {
  id: string;
  matter: string;
  aiSystemId: string | null;
  issuedAt: Date;
  releasedAt: Date | null;
};

/** A fake that applies the same filtering Prisma would. */
function db(rows: Row[]) {
  const live = () => rows.filter((r) => r.releasedAt === null);
  return {
    legalHold: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        let out = live();
        const or = where.OR as Array<{ aiSystemId?: string | null }> | undefined;
        if (or) {
          out = out.filter((r) =>
            or.some((clause) =>
              clause.aiSystemId === null
                ? r.aiSystemId === null
                : r.aiSystemId === clause.aiSystemId,
            ),
          );
        }
        return out;
      }),
      count: vi.fn(async () => live().length),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const orgHold: Row = {
  id: "h1",
  matter: "Matter 24-118",
  aiSystemId: null,
  issuedAt: new Date("2026-09-01"),
  releasedAt: null,
};
const systemHold: Row = {
  id: "h2",
  matter: "Matter 24-119",
  aiSystemId: "sys-a",
  issuedAt: new Date("2026-09-02"),
  releasedAt: null,
};
const released: Row = { ...orgHold, id: "h3", releasedAt: new Date("2026-09-05") };

describe("legal hold enforcement", () => {
  it("refuses a deletion while an organization-wide hold is in force", async () => {
    await expect(assertNotOnHold(db([orgHold]), "org1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("names the matter so the person knows what to ask about", async () => {
    await expect(assertNotOnHold(db([orgHold]), "org1")).rejects.toThrow(/Matter 24-118/);
  });

  it("allows the deletion once the hold is released", async () => {
    await expect(assertNotOnHold(db([released]), "org1")).resolves.toBeUndefined();
  });

  it("blocks the system a system-scoped hold covers", async () => {
    await expect(
      assertNotOnHold(db([systemHold]), "org1", { aiSystemId: "sys-a" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not block a different system", async () => {
    await expect(
      assertNotOnHold(db([systemHold]), "org1", { aiSystemId: "sys-b" }),
    ).resolves.toBeUndefined();
  });

  it("blocks an organization-wide deletion even when only one system is held", async () => {
    // No system id means "this is not scoped to a system", and a hold on any
    // part of the organization still has to be seen.
    const holds = await activeHolds(db([systemHold]), "org1");
    expect(holds).toHaveLength(1);
    expect(await anyHoldInForce(db([systemHold]), "org1")).toBe(true);
  });

  it("reports nothing in force when every hold is released", async () => {
    expect(await anyHoldInForce(db([released]), "org1")).toBe(false);
  });
});
