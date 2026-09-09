// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Tests for the shared system-scope assembly. Pure — buildSystemScope takes
 * rows and returns the resolved picture, so no database is involved.
 */

import { describe, it, expect } from "vitest";
import { buildSystemScope } from "./system-scope";
import { selectUnifiedQuestions } from "@/config/unified-assessment";

const system = (over: Record<string, unknown> = {}) =>
  ({
    id: "sys1",
    name: "Applicant ranker",
    technique: "MACHINE_LEARNING",
    role: "DEPLOYER",
    status: "DEPLOYED",
    purpose: "Ranks applicants",
    description: null,
    businessOwner: null,
    technicalOwner: null,
    processesPersonalData: true,
    jurisdictionOverride: [],
    metadata: null,
    riskClassification: null,
    admtProfile: null,
    agentProfile: null,
    transparencyProfile: null,
    ...over,
  }) as Parameters<typeof buildSystemScope>[0];

const org = (over: Record<string, unknown> = {}) =>
  ({
    name: "A firm",
    operatingJurisdictions: [],
    settings: null,
    ...over,
  }) as Parameters<typeof buildSystemScope>[1];

describe("buildSystemScope", () => {
  it("produces no overlays at all when nothing has been declared", () => {
    const scope = buildSystemScope(system(), org());
    expect(scope.jurisdictionsDeclared).toBe(false);
    expect(scope.overlayTags).toEqual([]);
    expect(scope.undetermined.map((u) => u.framework)).toEqual([
      "EU_GDPR",
      "CO_SB_26_189",
      "TX_TRAIGA",
      "WA_AI_RULES",
    ]);
    // The core assessment is still answerable.
    expect(selectUnifiedQuestions(scope.overlayTags).length).toBeGreaterThan(0);
  });

  it("withholds California tags while the ADMT determination is unresolved", () => {
    const scope = buildSystemScope(system(), org({ operatingJurisdictions: ["US_CA"] }));
    expect(scope.admtResolved).toBe(false);
    expect(scope.overlayTags).not.toContain("admt:art11");
  });

  it("resolves the EU picture from jurisdiction, personal data and risk tier", () => {
    const scope = buildSystemScope(
      system({ riskClassification: { riskLevel: "HIGH", annexIIICategory: "employment" } }),
      org({ operatingJurisdictions: ["EU"] }),
    );
    expect(scope.overlayTags).toEqual(expect.arrayContaining(["gdpr:core", "gdpr:dpia", "eu:high-risk"]));
    expect(scope.riskLevel).toBe("HIGH");
  });

  it("reads the Art. 50 obligation from the transparency profile", () => {
    const none = buildSystemScope(
      system({
        transparencyProfile: {
          art50InteractionStatus: "NOT_APPLICABLE",
          art50MarkingStatus: "NOT_APPLICABLE",
          art50EmotionStatus: "NOT_APPLICABLE",
          art50DeepfakeStatus: "NOT_APPLICABLE",
          markingMethods: [],
        },
      }),
      org({ operatingJurisdictions: ["EU"] }),
    );
    expect(none.hasArt50Obligation).toBe(false);
    expect(none.overlayTags).not.toContain("eu:art50");

    const some = buildSystemScope(
      system({
        transparencyProfile: {
          art50InteractionStatus: "REQUIRED",
          art50MarkingStatus: "NOT_APPLICABLE",
          art50EmotionStatus: "NOT_APPLICABLE",
          art50DeepfakeStatus: "NOT_APPLICABLE",
          markingMethods: [],
        },
      }),
      org({ operatingJurisdictions: ["EU"] }),
    );
    expect(some.hasArt50Obligation).toBe(true);
    expect(some.overlayTags).toContain("eu:art50");
  });

  it("carries the California ADMT determination into the GDPR and Colorado proxies", () => {
    const scope = buildSystemScope(
      system({
        admtProfile: {
          determination: "ADMT",
          prongInterpretOutput: "NOT_SATISFIED",
          prongReviewsOutputAndOtherInfo: "NOT_SATISFIED",
          prongAuthorityToChange: "NOT_SATISFIED",
          significantDecisionDomains: ["employment_contracting"],
          riskAssessmentTriggers: ["admt_significant_decision"],
          soleFactor: "SOLE_FACTOR",
          optOutBasis: "NOT_ASSESSED",
          designatedReviewer: null,
          appealRouteDescription: null,
        },
      }),
      org({ operatingJurisdictions: ["EU", "US_CA", "US_CO"] }),
    );
    // GDPR Art. 22 inferred from the sole-factor finding.
    expect(scope.overlayTags).toContain("gdpr:adm");
    // Colorado covered-ADMT inferred from the determination plus a domain.
    expect(scope.overlayTags).toContain("co:deployer");
  });

  it("reads the agentic answer out of system metadata", () => {
    const scope = buildSystemScope(
      system({ metadata: { regimeFacts: { handsOffToAutonomousAgent: "YES" } } }),
      org({ operatingJurisdictions: ["EU"] }),
    );
    expect(scope.overlayTags).toContain("agentic");
    expect(selectUnifiedQuestions(scope.overlayTags).map((s) => s.id)).toContain("agentic");
  });

  it("narrows to the per-system jurisdiction override", () => {
    const scope = buildSystemScope(
      system({ jurisdictionOverride: ["US_TX"] }),
      org({ operatingJurisdictions: ["EU", "US_TX"] }),
    );
    expect(scope.overlayTags).toContain("tx:core");
    expect(scope.overlayTags).not.toContain("gdpr:core");
  });

  it("assembles the full multi-state picture the workshop describes", () => {
    const scope = buildSystemScope(
      system({
        technique: "GENERATIVE_AI",
        riskClassification: { riskLevel: "HIGH", annexIIICategory: "employment" },
        metadata: { regimeFacts: { handsOffToAutonomousAgent: "YES", processesSpecialCategoryData: "YES" } },
        admtProfile: {
          determination: "ADMT",
          prongInterpretOutput: "NOT_SATISFIED",
          prongReviewsOutputAndOtherInfo: "NOT_SATISFIED",
          prongAuthorityToChange: "NOT_SATISFIED",
          significantDecisionDomains: ["employment_contracting"],
          riskAssessmentTriggers: ["admt_significant_decision"],
          soleFactor: "SOLE_FACTOR",
          optOutBasis: "NOT_ASSESSED",
          designatedReviewer: null,
          appealRouteDescription: null,
        },
      }),
      org({
        operatingJurisdictions: ["EU", "US_CA", "US_CO", "US_TX", "US_WA"],
        settings: {
          admt: { coveredBusiness: "YES", revenueBand: "OVER_50M", sellShareRevenue50Plus: "NO", revenueOverCcpaThreshold: "YES", largeProcessingVolume: "YES" },
          regimes: { isPublicAgency: "NO", isHealthCarrier: "NO", isHealthcareProvider: "NO", isCoveredGenAiProvider: "NO", processesConsumerHealthData: "NO" },
        },
      }),
    );
    expect(scope.overlayTags).toEqual(
      expect.arrayContaining([
        "admt:art10", "admt:art11",
        "gdpr:core", "gdpr:adm", "gdpr:dpia", "gdpr:special",
        "co:deployer", "tx:core", "wa:mhmda",
        "eu:high-risk", "agentic",
      ]),
    );
    const sections = selectUnifiedQuestions(scope.overlayTags);
    // Every section of the template is in play for this system.
    expect(sections.length).toBe(10);
    expect(scope.undetermined).toEqual([]);
  });
});
