// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  AdmtDetermination,
  AdmtProngStatus,
  AdmtSoleFactor,
  AdmtOptOutBasis,
} from "@prisma/client";
import {
  ADMT_APPLICABILITY_TAGS,
  ADMT_RULES_LAW_REVIEWED_AS_OF,
  ADMT_RULES_REVIEW_MARKER,
  ADMT_RULES_VERSION,
  OPT_OUT_EXCEPTIONS,
  RISK_ASSESSMENT_TRIGGERS,
  SIGNIFICANT_DECISION_DOMAINS,
  evaluateAdmtDefinition,
  resolveAdmtOrgScope,
  resolveAdmtScope,
  triggerTag,
  type AdmtOrgFacts,
  type AdmtProngs,
  type AdmtProngStatusValue,
  type AdmtSystemFacts,
} from "./admt-rules";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CA_ORG: AdmtOrgFacts = {
  operatingJurisdictions: ["EU", "US_CA"],
  coveredBusiness: "YES",
  revenueBand: "OVER_100M",
};

const PRONGS_ALL_SATISFIED: AdmtProngs = {
  interpretOutput: "SATISFIED",
  reviewsOutputAndOtherInfo: "SATISFIED",
  authorityToChange: "SATISFIED",
};

function system(overrides: Partial<AdmtSystemFacts> = {}): AdmtSystemFacts {
  return {
    jurisdictionOverride: [],
    determination: "NOT_ASSESSED",
    prongs: null,
    significantDecisionDomains: [],
    riskAssessmentTriggers: [],
    soleFactor: "NOT_ASSESSED",
    optOutBasis: "NOT_ASSESSED",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Vocabulary integrity
// ---------------------------------------------------------------------------

describe("ADMT vocabularies", () => {
  it("mirrors the Prisma enums member-for-member", () => {
    // The config declares string-literal unions so it stays client-safe; these
    // assertions are the guard that the two never drift apart.
    expect(Object.values(AdmtDetermination).sort()).toEqual(
      ["NOT_ASSESSED", "NOT_ADMT", "ADMT", "ADMT_EXCLUDED_7001_E_3"].sort(),
    );
    expect(Object.values(AdmtProngStatus).sort()).toEqual(
      ["NOT_ASSESSED", "SATISFIED", "NOT_SATISFIED"].sort(),
    );
    expect(Object.values(AdmtSoleFactor).sort()).toEqual(
      ["NOT_ASSESSED", "SOLE_FACTOR", "ONE_OF_SEVERAL", "NOT_USED"].sort(),
    );
    expect(Object.values(AdmtOptOutBasis).sort()).toEqual(
      ["NOT_ASSESSED", "NONE_OPT_OUT_OFFERED", ...OPT_OUT_EXCEPTIONS].sort(),
    );
  });

  it("keeps the opt-out exception list closed at the three real ones", () => {
    // Security, fraud and physical safety are NOT opt-out exceptions — they are
    // disclosure-scope limiters under §7220(d)/§7222(c). If this list ever grows
    // to include them, the schema would let a user claim an exception that does
    // not exist.
    expect(OPT_OUT_EXCEPTIONS).toHaveLength(3);
    expect(OPT_OUT_EXCEPTIONS.join(" ")).not.toMatch(
      /SECURITY|FRAUD|SAFETY/i,
    );
  });

  it("limits significant decisions to the five §7001(ddd) domains and excludes advertising", () => {
    expect(SIGNIFICANT_DECISION_DOMAINS).toEqual([
      "financial_lending",
      "housing",
      "education_enrollment",
      "employment_contracting",
      "healthcare",
    ]);
    // §7001(ddd)(6): "Significant decision does not include advertising."
    expect(SIGNIFICANT_DECISION_DOMAINS.join(" ")).not.toMatch(
      /advertis|marketing|recommend/i,
    );
  });

  it("carries all six §7150(b) risk-assessment triggers", () => {
    expect(RISK_ASSESSMENT_TRIGGERS).toHaveLength(6);
    expect(RISK_ASSESSMENT_TRIGGERS).toContain("sell_share_pi");
  });

  it("emits a tag for every trigger, all present in the vocabulary", () => {
    for (const trigger of RISK_ASSESSMENT_TRIGGERS) {
      expect(ADMT_APPLICABILITY_TAGS).toContain(triggerTag(trigger));
    }
  });

  it("carries a pending California sign-off marker in both locales", () => {
    expect(ADMT_RULES_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(ADMT_RULES_LAW_REVIEWED_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ADMT_RULES_REVIEW_MARKER.en).toContain("sign-off pending");
    expect(ADMT_RULES_REVIEW_MARKER.es).toContain("pendiente de validación");
    expect(ADMT_RULES_REVIEW_MARKER.en).toContain(
      ADMT_RULES_LAW_REVIEWED_AS_OF,
    );
    expect(ADMT_RULES_REVIEW_MARKER.es).toContain(
      ADMT_RULES_LAW_REVIEWED_AS_OF,
    );
  });
});

// ---------------------------------------------------------------------------
// §7001(e) — the conjunctive test
// ---------------------------------------------------------------------------

describe("evaluateAdmtDefinition (§7001(e))", () => {
  it("returns null — never false — when no prongs have been answered", () => {
    const result = evaluateAdmtDefinition(null, "NOT_ASSESSED");
    expect(result.isAdmt).toBeNull();
    expect(result.decidedBy).toBeNull();
  });

  it("concludes NOT ADMT only when ALL THREE prongs are explicitly satisfied", () => {
    expect(
      evaluateAdmtDefinition(PRONGS_ALL_SATISFIED, "NOT_ASSESSED").isAdmt,
    ).toBe(false);

    // Two satisfied, one unexamined is unresolved — not a pass.
    const statuses: AdmtProngStatusValue[] = ["NOT_ASSESSED"];
    for (const unanswered of statuses) {
      expect(
        evaluateAdmtDefinition(
          { ...PRONGS_ALL_SATISFIED, interpretOutput: unanswered },
          "NOT_ASSESSED",
        ).isAdmt,
      ).toBeNull();
      expect(
        evaluateAdmtDefinition(
          { ...PRONGS_ALL_SATISFIED, reviewsOutputAndOtherInfo: unanswered },
          "NOT_ASSESSED",
        ).isAdmt,
      ).toBeNull();
      expect(
        evaluateAdmtDefinition(
          { ...PRONGS_ALL_SATISFIED, authorityToChange: unanswered },
          "NOT_ASSESSED",
        ).isAdmt,
      ).toBeNull();
    }
  });

  it("concludes IS ADMT from any single failed prong, naming which one", () => {
    const cases: Array<[keyof AdmtProngs, "A" | "B" | "C"]> = [
      ["interpretOutput", "A"],
      ["reviewsOutputAndOtherInfo", "B"],
      ["authorityToChange", "C"],
    ];
    for (const [prong, label] of cases) {
      const result = evaluateAdmtDefinition(
        { ...PRONGS_ALL_SATISFIED, [prong]: "NOT_SATISFIED" },
        "NOT_ASSESSED",
      );
      expect(result.isAdmt).toBe(true);
      expect(result.decidedBy).toBe("prong_failed");
      expect(result.failedProng).toBe(label);
    }
  });

  it("treats a reviewer who cannot overturn as ADMT even if fully trained", () => {
    // The rubber-stamp case: prongs A and B satisfied, C failed.
    const result = evaluateAdmtDefinition(
      {
        interpretOutput: "SATISFIED",
        reviewsOutputAndOtherInfo: "SATISFIED",
        authorityToChange: "NOT_SATISFIED",
      },
      "NOT_ASSESSED",
    );
    expect(result.isAdmt).toBe(true);
    expect(result.failedProng).toBe("C");
  });

  it("honours an explicitly recorded determination over the prongs", () => {
    expect(evaluateAdmtDefinition(PRONGS_ALL_SATISFIED, "ADMT")).toMatchObject({
      isAdmt: true,
      decidedBy: "declared",
    });
    expect(evaluateAdmtDefinition(null, "NOT_ADMT")).toMatchObject({
      isAdmt: false,
      decidedBy: "declared",
    });
  });

  it("treats §7001(e)(3) enumerated technology as not ADMT, with its own reason", () => {
    const result = evaluateAdmtDefinition(null, "ADMT_EXCLUDED_7001_E_3");
    expect(result.isAdmt).toBe(false);
    expect(result.decidedBy).toBe("excluded_7001_e_3");
  });
});

// ---------------------------------------------------------------------------
// Scope gates
// ---------------------------------------------------------------------------

describe("resolveAdmtScope — jurisdiction gates", () => {
  it("reports UNDECLARED, never out-of-scope, when nobody has said where the org operates", () => {
    const result = resolveAdmtScope(
      { ...CA_ORG, operatingJurisdictions: [] },
      system(),
    );
    expect(result.state).toBe("JURISDICTION_UNDECLARED");
    expect(result.state).not.toBe("OUT_OF_SCOPE_NO_CA_NEXUS");
    expect(result.tags).toEqual([]);
    expect(result.openQuestions).toContain("declareJurisdictions");
  });

  it("surfaces a narrowing conflict for a human instead of zeroing obligations", () => {
    const result = resolveAdmtScope(
      { ...CA_ORG, operatingJurisdictions: ["EU"] },
      system({ jurisdictionOverride: ["US_CA"] }),
    );
    expect(result.state).toBe("JURISDICTION_CONFLICT");
    expect(result.tags).toEqual([]);
  });

  it("is out of scope only when a DECLARED set genuinely excludes California", () => {
    const result = resolveAdmtScope(
      { ...CA_ORG, operatingJurisdictions: ["EU", "UK"] },
      system(),
    );
    expect(result.state).toBe("OUT_OF_SCOPE_NO_CA_NEXUS");
    expect(result.tags).toEqual([]);
    expect(result.reasons).toContain("noCaliforniaNexus");
  });

  it("respects a per-system override that narrows California away", () => {
    const result = resolveAdmtScope(
      CA_ORG,
      system({ jurisdictionOverride: ["EU"] }),
    );
    expect(result.state).toBe("OUT_OF_SCOPE_NO_CA_NEXUS");
  });
});

describe("resolveAdmtScope — covered-business gate", () => {
  it("stays open when the business screen is unanswered", () => {
    const result = resolveAdmtScope(
      { ...CA_ORG, coveredBusiness: "NOT_ASSESSED" },
      system({ determination: "ADMT", riskAssessmentTriggers: ["sell_share_pi"] }),
    );
    expect(result.state).toBe("COVERED_BUSINESS_NOT_ASSESSED");
    expect(result.tags).toEqual([]);
    expect(result.openQuestions).toContain("answerCoveredBusiness");
  });

  it("ends the analysis when the org is answered NOT a covered business", () => {
    const result = resolveAdmtScope(
      { ...CA_ORG, coveredBusiness: "NO" },
      system({ determination: "ADMT" }),
    );
    expect(result.state).toBe("OUT_OF_SCOPE_NO_CA_NEXUS");
    expect(result.reasons).toContain("coveredBusinessNo");
  });
});

describe("resolveAdmtScope — profile gate", () => {
  it("reports PROFILE_NOT_ASSESSED when no profile row exists", () => {
    const result = resolveAdmtScope(CA_ORG, system({ determination: null }));
    expect(result.state).toBe("PROFILE_NOT_ASSESSED");
    expect(result.determination.isAdmt).toBeNull();
    expect(result.tags).toEqual([]);
    expect(result.openQuestions).toContain("createProfile");
  });

  it("stays unresolved when the prongs are only partly answered", () => {
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "NOT_ASSESSED",
        prongs: { ...PRONGS_ALL_SATISFIED, authorityToChange: "NOT_ASSESSED" },
        riskAssessmentTriggers: ["sell_share_pi"],
      }),
    );
    expect(result.state).toBe("PROFILE_NOT_ASSESSED");
    expect(result.determination.isAdmt).toBeNull();
    expect(result.tags).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Article 10 / Article 11 split
// ---------------------------------------------------------------------------

describe("resolveAdmtScope — Article 10 / Article 11", () => {
  it("gives Article 10 only when triggers exist but no significant decision does", () => {
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "ADMT",
        riskAssessmentTriggers: ["sell_share_pi", "sensitive_pi"],
        significantDecisionDomains: [],
      }),
    );
    expect(result.state).toBe("ARTICLE_10_ONLY");
    expect(result.tags).toContain("admt:art10");
    expect(result.tags).toContain("admt:art10:trigger:sell_share_pi");
    expect(result.tags).toContain("admt:art10:trigger:sensitive_pi");
    expect(result.tags).not.toContain("admt:art11");
    expect(result.reasons).toContain("noSignificantDecision");
  });

  it("gives both articles when ADMT makes a significant decision", () => {
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "ADMT",
        riskAssessmentTriggers: ["admt_significant_decision"],
        significantDecisionDomains: ["employment_contracting"],
        soleFactor: "ONE_OF_SEVERAL",
        optOutBasis: "NONE_OPT_OUT_OFFERED",
      }),
    );
    expect(result.state).toBe("ARTICLE_10_AND_11");
    expect(result.tags).toContain("admt:art11");
    expect(result.tags).toContain("admt:art10");
    expect(result.reasons).toContain("significantDecisionPresent");
  });

  it("keeps a non-ADMT system out of Article 11 even with a significant-decision domain", () => {
    // The law-firm shape: an attorney interprets the output, weighs the matter
    // file, and can reach a different conclusion — so it is not ADMT at all.
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "NOT_ADMT",
        prongs: PRONGS_ALL_SATISFIED,
        significantDecisionDomains: ["employment_contracting"],
        riskAssessmentTriggers: ["sensitive_pi"],
      }),
    );
    expect(result.state).toBe("ARTICLE_10_ONLY");
    expect(result.tags).not.toContain("admt:art11");
    expect(result.determination.isAdmt).toBe(false);
    expect(result.reasons).toContain("humanInvolvementSubstantive");
  });

  it("does not reach Article 11 for advertising-only automation", () => {
    // §7001(ddd)(6) excludes advertising however automated it is: no domain
    // recorded means no Article 11, even when the system is squarely ADMT.
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "ADMT",
        significantDecisionDomains: [],
        riskAssessmentTriggers: ["sell_share_pi"],
      }),
    );
    expect(result.state).toBe("ARTICLE_10_ONLY");
    expect(result.openQuestions).toContain("answerSignificantDecisionDomains");
  });

  it("flags the two-part evidence test when a §7221(b)(2)/(3) exception is relied on", () => {
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "ADMT",
        significantDecisionDomains: ["employment_contracting"],
        riskAssessmentTriggers: ["admt_significant_decision"],
        soleFactor: "SOLE_FACTOR",
        optOutBasis: "ADMISSION_ACCEPTANCE_HIRING_7221_B_2",
      }),
    );
    expect(result.tags).toContain("admt:art11:optout_exception");
    expect(result.openQuestions).toContain("evidenceWorksForPurpose");
    expect(result.openQuestions).toContain("evidenceNonDiscrimination");
  });

  it("asks for soleFactor rather than assuming 'not the sole factor'", () => {
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "ADMT",
        significantDecisionDomains: ["healthcare"],
        riskAssessmentTriggers: ["admt_significant_decision"],
        soleFactor: "NOT_ASSESSED",
        optOutBasis: "NONE_OPT_OUT_OFFERED",
      }),
    );
    expect(result.openQuestions).toContain("answerSoleFactor");
  });

  it("ignores values outside the vocabularies", () => {
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "ADMT",
        riskAssessmentTriggers: ["sell_share_pi", "not_a_real_trigger"],
        significantDecisionDomains: ["advertising"],
      }),
    );
    expect(result.tags).toContain("admt:art10:trigger:sell_share_pi");
    expect(result.tags.join(" ")).not.toContain("not_a_real_trigger");
    // "advertising" is not a §7001(ddd) domain, so Article 11 must not attach.
    expect(result.state).toBe("ARTICLE_10_ONLY");
  });

  it("emits tags ONLY in a positive scope state", () => {
    const nonPositive = [
      resolveAdmtScope({ ...CA_ORG, operatingJurisdictions: [] }, system()),
      resolveAdmtScope({ ...CA_ORG, operatingJurisdictions: ["EU"] }, system()),
      resolveAdmtScope({ ...CA_ORG, coveredBusiness: "NOT_ASSESSED" }, system()),
      resolveAdmtScope(CA_ORG, system({ determination: null })),
    ];
    for (const result of nonPositive) {
      expect(result.tags).toEqual([]);
    }
  });

  it("only ever emits tags from the declared vocabulary", () => {
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "ADMT",
        significantDecisionDomains: ["housing"],
        riskAssessmentTriggers: [...RISK_ASSESSMENT_TRIGGERS],
        optOutBasis: "HUMAN_APPEAL_7221_B_1",
      }),
    );
    for (const tag of result.tags) {
      expect(ADMT_APPLICABILITY_TAGS).toContain(tag);
    }
  });
});

// ---------------------------------------------------------------------------
// Organization scope
// ---------------------------------------------------------------------------

describe("resolveAdmtOrgScope", () => {
  it("mirrors the system-level state when nothing attaches", () => {
    const result = resolveAdmtOrgScope(
      { ...CA_ORG, operatingJurisdictions: [] },
      [system(), system()],
    );
    expect(result.state).toBe("JURISDICTION_UNDECLARED");
    expect(result.tags).toEqual([]);
  });

  it("unions the tags of every in-scope system", () => {
    const result = resolveAdmtOrgScope(CA_ORG, [
      system({
        determination: "ADMT",
        riskAssessmentTriggers: ["sell_share_pi"],
      }),
      system({
        determination: "ADMT",
        riskAssessmentTriggers: ["sensitive_pi"],
        significantDecisionDomains: ["financial_lending"],
        optOutBasis: "NONE_OPT_OUT_OFFERED",
        soleFactor: "SOLE_FACTOR",
      }),
    ]);
    expect(result.state).toBe("ARTICLE_10_AND_11");
    expect(result.tags).toContain("admt:art10:trigger:sell_share_pi");
    expect(result.tags).toContain("admt:art10:trigger:sensitive_pi");
    expect(result.tags).toContain("admt:art11");
    expect(result.tags).toContain("admt:art9"); // revenue band known
  });

  it("withholds the Article 9 audit tag until a revenue band is known", () => {
    const result = resolveAdmtOrgScope(
      { ...CA_ORG, revenueBand: "NOT_ASSESSED" },
      [
        system({
          determination: "ADMT",
          riskAssessmentTriggers: ["sell_share_pi"],
        }),
      ],
    );
    expect(result.tags).not.toContain("admt:art9");
    expect(result.openQuestions).toContain("answerCoveredBusiness");
  });

  it("returns tags in canonical vocabulary order, deduplicated", () => {
    const result = resolveAdmtOrgScope(CA_ORG, [
      system({
        determination: "ADMT",
        riskAssessmentTriggers: ["sell_share_pi"],
      }),
      system({
        determination: "ADMT",
        riskAssessmentTriggers: ["sell_share_pi"],
      }),
    ]);
    expect(new Set(result.tags).size).toBe(result.tags.length);
    const indices = result.tags.map((t) => ADMT_APPLICABILITY_TAGS.indexOf(t));
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });
});

// ---------------------------------------------------------------------------
// Regression guard: ADMT rows stay invisible to the risk-tier paths
// ---------------------------------------------------------------------------

describe("two-axis applicability invariant", () => {
  it("keeps ADMT applicability entirely on the tag axis", () => {
    // The five existing auto-mapping call sites query
    // `applicableTo: { has: <riskLevel> }` with NO framework filter, so an ADMT
    // row with a non-empty applicableTo would be created for every system of
    // that tier. Seeding them with applicableTo = [] is what makes them
    // structurally unreachable from those paths; the resolver never returns a
    // risk tier, only tags.
    const result = resolveAdmtScope(
      CA_ORG,
      system({
        determination: "ADMT",
        riskAssessmentTriggers: ["sell_share_pi"],
        significantDecisionDomains: ["housing"],
        optOutBasis: "NONE_OPT_OUT_OFFERED",
      }),
    );
    const riskTiers = ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"];
    for (const tag of result.tags) {
      expect(riskTiers).not.toContain(tag);
    }
    // Every tag is namespaced, so it can never collide with a risk-tier value.
    expect(
      result.tags.every(
        (t) => t.startsWith("admt:") || t.startsWith("jurisdiction:"),
      ),
    ).toBe(true);
  });
});
