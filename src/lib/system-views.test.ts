// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  activeFilterCount,
  buildSystemFilterConditions,
  isEmptyFilterSet,
  parseSystemViewFilters,
  serializeSystemViewFilters,
  type SystemViewFilters,
} from "./system-views";

describe("system view filters — URL round trip", () => {
  it("parses a full filter set and drops unknown values", () => {
    const params = new URLSearchParams(
      "owner=HR&dept=d1&region=US_CA&stage=DEPLOYED&reg=incomplete&risk=HIGH&role=DEPLOYER&assess=none&q=cv&sort=name&bogus=1&region2=XX",
    );
    const filters = parseSystemViewFilters(params);
    expect(filters).toEqual({
      owner: "HR",
      businessUnitId: "d1",
      region: "US_CA",
      stage: "DEPLOYED",
      registration: "incomplete",
      risk: "HIGH",
      role: "DEPLOYER",
      assessment: "none",
      search: "cv",
      sort: "name",
    });
  });

  it("ignores malformed enum values rather than trusting them", () => {
    const filters = parseSystemViewFilters(
      new URLSearchParams("region=ATLANTIS&stage=SLEEPING&risk=SPICY&sort=chaos"),
    );
    expect(filters).toEqual({});
  });

  it("serializes without the default sort and drops empties", () => {
    const filters: SystemViewFilters = { owner: "HR", sort: "newest" };
    expect(serializeSystemViewFilters(filters, { defaultSort: "newest" }).toString()).toBe(
      "owner=HR",
    );
  });

  it("serializes a non-default sort", () => {
    expect(serializeSystemViewFilters({ sort: "risk" }).toString()).toBe("sort=risk");
  });

  it("survives a round trip", () => {
    const filters: SystemViewFilters = {
      owner: "HR",
      businessUnitId: "d1",
      region: "EU",
      stage: "TESTING",
      registration: "complete",
      risk: "none",
      role: "PROVIDER",
      assessment: "approved",
      search: "vision",
      sort: "oldest",
    };
    const round = parseSystemViewFilters(serializeSystemViewFilters(filters));
    expect(round).toEqual(filters);
  });
});

describe("system view filters — counting", () => {
  it("counts active filters but not sort", () => {
    expect(activeFilterCount({ owner: "HR", sort: "risk" })).toBe(1);
    expect(isEmptyFilterSet({ sort: "risk" })).toBe(true);
    expect(isEmptyFilterSet({ risk: "HIGH" })).toBe(false);
  });
});

describe("buildSystemFilterConditions", () => {
  const opts = { orgJurisdictions: ["EU", "US_CA"] as const };

  it("builds no conditions for an empty set", () => {
    expect(buildSystemFilterConditions({}, opts)).toEqual([]);
  });

  it("matches an owner against both owner fields", () => {
    const [cond] = buildSystemFilterConditions({ owner: "smith" }, opts);
    expect(cond).toEqual({
      OR: [
        { businessOwner: { contains: "smith", mode: "insensitive" } },
        { technicalOwner: { contains: "smith", mode: "insensitive" } },
      ],
    });
  });

  it("maps the unassigned department to a null column", () => {
    expect(buildSystemFilterConditions({ businessUnitId: "unassigned" }, opts)).toEqual([
      { businessUnitId: null },
    ]);
    expect(buildSystemFilterConditions({ businessUnitId: "d1" }, opts)).toEqual([
      { businessUnitId: "d1" },
    ]);
  });

  it("treats a system with an empty override as inheriting the org region", () => {
    expect(buildSystemFilterConditions({ region: "US_CA" }, opts)).toEqual([
      { OR: [{ jurisdictionOverride: { isEmpty: true } }, { jurisdictionOverride: { has: "US_CA" } }] },
    ]);
  });

  it("matches nothing for a region the org has not declared", () => {
    // Effective jurisdictions are always a subset of the org set, so a region
    // outside it can never be in force — the list is honestly empty.
    expect(buildSystemFilterConditions({ region: "UK" }, opts)).toEqual([{ id: { in: [] } }]);
  });

  it("maps risk 'none' to a missing classification and a level to the relation", () => {
    expect(buildSystemFilterConditions({ risk: "none" }, opts)).toEqual([
      { riskClassification: { is: null } },
    ]);
    expect(buildSystemFilterConditions({ risk: "HIGH" }, opts)).toEqual([
      { riskClassification: { riskLevel: "HIGH" } },
    ]);
  });

  it("expresses incomplete registration as any required field missing", () => {
    const [cond] = buildSystemFilterConditions({ registration: "incomplete" }, opts);
    expect(cond).toEqual({
      OR: [
        { OR: [{ description: null }, { description: "" }] },
        { OR: [{ purpose: null }, { purpose: "" }] },
        { OR: [{ businessOwner: null }, { businessOwner: "" }] },
        { OR: [{ technicalOwner: null }, { technicalOwner: "" }] },
        { riskClassification: { is: null } },
      ],
    });
  });

  it("expresses complete registration as every required field present", () => {
    const [cond] = buildSystemFilterConditions({ registration: "complete" }, opts);
    expect(cond).toEqual({
      AND: [
        { AND: [{ description: { not: null } }, { NOT: { description: "" } }] },
        { AND: [{ purpose: { not: null } }, { NOT: { purpose: "" } }] },
        { AND: [{ businessOwner: { not: null } }, { NOT: { businessOwner: "" } }] },
        { AND: [{ technicalOwner: { not: null } }, { NOT: { technicalOwner: "" } }] },
        { riskClassification: { isNot: null } },
      ],
    });
  });

  it("maps assessment states to relation filters", () => {
    expect(buildSystemFilterConditions({ assessment: "none" }, opts)).toEqual([
      { assessments: { none: {} } },
    ]);
    expect(buildSystemFilterConditions({ assessment: "approved" }, opts)).toEqual([
      { assessments: { some: { status: "APPROVED" } } },
    ]);
    expect(buildSystemFilterConditions({ assessment: "in_progress" }, opts)).toEqual([
      {
        AND: [
          { assessments: { some: {} } },
          { assessments: { none: { status: "APPROVED" } } },
        ],
      },
    ]);
  });

  it("passes stage and role straight through", () => {
    expect(buildSystemFilterConditions({ stage: "RETIRED", role: "PROVIDER" }, opts)).toEqual([
      { status: "RETIRED" },
      { role: "PROVIDER" },
    ]);
  });
});
