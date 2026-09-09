// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Tests for the four generated artifacts and the agentic stress test. Pure:
 * the generators take a resolved scope plus answers and return a document.
 */

import { describe, it, expect } from "vitest";
import { buildSystemScope } from "@/server/services/scope/system-scope";
import {
  buildAssessmentArtifact,
  buildNoticeArtifact,
  buildProtocolArtifact,
  buildAgenticAddendumArtifact,
  regimeLabels,
  filterCitationStrings,
} from "./build-artifacts";
import { renderArtifactMarkdown } from "./render-markdown";
import { runAgenticStressTest, AGENTIC_FINDINGS } from "@/config/agentic-stress-test";
import { allUnifiedQuestions } from "@/config/unified-assessment";

const baseSystem = (over: Record<string, unknown> = {}) =>
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
    riskClassification: { riskLevel: "HIGH", annexIIICategory: "employment" },
    admtProfile: null,
    agentProfile: null,
    transparencyProfile: null,
    ...over,
  }) as Parameters<typeof buildSystemScope>[0];

const baseOrg = (over: Record<string, unknown> = {}) =>
  ({
    name: "A firm",
    operatingJurisdictions: ["EU"],
    settings: null,
    ...over,
  }) as Parameters<typeof buildSystemScope>[1];

const input = (over: Partial<Parameters<typeof buildAssessmentArtifact>[0]> = {}) => ({
  scope: buildSystemScope(baseSystem(), baseOrg()),
  answers: {},
  locale: "en" as const,
  generatedAt: "2026-09-08",
  ...over,
});

describe("artifact assembly: gaps are first class", () => {
  it("emits a gap, with citations, for every unanswered question", () => {
    const artifact = buildAssessmentArtifact(input());
    expect(artifact.gaps.length).toBeGreaterThan(5);
    for (const g of artifact.gaps) {
      expect(g.text.trim()).not.toBe("");
      expect(g.section.trim()).not.toBe("");
    }
    // The gaps carry real obligations, not empty labels.
    expect(artifact.gaps.some((g) => g.citations.some((c) => c.startsWith("EU GDPR")))).toBe(true);
  });

  it("replaces the gap with the answer once one is recorded", () => {
    const answered = buildAssessmentArtifact(
      input({ answers: { sys_description: "A gradient-boosted ranker over CV text." } }),
    );
    const md = renderArtifactMarkdown(answered);
    expect(md).toContain("A gradient-boosted ranker over CV text.");
    expect(answered.gaps.map((g) => g.text)).not.toContain(
      allUnifiedQuestions().find((q) => q.question.id === "sys_description")!.question.text.en,
    );
  });

  it("ignores whitespace-only answers", () => {
    const artifact = buildAssessmentArtifact(input({ answers: { sys_description: "   " } }));
    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("Gap to complete");
  });

  it("always carries the disclaimer, the version and the review date", () => {
    const artifact = buildAssessmentArtifact(input());
    expect(artifact.disclaimer).toContain("not legal advice");
    // The disclaimer states the status of the content this document cites.
    // A system in EU scope cites GDPR and the EU AI Act; the latter is still
    // pending, so the document must say so rather than claim a clean bill.
    expect(artifact.disclaimer).toContain("pending legal sign-off");
    expect(artifact.disclaimer).toContain("EU AI ACT");
    expect(artifact.contentVersion).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(artifact.lawReviewedAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(renderArtifactMarkdown(artifact)).toContain("law reviewed as of");
  });

  it("states the undetermined regimes rather than presenting the set as complete", () => {
    // Washington resolves to UNDETERMINED until its instrument questions are
    // answered: an organisation that has declared the state but nothing else.
    const scope = buildSystemScope(baseSystem(), baseOrg({ operatingJurisdictions: ["US_WA"] }));
    const artifact = buildAssessmentArtifact(input({ scope }));
    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("Undetermined");
    expect(artifact.gaps.some((g) => g.text.includes("undetermined"))).toBe(true);
  });
});

describe("the multi-jurisdictional notice", () => {
  it("has a universal core and no addendum when only the GDPR core applies", () => {
    const artifact = buildNoticeArtifact(input());
    const headings = artifact.sections.map((s) => s.heading);
    expect(headings).toContain("Universal core");
    const addenda = artifact.sections.find((s) => s.heading === "Jurisdictional addenda");
    expect(addenda?.subsections ?? []).toHaveLength(0);
  });

  it("adds one addendum per jurisdiction in scope, and never mixes them", () => {
    const scope = buildSystemScope(
      baseSystem({
        metadata: { regimeFacts: { solelyAutomatedLegalEffect: "YES", materiallyInfluencesConsequentialDecision: "YES" } },
      }),
      baseOrg({ operatingJurisdictions: ["EU", "US_CO", "US_TX"] }),
    );
    const artifact = buildNoticeArtifact(input({ scope }));
    const addenda = artifact.sections.find((s) => s.heading === "Jurisdictional addenda");
    const names = (addenda?.subsections ?? []).map((s) => s.heading);
    expect(names).toContain("European Union and EEA");
    expect(names).toContain("Colorado");
    expect(names).toContain("Texas");
    expect(names).not.toContain("California");
    expect(names).not.toContain("Washington — companion chatbot");
  });

  it("states the rights in the addendum even when the answer is missing", () => {
    const scope = buildSystemScope(
      baseSystem({ metadata: { regimeFacts: { solelyAutomatedLegalEffect: "YES" } } }),
      baseOrg(),
    );
    const md = renderArtifactMarkdown(buildNoticeArtifact(input({ scope })));
    expect(md).toContain("right to obtain human intervention");
  });

  it("renders in Castilian Spanish when the locale is es", () => {
    const scope = buildSystemScope(
      baseSystem({ metadata: { regimeFacts: { solelyAutomatedLegalEffect: "YES" } } }),
      baseOrg(),
    );
    const md = renderArtifactMarkdown(buildNoticeArtifact(input({ scope, locale: "es" })));
    expect(md).toContain("Aviso de IA multijurisdiccional");
    expect(md).toContain("intervención humana");
    expect(md).not.toContain("Universal core");
  });
});

describe("the human review and appeal protocol", () => {
  it("builds the common workflow from the review answers", () => {
    const artifact = buildProtocolArtifact(
      input({ answers: { rev_route: "Reply to the decision email within 30 days.", rev_reviewer: "The hiring manager, who can overturn the ranking." } }),
    );
    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("Reply to the decision email within 30 days.");
    expect(md).toContain("The hiring manager, who can overturn the ranking.");
    expect(artifact.sections.map((s) => s.heading)).toContain("How a person asks for review");
  });

  it("adds the variation table only for the jurisdictions in scope", () => {
    const scope = buildSystemScope(
      baseSystem({ metadata: { regimeFacts: { solelyAutomatedLegalEffect: "YES", materiallyInfluencesConsequentialDecision: "YES" } } }),
      baseOrg({ operatingJurisdictions: ["EU", "US_CO"] }),
    );
    const md = renderArtifactMarkdown(buildProtocolArtifact(input({ scope })));
    expect(md).toContain("Jurisdictional variations");
    expect(md).toContain("GDPR Art. 22(3)");
    expect(md).toContain("SB 26-189");
    expect(md).not.toContain("CCPA ADMT § 7221");
  });

  it("omits an overlay question the system's scope did not select", () => {
    const md = renderArtifactMarkdown(buildProtocolArtifact(input()));
    // rev_optout is California-only.
    expect(md).not.toContain("opt-out from the automated process");
  });
});

describe("the agentic stress test", () => {
  it("runs nothing at all without a declared handoff", () => {
    const result = runAgenticStressTest(["gdpr:adm", "admt:art11"]);
    expect(result.applicable).toEqual([]);
    expect(result.counts).toEqual({ breaks: 0, weakens: 0, watch: 0 });
  });

  it("returns the regime-independent findings for any agentic system", () => {
    const result = runAgenticStressTest(["agentic"]);
    const ids = result.applicable.map((f) => f.id);
    expect(ids).toContain("notice-scope");
    expect(ids).toContain("protocol-no-reversal");
    expect(ids).toContain("traceability");
    expect(ids).not.toContain("gdpr-22-boundary");
  });

  it("adds the regime findings only when that regime applies", () => {
    const ids = runAgenticStressTest(["agentic", "gdpr:adm", "admt:art11", "wa:companion"]).applicable.map((f) => f.id);
    expect(ids).toContain("gdpr-22-boundary");
    expect(ids).toContain("ca-prongs-fail");
    expect(ids).toContain("wa-crisis-handoff");
    expect(ids).not.toContain("co-principal-reasons");
  });

  it("groups findings by the artifact they break", () => {
    const result = runAgenticStressTest(["agentic", "gdpr:adm"]);
    expect(result.byArtifact.notice.map((f) => f.id)).toContain("notice-scope");
    expect(result.byArtifact.protocol.map((f) => f.id)).toContain("protocol-no-reversal");
    expect(result.byArtifact.assessment.map((f) => f.id)).toContain("gdpr-22-boundary");
  });

  it("has bilingual, complete content and citations on every finding", () => {
    for (const f of AGENTIC_FINDINGS) {
      for (const field of ["title", "assumption", "breakage", "provision"] as const) {
        expect(f[field].en.trim(), `${f.id} ${field}.en`).not.toBe("");
        expect(f[field].es.trim(), `${f.id} ${field}.es`).not.toBe("");
        expect(f[field].es, `${f.id} ${field} untranslated`).not.toBe(f[field].en);
      }
      expect(f.citations.length, `${f.id} has no citation`).toBeGreaterThan(0);
      expect(f.artifacts.length, `${f.id} breaks nothing`).toBeGreaterThan(0);
    }
    const ids = AGENTIC_FINDINGS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every finding points at questions that exist in the template", () => {
    const known = new Set(allUnifiedQuestions().map(({ question }) => question.id));
    for (const f of AGENTIC_FINDINGS) {
      for (const id of f.evidencedBy) {
        expect(known, `${f.id} cites unknown question ${id}`).toContain(id);
      }
    }
  });
});

describe("the agentic addendum document", () => {
  const agenticScope = () =>
    buildSystemScope(
      baseSystem({
        metadata: { regimeFacts: { handsOffToAutonomousAgent: "YES", solelyAutomatedLegalEffect: "YES" } },
      }),
      baseOrg(),
    );

  it("says plainly when nobody has answered the handoff question", () => {
    const md = renderArtifactMarkdown(buildAgenticAddendumArtifact(input()));
    expect(md).toContain("has not run");
  });

  it("states the assumption, the breakage and the provision for each finding", () => {
    const md = renderArtifactMarkdown(buildAgenticAddendumArtifact(input({ scope: agenticScope() })));
    expect(md).toContain("What the regime assumed");
    expect(md).toContain("What the handoff breaks");
    expect(md).toContain("Provision the agentic layer demands");
    expect(md).toContain("Article 22 boundary");
  });

  it("shows recorded answers as evidence and the rest as gaps", () => {
    const artifact = buildAgenticAddendumArtifact(
      input({ scope: agenticScope(), answers: { agt_killswitch: "The duty officer can halt the queue within two minutes." } }),
    );
    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("What is already recorded");
    expect(md).toContain("halt the queue within two minutes");
    expect(artifact.gaps.length).toBeGreaterThan(0);
  });
});

describe("citations never name a regime that does not apply", () => {
  it("an EU-and-Colorado system's protocol cites neither California nor Washington", () => {
    const scope = buildSystemScope(
      baseSystem({ metadata: { regimeFacts: { solelyAutomatedLegalEffect: "YES", materiallyInfluencesConsequentialDecision: "YES" } } }),
      baseOrg({ operatingJurisdictions: ["EU", "US_CO"] }),
    );
    const md = renderArtifactMarkdown(buildProtocolArtifact(input({ scope })));
    expect(md).toContain("CO SB 26 189");
    expect(md).toContain("EU GDPR");
    expect(md).not.toContain("CA CCPA ADMT");
    expect(md).not.toContain("WA ");
  });

  it("a Texas-only system's assessment cites Texas and never the GDPR", () => {
    const scope = buildSystemScope(baseSystem(), baseOrg({ operatingJurisdictions: ["US_TX"] }));
    const md = renderArtifactMarkdown(buildAssessmentArtifact(input({ scope })));
    expect(md).toContain("TX TRAIGA");
    expect(md).not.toContain("EU GDPR");
    expect(md).not.toContain("CA CCPA ADMT");
  });

  it("drops the EU AI Act too when nothing connects the system to it", () => {
    // No EU nexus and no EU risk classification: the EU AI Act is not citable.
    const scope = buildSystemScope(
      baseSystem({ riskClassification: null }),
      baseOrg({ operatingJurisdictions: ["US_TX"] }),
    );
    const md = renderArtifactMarkdown(buildAssessmentArtifact(input({ scope })));
    expect(md).toContain("TX TRAIGA");
    expect(md).not.toContain("EU AI ACT");
    expect(md).not.toContain("EU GDPR");
  });

  it("keeps the EU AI Act citable once a high-risk classification exists", () => {
    // Classifying a system high-risk is itself an EU AI Act act, so its
    // citations belong in the document even without a declared EU nexus.
    const scope = buildSystemScope(baseSystem(), baseOrg({ operatingJurisdictions: ["US_TX"] }));
    const md = renderArtifactMarkdown(buildAssessmentArtifact(input({ scope })));
    expect(md).toContain("EU AI ACT");
    expect(md).not.toContain("EU GDPR");
  });
});

describe("free-text citations are scoped too", () => {
  const agenticNonCalifornia = () =>
    buildSystemScope(
      baseSystem({
        metadata: {
          regimeFacts: {
            handsOffToAutonomousAgent: "YES",
            solelyAutomatedLegalEffect: "YES",
            materiallyInfluencesConsequentialDecision: "YES",
          },
        },
      }),
      baseOrg({ operatingJurisdictions: ["EU", "US_CO"] }),
    );

  it("the agentic addendum never cites California to an organisation with no California nexus", () => {
    const md = renderArtifactMarkdown(
      buildAgenticAddendumArtifact(input({ scope: agenticNonCalifornia() })),
    );
    // The reversal finding applies to everyone and its citation list names
    // California; that citation must not survive here.
    expect(md).toContain("reviews a decision the agent has already carried out");
    expect(md).not.toContain("CA CCPA ADMT");
    expect(md).toContain("EU GDPR Art. 22(3)");
  });

  it("the notice's universal core drops the California section number", () => {
    const md = renderArtifactMarkdown(buildNoticeArtifact(input({ scope: agenticNonCalifornia() })));
    expect(md).toContain("Universal core");
    expect(md).not.toContain("CA CCPA ADMT § 7220");
    expect(md).toContain("CO SB 26-189 CO-DEP-1");
  });

  it("keeps a citation whose prefix it cannot classify rather than dropping it", () => {
    const applicable = new Set(["EU_GDPR"]);
    expect(filterCitationStrings(["Some unrecognised source", "CA CCPA ADMT § 7221"], applicable)).toEqual([
      "Some unrecognised source",
    ]);
  });
});

describe("regimeLabels", () => {
  it("names every regime in plain language and never leaves a raw tag", () => {
    const labels = regimeLabels(["gdpr:adm", "admt:art11", "agentic"]);
    expect(labels).toEqual([
      "GDPR Art. 22 (automated decisions)",
      "California CCPA ADMT (Art. 11)",
      "Agentic layer",
    ]);
    expect(regimeLabels([])).toEqual(["No regime resolved yet"]);
  });
});

describe("markdown rendering", () => {
  it("produces a document with a title, an open-items summary and numbered sections", () => {
    const md = renderArtifactMarkdown(buildAssessmentArtifact(input()));
    expect(md.startsWith("# Unified AI impact assessment")).toBe(true);
    expect(md).toContain("## Open items");
    expect(md).toMatch(/## 1\. /);
    expect(md).not.toMatch(/\n{3,}/);
  });
});
