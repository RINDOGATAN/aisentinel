// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The worked example, guarded.
 *
 * Two things can go wrong with example content and both are worse than having
 * none: it can be mistaken for a real client's matter, and it can teach the
 * wrong answer. So every name says it is a sample, every classification carries
 * a rationale that matches the system it classifies, and the answers recorded
 * are answers to questions the assessment actually asks.
 */

import { describe, expect, it } from "vitest";
import {
  EXAMPLE_ASSESSMENT_ANSWERS,
  EXAMPLE_GATE,
  EXAMPLE_INCIDENT,
  EXAMPLE_POLICY,
  EXAMPLE_SYSTEMS,
  EXAMPLE_VENDORS,
  WORKED_EXAMPLE_CHROME,
  WORKED_EXAMPLE_JURISDICTIONS,
  WORKED_EXAMPLE_VERSION,
} from "./worked-example";
import { allUnifiedQuestions } from "./unified-assessment";
import { JURISDICTIONS } from "./jurisdictions";

const LOCALES = ["en", "es"] as const;

/** Every piece of prose the example puts in front of a person. */
function allProse(): { where: string; locale: (typeof LOCALES)[number]; text: string }[] {
  const out: { where: string; locale: (typeof LOCALES)[number]; text: string }[] = [];
  const add = (where: string, value: Record<"en" | "es", string>) => {
    for (const locale of LOCALES) out.push({ where, locale, text: value[locale] });
  };
  for (const v of EXAMPLE_VENDORS) {
    add(`vendor:${v.key}:name`, v.name);
    add(`vendor:${v.key}:description`, v.description);
  }
  for (const s of EXAMPLE_SYSTEMS) {
    add(`system:${s.key}:name`, s.name);
    add(`system:${s.key}:description`, s.description);
    add(`system:${s.key}:purpose`, s.purpose);
    add(`system:${s.key}:rationale`, s.risk.rationale);
    add(`system:${s.key}:businessOwner`, s.businessOwner);
    add(`system:${s.key}:technicalOwner`, s.technicalOwner);
  }
  add("policy:title", EXAMPLE_POLICY.title);
  add("policy:description", EXAMPLE_POLICY.description);
  add("policy:content", EXAMPLE_POLICY.content);
  add("gate:description", EXAMPLE_GATE.description);
  add("gate:cadence", EXAMPLE_GATE.reviewCadence);
  add("incident:title", EXAMPLE_INCIDENT.title);
  add("incident:description", EXAMPLE_INCIDENT.description);
  add("incident:impact", EXAMPLE_INCIDENT.impactDescription);
  add("incident:rootCause", EXAMPLE_INCIDENT.rootCauseCategory);
  for (const [id, text] of Object.entries(EXAMPLE_ASSESSMENT_ANSWERS)) add(`answer:${id}`, text);
  for (const locale of LOCALES) {
    for (const [key, value] of Object.entries(WORKED_EXAMPLE_CHROME[locale])) {
      out.push({ where: `chrome:${key}`, locale, text: value });
    }
  }
  return out;
}

describe("the example cannot be mistaken for real work", () => {
  it("every name a person sees says it is a sample", () => {
    const named = [
      ...EXAMPLE_SYSTEMS.map((s) => ({ key: s.key, value: s.name })),
      ...EXAMPLE_VENDORS.map((v) => ({ key: v.key, value: v.name })),
      { key: "policy", value: EXAMPLE_POLICY.title },
      { key: "incident", value: EXAMPLE_INCIDENT.title },
    ];
    for (const { key, value } of named) {
      expect(value.en, key).toMatch(/\(sample\)/);
      expect(value.es, key).toMatch(/\(muestra\)/);
    }
  });

  it("every description says the content is invented", () => {
    const invented = [
      ...EXAMPLE_SYSTEMS.map((s) => ({ key: s.key, value: s.description })),
      ...EXAMPLE_VENDORS.map((v) => ({ key: v.key, value: v.description })),
      { key: "incident", value: EXAMPLE_INCIDENT.description },
    ];
    for (const { key, value } of invented) {
      expect(value.en, key).toMatch(/invented|example organisation/i);
      expect(value.es, key).toMatch(/inventad|organización de ejemplo/i);
    }
  });

  it("names no real person and no real company", () => {
    for (const { where, text } of allProse()) {
      // The roles are roles, not names, and the only brand named is the one
      // whose product this is.
      expect(text, where).not.toMatch(/\b(?:Acme|OpenAI|Anthropic|Google|Microsoft|Workday|LinkedIn)\b/);
      expect(text, where).not.toMatch(/@(?!example\.)[a-z0-9.-]+\.[a-z]{2,}/i);
    }
  });
});

describe("the example is internally consistent", () => {
  it("has exactly one high, one limited and one minimal system", () => {
    const levels = EXAMPLE_SYSTEMS.map((s) => s.risk.level).sort();
    expect(levels).toEqual(["HIGH", "LIMITED", "MINIMAL"]);
  });

  it("only the high-risk system carries an Annex III category", () => {
    for (const s of EXAMPLE_SYSTEMS) {
      if (s.risk.level === "HIGH") expect(s.risk.annexIIICategory, s.key).toBeTruthy();
      else expect(s.risk.annexIIICategory, s.key).toBeNull();
    }
  });

  it("every rationale explains the level it justifies, in both languages", () => {
    const high = EXAMPLE_SYSTEMS.find((s) => s.risk.level === "HIGH")!;
    expect(high.risk.rationale.en).toMatch(/Annex III/);
    expect(high.risk.rationale.es).toMatch(/anexo III/);
    const limited = EXAMPLE_SYSTEMS.find((s) => s.risk.level === "LIMITED")!;
    expect(limited.risk.rationale.en).toMatch(/Article 50/);
    expect(limited.risk.rationale.es).toMatch(/artículo 50/);
    const minimal = EXAMPLE_SYSTEMS.find((s) => s.risk.level === "MINIMAL")!;
    // Minimal is not an endorsement: it still says what does apply.
    expect(minimal.risk.rationale.en).toMatch(/data protection/i);
    expect(minimal.risk.rationale.es).toMatch(/protección de datos/i);
  });

  it("the gate and the incident point at systems the example creates", () => {
    const keys = new Set(EXAMPLE_SYSTEMS.map((s) => s.key));
    expect(keys.has(EXAMPLE_GATE.systemKey)).toBe(true);
    expect(keys.has(EXAMPLE_INCIDENT.systemKey)).toBe(true);
    // The incident belongs to the public assistant, not the hiring model: an
    // example incident on the high-risk system would imply a reporting duty the
    // rest of the example does not carry.
    expect(EXAMPLE_INCIDENT.systemKey).toBe("customer-assistant");
  });

  it("every system's vendor reference resolves", () => {
    const vendorKeys = new Set(EXAMPLE_VENDORS.map((v) => v.key));
    for (const s of EXAMPLE_SYSTEMS) {
      if (s.vendorKey) expect(vendorKeys.has(s.vendorKey), s.key).toBe(true);
    }
  });

  it("declares a jurisdiction the product knows about", () => {
    const known = new Set(JURISDICTIONS.map((j) => j.id as string));
    for (const id of WORKED_EXAMPLE_JURISDICTIONS) expect(known.has(id), id).toBe(true);
  });

  it("is versioned, so an audit entry says which example ran", () => {
    expect(WORKED_EXAMPLE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("the recorded answers answer questions that exist", () => {
  const ids = new Set(allUnifiedQuestions().map((q) => q.question.id));

  it("every answer key is a real question id", () => {
    for (const id of Object.keys(EXAMPLE_ASSESSMENT_ANSWERS)) {
      expect(ids.has(id), `${id} is not a question the assessment asks`).toBe(true);
    }
  });

  it("leaves some questions unanswered, so an open item is visible too", () => {
    expect(Object.keys(EXAMPLE_ASSESSMENT_ANSWERS).length).toBeGreaterThan(8);
    expect(Object.keys(EXAMPLE_ASSESSMENT_ANSWERS).length).toBeLessThan(ids.size);
  });

  it("every answer is substantive in both languages", () => {
    for (const [id, text] of Object.entries(EXAMPLE_ASSESSMENT_ANSWERS)) {
      for (const locale of LOCALES) {
        expect(text[locale].length, `${id}/${locale}`).toBeGreaterThan(60);
        expect(text[locale].trim().endsWith("."), `${id}/${locale}`).toBe(true);
      }
    }
  });
});

describe("the Spanish is Castilian and addresses the reader as tú", () => {
  it("uses no usted forms and no long dashes anywhere", () => {
    for (const { where, locale, text } of allProse()) {
      expect(text, where).not.toMatch(/[—–]/);
      if (locale !== "es") continue;
      expect(text, where).not.toMatch(/\busted\b/i);
      expect(text, where).not.toMatch(
        /\bintroduzca\b|\bcomuníquelo\b|\bsustitúyalo\b|\btome\b|\bcambie\b|\bempiece\b|\bquite\b/,
      );
    }
  });

  it("the one-click copy tells the reader what it will change before they click", () => {
    for (const locale of LOCALES) {
      const c = WORKED_EXAMPLE_CHROME[locale];
      // What it adds, what it changes, and that it is all marked and removable.
      expect(c.contents.length).toBeGreaterThan(80);
      expect(c.jurisdictionNote).toMatch(locale === "es" ? /Unión Europea/ : /European Union/);
      expect(c.jurisdictionNote).toMatch(locale === "es" ? /restablece/ : /puts back/);
      expect(c.markedNote).toMatch(locale === "es" ? /datos de muestra/ : /sample data/);
    }
  });
});
