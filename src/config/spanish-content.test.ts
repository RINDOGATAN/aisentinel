// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Content sets that reach a Spanish organisation outside the message files:
 * each entry must have a non-empty Spanish version with no long dash, so a
 * new English entry without its Spanish fails here rather than on screen.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import {
  GENERIC_AI_MAPPING,
  VENDOR_AI_MAPPINGS,
  vendorSystemDescription,
  vendorSystemName,
  vendorSystemNames,
} from "./vendor-ai-mappings";
import { AI_GOVERNANCE_TEMPLATES } from "./ai-governance-templates";
import { EXAMPLE_SYSTEMS } from "./worked-example";
import {
  ANNEX_III_FORM_KEYS,
  ANNEX_III_FORM_LABELS,
  ANNEX_III_FREE_TEXT_ES,
  annexIIIText,
} from "@/lib/annex-iii-label";
import {
  FRAMEWORKS_ES,
  frameworksData,
  frameworksDataFor,
  localizeFrameworks,
  translatableStrings,
  validateFrameworks,
} from "@/lib/frameworks/model";

const LONG_DASH = /[–—―]/;

function expectSpanish(where: string, value: string | undefined, english?: string) {
  expect(value, where).toBeTruthy();
  expect(value!.trim(), where).not.toBe("");
  expect(LONG_DASH.test(value!), `${where} has a long dash`).toBe(false);
  expect(/\busted(es)?\b/i.test(value!), `${where} says usted`).toBe(false);
  expect(/prestador/i.test(value!), `${where} says prestador`).toBe(false);
  expect(/\bejecu(?!tiv)(?!tar (un|el) contrato)/i.test(value!), `${where} says ejecutar`).toBe(false);
  expect(/[^\s.¿¡«]\s+Arts?\.\s*\d|\(Arts?\.\s*\d/.test(value!), `${where} has an upper-case article reference`).toBe(false);
  if (english !== undefined) expect(value, `${where} is untranslated`).not.toBe(english);
}

describe("vendor-catalogue quick start mappings", () => {
  const mappings = [...Object.entries(VENDOR_AI_MAPPINGS), ["generic", GENERIC_AI_MAPPING] as const];

  it("has a Spanish version of every text the quick start writes", () => {
    for (const [key, m] of mappings) {
      for (const [field, value] of [
        ["label", m.label],
        ["nameSuffix", m.system.nameSuffix],
        ["purpose", m.system.purpose],
        ["riskRationale", m.riskRationale],
      ] as const) {
        expect(value.en, `${key}.${field}.en`).toBeTruthy();
        expect(LONG_DASH.test(value.en), `${key}.${field}.en has a long dash`).toBe(false);
        expectSpanish(`${key}.${field}.es`, value.es, value.en);
      }
    }
  });

  it("names and describes the system in the requester's language, and dedupes across both", () => {
    const m = VENDOR_AI_MAPPINGS.llm;
    expect(vendorSystemName("Acme", m, "es")).toBe("Acme Plataforma de LLM");
    expect(vendorSystemName("Acme", m, "en")).toBe("Acme LLM Platform");
    expect(vendorSystemNames("Acme", m)).toEqual(["Acme LLM Platform", "Acme Plataforma de LLM"]);
    expect(vendorSystemDescription("Acme", m, "es")).toContain(m.system.purpose.es);
    expect(vendorSystemDescription("Acme", m, "es")).not.toMatch(/deployed from/);
    expect(m.riskRationale.es).toContain("art. 50 del RIA");
  });

  it("leaves the stored Annex III value to the shared label", () => {
    for (const [key, m] of mappings) {
      if (m.annexIIICategory) expect(ANNEX_III_FREE_TEXT_ES[m.annexIIICategory], key).toBeTruthy();
    }
  });
});

describe("Annex III category labels", () => {
  const stored = new Set<string>();
  for (const t of AI_GOVERNANCE_TEMPLATES) for (const s of t.systems) if (s.annexIIICategory) stored.add(s.annexIIICategory);
  for (const m of Object.values(VENDOR_AI_MAPPINGS)) if (m.annexIIICategory) stored.add(m.annexIIICategory);
  for (const s of EXAMPLE_SYSTEMS) if (s.risk.annexIIICategory) stored.add(s.risk.annexIIICategory);

  it("has a Spanish label for every value the templates, mappings and worked example store", () => {
    expect(stored.size).toBeGreaterThan(3);
    for (const v of stored) expectSpanish(`annexIII ${v}`, annexIIIText(v, "es"), v);
    for (const [k, v] of Object.entries(ANNEX_III_FREE_TEXT_ES)) expectSpanish(`ANNEX_III_FREE_TEXT_ES ${k}`, v);
  });

  it("stores no long dash, and shows the legacy dashed value without one in both languages", () => {
    for (const v of stored) expect(LONG_DASH.test(v), v).toBe(false);
    const legacy = "Art. 6(1) / Annex I (MDR) route — not Annex III";
    expect(annexIIIText(legacy, "en")).toBe("Art. 6(1) / Annex I (MDR) route, not Annex III");
    expect(annexIIIText(legacy, "es")).toBe("Vía del art. 6(1) y del anexo I (productos sanitarios): no es el anexo III");
  });

  it("names the form keys exactly as the message files do", () => {
    for (const k of ANNEX_III_FORM_KEYS) {
      expect(ANNEX_III_FORM_LABELS.en[k], k).toBe(en.riskClassification.annexIII[k]);
      expect(ANNEX_III_FORM_LABELS.es[k], k).toBe(es.riskClassification.annexIII[k]);
    }
    expect(annexIIIText("employment", "es")).toBe("4. Empleo y gestión de los trabajadores");
  });

  it("the impact assessment document prints the category in its language", () => {
    const src = readFileSync(path.join(process.cwd(), "src/server/services/artifacts/build-artifacts.ts"), "utf8");
    expect(src).toContain("annexIIIText(scope.annexIiiCategory, locale)");
  });
});

describe("frameworks documentation (wheel, table, compare, selector)", () => {
  const source = translatableStrings();

  it("has a Spanish version of every shown string", () => {
    const missing = source.filter(({ en: s }) => !Object.prototype.hasOwnProperty.call(FRAMEWORKS_ES, s));
    expect(missing.map((m) => m.where)).toEqual([]);
    // Proper names that read the same in both languages.
    const sameAllowed = new Set(["NIST AI RMF", "ISO/IEC 42001", "ISO/IEC 23894", "Colorado", "NYC LL 144", "AIUC-1"]);
    for (const { where, en: s } of source) expectSpanish(where, FRAMEWORKS_ES[s], sameAllowed.has(s) ? undefined : s);
  });

  it("has no stale entries", () => {
    const live = new Set(source.map((s) => s.en));
    expect(Object.keys(FRAMEWORKS_ES).filter((k) => !live.has(k))).toEqual([]);
  });

  it("keeps ids, URLs, depths and citations, and the Spanish data passes the data checks", () => {
    const esData = frameworksDataFor("es");
    expect(frameworksDataFor("en")).toBe(frameworksData);
    expect(localizeFrameworks(frameworksData, "en")).toBe(frameworksData);
    esData.frameworks.forEach((f, i) => {
      const orig = frameworksData.frameworks[i];
      expect(f.id).toBe(orig.id);
      expect(f.url).toBe(orig.url);
      for (const [ring, c] of Object.entries(f.cells)) {
        expect(c.depth).toBe(orig.cells[ring].depth);
        expect(c.source).toEqual(orig.cells[ring].source);
      }
    });
    // The 260-character summary limit is an English editorial rule; the rest applies.
    expect(validateFrameworks(esData).filter((e) => !e.includes("over 260 characters"))).toEqual([]);
    expect(esData.rings.find((r) => r.id === "oversight")?.label).toBe("Supervisión humana");
    expect(esData.frameworks[0].short).toBe("RIA");
  });
});

describe("licences page", () => {
  it("has every text in Spanish", () => {
    const keys = Object.keys(en.licenses) as (keyof typeof en.licenses)[];
    expect(Object.keys(es.licenses).sort()).toEqual([...keys].sort());
    for (const k of keys) expectSpanish(`licenses.${k}`, es.licenses[k], en.licenses[k]);
    expect(es.licenses.premiumTitle).toBe("Skills premium");
  });
});

describe("automatic incident timeline entries", () => {
  it("are said in Spanish at read time", () => {
    const t = es.incidentDetail.timelineSystem;
    for (const [k, v] of Object.entries(t)) {
      expectSpanish(`incidentDetail.timelineSystem.${k}`, v, (en.incidentDetail.timelineSystem as Record<string, string>)[k]);
    }
  });
});
