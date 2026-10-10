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
  REQUIREMENT_TITLES_ES,
  frameworkName,
  frameworkShort,
  frameworkShortName,
  requirementCode,
  requirementDescription,
  requirementTitle,
} from "./framework-display";
import { EU_ART113_SUBTREE } from "./eu-timeline-requirements";
import { AIUC1_DOMAINS } from "./aiuc1-requirements";
import { AIUC1_CAPABILITIES_ES, AIUC1_TITLES_ES, aiuc1Capabilities, aiuc1Title } from "./aiuc1-requirements-es";
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
