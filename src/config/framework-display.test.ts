// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Every framework and requirement the seeds write has a Spanish display name,
 * so a Spanish screen never shows a stored English title or a raw code such
 * as "EU_AI_ACT" (src/config/framework-display.ts).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  REQUIREMENT_DESCRIPTIONS_ES,
  REQUIREMENT_TITLES_ES,
  citationLabel,
  citationString,
  frameworkChip,
  frameworkName,
  frameworkShort,
  frameworkShortName,
  requirementCode,
  requirementDescription,
  requirementTitle,
} from "./framework-display";
import { EU_ART113_SUBTREE } from "./eu-timeline-requirements";
import { AIUC1_DOMAINS, aiuc1RequirementDescription } from "./aiuc1-requirements";
import {
  AIUC1_CAPABILITIES_ES,
  AIUC1_PARAPHRASES_ES,
  AIUC1_TITLES_ES,
  aiuc1Capabilities,
  aiuc1Paraphrase,
  aiuc1Title,
} from "./aiuc1-requirements-es";
import { ADMT_FRAMEWORK } from "./admt-requirements";
import { REGIME_PACKS } from "./regimes";

const SEED = readFileSync(path.resolve(__dirname, "../../scripts/seed-frameworks.ts"), "utf8");

/** The {code, title} literals of one framework's section of the seed script. */
function seededCodes(fromMarker: string, toMarker: string): string[] {
  const a = SEED.indexOf(fromMarker);
  const b = SEED.indexOf(toMarker, a + 1);
  expect(a, fromMarker).toBeGreaterThan(-1);
  expect(b, toMarker).toBeGreaterThan(a);
  return [...SEED.slice(a, b).matchAll(/\{ code: "([^"]+)", title: "[^"]+"/g)].map((m) => m[1]);
}

function subtreeCodes(node: { code: string; children?: readonly unknown[] }): string[] {
  return [node.code, ...((node.children ?? []) as (typeof node)[]).flatMap(subtreeCodes)];
}

const ALL_CODES = ["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001", "AIUC_1", ADMT_FRAMEWORK.code, ...REGIME_PACKS.map((p) => p.framework.code)];

describe("framework display names", () => {
  it("cover every seeded EU AI Act, NIST and ISO requirement in Spanish", () => {
    const eu = [...seededCodes('code: "EU_AI_ACT"', 'code: "NIST_AI_RMF"'), ...subtreeCodes(EU_ART113_SUBTREE)];
    const nist = seededCodes('code: "NIST_AI_RMF"', 'code: "ISO_42001"');
    const iso = seededCodes('code: "ISO_42001"', "AIUC1_FRAMEWORK.code");
    expect(eu.length).toBeGreaterThan(70);
    expect(nist.length).toBeGreaterThan(20);
    expect(iso.length).toBeGreaterThan(30);
    for (const [fw, codes] of [["EU_AI_ACT", eu], ["NIST_AI_RMF", nist], ["ISO_42001", iso]] as const) {
      for (const code of codes) expect(REQUIREMENT_TITLES_ES[fw]?.[code], `${fw} ${code}`).toBeTruthy();
    }
  });

  it("cover every AIUC-1 domain, requirement and capability tag", () => {
    for (const d of AIUC1_DOMAINS) {
      expect(REQUIREMENT_TITLES_ES.AIUC_1[d.code], d.code).toBeTruthy();
      for (const r of d.requirements) {
        expect(AIUC1_TITLES_ES[r.code], r.code).toBeTruthy();
        for (const c of r.capabilities) expect(AIUC1_CAPABILITIES_ES[c], c).toBeTruthy();
      }
    }
    const a001 = AIUC1_DOMAINS[0].requirements[0];
    expect(aiuc1Title(a001, "es")).toBe("Establecer la política de datos de entrada");
    expect(aiuc1Title(a001, "en")).toBe(a001.title);
    expect(aiuc1Capabilities(["Universal", "External-facing"], "es")).toBe("Todos los agentes, De cara al público");
  });

  it("take the Spanish titles and descriptions the regime and ADMT packs carry", () => {
    const gdpr = REGIME_PACKS.find((p) => p.framework.code === "EU_GDPR")!;
    const row = gdpr.requirements[0];
    expect(requirementTitle("EU_GDPR", row.code, row.title.en, "es")).toBe(row.title.es);
    expect(requirementDescription("EU_GDPR", row.code, row.description.en, "es")).toBe(row.description.es);
    expect(requirementTitle("EU_GDPR", row.code, row.title.en, "en")).toBe(row.title.en);
  });

  it("never show a raw framework code in Spanish, and name each framework", () => {
    for (const code of ALL_CODES) {
      expect(frameworkName(code, "stored", "es"), code).not.toMatch(/_/);
      expect(frameworkShortName(code, "es"), code).not.toMatch(/_/);
      expect(frameworkShort(code, "es"), code).not.toMatch(/_/);
    }
    expect(frameworkName("EU_AI_ACT", "EU AI Act", "es")).toBe("Reglamento Europeo de IA");
    expect(frameworkName("EU_AI_ACT", "EU AI Act", "en")).toBe("EU AI Act");
    expect(frameworkShort("EU_GDPR", "es")).toBe("RGPD");
    // An unknown code falls back to what is stored, never to another framework.
    expect(frameworkName("NEW_ONE", "New one", "es")).toBe("New one");
  });

  it("use no long dash and no English month in the Spanish codes and titles", () => {
    for (const code of subtreeCodes(EU_ART113_SUBTREE)) {
      expect(requirementCode("EU_AI_ACT", code, "es"), code).not.toMatch(/[–—]|\b(Feb|Aug|Dec)\b/);
    }
    for (const [fw, titles] of Object.entries(REQUIREMENT_TITLES_ES)) {
      for (const [code, title] of Object.entries(titles)) expect(title, `${fw} ${code}`).not.toMatch(/[–—]/);
    }
  });

  it("fall back to the stored title for a row with no translation", () => {
    expect(requirementTitle("EU_AI_ACT", "Art. 999", "Stored", "es")).toBe("Stored");
  });
});

/** Every {code, title, description} literal of one framework's section of the seed script. */
function seededRows(fromMarker: string, toMarker: string): { code: string; description: string }[] {
  const a = SEED.indexOf(fromMarker);
  const b = SEED.indexOf(toMarker, a + 1);
  return [...SEED.slice(a, b).matchAll(/\{ code: "([^"]+)", title: "[^"]+", description: "((?:[^"\\]|\\.)*)"/g)].map((m) => ({
    code: m[1],
    description: m[2],
  }));
}

describe("requirement descriptions in Spanish", () => {
  const eu = [
    ...seededRows('code: "EU_AI_ACT"', 'code: "NIST_AI_RMF"'),
    ...[EU_ART113_SUBTREE, ...EU_ART113_SUBTREE.children].map((r) => ({ code: r.code, description: r.description })),
  ];
  const nist = seededRows('code: "NIST_AI_RMF"', 'code: "ISO_42001"');
  const iso = seededRows('code: "ISO_42001"', "AIUC1_FRAMEWORK.code");
  const aiuc1 = AIUC1_DOMAINS.flatMap((d) => [
    { code: d.code, description: d.paraphrase },
    ...d.requirements.map((r) => ({ code: r.code, description: aiuc1RequirementDescription(r) })),
  ]);
  const tables = [
    ["EU_AI_ACT", eu],
    ["NIST_AI_RMF", nist],
    ["ISO_42001", iso],
    ["AIUC_1", aiuc1],
  ] as const;

  it("cover every seeded EU AI Act, NIST, ISO and AIUC-1 description", () => {
    expect(eu.length).toBeGreaterThan(80);
    expect(nist.length).toBeGreaterThan(20);
    expect(iso.length).toBeGreaterThan(30);
    expect(aiuc1.length).toBe(57);
    for (const [fw, rows] of tables) {
      for (const row of rows) {
        const es = requirementDescription(fw, row.code, row.description, "es");
        expect(es, `${fw} ${row.code}`).toBeTruthy();
        expect(es, `${fw} ${row.code}`).not.toBe(row.description);
      }
    }
  });

  it("carry no stale entries for codes the seeds no longer write", () => {
    for (const [fw, rows] of tables) {
      const codes = new Set(rows.map((r) => r.code));
      for (const code of Object.keys(REQUIREMENT_DESCRIPTIONS_ES[fw])) expect(codes.has(code), `${fw} ${code}`).toBe(true);
    }
  });

  it("leave the English text as stored", () => {
    for (const [fw, rows] of tables) {
      for (const row of rows) expect(requirementDescription(fw, row.code, row.description, "en")).toBe(row.description);
    }
  });

  it("write Castilian interface Spanish: no long dash, no usted, no vosotros, no ejecutar for software", () => {
    for (const [fw, rows] of Object.entries(REQUIREMENT_DESCRIPTIONS_ES)) {
      for (const [code, text] of Object.entries(rows)) {
        const where = `${fw} ${code}`;
        expect(text, where).not.toMatch(/[–—]|--/);
        expect(text, where).not.toMatch(/\busted(es)?\b/i);
        expect(text, where).not.toMatch(/\bvosotr[oa]s\b|\bvuestr[oa]s?\b/i);
        // "Ejecutar un contrato" is the GDPR term (art. 6.1.b); for software the word is usar or funcionar.
        expect(text, where).not.toMatch(/\bejecut(ar|a|an|ando|ado|e|en)\b(?! (un|el) contrato)/i);
      }
    }
  });

  it("use the terms of the Spanish text of the AI Act", () => {
    const eu = REQUIREMENT_DESCRIPTIONS_ES.EU_AI_ACT;
    expect(eu["Art. 26"]).toContain("responsables del despliegue");
    expect(eu["Art. 53"]).toContain("modelos de IA de uso general");
    expect(eu["Art. 50(4)"]).toContain("ultrasuplantaciones");
    expect(Object.values(eu).join(" ")).not.toMatch(/\b(implementador|desplegador|usuario)\b/i);
  });

  it("build the AIUC-1 description the way the seed builds the English one", () => {
    const a007 = AIUC1_DOMAINS[0].requirements.find((r) => r.code === "A007")!;
    const es = requirementDescription("AIUC_1", "A007", aiuc1RequirementDescription(a007), "es")!;
    expect(es.startsWith(AIUC1_PARAPHRASES_ES.A007)).toBe(true);
    expect(es).toContain("Obligatorio para la certificación; etiquetas de capacidad: De cara al público.");
    expect(es).toContain("https://standard.aiuc-1.com/data-and-privacy/prevent-ip-violations");
    expect(aiuc1Paraphrase(a007, "es")).toBe(AIUC1_PARAPHRASES_ES.A007);
    expect(aiuc1Paraphrase(a007, "en")).toBe(a007.paraphrase);
  });
});

describe("regime chips and citations", () => {
  it("name the regimes in Spanish, never by their English acronym", () => {
    expect(frameworkChip("EU_GDPR", "es")).toBe("RGPD");
    expect(frameworkChip("EU_AI_ACT", "es")).toBe("RIA");
    for (const code of ALL_CODES) {
      const chip = frameworkChip(code, "es");
      expect(chip, code).not.toMatch(/_|\bEU\b|GDPR|AI ACT/);
    }
  });

  it("keep the English chips as they read before", () => {
    expect(frameworkChip("EU_AI_ACT", "en")).toBe("EU AI ACT");
    expect(frameworkChip("EU_GDPR", "en")).toBe("EU GDPR");
    expect(citationLabel("EU_GDPR", "Art. 22(3)", "en")).toBe("EU GDPR Art. 22(3)");
    expect(citationString("EU GDPR Art. 22", "en")).toBe("EU GDPR Art. 22");
  });

  it("write requirement codes with a lower-case art. in Spanish, as stored in English", () => {
    expect(requirementCode("EU_AI_ACT", "Art. 53", "es")).toBe("art. 53");
    expect(requirementCode("EU_GDPR", "Art. 22(3)", "es")).toBe("art. 22(3)");
    expect(requirementCode("EU_AI_ACT", "Art. 113 — 2 Aug 2026", "es")).toBe("art. 113, 2 ago 2026");
    expect(requirementCode("EU_AI_ACT", "Art. 53", "en")).toBe("Art. 53");
    expect(requirementCode("NIST_AI_RMF", "GOVERN 1", "es")).toBe("GOVERN 1");
  });

  it("write citations in Spanish style", () => {
    expect(citationLabel("EU_GDPR", "Art. 22(3)", "es")).toBe("RGPD art. 22(3)");
    expect(citationLabel("EU_AI_ACT", "Annex III", "es")).toBe("RIA anexo III");
    expect(citationLabel("CA_CCPA_ADMT", "§ 7221", "es")).toBe("ADMT de California § 7221");
    expect(citationString("EU AI ACT Art. 50", "es")).toBe("RIA art. 50");
    expect(citationString("EU GDPR Art. 13(2)(f) / 14(2)(g)", "es")).toBe("RGPD art. 13(2)(f) / 14(2)(g)");
    expect(citationString("CO SB 26-189 CO-DEP-1", "es")).toBe("CO SB 26-189 CO-DEP-1");
  });
});
