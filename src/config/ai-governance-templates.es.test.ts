// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { AI_GOVERNANCE_TEMPLATES } from "./ai-governance-templates";
import {
  AI_GOVERNANCE_TEMPLATES_ES,
  localizeTemplate,
  localizeTemplateString,
} from "./ai-governance-templates.es";

/** Every user-visible English string in the templates, with where it lives. */
function collectSourceStrings(): Array<{ where: string; en: string }> {
  const out: Array<{ where: string; en: string }> = [];
  for (const t of AI_GOVERNANCE_TEMPLATES) {
    out.push({ where: `${t.id}.name`, en: t.name });
    out.push({ where: `${t.id}.description`, en: t.description });
    t.systems.forEach((s, i) => {
      out.push({ where: `${t.id}.systems[${i}].name`, en: s.name });
      out.push({ where: `${t.id}.systems[${i}].description`, en: s.description });
      out.push({ where: `${t.id}.systems[${i}].purpose`, en: s.purpose });
      out.push({ where: `${t.id}.systems[${i}].riskRationale`, en: s.riskRationale });
    });
    t.policies.forEach((p, i) => {
      out.push({ where: `${t.id}.policies[${i}].title`, en: p.title });
      out.push({ where: `${t.id}.policies[${i}].description`, en: p.description });
      out.push({ where: `${t.id}.policies[${i}].content`, en: p.content });
    });
  }
  return out;
}

/**
 * Strings that are pure proper names and may legitimately read the same in
 * both languages. Currently none: every source string is translated.
 */
const ALLOWED_IDENTICAL = new Set<string>([]);

describe("AI_GOVERNANCE_TEMPLATES_ES", () => {
  const source = collectSourceStrings();

  it("covers all eight templates", () => {
    expect(AI_GOVERNANCE_TEMPLATES.map((t) => t.id).sort()).toEqual(
      ["ecommerce", "financial", "healthcare", "manufacturing", "media", "professional", "public", "saas"],
    );
  });

  it("has a translation for every user-visible English string", () => {
    const missing = source.filter(({ en }) => !Object.prototype.hasOwnProperty.call(AI_GOVERNANCE_TEMPLATES_ES, en));
    expect(missing.map((m) => m.where)).toEqual([]);
  });

  it("has no stale entries that no longer match any English string", () => {
    const live = new Set(source.map((s) => s.en));
    const stale = Object.keys(AI_GOVERNANCE_TEMPLATES_ES).filter((k) => !live.has(k));
    expect(stale).toEqual([]);
  });

  it("never leaves a value identical to its English key (except listed proper names)", () => {
    const identical = Object.entries(AI_GOVERNANCE_TEMPLATES_ES)
      .filter(([en, es]) => en === es && !ALLOWED_IDENTICAL.has(en))
      .map(([en]) => en);
    expect(identical).toEqual([]);
  });

  it("uses no 'usted' and no long dashes in the Spanish", () => {
    const offending = Object.entries(AI_GOVERNANCE_TEMPLATES_ES)
      .filter(([, es]) => /usted/i.test(es) || es.includes("—") || es.includes("–"))
      .map(([en]) => en.slice(0, 80));
    expect(offending).toEqual([]);
  });

  it("keeps paragraph structure (same number of line breaks) in every value", () => {
    const mismatched = Object.entries(AI_GOVERNANCE_TEMPLATES_ES)
      .filter(([en, es]) => (en.match(/\n/g) ?? []).length !== (es.match(/\n/g) ?? []).length)
      .map(([en]) => en.slice(0, 80));
    expect(mismatched).toEqual([]);
  });
});

describe("localizeTemplateString", () => {
  it("returns the Spanish for 'es' and the English for 'en'", () => {
    expect(localizeTemplateString("Healthcare", "es")).toBe("Sanidad");
    expect(localizeTemplateString("Healthcare", "en")).toBe("Healthcare");
  });

  it("falls back to the English when no translation exists", () => {
    expect(localizeTemplateString("Not a template string", "es")).toBe("Not a template string");
  });
});

describe("localizeTemplate", () => {
  for (const template of AI_GOVERNANCE_TEMPLATES) {
    describe(template.id, () => {
      const es = localizeTemplate(template, "es");

      it("keeps every non-text field identical to the source", () => {
        expect(es.id).toBe(template.id);
        expect(es.icon).toBe(template.icon);
        expect(es.systems).toHaveLength(template.systems.length);
        expect(es.policies).toHaveLength(template.policies.length);
        es.systems.forEach((s, i) => {
          const src = template.systems[i];
          expect(s.riskLevel).toBe(src.riskLevel);
          expect(s.technique).toBe(src.technique);
          expect(s.role).toBe(src.role);
          expect(s.gateType).toBe(src.gateType);
          expect(s.processesPersonalData).toBe(src.processesPersonalData);
          expect(s.annexIIICategory).toBe(src.annexIIICategory);
        });
        es.policies.forEach((p, i) => {
          expect(p.type).toBe(template.policies[i].type);
        });
      });

      it("translates every user-visible string", () => {
        expect(es.name).not.toBe(template.name);
        expect(es.description).not.toBe(template.description);
        es.systems.forEach((s, i) => {
          const src = template.systems[i];
          expect(s.name).not.toBe(src.name);
          expect(s.description).not.toBe(src.description);
          expect(s.purpose).not.toBe(src.purpose);
          expect(s.riskRationale).not.toBe(src.riskRationale);
        });
        es.policies.forEach((p, i) => {
          const src = template.policies[i];
          expect(p.title).not.toBe(src.title);
          expect(p.description).not.toBe(src.description);
          expect(p.content).not.toBe(src.content);
        });
      });

      it("keeps system names unique within the template", () => {
        const names = es.systems.map((s) => s.name);
        expect(new Set(names).size).toBe(names.length);
      });

      it("returns a deep copy and leaves the source untouched", () => {
        expect(es).not.toBe(template);
        expect(es.systems).not.toBe(template.systems);
        expect(es.policies).not.toBe(template.policies);
        es.systems.forEach((s, i) => expect(s).not.toBe(template.systems[i]));
        es.policies.forEach((p, i) => expect(p).not.toBe(template.policies[i]));
      });

      it("deep-equals the source for 'en'", () => {
        const en = localizeTemplate(template, "en");
        expect(en).toEqual(template);
        expect(en).not.toBe(template);
      });
    });
  }
});
