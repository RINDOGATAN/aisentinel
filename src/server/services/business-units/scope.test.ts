// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { businessUnitScopeWhere } from "./scope";
import { systemScopeWhere } from "../views/queries";

describe("business unit scope", () => {
  it("imposes no condition on a whole-organization member", () => {
    expect(businessUnitScopeWhere({ all: true })).toBeNull();
  });

  it("confines a limited member to their departments", () => {
    expect(businessUnitScopeWhere({ all: false, businessUnitIds: ["a", "b"] })).toEqual({
      businessUnitId: { in: ["a", "b"] },
    });
  });

  it("a limited member with no departments matches nothing", () => {
    // An empty id list is still a limit, not a fall-back to the whole org.
    expect(businessUnitScopeWhere({ all: false, businessUnitIds: [] })).toEqual({
      businessUnitId: { in: [] },
    });
  });

  describe("systemScopeWhere merges member scope with a requested department", () => {
    it("returns undefined for an unlimited member with no request", () => {
      expect(systemScopeWhere({ all: true })).toBeUndefined();
    });

    it("applies only the request for an unlimited member", () => {
      expect(systemScopeWhere({ all: true }, "hr")).toEqual({ businessUnitId: "hr" });
    });

    it("applies only the member scope when there is no request", () => {
      expect(systemScopeWhere({ all: false, businessUnitIds: ["hr"] })).toEqual({
        businessUnitId: { in: ["hr"] },
      });
    });

    it("ANDs the member scope and the request, so an out-of-scope request cannot widen", () => {
      const where = systemScopeWhere({ all: false, businessUnitIds: ["hr"] }, "legal");
      expect(where).toEqual({
        AND: [{ businessUnitId: { in: ["hr"] } }, { businessUnitId: "legal" }],
      });
    });

    it("maps the unassigned sentinel to a null department", () => {
      expect(systemScopeWhere({ all: true }, "unassigned")).toEqual({ businessUnitId: null });
    });
  });
});

describe("roles that always see the whole organization", () => {
  it("exempts owners and admins only", async () => {
    const { isScopeExemptRole } = await import("./scope");
    expect(["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"].filter(isScopeExemptRole)).toEqual([
      "OWNER",
      "ADMIN",
    ]);
  });

  it("ignores a stored limit for an owner or admin without reading it", async () => {
    const { loadBusinessUnitScope } = await import("./scope");
    let reads = 0;
    const prisma = {
      businessUnitMember: {
        findMany: async () => {
          reads++;
          return [{ businessUnitId: "hr" }];
        },
      },
    } as never;
    expect(await loadBusinessUnitScope(prisma, { id: "m1", role: "OWNER" })).toEqual({ all: true });
    expect(await loadBusinessUnitScope(prisma, { id: "m2", role: "ADMIN" })).toEqual({ all: true });
    expect(reads).toBe(0);
    expect(await loadBusinessUnitScope(prisma, { id: "m3", role: "MEMBER" })).toEqual({
      all: false,
      businessUnitIds: ["hr"],
    });
  });
});

describe("the department of a new system", () => {
  it("keeps what a whole-organization member asked for, or none", async () => {
    const { businessUnitForNewSystem } = await import("./scope");
    expect(businessUnitForNewSystem({ all: true }, "hr")).toBe("hr");
    expect(businessUnitForNewSystem({ all: true }, null)).toBeNull();
    expect(businessUnitForNewSystem({ all: true }, undefined)).toBeNull();
  });

  it("places a limited member's system inside their scope", async () => {
    const { businessUnitForNewSystem, defaultBusinessUnitId } = await import("./scope");
    const scope = { all: false as const, businessUnitIds: ["it", "hr"] };
    expect(businessUnitForNewSystem(scope, "hr")).toBe("hr");
    expect(businessUnitForNewSystem(scope, null)).toBe("it");
    expect(businessUnitForNewSystem(scope, "legal")).toBe("it");
    expect(defaultBusinessUnitId(scope)).toBe("it");
    expect(defaultBusinessUnitId({ all: true })).toBeNull();
  });
});
