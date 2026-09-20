// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The document read as a stranger would read it, with no access to the screen it
 * came from.
 *
 * It has to carry, in this order: what was assessed and for whom; when and by
 * whom; the method and its version; the inputs the user gave; the findings, with
 * the risk tier by shape and label and never by colour alone; the references
 * behind each finding, cited to the article or the clause; what remains open;
 * and a plain statement of what the document is not. No raw identifiers, no
 * untranslated keys, no empty sections, no placeholder text. Both languages.
 *
 * Each of those is one test below, so a change to the order or to the furniture
 * fails here with the reason rather than by eye.
 */

import { describe, expect, it } from "vitest";
import { buildSystemScope } from "@/server/services/scope/system-scope";
import { buildAssessmentArtifact, tierLabel } from "./build-artifacts";
import { renderArtifactMarkdown } from "./render-markdown";
import { RISK_TIERS, tierShapeText } from "@/config/risk-tier-palette";
import type { Artifact } from "./types";

const system = (over: Record<string, unknown> = {}) =>
  ({
    id: "clz9x8y7w6v5u4t3s2r1q0",
    name: "Applicant ranker",
    technique: "MACHINE_LEARNING",
    role: "DEPLOYER",
    status: "DEPLOYED",
    purpose: "Ranks applicants for a first sift",
    description: "A gradient-boosted ranker over CV text.",
    businessOwner: "Head of hiring",
    technicalOwner: "Platform team",
    processesPersonalData: true,
    jurisdictionOverride: [],
    metadata: null,
    riskClassification: { riskLevel: "HIGH", annexIIICategory: "employment_contracting" },
    admtProfile: null,
    agentProfile: null,
    transparencyProfile: null,
    ...over,
  }) as Parameters<typeof buildSystemScope>[0];

const org = (over: Record<string, unknown> = {}) =>
  ({ name: "A firm", operatingJurisdictions: ["EU"], settings: null, ...over }) as Parameters<
    typeof buildSystemScope
  >[1];

const LOCALES = ["en", "es"] as const;

function build(locale: (typeof LOCALES)[number], over: Record<string, unknown> = {}) {
  return buildAssessmentArtifact({
    scope: buildSystemScope(system(over.system as never), org(over.org as never)),
    answers: (over.answers as Record<string, unknown>) ?? {
      sys_description: "A gradient-boosted ranker over CV text, retrained quarterly.",
      people_categories: "Applicants for junior roles.",
    },
    locale,
    generatedAt: "2026-09-19",
    preparedBy:
      over.preparedBy === null
        ? null
        : ((over.preparedBy as never) ?? {
            name: "A. Reviewer",
            email: "reviewer@example.test",
            role: "AI_OFFICER",
          }),
  });
}

/** The headings, in document order. */
const headings = (artifact: Artifact) => artifact.sections.map((s) => s.heading);

describe("the document answers a stranger's questions, in order", () => {
  it("opens with what was assessed and for whom, then when and by whom, then the scope", () => {
    const h = headings(build("en"));
    expect(h[0]).toBe("What was assessed, and for whom");
    expect(h[1]).toBe("When, by whom, and on what method");
    expect(h[2]).toBe("Scope and applicable regimes");
    expect(h[3]).toBe("The inputs recorded");
    expect(h[4]).toBe("The findings");
  });

  it("closes with what remains open, then what the document is not", () => {
    const h = headings(build("en"));
    expect(h[h.length - 2]).toBe("What remains open");
    expect(h[h.length - 1]).toBe("What this document is not");
  });

  it("keeps the same order in Spanish", () => {
    const h = headings(build("es"));
    expect(h[0]).toBe("Qué se evalúa y para quién");
    expect(h[1]).toBe("Cuándo, por quién y con qué método");
    expect(h[3]).toBe("Las respuestas registradas");
    expect(h[4]).toBe("Las conclusiones");
    expect(h[h.length - 2]).toBe("Qué queda abierto");
    expect(h[h.length - 1]).toBe("Qué no es este documento");
  });
});

describe("who, when and on what method", () => {
  it("names the person who generated it, with their role in words", () => {
    const md = renderArtifactMarkdown(build("en"));
    expect(md).toContain("A. Reviewer (AI officer)");
    expect(md).not.toContain("AI_OFFICER");
  });

  it("falls back to the email when there is no name", () => {
    const md = renderArtifactMarkdown(
      build("en", { preparedBy: { name: null, email: "reviewer@example.test", role: "OWNER" } }),
    );
    expect(md).toContain("reviewer@example.test (owner)");
  });

  it("says so plainly when it cannot name anyone, rather than leaving a blank", () => {
    const md = renderArtifactMarkdown(build("en", { preparedBy: null }));
    expect(md).toContain("does not record who generated it");
    expect(md).not.toMatch(/Prepared by\s*\|\s*\|/);
  });

  it("states the method, its version, the review date and that no model wrote it", () => {
    const artifact = build("en");
    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("the unified impact assessment, content version");
    expect(md).toContain("No language model wrote it");
    expect(md).toContain(artifact.contentVersion);
    expect(md).toContain(artifact.lawReviewedAsOf);
  });

  it("lists the regulatory content it cites with the sign-off status of each part", () => {
    const md = renderArtifactMarkdown(build("en"));
    expect(md).toMatch(/\| Content \| Law reviewed \| Sign-off \|/);
    expect(md).toMatch(/Pending|Signed off/);
    // Only what this document cites: an EU system's table names the EU packs
    // and not, say, Texas.
    expect(md).toContain("UNIFIED ASSESSMENT");
    expect(md).not.toMatch(/\| TX TRAIGA \|/);
  });
});

describe("the inputs the user gave", () => {
  it("lists every recorded answer, with the question it answers", () => {
    const md = renderArtifactMarkdown(build("en"));
    expect(md).toContain("The inputs recorded");
    expect(md).toContain("A gradient-boosted ranker over CV text, retrained quarterly.");
    expect(md).toMatch(/have a recorded answer and \d+ do not/);
  });

  it("says why the section is empty rather than showing an empty table", () => {
    const md = renderArtifactMarkdown(build("en", { answers: {} }));
    expect(md).toContain("No answer has been recorded yet, which is why this section is empty");
  });

  it("keeps a multi-line answer inside its table cell", () => {
    const md = renderArtifactMarkdown(
      build("en", { answers: { sys_description: "First line.\nSecond line." } }),
    );
    const rows = md.split("\n").filter((l) => l.startsWith("| ") && l.includes("First line."));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("First line. Second line.");
  });
});

describe("the risk tier is shown by shape and label, never by colour alone", () => {
  it("every tier has a distinct shape, and the shapes are text", () => {
    const shapes = RISK_TIERS.map((t) => tierShapeText(t));
    expect(new Set(shapes).size).toBe(RISK_TIERS.length);
    for (const shape of shapes) expect(shape.length).toBeGreaterThan(0);
  });

  it("the document carries the tier as a shape and as a named label", () => {
    const artifact = build("en");
    expect(artifact.riskTierLabel).toBe("High risk");
    expect(artifact.riskTierShape).toBe(tierShapeText("HIGH"));
    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain(`Risk tier: ${tierShapeText("HIGH")} High risk`);
  });

  it("names the tier in Spanish too", () => {
    expect(tierLabel("HIGH", "es")).toBe("Riesgo alto");
    expect(renderArtifactMarkdown(build("es"))).toContain("Nivel de riesgo:");
  });

  it("an unclassified system reads as the absence of a finding, not as a low one", () => {
    const md = renderArtifactMarkdown(build("en", { system: { riskClassification: null } }));
    expect(md).toContain("Not classified yet");
    expect(md).toContain("the absence of one");
  });
});

describe("no raw identifiers, no untranslated keys, no placeholder text", () => {
  it.each(LOCALES)("%s: never prints a database id", (locale) => {
    const md = renderArtifactMarkdown(build(locale));
    expect(md).not.toContain("clz9x8y7w6v5u4t3s2r1q0");
    // A cuid is 25 characters of lowercase and digits starting with c.
    expect(md).not.toMatch(/\bc[a-z0-9]{24}\b/);
  });

  it.each(LOCALES)("%s: never prints a raw enum token", (locale) => {
    const md = renderArtifactMarkdown(build(locale));
    for (const token of ["MACHINE_LEARNING", "DEPLOYER", "AI_OFFICER"]) {
      expect(md).not.toContain(token);
    }
    // SCREAMING_SNAKE survives only in a citation's framework name.
    const shouty = [...md.matchAll(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g)].map((m) => m[0]);
    expect(shouty).toEqual([]);
  });

  it.each(LOCALES)("%s: the renderer's own words are in the reader's language", (locale) => {
    const md = renderArtifactMarkdown(build(locale, { answers: {} }));
    if (locale === "es") {
      expect(md).toContain("Apartado pendiente");
      expect(md).toContain("Apartados abiertos");
      expect(md).toContain("Calibrado para");
      expect(md).toContain("Generado el");
      // The English furniture must be gone, not merely supplemented.
      expect(md).not.toContain("Gap to complete");
      expect(md).not.toContain("Open items");
      expect(md).not.toContain("Calibrated to");
    } else {
      expect(md).toContain("Gap to complete");
      expect(md).toContain("Open items");
    }
  });

  it.each(LOCALES)("%s: no placeholder text and no unresolved interpolation", (locale) => {
    const md = renderArtifactMarkdown(build(locale));
    // Case-sensitive on the markers: "todo" is an ordinary Spanish word, and
    // TODO.LAW is the brand.
    expect(md).not.toMatch(/lorem ipsum/i);
    expect(md).not.toMatch(/\bTODO\b(?!\.LAW)|\bTBD\b|\bFIXME\b|\bXXX\b/);
    expect(md).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(md).not.toMatch(/undefined|\[object Object\]/);
    expect(md).not.toMatch(/\bnull\b/);
  });

  it.each(LOCALES)("%s: no section is empty and no table row is blank", (locale) => {
    const artifact = build(locale, { answers: {} });
    for (const section of artifact.sections) {
      expect(section.blocks.length, `${section.heading} is empty`).toBeGreaterThan(0);
      for (const block of section.blocks) {
        if (block.kind === "table") {
          expect(block.rows.length, `${section.heading} has an empty table`).toBeGreaterThan(0);
          for (const row of block.rows) {
            for (const cell of row) expect(cell.trim(), `${section.heading} has a blank cell`).not.toBe("");
          }
        }
        if (block.kind === "paragraph") expect(block.text.trim()).not.toBe("");
      }
    }
  });
});

describe("what remains open, and what the document is not", () => {
  it("states the count at the top and lists the items in their ordered place", () => {
    const artifact = build("en", { answers: {} });
    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain(`## Open items (${artifact.gaps.length})`);
    expect(md).toContain('listed under "What remains open"');
    // Every gap appears once, in the ordered section, with its obligation.
    const open = artifact.sections.find((s) => s.heading === "What remains open");
    const table = open?.blocks.find((b) => b.kind === "table");
    expect(table && table.kind === "table" && table.rows.length).toBe(artifact.gaps.length);
  });

  it("says nothing is open when nothing is, rather than showing an empty list", () => {
    // Every question answered and every regime determined: a single declared
    // jurisdiction with no screening left open.
    const artifact = build("en");
    const open = artifact.sections.find((s) => s.heading === "What remains open")!;
    if (artifact.gaps.length === 0) {
      expect(open.blocks[0].kind === "paragraph" && open.blocks[0].text).toContain("Nothing.");
    } else {
      expect(open.blocks.some((b) => b.kind === "table")).toBe(true);
    }
  });

  it.each(LOCALES)("%s: closes by saying it is not legal advice and not a certification", (locale) => {
    const artifact = build(locale);
    const last = artifact.sections[artifact.sections.length - 1];
    const text = last.blocks
      .filter((b) => b.kind === "paragraph")
      .map((b) => (b.kind === "paragraph" ? b.text : ""))
      .join(" ");
    if (locale === "es") {
      expect(text).toContain("No es asesoramiento jurídico");
      expect(text).toContain("ni la certificación de un tercero");
    } else {
      expect(text).toContain("not legal advice");
      expect(text).toContain("not a third party's certification");
    }
  });
});

describe("the Spanish is Castilian and addresses the reader as tú", () => {
  it("uses no usted forms in the sections this file adds", () => {
    const artifact = build("es", { answers: {} });
    const own = new Set([
      "Qué se evalúa y para quién",
      "Cuándo, por quién y con qué método",
      "Las respuestas registradas",
      "Las conclusiones",
      "Qué queda abierto",
      "Qué no es este documento",
    ]);
    const text = artifact.sections
      .filter((s) => own.has(s.heading))
      .flatMap((s) => s.blocks)
      .map((b) =>
        b.kind === "paragraph" ? b.text : b.kind === "gap" ? b.text : b.kind === "list" ? b.items.join(" ") : "",
      )
      .join(" ");
    expect(text).not.toMatch(/\busted\b/i);
    expect(text).not.toMatch(/\bcomplete usted\b|\bvuelva a exportar\b|\brevise\b/);
    expect(text).toMatch(/\bCompleta\b|\bVuelve\b|\bRevisa\b/);
  });
});
