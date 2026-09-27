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
