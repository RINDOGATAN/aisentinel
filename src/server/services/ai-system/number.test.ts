// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { fillMissingSystemNumbers, nextSystemNumber } from "./number";

type Row = { id: string; organizationId: string; number: number | null; createdAt: Date };

/** An in-memory stand-in for the three aISystem calls the service makes. */
function fakeDb(rows: Row[]) {
  const inOrg = (where: { organizationId: string }) => rows.filter((r) => r.organizationId === where.organizationId);
  return {
    rows,
    aISystem: {
      findFirst: async ({ where }: { where: { organizationId: string } }) => {
        const top = inOrg(where)
          .filter((r) => r.number != null)
          .sort((a, b) => (b.number ?? 0) - (a.number ?? 0))[0];
        return top ? { number: top.number } : null;
      },
      findMany: async ({ where }: { where: { organizationId: string } }) =>
        inOrg(where)
          .filter((r) => r.number == null)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
          .map((r) => ({ id: r.id })),
      updateMany: async ({ where, data }: { where: { id: string; organizationId: string; number: null }; data: { number: number } }) => {
        const row = rows.find((r) => r.id === where.id && r.organizationId === where.organizationId && r.number == null);
        if (row) row.number = data.number;
        return { count: row ? 1 : 0 };
      },
    },
  };
}

const at = (n: number) => new Date(2026, 0, n);

describe("AI system numbers", () => {
  it("starts at 1 and follows the highest number in the organization", async () => {
    const db = fakeDb([]);
    expect(await nextSystemNumber(db as never, "org-a")).toBe(1);
    db.rows.push({ id: "s1", organizationId: "org-a", number: 4, createdAt: at(1) });
    db.rows.push({ id: "s2", organizationId: "org-b", number: 9, createdAt: at(1) });
    expect(await nextSystemNumber(db as never, "org-a")).toBe(5);
  });

  it("numbers unnumbered systems in creation order, after the highest in use, without touching other organizations", async () => {
    const db = fakeDb([
      { id: "late", organizationId: "org-a", number: null, createdAt: at(3) },
      { id: "kept", organizationId: "org-a", number: 2, createdAt: at(1) },
      { id: "early", organizationId: "org-a", number: null, createdAt: at(2) },
      { id: "other", organizationId: "org-b", number: null, createdAt: at(1) },
    ]);
    expect(await fillMissingSystemNumbers(db as never, "org-a")).toBe(2);
    const byId = Object.fromEntries(db.rows.map((r) => [r.id, r.number]));
    expect(byId).toEqual({ late: 4, kept: 2, early: 3, other: null });
    expect(await fillMissingSystemNumbers(db as never, "org-a")).toBe(0);
  });
});
