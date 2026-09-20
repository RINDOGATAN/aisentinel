// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The disclosure, guarded. It must say the five things, in both languages, and
 * it must not claim anything we cannot evidence: no certification, no
 * "enterprise grade", no security theatre. This test is the reason the wording
 * lives in one file rather than in the screen that shows it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DISCLOSURE_CHROME,
  DISCLOSURE_DOCS_PATH,
  DISCLOSURE_POINTS,
  DISCLOSURE_REVIEWED_AS_OF,
  DISCLOSURE_VERSION,
  disclosureLines,
} from "./pilot-disclosure";

const LOCALES = ["en", "es"] as const;

describe("the hosted pilot disclosure", () => {
  it("says all five things, in both languages, and each is a real sentence", () => {
    expect(DISCLOSURE_POINTS.map((p) => p.id)).toEqual([
      "free-pilot",
      "no-certifications",
      "no-real-data",
      "export-anytime",
      "real-deletion",
    ]);
    for (const point of DISCLOSURE_POINTS) {
      for (const locale of LOCALES) {
        const text = point.text[locale];
        expect(text.length).toBeGreaterThan(40);
        expect(text.trim().endsWith(".")).toBe(true);
      }
    }
  });

  it("claims no certification and no enterprise grade", () => {
    for (const locale of LOCALES) {
      const all = disclosureLines(locale).join(" ");
      // The one mention of a certification is that we do NOT hold one.
      expect(all).toMatch(locale === "es" ? /No disponemos de las certificaciones/ : /do not hold the usual security certifications/);
      expect(all).not.toMatch(/enterprise[- ]grade/i);
      expect(all).not.toMatch(/bank[- ]grade|military[- ]grade|grado empresarial|nivel bancario/i);
      // No claim of holding a standard, only of not holding one.
      expect(all).not.toMatch(/(?:we are|somos|estamos)\s+(?:ISO|SOC)/i);
    }
  });

  it("names the three things a person needs to act on", () => {
    const en = disclosureLines("en").join(" ");
    const es = disclosureLines("es").join(" ");
    expect(en).toMatch(/free pilot/);
    expect(en).toMatch(/Do not put real client matter or personal data/);
    expect(en).toMatch(/export your work at any time/);
    expect(en).toMatch(/really deleted/);
    expect(es).toMatch(/piloto gratuito/);
    expect(es).toMatch(/No introduzcas asuntos reales/);
    expect(es).toMatch(/exportar tu trabajo en cualquier momento/);
    expect(es).toMatch(/se elimina de verdad/);
  });

  it("the Spanish is Castilian and addresses the reader as tú", () => {
    const strings = [...disclosureLines("es"), ...Object.values(DISCLOSURE_CHROME.es)];
    for (const s of strings) {
      expect(s).not.toMatch(/\busted\b/i);
      // The imperatives are tú forms, so the usted forms must not appear.
      expect(s).not.toMatch(/\bintroduzca\b|\bpuede exportar\b|\bpuede eliminar\b|\blea\b|\bsiga\b|\butilice\b/);
    }
  });

  it("uses no long dashes in user-facing copy", () => {
    const strings = [
      ...disclosureLines("en"),
      ...disclosureLines("es"),
      ...Object.values(DISCLOSURE_CHROME.en),
      ...Object.values(DISCLOSURE_CHROME.es),
    ];
    for (const s of strings) expect(s).not.toMatch(/[—–]/);
  });

  it("is versioned and dated, so an acknowledgement means something", () => {
    expect(DISCLOSURE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(DISCLOSURE_REVIEWED_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is published where the screen says it is", () => {
    const page = readFileSync(
      join(__dirname, "../app", DISCLOSURE_DOCS_PATH.replace(/^\/docs/, "docs"), "page.tsx"),
      "utf8",
    );
    // The docs page renders the shared list rather than restating the wording.
    expect(page).toMatch(/DisclosureList/);
    expect(page).not.toMatch(/free pilot running on our servers/);
  });
});
