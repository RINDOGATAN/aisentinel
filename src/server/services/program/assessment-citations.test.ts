// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The plan's impact-assessment action cites only the laws in the
 * organisation's scope: a document that cites a law the organisation is not
 * subject to is the boilerplate that makes a reader stop trusting the rest.
 */
import { describe, expect, it } from "vitest";
import { impactAssessmentDetail } from "@/config/program-guidance";
import { assessmentLawScope } from "./program-data";

const ALL = ["EU_AI_ACT", "CA_CCPA_ADMT", "CO_SB_26_189", "TX_TRAIGA", "WA_AI_RULES", "NIST_AI_RMF", "ISO_42001", "AIUC_1"];
const org = (places: string[], frameworks: string[] = ALL, extra: Record<string, unknown> = {}) => ({
  operatingJurisdictions: places,
  settings: { applicability: { frameworks, answers: { usesAi: "YES" } }, ...extra },
});
const detail = (o: ReturnType<typeof org>) => impactAssessmentDetail(assessmentLawScope(o));

describe("the impact-assessment action's citations", () => {
  it("cites the GDPR and the EU AI Act for an EU organisation that has chosen the Act", () => {
    const d = detail(org(["EU"]));
    expect(d.en).toContain("GDPR data protection impact assessment (Art. 35)");
    expect(d.en).toContain("(Art. 27)");
    expect(d.es).toContain("RGPD (art. 35)");
    expect(d.es).toContain("(art. 27)");
  });

  it("cites the GDPR alone for the UK, and alone when the EU AI Act is not chosen", () => {
    for (const o of [org(["UK"]), org(["EU"], ["NIST_AI_RMF"])]) {
      const d = detail(o);
      expect(d.en).toContain("Art. 35");
      expect(d.en).not.toContain("Art. 27");
      expect(d.es).not.toContain("art. 27");
    }
  });

  it("cites no European law for a US-only organisation, and neutral words with nothing in scope", () => {
    for (const o of [org(["US_CO", "US_TX"]), org([]), org(["US_CA"])]) {
      const d = detail(o);
      for (const text of [d.en, d.es]) expect(text).not.toMatch(/Art\. 3[5]|art\. 35|Art\. 27|art\. 27|§/);
      expect(d.en).toContain("safeguards");
    }
  });

  it("cites the California risk assessments only for a covered business that has chosen the rules", () => {
    expect(detail(org(["US_CA"], ALL, { admt: { coveredBusiness: "YES" } })).en).toContain("§§ 7150 to 7157");
    expect(detail(org(["US_CA"], ["NIST_AI_RMF"], { admt: { coveredBusiness: "YES" } })).en).not.toContain("§");
    expect(detail(org(["US_CA"], ALL, { admt: { coveredBusiness: "NOT_ASSESSED" } })).en).not.toContain("§");
  });
});
