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
    expect(text).toContain("Data locations: US, EU (EU data centre: yes)");
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
