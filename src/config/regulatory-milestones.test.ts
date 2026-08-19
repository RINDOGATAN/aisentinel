// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  REGULATORY_MILESTONES,
  REGULATORY_MILESTONES_VERSION,
  REGULATORY_MILESTONES_LAW_REVIEWED_AS_OF,
  REGULATORY_MILESTONES_REVIEW_MARKER,
  evaluateMilestone,
  evaluateMilestones,
  getMilestone,
  type MilestoneOrgContext,
  type MilestoneSystemContext,
  type AdmtProfileFacts,
  type EvaluateInput,
} from "./regulatory-milestones";
import {
  ART50_APPLICABLE_FROM,
  ART50_MARKING_GRACE_DEADLINE,
} from "./transparency-rules";
import { EU_TIMELINE_REQUIREMENT_CODES } from "./eu-timeline-requirements";
import { JURISDICTION_IDS } from "./jurisdictions";

const NOW = "2026-08-19T00:00:00.000Z";

// ── Fixtures ────────────────────────────────────────────────────────

function org(overrides: Partial<MilestoneOrgContext> = {}): MilestoneOrgContext {
  return {
    jurisdictions: ["EU"],
    jurisdictionsDeclared: true,
    revenueTier: null,
    sellsOrSharesPersonalInfo: null,
    isLargeOnlinePlatform: null,
    isGenerativeAiDeveloper: null,
    hasEmployees: null,
    ...overrides,
  };
}

const UNDECLARED = org({ jurisdictions: [], jurisdictionsDeclared: false });

function admt(overrides: Partial<AdmtProfileFacts> = {}): AdmtProfileFacts {
  return {
    isAdmt: true,
    humanInvolvement: "NONE",
    significantDecisionDomains: ["employment_contracting"],
    triggers: ["admt_significant_decision"],
    riskAssessmentCompletedAt: null,
    preUseNoticeReady: null,
    optOutMechanismReady: null,
    accessRequestProcessReady: null,
    determinedAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides,
  };
}

function system(
  overrides: Partial<MilestoneSystemContext> = {},
): MilestoneSystemContext {
  return {
    id: "sys-1",
    name: "Screening Assistant",
    riskLevel: "LIMITED",
    annexIiiCategory: null,
    isAnnexIProduct: false,
    technique: "GENERATIVE_AI",
    role: "DEPLOYER",
    status: "DEPLOYED",
    processesPersonalData: true,
    placedOnMarketBefore2Aug2026: false,
    art50: {
      interaction: "REQUIRED",
      marking: "REQUIRED",
      emotion: "NOT_APPLICABLE",
      deepfake: "NOT_APPLICABLE",
    },
    admt: null,
    ...overrides,
  };
}

function evalInput(overrides: Partial<EvaluateInput> = {}): EvaluateInput {
  return {
    org: org(),
    systems: [system()],
    organizationId: "org-1",
    nowIso: NOW,
    ...overrides,
  };
}

const byId = (id: string) => {
  const m = REGULATORY_MILESTONES.find((x) => x.id === id);
  if (!m) throw new Error(`milestone ${id} not found`);
  return m;
};

// ── Structural integrity ────────────────────────────────────────────

describe("regulatory milestones — structure", () => {
  it("has a versioned, pending-sign-off review marker", () => {
    expect(REGULATORY_MILESTONES_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(REGULATORY_MILESTONES_LAW_REVIEWED_AS_OF).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    // This content has NOT been signed off — the marker must say so, in both
    // languages, or an export would imply a review that never happened.
    expect(REGULATORY_MILESTONES_REVIEW_MARKER.en).toContain("pending");
    expect(REGULATORY_MILESTONES_REVIEW_MARKER.es).toContain("pendiente");
  });

  it("ids are unique and kebab-case", () => {
    const ids = REGULATORY_MILESTONES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("every date parses to UTC midnight", () => {
    for (const m of REGULATORY_MILESTONES) {
      expect(m.date, m.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const parsed = new Date(`${m.date}T00:00:00.000Z`);
      expect(Number.isNaN(parsed.getTime()), m.id).toBe(false);
      expect(parsed.toISOString().slice(0, 10)).toBe(m.date);
    }
  });

  it("has no duplicate (instrument, provision, date) triples", () => {
    const keys = REGULATORY_MILESTONES.map(
      (m) => `${m.instrument}|${m.provision}|${m.date}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every title and whatItMeans is non-empty in both locales", () => {
    for (const m of REGULATORY_MILESTONES) {
      expect(m.title.en.trim(), `${m.id} title.en`).not.toBe("");
      expect(m.title.es.trim(), `${m.id} title.es`).not.toBe("");
      expect(m.whatItMeans.en.trim(), `${m.id} whatItMeans.en`).not.toBe("");
      expect(m.whatItMeans.es.trim(), `${m.id} whatItMeans.es`).not.toBe("");
      // The Spanish must actually be Spanish, not a copy of the English.
      expect(m.whatItMeans.es, `${m.id} untranslated`).not.toBe(
        m.whatItMeans.en,
      );
    }
  });

  it("carries a citation, a provision and a review date on every entry", () => {
    for (const m of REGULATORY_MILESTONES) {
      expect(m.citation.trim(), m.id).not.toBe("");
      expect(m.provision.trim(), m.id).not.toBe("");
      expect(m.lawReviewedAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("declares the right predicate for its count unit", () => {
    for (const m of REGULATORY_MILESTONES) {
      if (m.countUnit === "systems") {
        expect(m.applies, `${m.id} needs applies()`).toBeTypeOf("function");
      } else {
        expect(m.orgApplies, `${m.id} needs orgApplies()`).toBeTypeOf(
          "function",
        );
      }
    }
  });

  it("only cites requirement codes that exist in the seeded Art. 113 subtree", () => {
    for (const m of REGULATORY_MILESTONES) {
      for (const code of m.requirementCodes ?? []) {
        expect(
          EU_TIMELINE_REQUIREMENT_CODES,
          `${m.id} cites unknown requirement code "${code}"`,
        ).toContain(code);
      }
    }
  });

  it("only uses jurisdictions that exist in the shared vocabulary", () => {
    // Predicates close over jurisdiction tokens; this guards against a typo
    // silently making a milestone unreachable.
    const source = REGULATORY_MILESTONES.map((m) =>
      (m.applies ?? m.orgApplies ?? (() => undefined)).toString(),
    ).join("\n");
    const referenced = [...source.matchAll(/"(US_[A-Z]+|EU|EEA|UK)"/g)].map(
      (x) => x[1],
    );
    for (const token of new Set(referenced)) {
      expect(JURISDICTION_IDS, `unknown jurisdiction "${token}"`).toContain(
        token,
      );
    }
  });

  it("covers roughly the expected number of instruments", () => {
    expect(REGULATORY_MILESTONES.length).toBeGreaterThanOrEqual(18);
    const instruments = new Set(REGULATORY_MILESTONES.map((m) => m.instrument));
    for (const required of [
      "eu-ai-act",
      "ccpa-admt",
      "ccpa-risk-assessments",
      "ccpa-cyber-audits",
      "tx-traiga",
      "il-hb-3773",
      "co-sb-26-189",
      "nyc-ll-144",
      "ut-aipa",
    ]) {
      expect(instruments, `missing ${required}`).toContain(required);
    }
  });

  it("getMilestone resolves by id", () => {
    expect(getMilestone("ccpa-admt-article-11-rights")?.date).toBe("2027-01-01");
    expect(getMilestone("nope")).toBeUndefined();
  });
});

// ── Date ownership ──────────────────────────────────────────────────

describe("regulatory milestones — date ownership", () => {
  it("takes the Art. 50 dates from transparency-rules, never a copied literal", () => {
    // If someone re-types "2026-08-02" here instead of importing, this fails.
    expect(byId("eu-ai-act-art50-transparency").date).toBe(
      ART50_APPLICABLE_FROM.toISOString().slice(0, 10),
    );
    expect(byId("eu-ai-act-art50-marking-grace").date).toBe(
      ART50_MARKING_GRACE_DEADLINE.toISOString().slice(0, 10),
    );
  });

  it("encodes the post-Omnibus ordering: California ADMT before EU Annex III", () => {
    // The product's headline message. If a future edit inverts this, the
    // calendar's whole argument breaks and this test is the tripwire.
    const admtDate = new Date(`${byId("ccpa-admt-article-11-rights").date}T00:00:00Z`);
    const annexIiiDate = new Date(
      `${byId("eu-ai-act-annex-iii-high-risk").date}T00:00:00Z`,
    );
    expect(admtDate.getTime()).toBeLessThan(annexIiiDate.getTime());
    const months =
      (annexIiiDate.getTime() - admtDate.getTime()) / (30.44 * 24 * 3600 * 1000);
    expect(Math.round(months)).toBe(11);
  });

  it("keeps the deferred EU dates post-Omnibus", () => {
    expect(byId("eu-ai-act-annex-iii-high-risk").date).toBe("2027-12-02");
    expect(byId("eu-ai-act-annex-i-high-risk").date).toBe("2028-08-02");
  });

  it("has the California duty live in 2026, not 2027", () => {
    // The single most-misread fact in the regime: risk assessments are
    // already required; only Article 11 rights wait for 2027.
    expect(byId("ccpa-risk-assessment-duty-live").date).toBe("2026-01-01");
    expect(byId("ccpa-risk-assessment-backfill").date).toBe("2027-12-31");
    expect(byId("ccpa-risk-assessment-first-submission").date).toBe("2028-04-01");
  });

  it("phases the cybersecurity audits across three years", () => {
    expect(byId("ccpa-cyber-audit-tier-1").date).toBe("2028-04-01");
    expect(byId("ccpa-cyber-audit-tier-2").date).toBe("2029-04-01");
    expect(byId("ccpa-cyber-audit-tier-3").date).toBe("2030-04-01");
  });
});

// ── Tri-state applicability ─────────────────────────────────────────

describe("regulatory milestones — tri-state applicability", () => {
  it("returns only the three legal values across a matrix of contexts", () => {
    const contexts = [
      UNDECLARED,
      org({ jurisdictions: ["EU"] }),
      org({ jurisdictions: ["US_CA"] }),
      org({ jurisdictions: ["US_TX"] }),
      org({ jurisdictions: ["US_IL"], hasEmployees: true }),
      org({ jurisdictions: ["US_NY"], hasEmployees: false }),
      org({ jurisdictions: ["US_CO"] }),
      org({ jurisdictions: ["US_UT"] }),
      org({ jurisdictions: ["EU", "US_CA"], revenueTier: "OVER_100M" }),
      org({ jurisdictions: ["US_CA"], sellsOrSharesPersonalInfo: true }),
      org({ jurisdictions: ["US_CA"], isGenerativeAiDeveloper: true }),
      org({ jurisdictions: ["US_CA"], isLargeOnlinePlatform: false }),
    ];
    const systems = [
      system(),
      system({ riskLevel: null }),
      system({ riskLevel: "HIGH", isAnnexIProduct: null }),
      system({ admt: admt() }),
      system({ admt: admt({ determinedAt: null }) }),
      system({ art50: null }),
    ];
    const legal = new Set(["in-scope", "out-of-scope", "undetermined"]);
    for (const m of REGULATORY_MILESTONES) {
      for (const context of contexts) {
        if (m.countUnit === "organization") {
          expect(legal, `${m.id}`).toContain(m.orgApplies!(context, systems));
        } else {
          for (const sys of systems) {
            expect(legal, `${m.id}`).toContain(m.applies!(sys, context));
          }
        }
      }
    }
  });

  it("never says out-of-scope when jurisdictions are undeclared", () => {
    // The load-bearing honesty rule: we cannot tell a company a regime does
    // not apply when it has not told us where it operates.
    for (const m of REGULATORY_MILESTONES) {
      const result =
        m.countUnit === "organization"
          ? m.orgApplies!(UNDECLARED, [system()])
          : m.applies!(system(), UNDECLARED);
      expect(result, `${m.id} must not assert scope from no data`).toBe(
        "undetermined",
      );
    }
  });

  it("never puts a system with no ADMT profile in scope for a CCPA-ADMT milestone", () => {
    const caOrg = org({ jurisdictions: ["US_CA"] });
    const noProfile = system({ admt: null });
    const undetermined = system({ admt: admt({ determinedAt: null }) });
    for (const m of REGULATORY_MILESTONES.filter(
      (x) => x.instrument === "ccpa-admt" && x.countUnit === "systems",
    )) {
      expect(m.applies!(noProfile, caOrg)).toBe("undetermined");
      expect(m.applies!(undetermined, caOrg)).toBe("undetermined");
    }
  });

  it("treats an unclassified system as undetermined for Annex III, not exempt", () => {
    const euOrg = org({ jurisdictions: ["EU"] });
    const m = byId("eu-ai-act-annex-iii-high-risk");
    expect(m.applies!(system({ riskLevel: null }), euOrg)).toBe("undetermined");
    expect(m.applies!(system({ riskLevel: "LIMITED" }), euOrg)).toBe(
      "out-of-scope",
    );
    expect(
      m.applies!(
        system({ riskLevel: "HIGH", isAnnexIProduct: false }),
        euOrg,
      ),
    ).toBe("in-scope");
    expect(
      m.applies!(system({ riskLevel: "HIGH", isAnnexIProduct: null }), euOrg),
    ).toBe("undetermined");
  });

  it("applies the §7001(e) and §7001(ddd) gates to California ADMT", () => {
    const caOrg = org({ jurisdictions: ["US_CA"] });
    const m = byId("ccpa-admt-article-11-rights");
    // Substantive human involvement ⇒ not ADMT ⇒ out of scope.
    expect(
      m.applies!(system({ admt: admt({ humanInvolvement: "SUBSTANTIVE" }) }), caOrg),
    ).toBe("out-of-scope");
    // No significant-decision domain ⇒ Article 11 does not bite.
    expect(
      m.applies!(system({ admt: admt({ significantDecisionDomains: [] }) }), caOrg),
    ).toBe("out-of-scope");
    // Unresolved conjunction ⇒ undetermined, never a guess.
    expect(
      m.applies!(
        system({ admt: admt({ humanInvolvement: "UNDETERMINED" }) }),
        caOrg,
      ),
    ).toBe("undetermined");
    expect(m.applies!(system({ admt: admt() }), caOrg)).toBe("in-scope");
  });

  it("scopes an EU-only organization out of California and vice versa", () => {
    const euOnly = org({ jurisdictions: ["EU"] });
    const caOnly = org({ jurisdictions: ["US_CA"] });
    expect(
      byId("ccpa-admt-article-11-rights").applies!(
        system({ admt: admt() }),
        euOnly,
      ),
    ).toBe("out-of-scope");
    expect(
      byId("eu-ai-act-annex-iii-high-risk").applies!(
        system({ riskLevel: "HIGH" }),
        caOnly,
      ),
    ).toBe("out-of-scope");
  });

  it("treats EEA membership as EU for AI Act purposes", () => {
    const eea = org({ jurisdictions: ["EEA"] });
    expect(
      byId("eu-ai-act-annex-iii-high-risk").applies!(
        system({ riskLevel: "HIGH", isAnnexIProduct: false }),
        eea,
      ),
    ).toBe("in-scope");
  });
});

// ── Evaluation ──────────────────────────────────────────────────────

describe("evaluateMilestones", () => {
  it("is deterministic for a fixed nowIso", () => {
    const a = evaluateMilestones(evalInput());
    const b = evaluateMilestones(evalInput());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("sorts by date then id", () => {
    const results = evaluateMilestones(evalInput());
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const cur = results[i];
      const delta = cur.date.getTime() - prev.date.getTime();
      expect(delta).toBeGreaterThanOrEqual(0);
      if (delta === 0) {
        expect(prev.milestone.id < cur.milestone.id).toBe(true);
      }
    }
  });

  it("computes signed whole days and the matching phase", () => {
    const results = evaluateMilestones(evalInput());
    for (const r of results) {
      const expected = Math.ceil(
        (r.date.getTime() - new Date(NOW).getTime()) / (24 * 3600 * 1000),
      );
      expect(r.daysRemaining, r.milestone.id).toBe(expected);
      if (r.daysRemaining < 0) expect(r.phase).toBe("past");
      else if (r.daysRemaining <= 90) expect(r.phase).toBe("imminent");
      else if (r.daysRemaining <= 365) expect(r.phase).toBe("upcoming");
      else expect(r.phase).toBe("future");
    }
  });

  it("keeps in-scope, undetermined and out-of-scope counts disjoint", () => {
    const systems = [
      system({ id: "a" }),
      system({ id: "b", riskLevel: null }),
      system({ id: "c", admt: admt() }),
    ];
    for (const r of evaluateMilestones(evalInput({ systems }))) {
      if (r.milestone.countUnit !== "systems") continue;
      const total =
        r.inScope.length + r.undetermined.length + r.outOfScope;
      expect(total, r.milestone.id).toBe(systems.length);
      // No id can appear in two buckets.
      const undeterminedIds = new Set(r.undetermined.map((u) => u.id));
      for (const id of r.inScope) expect(undeterminedIds.has(id)).toBe(false);
    }
  });

  it("reports unknown rather than does-not-apply when nothing is determined", () => {
    const results = evaluateMilestones(
      evalInput({ org: UNDECLARED, systems: [system()] }),
    );
    for (const r of results) {
      expect(r.applicability, r.milestone.id).toBe("unknown");
      expect(r.inScope).toHaveLength(0);
    }
  });

  it("distinguishes a legitimate zero from an unknown", () => {
    // An EU-declared org with a non-generative, classified system is
    // genuinely out of scope for the new Art. 5 prohibitions.
    const result = evaluateMilestone(
      byId("eu-ai-act-art5-new-prohibitions"),
      evalInput({
        org: org({ jurisdictions: ["EU"] }),
        systems: [system({ technique: "NLP" })],
      }),
    );
    expect(result.applicability).toBe("does-not-apply");
    expect(result.outOfScope).toBe(1);
    expect(result.undetermined).toHaveLength(0);
  });

  it("marks a past, unsatisfied obligation overdue", () => {
    const result = evaluateMilestone(
      byId("eu-ai-act-art50-transparency"),
      evalInput({
        org: org({ jurisdictions: ["EU"] }),
        systems: [system()], // marking REQUIRED, so not satisfied
      }),
    );
    expect(result.daysRemaining).toBeLessThan(0);
    expect(result.phase).toBe("past");
    expect(result.overdue).toBe(true);
  });

  it("does not mark a past obligation overdue once it is satisfied", () => {
    const satisfied = system({
      art50: {
        interaction: "IMPLEMENTED",
        marking: "IMPLEMENTED",
        emotion: "NOT_APPLICABLE",
        deepfake: "NOT_APPLICABLE",
      },
    });
    const result = evaluateMilestone(
      byId("eu-ai-act-art50-transparency"),
      evalInput({ org: org({ jurisdictions: ["EU"] }), systems: [satisfied] }),
    );
    expect(result.satisfied).toEqual([satisfied.id]);
    expect(result.overdue).toBe(false);
  });

  it("resolves the derived marking deadline per system", () => {
    const graced = system({
      placedOnMarketBefore2Aug2026: true,
      art50: {
        interaction: "NOT_APPLICABLE",
        marking: "REQUIRED",
        emotion: "NOT_APPLICABLE",
        deepfake: "NOT_APPLICABLE",
      },
    });
    const result = evaluateMilestone(
      byId("eu-ai-act-art50-marking-grace"),
      evalInput({ org: org({ jurisdictions: ["EU"] }), systems: [graced] }),
    );
    expect(result.inScope).toEqual([graced.id]);
    expect(result.date.toISOString().slice(0, 10)).toBe(
      ART50_MARKING_GRACE_DEADLINE.toISOString().slice(0, 10),
    );
  });

  it("uses the organization id as the subject for org-level milestones", () => {
    const result = evaluateMilestone(
      byId("tx-traiga-live"),
      evalInput({ org: org({ jurisdictions: ["US_TX"] }) }),
    );
    expect(result.inScope).toEqual(["org-1"]);
  });

  it("records a reason for every undetermined subject", () => {
    for (const r of evaluateMilestones(evalInput({ org: UNDECLARED }))) {
      for (const u of r.undetermined) {
        expect(u.reason, `${r.milestone.id}`).toBeTruthy();
      }
    }
  });

  it("handles an empty inventory without inventing scope", () => {
    const results = evaluateMilestones(evalInput({ systems: [] }));
    for (const r of results.filter((x) => x.milestone.countUnit === "systems")) {
      expect(r.inScope).toHaveLength(0);
      expect(r.undetermined).toHaveLength(0);
      expect(r.outOfScope).toBe(0);
      expect(r.applicability).toBe("does-not-apply");
      expect(r.overdue).toBe(false);
    }
  });
});
