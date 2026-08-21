// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { buildScopeFilter, selectorTags } from "./applicability-scope";
import {
  resolveAdmtScope,
  type AdmtOrgFacts,
  type AdmtSystemFacts,
} from "@/config/admt-rules";
import { flattenAdmtRequirements } from "@/config/admt-requirements";

const rows = flattenAdmtRequirements();

describe("selector tags", () => {
  it("drops jurisdiction tags and keeps everything else", () => {
    expect(selectorTags(["jurisdiction:US_CA", "admt:art10", "admt:org"])).toEqual([
      "admt:art10",
      "admt:org",
    ]);
  });
});

describe("scope filter", () => {
  it("admits everything when the caller is not scoping", () => {
    const f = buildScopeFilter(undefined);
    expect(f({ applicabilityTags: ["admt:art11"] })).toBe(true);
  });

  it("admits nothing when the rules layer resolved and admitted nothing", () => {
    const f = buildScopeFilter([]);
    expect(f({ applicabilityTags: ["admt:art11"] })).toBe(false);
  });

  it("always admits untagged rows — they scope by risk tier instead", () => {
    // Dropping these would empty the EU AI Act matrix.
    expect(buildScopeFilter([]) ({ applicabilityTags: [] })).toBe(true);
    expect(buildScopeFilter(["admt:art10"])({ applicabilityTags: [] })).toBe(true);
  });

  it("does NOT let a shared jurisdiction tag select a row", () => {
    // The regression this module exists for: jurisdiction tags gate whether a
    // framework reaches you, they never pick out rows within it.
    const f = buildScopeFilter(["jurisdiction:US_CA", "admt:art10"]);
    expect(f({ applicabilityTags: ["jurisdiction:US_CA", "admt:art11"] })).toBe(false);
    expect(f({ applicabilityTags: ["jurisdiction:US_CA", "admt:art10"] })).toBe(true);
  });

  it("admits a row scoped by jurisdiction alone", () => {
    const f = buildScopeFilter(["jurisdiction:US_CA", "admt:art10"]);
    expect(f({ applicabilityTags: ["jurisdiction:US_CA"] })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// End-to-end scope matrix: the real resolver against the real requirement tags.
// This is the test that would have caught 59 Article 11 duties being written
// into the record of a system expressly determined NOT to be ADMT.
// ---------------------------------------------------------------------------

const CA_ORG: AdmtOrgFacts = {
  operatingJurisdictions: ["US_CA"],
  coveredBusiness: "YES",
  revenueBand: "UNDER_50M",
};

const BLANK_SYSTEM: AdmtSystemFacts = {
  jurisdictionOverride: [],
  determination: null,
  prongs: null,
  significantDecisionDomains: [],
  riskAssessmentTriggers: [],
  soleFactor: "NOT_ASSESSED",
  optOutBasis: "NOT_ASSESSED",
};

/** Rows the mapping sync would create for these facts. */
function selectedRows(org: AdmtOrgFacts, system: AdmtSystemFacts) {
  const scope = resolveAdmtScope(org, system);
  if (scope.tags.length === 0) return [];
  return rows.filter(buildScopeFilter(scope.tags));
}

const isArticle11 = (r: { applicabilityTags: readonly string[] }) =>
  r.applicabilityTags.includes("admt:art11");

describe("California scope matrix", () => {
  it("creates nothing when no jurisdiction has been declared", () => {
    expect(
      selectedRows(
        { operatingJurisdictions: [], coveredBusiness: "NOT_ASSESSED", revenueBand: "NOT_ASSESSED" },
        BLANK_SYSTEM,
      ),
    ).toHaveLength(0);
  });

  it("creates nothing for an organization with no California nexus", () => {
    expect(
      selectedRows(
        { operatingJurisdictions: ["EU"], coveredBusiness: "YES", revenueBand: "UNDER_50M" },
        BLANK_SYSTEM,
      ),
    ).toHaveLength(0);
  });

  it("creates nothing while the § 7001(e) determination is unanswered", () => {
    expect(selectedRows(CA_ORG, BLANK_SYSTEM)).toHaveLength(0);
  });

  it("does not attach Article 11 duties to a system determined NOT to be ADMT", () => {
    const selected = selectedRows(CA_ORG, {
      ...BLANK_SYSTEM,
      determination: "NOT_ADMT",
      riskAssessmentTriggers: ["sell_share_pi"],
    });

    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThan(rows.length);

    // The core guarantee: no pre-use notice, opt-out or access row. The four
    // rows that legitimately carry admt:art11 alongside an Article 10 or
    // org-level tag are reached through THAT tag, never through art11 alone.
    const art11Only = selected.filter(
      (r) =>
        isArticle11(r) &&
        !r.applicabilityTags.some(
          (t) => t.startsWith("admt:art10") || t === "admt:org",
        ),
    );
    expect(art11Only).toHaveLength(0);
  });

  it("attaches the Article 11 rows once ADMT makes a significant decision", () => {
    const selected = selectedRows(CA_ORG, {
      ...BLANK_SYSTEM,
      determination: "ADMT",
      riskAssessmentTriggers: ["admt_significant_decision"],
      significantDecisionDomains: ["employment_contracting"],
    });
    expect(selected.filter(isArticle11).length).toBeGreaterThan(50);
  });

  it("selects strictly fewer rows for Article 10 only than for Article 10 + 11", () => {
    const art10 = selectedRows(CA_ORG, {
      ...BLANK_SYSTEM,
      determination: "NOT_ADMT",
      riskAssessmentTriggers: ["sell_share_pi"],
    });
    const both = selectedRows(CA_ORG, {
      ...BLANK_SYSTEM,
      determination: "ADMT",
      riskAssessmentTriggers: ["admt_significant_decision"],
      significantDecisionDomains: ["employment_contracting"],
    });
    expect(art10.length).toBeLessThan(both.length);
  });
});
