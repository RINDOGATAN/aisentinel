// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { vendorDueDiligenceFindings, toCatalogFacts, type CatalogFacts } from "./vendor-due-diligence";

const empty: CatalogFacts = {
  name: "Vendor",
  certifications: [],
  dataLocations: [],
  hasEuDataCenter: null,
  dpaUrl: null,
  trustCenterUrl: null,
  dpaGdprScore: null,
  transferSafeguards: null,
  aiCapabilities: [],
  modelHosting: null,
  euAiActRole: null,
  iso42001Certified: null,
  aiIncidentNotificationSLA: null,
  dataProcessingTransparency: null,
  hasRecentBreach: null,
  subprocessorCount: null,
};

describe("vendorDueDiligenceFindings", () => {
  it("turns every unknown into an open question and asserts nothing", () => {
    const text = vendorDueDiligenceFindings(empty, "en");
    expect(text).not.toContain("Stated in the vendor catalog");
    expect(text).toContain("Open questions");
    expect(text).toContain("used to train");
    expect(text).toContain("provider of the AI system");
    // An unknown breach history is a question, never "no".
    expect(text).not.toMatch(/breach[^?\n]*: no/i);
  });

  it("states what the catalog knows, and drops the questions it answers", () => {
    const text = vendorDueDiligenceFindings(
      {
        ...empty,
        certifications: ["ISO 27001", "SOC 2 Type II"],
        dataLocations: ["US", "EU"],
        hasEuDataCenter: true,
        dpaUrl: "https://vendor.example/dpa",
        dpaGdprScore: 82,
        euAiActRole: "Provider",
        hasRecentBreach: false,
        subprocessorCount: 12,
      },
      "en",
    );
    expect(text).toContain("Certifications: ISO 27001, SOC 2 Type II");
    expect(text).toContain("Data locations: US, EU (EU data center: yes)");
    expect(text).toContain("82/100");
    expect(text).toContain("Publicly reported breach in the catalog's window: no");
    expect(text).not.toContain("Which security and AI management certifications");
    expect(text).not.toContain("Which subprocessors");
    // Training and retention are never in the catalog: always asked.
    expect(text).toContain("used to train");
  });

  it("writes Castilian Spanish with no English labels", () => {
    const text = vendorDueDiligenceFindings({ ...empty, certifications: ["ISO 27001"] }, "es");
    expect(text).toContain("Certificaciones: ISO 27001");
    expect(text).toContain("Preguntas abiertas");
    expect(text).not.toMatch(/Open questions|Certifications/);
    expect(text.toLowerCase()).not.toContain("usted");
  });

  it("counts subprocessors only from a JSON array", () => {
    const base = { ...empty, subprocessors: null } as Parameters<typeof toCatalogFacts>[0];
    expect(toCatalogFacts({ ...base, subprocessors: [{}, {}] }).subprocessorCount).toBe(2);
    expect(toCatalogFacts({ ...base, subprocessors: { a: 1 } }).subprocessorCount).toBeNull();
  });
});

describe("training use and retention", () => {
  const cases: [string, string, string][] = [
    ["no", "no", "no"],
    ["opt-out", "yes unless the customer opts out", "sí, salvo que el cliente lo desactive"],
    ["opt-in", "only if the customer opts in", "solo si el cliente lo activa"],
    ["yes", "yes", "sí"],
  ];
  for (const [value, en, es] of cases) {
    it(`moves the training question to known for "${value}"`, () => {
      const f = { ...empty, trainingUse: value };
      const textEn = vendorDueDiligenceFindings(f, "en");
      expect(textEn).toContain(`- Use of customer data to train models (vendor's statement): ${en}`);
      expect(textEn).not.toContain("used to train or improve");
      const textEs = vendorDueDiligenceFindings(f, "es");
      expect(textEs).toContain(`- Uso de los datos del cliente para entrenar modelos (según el proveedor): ${es}`);
      expect(textEs).not.toContain("para entrenar o mejorar");
    });
  }

  it("keeps the training question when not stated, null or absent", () => {
    for (const trainingUse of ["not-stated", null, undefined]) {
      const text = vendorDueDiligenceFindings({ ...empty, trainingUse }, "en");
      expect(text).toContain("used to train or improve");
      expect(text).not.toContain("Use of customer data to train models");
    }
  });

  it("moves the retention question to known in both languages", () => {
    const f = { ...empty, retention: "30 days" };
    expect(vendorDueDiligenceFindings(f, "en")).toContain("- Retention of inputs and outputs (vendor's statement): 30 days");
    expect(vendorDueDiligenceFindings(f, "en")).not.toContain("How long are inputs");
    expect(vendorDueDiligenceFindings(f, "es")).toContain("- Conservación de entradas y resultados (según el proveedor): 30 days");
    expect(vendorDueDiligenceFindings(f, "es")).not.toContain("¿Durante cuánto tiempo");
  });

  it("keeps the retention question when null or blank", () => {
    for (const retention of [null, undefined, "  "]) {
      expect(vendorDueDiligenceFindings({ ...empty, retention }, "en")).toContain("How long are inputs");
    }
  });
});
