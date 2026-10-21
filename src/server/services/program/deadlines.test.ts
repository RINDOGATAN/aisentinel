// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The deadlines at risk for one department (the "Viewing" switch): the
 * incident and re-test queries are narrowed to that department's systems,
 * and the organization-wide obligation dates are left out.
 */

import { describe, expect, it, vi } from "vitest";

const obligations = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/server/services/obligations/obligations-data", () => ({
  getObligationsData: async () => {
    obligations.calls++;
    return {
      rows: [
        {
          inScope: [],
          countUnit: "organization",
          applicability: "applies",
          dateIso: "2026-10-25",
          phase: "upcoming",
          overdue: false,
          title: "An organization-wide obligation",
        },
      ],
    };
  },
}));

import { loadDeadlines } from "./deadlines";

function fakeDb() {
  const seen: { incidents?: unknown; threatModels?: unknown } = {};
  const db = {
    organization: { findFirst: async () => ({ operatingJurisdictions: ["EU"] }) },
    aIIncident: {
      findMany: async ({ where }: { where: unknown }) => {
        seen.incidents = where;
        return [];
      },
    },
    threatModel: {
      findMany: async ({ where }: { where: unknown }) => {
        seen.threatModels = where;
        return [{ id: "tm-1", name: "Agent", nextReviewDue: new Date("2026-10-22T00:00:00Z") }];
      },
    },
  };
  return { db, seen };
}

const now = new Date("2026-10-19T00:00:00Z");

describe("deadlines for one department", () => {
  it("keeps the whole organization's view as it was, obligations included", async () => {
    obligations.calls = 0;
    const { db, seen } = fakeDb();
    const out = await loadDeadlines(db as never, "org-1", "en", now);
    expect(out.map((d) => d.kind).sort()).toEqual(["obligation", "retest"]);
    expect(obligations.calls).toBe(1);
    expect(JSON.stringify(seen.incidents)).not.toContain("aiSystem");
  });

  it("narrows incidents and re-tests to the department's systems and leaves out the obligations", async () => {
    obligations.calls = 0;
    const { db, seen } = fakeDb();
    const out = await loadDeadlines(db as never, "org-1", "en", now, { businessUnitId: "bu-hr" });
    expect(out.map((d) => d.kind)).toEqual(["retest"]);
    expect(obligations.calls).toBe(0);
    expect(seen.incidents).toMatchObject({ organizationId: "org-1", aiSystem: { is: { businessUnitId: "bu-hr" } } });
    expect(seen.threatModels).toMatchObject({ organizationId: "org-1", aiSystem: { is: { businessUnitId: "bu-hr" } } });
  });
});
