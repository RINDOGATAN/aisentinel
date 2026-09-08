// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Content and selection tests for the unified impact assessment. Pure.
 */

import { describe, it, expect } from "vitest";
import {
  UNIFIED_ASSESSMENT_SECTIONS,
  UNIFIED_ASSESSMENT_VERSION,
  UNIFIED_ASSESSMENT_REVIEW_MARKER,
  allUnifiedQuestions,
  selectUnifiedQuestions,
  unifiedOverlayTags,
  citationsFor,
  type OverlayTag,
} from "./unified-assessment";
import { deriveOverlayTags, undeterminedRegimes } from "@/lib/overlay-tags";
import type { RegimeScope } from "@/config/regimes";

const all = allUnifiedQuestions();

describe("unified assessment: content", () => {
  it("carries a version and a sign-off-pending marker in both locales", () => {
    expect(UNIFIED_ASSESSMENT_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(UNIFIED_ASSESSMENT_REVIEW_MARKER.en).toContain("sign-off pending");
    expect(UNIFIED_ASSESSMENT_REVIEW_MARKER.es).toContain("pendiente");
  });

  it("has unique question ids and unique section ids", () => {
    const qids = all.map(({ question }) => question.id);
    const sids = UNIFIED_ASSESSMENT_SECTIONS.map((s) => s.id);
    expect(new Set(qids).size).toBe(qids.length);
    expect(new Set(sids).size).toBe(sids.length);
  });

  it("is bilingual everywhere, with no untranslated copy", () => {
    for (const section of UNIFIED_ASSESSMENT_SECTIONS) {
      expect(section.title.en.trim()).not.toBe("");
      expect(section.title.es.trim()).not.toBe("");
      expect(section.title.es, `${section.id} title untranslated`).not.toBe(section.title.en);
      if (section.intro) {
        expect(section.intro.es, `${section.id} intro untranslated`).not.toBe(section.intro.en);
      }
    }
    for (const { question } of all) {
      expect(question.text.en.trim(), `${question.id} en`).not.toBe("");
      expect(question.text.es.trim(), `${question.id} es`).not.toBe("");
      expect(question.text.es, `${question.id} untranslated`).not.toBe(question.text.en);
      if (question.helpText) {
        expect(question.helpText.es, `${question.id} help untranslated`).not.toBe(question.helpText.en);
      }
    }
  });

  it("gives every question at least one citation, with a known framework", () => {
    const frameworks = new Set([
      "EU_AI_ACT", "EU_GDPR", "CA_CCPA_ADMT", "CO_SB_26_189",
      "TX_TRAIGA", "WA_AI_RULES", "NIST_AI_RMF", "ISO_42001",
    ]);
    for (const { question } of all) {
      expect(question.satisfies.length, `${question.id} has no citation`).toBeGreaterThan(0);
      for (const c of question.satisfies) {
        expect(frameworks, `${question.id} unknown framework ${c.framework}`).toContain(c.framework);
        expect(c.code.trim()).not.toBe("");
      }
    }
  });

  it("covers all six regimes of the workshop across the template", () => {
    const frameworks = new Set(all.flatMap(({ question }) => question.satisfies.map((c) => c.framework)));
    for (const fw of ["EU_AI_ACT", "EU_GDPR", "CA_CCPA_ADMT", "CO_SB_26_189", "TX_TRAIGA", "WA_AI_RULES"]) {
      expect(frameworks, `no question cites ${fw}`).toContain(fw);
    }
  });

  it("feeds all three artifacts", () => {
    const targets = new Set(all.flatMap(({ question }) => question.feeds ?? []));
    expect(targets).toContain("assessment");
    expect(targets).toContain("notice");
    expect(targets).toContain("protocol");
  });

  it("keeps the core question set answerable on its own", () => {
    const core = selectUnifiedQuestions([]);
    // Every section except the pure-overlay ones survives with no tags.
    expect(core.length).toBeGreaterThanOrEqual(7);
    expect(core.every((s) => s.questions.every((q) => q.reason === "core"))).toBe(true);
    expect(core.find((s) => s.id === "agentic")).toBeUndefined();
  });
});

describe("selectUnifiedQuestions", () => {
  it("adds only the overlay whose tag is active", () => {
    const withGdpr = selectUnifiedQuestions(["gdpr:adm"]);
    const ids = withGdpr.flatMap((s) => s.questions.map((q) => q.id));
    expect(ids).toContain("dec_art22_ground");
    expect(ids).not.toContain("dec_ca_domain");
    expect(ids).not.toContain("not_provenance");
  });

  it("marks each question with the reason it appears", () => {
    const sections = selectUnifiedQuestions(["admt:art11"]);
    const q = sections.flatMap((s) => s.questions).find((x) => x.id === "rev_optout");
    expect(q?.reason).toBe("admt:art11");
    const core = sections.flatMap((s) => s.questions).find((x) => x.id === "rev_route");
    expect(core?.reason).toBe("core");
  });

  it("drops a section entirely when nothing in it applies", () => {
    expect(selectUnifiedQuestions([]).map((s) => s.id)).not.toContain("agentic");
    expect(selectUnifiedQuestions(["agentic"]).map((s) => s.id)).toContain("agentic");
  });

  it("every declared overlay tag actually selects at least one question", () => {
    for (const tag of unifiedOverlayTags()) {
      const withTag = selectUnifiedQuestions([tag]).flatMap((s) => s.questions);
      const added = withTag.filter((q) => q.reason === tag);
      expect(added.length, `overlay ${tag} selects nothing`).toBeGreaterThan(0);
    }
  });

  it("grows monotonically as tags are added", () => {
    const count = (tags: OverlayTag[]) =>
      selectUnifiedQuestions(tags).reduce((n, s) => n + s.questions.length, 0);
    const core = count([]);
    const one = count(["gdpr:adm"]);
    const two = count(["gdpr:adm", "admt:art11"]);
    expect(one).toBeGreaterThan(core);
    expect(two).toBeGreaterThan(one);
  });
});

describe("citationsFor", () => {
  it("collects the evidence one answered assessment produces, by framework", () => {
    const sections = selectUnifiedQuestions(["gdpr:adm", "gdpr:dpia", "admt:art11"]);
    const cites = citationsFor(sections);
    expect(cites.EU_GDPR).toContain("Art. 22(2)");
    expect(cites.EU_GDPR).toContain("Art. 35(7)");
    expect(cites.CA_CCPA_ADMT).toContain("§ 7221(a)");
    expect(cites.EU_AI_ACT.length).toBeGreaterThan(0);
    // Sorted and de-duplicated.
    expect(cites.EU_GDPR).toEqual([...cites.EU_GDPR].sort());
    expect(new Set(cites.EU_GDPR).size).toBe(cites.EU_GDPR.length);
  });
});

const scope = (framework: string, state: RegimeScope["state"], tags: string[]): RegimeScope =>
  ({ framework, state, tags, reasons: [], openQuestions: [] }) as RegimeScope;

describe("deriveOverlayTags", () => {
  it("returns nothing when no resolver has decided", () => {
    expect(deriveOverlayTags({})).toEqual([]);
  });

  it("ignores regimes that are not in scope", () => {
    const tags = deriveOverlayTags({
      regimeScopes: [
        scope("EU_GDPR", "UNDETERMINED", ["gdpr:core"]),
        scope("TX_TRAIGA", "OUT_OF_SCOPE", []),
      ],
    });
    expect(tags).toEqual([]);
  });

  it("collapses California's fine-grained tags to the article", () => {
    const tags = deriveOverlayTags({
      admtTags: ["jurisdiction:US_CA", "admt:art10", "admt:art10:trigger:sensitive_pi", "admt:art11", "admt:art11:optout_exception"],
    });
    expect(tags).toEqual(["admt:art10", "admt:art11"]);
  });

  it("takes only the known overlay tags from a regime scope", () => {
    const tags = deriveOverlayTags({
      regimeScopes: [scope("EU_GDPR", "IN_SCOPE", ["jurisdiction:EU", "gdpr:core", "gdpr:adm"])],
    });
    expect(tags).toEqual(["gdpr:core", "gdpr:adm"]);
  });

  it("derives the EU high-risk tag from either the tier or an Annex III category", () => {
    expect(deriveOverlayTags({ riskLevel: "HIGH" })).toContain("eu:high-risk");
    expect(deriveOverlayTags({ riskLevel: "LIMITED", annexIiiCategory: "employment" })).toContain("eu:high-risk");
    expect(deriveOverlayTags({ riskLevel: "MINIMAL" })).not.toContain("eu:high-risk");
  });

  it("derives the agentic tag from the technique or the explicit answer", () => {
    expect(deriveOverlayTags({ technique: "AGENTIC_AI" })).toContain("agentic");
    expect(deriveOverlayTags({ handsOffToAutonomousAgent: "YES" })).toContain("agentic");
    expect(deriveOverlayTags({ technique: "GENERATIVE_AI", handsOffToAutonomousAgent: "NO" })).not.toContain("agentic");
  });

  it("combines every source for a realistic multi-state system", () => {
    const tags = deriveOverlayTags({
      admtTags: ["jurisdiction:US_CA", "admt:art11"],
      regimeScopes: [
        scope("EU_GDPR", "IN_SCOPE", ["jurisdiction:EU", "gdpr:core", "gdpr:adm", "gdpr:dpia"]),
        scope("CO_SB_26_189", "IN_SCOPE", ["jurisdiction:US_CO", "co:core", "co:deployer"]),
        scope("TX_TRAIGA", "IN_SCOPE", ["jurisdiction:US_TX", "tx:core"]),
        scope("WA_AI_RULES", "UNDETERMINED", []),
      ],
      riskLevel: "HIGH",
      hasArt50Obligation: true,
      technique: "AGENTIC_AI",
    });
    expect(tags).toEqual(expect.arrayContaining([
      "admt:art11", "gdpr:core", "gdpr:adm", "gdpr:dpia",
      "co:deployer", "tx:core", "eu:high-risk", "eu:art50", "agentic",
    ]));
    // The section count should be the whole template.
    expect(selectUnifiedQuestions(tags).length).toBe(UNIFIED_ASSESSMENT_SECTIONS.length);
  });
});

describe("undeterminedRegimes", () => {
  it("names the regimes still undecided and their open questions", () => {
    const open = undeterminedRegimes([
      { framework: "WA_AI_RULES", state: "UNDETERMINED", tags: [], reasons: [], openQuestions: ["companion-chatbot"] } as RegimeScope,
      scope("EU_GDPR", "IN_SCOPE", ["gdpr:core"]),
    ]);
    expect(open).toEqual([{ framework: "WA_AI_RULES", openQuestions: ["companion-chatbot"] }]);
  });
});
