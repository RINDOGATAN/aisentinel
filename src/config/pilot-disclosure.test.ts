// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The disclosure, guarded. It must say the five things, in both languages, and
 * it must not claim anything we cannot evidence: the only certifications named
 * are our sub-processors' (version 2.0.0, owner, 11 Oct 2026), never our own;
 * no "enterprise grade", no security theatre. Accepting it also accepts the
 * data processing agreement named in DISCLOSURE_DPA. This test is the reason the wording
 * lives in one file rather than in the screen that shows it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DISCLOSURE_CHROME,
  DISCLOSURE_DOCS_PATH,
  DISCLOSURE_DPA,
  DISCLOSURE_POINTS,
  DISCLOSURE_REVIEWED_AS_OF,
  DISCLOSURE_VERSION,
  SUBPROCESSORS_URL,
  disclosureLines,
} from "./pilot-disclosure";

const LOCALES = ["en", "es"] as const;

describe("the hosted pilot disclosure", () => {
  it("says all five things, in both languages, and each is a real sentence", () => {
    expect(DISCLOSURE_POINTS.map((p) => p.id)).toEqual([
      "free-pilot",
      "certified-subprocessors",
      "real-data",
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

  it("cites only sub-processors' certifications, never our own, and no enterprise grade", () => {
    for (const locale of LOCALES) {
      const all = disclosureLines(locale).join(" ");
      // The certifications named are the sub-processors', with a link to their list.
      expect(all).toMatch(
        locale === "es"
          ? /subencargados que tienen certificaciones ISO 27001 y SOC 2 Tipo II/
          : /sub-processors that hold ISO 27001 and SOC 2 Type II certifications/,
      );
      expect(all).not.toMatch(/enterprise[- ]grade/i);
      expect(all).not.toMatch(/bank[- ]grade|military[- ]grade|grado empresarial|nivel bancario/i);
      // Never a claim that we (or the service) hold a standard.
      expect(all).not.toMatch(/(?:we are|we hold|somos|estamos|tenemos)\s+(?:the\s+)?(?:ISO|SOC)/i);
      expect(all).not.toMatch(/(?:Rindogatan|TODO\.LAW) (?:holds|is|tiene|está)\s+(?:ISO|SOC|certif)/i);
    }
  });

  it("links the certifications point to the published sub-processor list", () => {
    const point = DISCLOSURE_POINTS.find((p) => p.id === "certified-subprocessors");
    expect(point?.link).toBeDefined();
    for (const locale of LOCALES) {
      const link = point!.link![locale];
      expect(point!.text[locale]).toContain(link.label);
      expect(link.href).toBe(SUBPROCESSORS_URL[locale]);
    }
    expect(SUBPROCESSORS_URL.en).toMatch(/\/legal\/eu-cloud-plan-subprocessors$/);
    expect(SUBPROCESSORS_URL.es).toMatch(/\/es\/legal\/subencargados-plan-nube-ue$/);
  });

  it("names the agreement it accepts, and the screen says so with a link", () => {
    expect(DISCLOSURE_VERSION).toBe("2.0.0");
    expect(DISCLOSURE_DPA.version).toBe("1.1");
    expect(DISCLOSURE_DPA.href.en).toMatch(/\/legal\/eu-cloud-plan-dpa$/);
    expect(DISCLOSURE_DPA.href.es).toMatch(/\/es\/legal\/encargo-tratamiento-plan-nube-ue$/);
    for (const locale of LOCALES) {
      const chrome = DISCLOSURE_CHROME[locale];
      expect(chrome.dpa).toContain(chrome.dpaLinkLabel);
    }
    expect(DISCLOSURE_CHROME.en.acknowledge).toMatch(/accept/);
    expect(DISCLOSURE_CHROME.es.acknowledge).toMatch(/acepto/);
  });

  it("names the three things a person needs to act on", () => {
    const en = disclosureLines("en").join(" ");
    const es = disclosureLines("es").join(" ");
    expect(en).toMatch(/free pilot/);
    expect(en).toMatch(/no service level agreement/);
    expect(en).toMatch(/You may use real data/);
    expect(en).toMatch(/choose a managed instance or your own hardware/);
    expect(en).toMatch(/export your work at any time/);
    expect(en).toMatch(/really deleted/);
    expect(en).toMatch(/minimal audit record .*without content.*General Terms/);
    expect(es).toMatch(/piloto gratuito/);
    expect(es).toMatch(/No tiene acuerdo de nivel de servicio/);
    expect(es).toMatch(/Puedes usar datos reales/);
    expect(es).toMatch(/elige una instancia gestionada o tu propio hardware/);
    expect(es).toMatch(/exportar tu trabajo en cualquier momento/);
    expect(es).toMatch(/se elimina de verdad/);
    expect(es).toMatch(/registro de auditoría mínimo .*sin contenido.*Condiciones Generales/);
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
    expect(page).toMatch(/DisclosureDpaLine/);
    expect(page).not.toMatch(/free pilot on the TODO\.LAW cloud/);
  });
});
