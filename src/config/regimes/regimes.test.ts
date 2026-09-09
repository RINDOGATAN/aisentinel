// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Content and rule tests for the regime frameworks (GDPR, Colorado SB 26-189,
 * Texas TRAIGA, Washington domain instruments). Pure — no DB.
 */

import { describe, it, expect } from "vitest";
import {
  REGIME_PACKS,
  REGIME_SELECTOR_TAGS,
  flattenRegimeRequirements,
  regimeRequirementId,
  resolveAllRegimeScopes,
  resolveGdprScope,
  resolveColoradoScope,
  resolveTexasScope,
  resolveWashingtonScope,
  DEFAULT_ORG_FACTS,
  DEFAULT_SYSTEM_SCREENING,
  type RegimeOrgFacts,
  type RegimeSystemFacts,
} from "./index";
import { JURISDICTION_TAG_PREFIX, selectorTags } from "@/lib/applicability-scope";
import { LEGAL_SIGNOFF } from "@/config/legal-signoff";

describe("regime packs: content", () => {
  for (const pack of REGIME_PACKS) {
    const all = flattenRegimeRequirements(pack.requirements);
    describe(pack.framework.code, () => {
      it("carries a version, a review date and a sign-off marker in both locales", () => {
        expect(pack.framework.contentVersion).toMatch(/^\d{4}\.\d{2}\.\d+$/);
        expect(pack.framework.lawReviewedAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // The marker states the status either way; what must never happen is a
        // marker that claims sign-off the record does not record.
        const record = LEGAL_SIGNOFF[pack.framework.code];
        expect(record, `no sign-off record for ${pack.framework.code}`).toBeDefined();
        for (const locale of ["en", "es"] as const) {
          expect(pack.framework.reviewMarker[locale].trim()).not.toBe("");
        }
        if (record.status === "signed-off") {
          expect(pack.framework.reviewMarker.en).toMatch(/Signed off/);
          expect(pack.framework.reviewMarker.en).not.toMatch(/sign-off pending/);
          expect(record.confirmedBy, "a sign-off needs someone who made it").toBeTruthy();
          expect(record.confirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        } else {
          expect(pack.framework.reviewMarker.en).toMatch(/sign-off pending/);
          expect(pack.framework.reviewMarker.es).toMatch(/pendiente/);
        }
      });
      it("has bilingual, non-identical titles and descriptions on every row", () => {
        expect(all.length).toBeGreaterThan(5);
        for (const row of all) {
          expect(row.title.en.trim(), `${row.code} title.en`).not.toBe("");
          expect(row.title.es.trim(), `${row.code} title.es`).not.toBe("");
          expect(row.description.en.trim(), `${row.code} description.en`).not.toBe("");
          expect(row.description.es.trim(), `${row.code} description.es`).not.toBe("");
          expect(row.description.es, `${row.code} untranslated`).not.toBe(row.description.en);
        }
      });
      it("has unique slugs and codes, and url-safe ids", () => {
        const slugs = all.map((r) => r.slug);
        const codes = all.map((r) => r.code);
        expect(new Set(slugs).size).toBe(slugs.length);
        expect(new Set(codes).size).toBe(codes.length);
        for (const row of all) {
          expect(regimeRequirementId(pack.framework, row.slug)).toMatch(/^[a-z]+-[a-z0-9-]+$/);
        }
      });
      it("tags every row with exactly one jurisdiction tag and only known selector tags", () => {
        for (const row of all) {
          const jur = row.applicabilityTags.filter((t) => t.startsWith(JURISDICTION_TAG_PREFIX));
          expect(jur.length, `${row.code} jurisdiction tag`).toBe(1);
          const selectors = selectorTags(row.applicabilityTags);
          expect(selectors.length, `${row.code} needs a selector tag`).toBeGreaterThan(0);
          for (const s of selectors) {
            expect(REGIME_SELECTOR_TAGS, `${row.code} unknown tag ${s}`).toContain(s);
          }
        }
      });
    });
  }
  it("uses distinct framework codes and id prefixes", () => {
    const codes = REGIME_PACKS.map((p) => p.framework.code);
    const prefixes = REGIME_PACKS.map((p) => p.framework.idPrefix);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    expect(prefixes).not.toContain("ca");
    expect(prefixes).not.toContain("eu");
  });
});

const org = (over: Partial<RegimeOrgFacts> = {}): RegimeOrgFacts => ({
  operatingJurisdictions: [],
  ...DEFAULT_ORG_FACTS,
  ...over,
});
const sys = (over: Partial<RegimeSystemFacts> = {}): RegimeSystemFacts => ({
  jurisdictionOverride: [],
  technique: "MACHINE_LEARNING",
  role: "DEPLOYER",
  processesPersonalData: true,
  riskLevel: null,
  annexIiiCategory: null,
  admtDetermination: null,
  significantDecisionDomains: [],
  admtSoleFactor: null,
  ...DEFAULT_SYSTEM_SCREENING,
  ...over,
});

describe("regime rules: undeclared jurisdictions never populate", () => {
  it("every regime is UNDETERMINED with a declare-jurisdictions question", () => {
    for (const scope of resolveAllRegimeScopes(org(), sys())) {
      expect(scope.state).toBe("UNDETERMINED");
      expect(scope.tags).toEqual([]);
      expect(scope.openQuestions).toContain("declare-jurisdictions");
    }
  });
  it("a foreign jurisdiction is OUT_OF_SCOPE, not undetermined", () => {
    const o = org({ operatingJurisdictions: ["JAPAN"] });
    for (const scope of resolveAllRegimeScopes(o, sys())) {
      expect(scope.state).toBe("OUT_OF_SCOPE");
      expect(scope.tags).toEqual([]);
    }
  });
});

describe("GDPR rules", () => {
  const eu = org({ operatingJurisdictions: ["EU"] });
  it("core only when personal data is processed and Art. 22 is unanswered", () => {
    const s = resolveGdprScope(eu, sys());
    expect(s.state).toBe("IN_SCOPE");
    expect(s.tags).toEqual(["jurisdiction:EU", "gdpr:core"]);
    expect(s.openQuestions).toEqual(["solely-automated", "special-category"]);
  });
  it("no personal data means out of scope", () => {
    expect(resolveGdprScope(eu, sys({ processesPersonalData: false })).state).toBe("OUT_OF_SCOPE");
  });
  it("a declared Art. 22 decision adds adm and dpia", () => {
    const s = resolveGdprScope(eu, sys({ solelyAutomatedLegalEffect: "YES", processesSpecialCategoryData: "NO" }));
    expect(s.tags).toEqual(["jurisdiction:EU", "gdpr:core", "gdpr:adm", "gdpr:dpia"]);
    expect(s.openQuestions).toEqual([]);
  });
  it("the ADMT sole-factor finding is a proxy for Art. 22 when the question was never asked", () => {
    const s = resolveGdprScope(eu, sys({ admtDetermination: "ADMT", admtSoleFactor: "SOLE_FACTOR" }));
    expect(s.tags).toContain("gdpr:adm");
    expect(s.reasons).toContain("solely-automated-from-admt");
  });
  it("a high-risk classification triggers the DPIA without an Art. 22 decision", () => {
    const s = resolveGdprScope(eu, sys({ riskLevel: "HIGH", solelyAutomatedLegalEffect: "NO", processesSpecialCategoryData: "NO" }));
    expect(s.tags).toEqual(["jurisdiction:EU", "gdpr:core", "gdpr:dpia"]);
  });
  it("special-category data adds both dpia and special", () => {
    const s = resolveGdprScope(eu, sys({ solelyAutomatedLegalEffect: "NO", processesSpecialCategoryData: "YES" }));
    expect(s.tags).toEqual(["jurisdiction:EU", "gdpr:core", "gdpr:dpia", "gdpr:special"]);
  });
  it("the UK counts as a GDPR nexus", () => {
    expect(resolveGdprScope(org({ operatingJurisdictions: ["UK"] }), sys()).state).toBe("IN_SCOPE");
  });
});

describe("Colorado rules", () => {
  const co = org({ operatingJurisdictions: ["US_CO"] });
  it("is undetermined until the consequential-decision question is answered", () => {
    const s = resolveColoradoScope(co, sys());
    expect(s.state).toBe("UNDETERMINED");
    expect(s.openQuestions).toEqual(["consequential-decision"]);
  });
  it("a positive ADMT determination with a domain is the proxy", () => {
    const s = resolveColoradoScope(co, sys({ admtDetermination: "ADMT", significantDecisionDomains: ["employment"] }));
    expect(s.state).toBe("IN_SCOPE");
    expect(s.tags).toEqual(["jurisdiction:US_CO", "co:core", "co:deployer"]);
    expect(s.reasons).toContain("consequential-decision-from-admt");
  });
  it("a provider is a developer", () => {
    const s = resolveColoradoScope(co, sys({ role: "PROVIDER", materiallyInfluencesConsequentialDecision: "YES" }));
    expect(s.tags).toContain("co:developer");
    expect(s.tags).not.toContain("co:deployer");
  });
  it("an explicit NO is out of scope even with an ADMT finding", () => {
    const s = resolveColoradoScope(co, sys({ admtDetermination: "ADMT", significantDecisionDomains: ["housing"], materiallyInfluencesConsequentialDecision: "NO" }));
    expect(s.state).toBe("OUT_OF_SCOPE");
  });
});

describe("Texas rules", () => {
  const tx = org({ operatingJurisdictions: ["US_TX"] });
  it("prohibitions reach every system; sector duties wait for answers", () => {
    const s = resolveTexasScope(tx, sys());
    expect(s.state).toBe("IN_SCOPE");
    expect(s.tags).toEqual(["jurisdiction:US_TX", "tx:core"]);
    expect(s.openQuestions).toEqual(["public-agency", "healthcare-provider"]);
  });
  it("a public agency gets the government duties", () => {
    const s = resolveTexasScope(org({ operatingJurisdictions: ["US_TX"], isPublicAgency: "YES", isHealthcareProvider: "NO" }), sys());
    expect(s.tags).toEqual(["jurisdiction:US_TX", "tx:core", "tx:government"]);
  });
  it("a health care provider gets the treatment disclosure", () => {
    const s = resolveTexasScope(org({ operatingJurisdictions: ["US_TX"], isPublicAgency: "NO", isHealthcareProvider: "YES" }), sys());
    expect(s.tags).toEqual(["jurisdiction:US_TX", "tx:core", "tx:healthcare"]);
    expect(s.openQuestions).toEqual([]);
  });
});

describe("Washington rules", () => {
  const wa = org({ operatingJurisdictions: ["US_WA"] });
  it("with no instrument answered it is undetermined with the right questions", () => {
    const s = resolveWashingtonScope(wa, sys({ technique: "GENERATIVE_AI", role: "PROVIDER" }));
    expect(s.state).toBe("UNDETERMINED");
    expect(s.tags).toEqual([]);
    expect(s.openQuestions).toEqual([
      "consumer-health-data",
      "covered-genai-provider",
      "companion-chatbot",
      "health-carrier",
      "public-agency",
    ]);
  });
  it("everything answered NO is out of scope", () => {
    const o = org({ operatingJurisdictions: ["US_WA"], isPublicAgency: "NO", isHealthCarrier: "NO", isCoveredGenAiProvider: "NO", processesConsumerHealthData: "NO" });
    const s = resolveWashingtonScope(o, sys({ processesSpecialCategoryData: "NO", isCompanionChatbot: "NO" }));
    expect(s.state).toBe("OUT_OF_SCOPE");
  });
  it("health inferences select MHMDA", () => {
    const s = resolveWashingtonScope(wa, sys({ processesSpecialCategoryData: "YES" }));
    expect(s.tags).toContain("wa:mhmda");
    expect(s.tags[0]).toBe("jurisdiction:US_WA");
  });
  it("a covered generative provider selects the provenance duty", () => {
    const o = org({ operatingJurisdictions: ["US_WA"], isCoveredGenAiProvider: "YES" });
    const s = resolveWashingtonScope(o, sys({ technique: "GENERATIVE_AI", role: "PROVIDER" }));
    expect(s.tags).toContain("wa:genai-provenance");
  });
  it("a deployer of generative AI is never a covered provider", () => {
    const o = org({ operatingJurisdictions: ["US_WA"], isCoveredGenAiProvider: "YES" });
    const s = resolveWashingtonScope(o, sys({ technique: "GENERATIVE_AI", role: "DEPLOYER" }));
    expect(s.tags).not.toContain("wa:genai-provenance");
  });
  it("companion chatbots, prior authorisation and public agencies each select their instrument", () => {
    const o = org({ operatingJurisdictions: ["US_WA"], isHealthCarrier: "YES", isPublicAgency: "YES" });
    const s = resolveWashingtonScope(o, sys({ isCompanionChatbot: "YES", usedInPriorAuthorization: "YES" }));
    expect(s.tags).toEqual(expect.arrayContaining(["wa:companion", "wa:prior-auth", "wa:public-agency"]));
  });
  it("a per-system jurisdiction override narrows the organisation set", () => {
    const o = org({ operatingJurisdictions: ["US_WA", "US_TX"] });
    const s = resolveWashingtonScope(o, sys({ jurisdictionOverride: ["US_TX"] }));
    expect(s.state).toBe("OUT_OF_SCOPE");
  });
});
