// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { Jurisdiction } from "@prisma/client";
import {
  JURISDICTIONS,
  JURISDICTION_IDS,
  JURISDICTION_GROUPS,
  jurisdictionsInGroup,
  isDeclared,
  resolveEffectiveJurisdictions,
  type JurisdictionId,
} from "./jurisdictions";

describe("jurisdiction vocabulary", () => {
  it("mirrors the Prisma enum member-for-member", () => {
    // The union in jurisdictions.ts is hand-mirrored so the module stays
    // client-safe; this is the guard that stops the two drifting apart.
    const prismaMembers = Object.values(Jurisdiction).sort();
    const configMembers = [...JURISDICTION_IDS].sort();
    expect(configMembers).toEqual(prismaMembers);
  });

  it("has no duplicate ids and a valid group for every entry", () => {
    expect(new Set(JURISDICTION_IDS).size).toBe(JURISDICTION_IDS.length);
    for (const option of JURISDICTIONS) {
      expect(JURISDICTION_GROUPS).toContain(option.group);
    }
  });

  it("uses the id as the i18n label key rather than a display string", () => {
    for (const option of JURISDICTIONS) {
      expect(option.labelKey).toBe(option.id);
    }
  });

  it("partitions every jurisdiction into exactly one group", () => {
    const grouped = JURISDICTION_GROUPS.flatMap((g) =>
      jurisdictionsInGroup(g).map((o) => o.id),
    );
    expect(grouped.sort()).toEqual([...JURISDICTION_IDS].sort());
  });
});

describe("isDeclared", () => {
  it("treats empty, null and undefined as undeclared", () => {
    expect(isDeclared([])).toBe(false);
    expect(isDeclared(null)).toBe(false);
    expect(isDeclared(undefined)).toBe(false);
  });

  it("is true once anything is declared", () => {
    expect(isDeclared(["EU"])).toBe(true);
  });
});

describe("resolveEffectiveJurisdictions", () => {
  it("reports undeclared — never 'operates nowhere' — when the org set is empty", () => {
    for (const orgSet of [[], null, undefined] as const) {
      const result = resolveEffectiveJurisdictions(orgSet, ["US_CA"]);
      expect(result.state).toBe("undeclared");
      expect(result.effective).toEqual([]);
    }
  });

  it("inherits the org set when the system has no override", () => {
    for (const override of [[], null, undefined] as const) {
      const result = resolveEffectiveJurisdictions(["EU", "US_CA"], override);
      expect(result.state).toBe("declared");
      expect(result.effective).toEqual(["EU", "US_CA"]);
    }
  });

  it("narrows to the intersection when a system overrides", () => {
    const result = resolveEffectiveJurisdictions(
      ["EU", "US_CA", "US_NY"],
      ["US_CA"],
    );
    expect(result.state).toBe("declared");
    expect(result.effective).toEqual(["US_CA"]);
  });

  it("never widens: values outside the org set are dropped", () => {
    const result = resolveEffectiveJurisdictions(["EU"], ["EU", "US_TX"]);
    expect(result.effective).toEqual(["EU"]);
    expect(result.state).toBe("declared");
  });

  it("flags a conflict — not an empty scope — when the intersection is empty", () => {
    const result = resolveEffectiveJurisdictions(["EU"], ["US_CA"]);
    expect(result.state).toBe("conflict");
    expect(result.effective).toEqual([]);
  });

  it("returns canonical display order regardless of input order", () => {
    const a = resolveEffectiveJurisdictions(["US_CA", "EU"]);
    const b = resolveEffectiveJurisdictions(["EU", "US_CA"]);
    expect(a.effective).toEqual(["EU", "US_CA"]);
    expect(a).toEqual(b);
  });

  it("deduplicates repeated values", () => {
    const result = resolveEffectiveJurisdictions(["EU", "EU", "US_CA"]);
    expect(result.effective).toEqual(["EU", "US_CA"]);
  });

  it("ignores unknown values without throwing", () => {
    const result = resolveEffectiveJurisdictions([
      "EU",
      "ATLANTIS" as JurisdictionId,
    ]);
    expect(result.effective).toEqual(["EU"]);
    expect(result.state).toBe("declared");
  });
});
