// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Table-driven tests for the deterministic Annex III screening rules.
 * Pure — no DB, no network, no AI. Each case is a registered-system shape
 * and the screening verdict it must produce, including the corrected
 * Annex III point 5(b) financial-fraud carve-out.
 */

import { describe, it, expect } from "vitest";
import { screenAnnexIii, type AnnexIiiFacts } from "./annex-iii-rules";

interface Case {
  title: string;
  facts: AnnexIiiFacts;
  level: "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL";
  category?: string | null;
  prohibitedArticle?: string;
  carveOut?: boolean;
}

const CASES: Case[] = [
  // --- Art. 5 prohibited practices -> UNACCEPTABLE ---
  {
    title: "social scoring is prohibited (Art. 5(1)(c))",
    facts: { name: "Citizen social scoring platform" },
    level: "UNACCEPTABLE",
    prohibitedArticle: "Art. 5(1)(c)",
  },
  {
    title: "profiling-based predictive policing is prohibited (Art. 5(1)(d))",
    facts: { name: "CrimeCast", purpose: "Predictive policing based on profiling" },
    level: "UNACCEPTABLE",
    prohibitedArticle: "Art. 5(1)(d)",
  },
  {
    title: "untargeted facial-image scraping is prohibited (Art. 5(1)(e))",
    facts: {
      name: "FaceHarvest",
      description: "Builds a facial recognition database by untargeted scraping of the internet",
    },
    level: "UNACCEPTABLE",
    prohibitedArticle: "Art. 5(1)(e)",
  },
  {
    title: "workplace emotion recognition is prohibited (Art. 5(1)(f))",
    facts: { name: "MoodWatch", purpose: "Emotion recognition in the workplace for productivity" },
    level: "UNACCEPTABLE",
    prohibitedArticle: "Art. 5(1)(f)",
  },
  {
    title: "real-time remote biometric identification is prohibited (Art. 5(1)(h))",
    facts: { name: "StreetScan", purpose: "Real-time biometric identification in public spaces" },
    level: "UNACCEPTABLE",
    prohibitedArticle: "Art. 5(1)(h)",
  },

  // --- Annex III high-risk categories -> HIGH ---
  {
    title: "CV screening lands in employment (Annex III, point 4)",
    facts: { name: "TalentRank", purpose: "CV screening and candidate ranking for hiring" },
    level: "HIGH",
    category: "employment",
  },
  {
    title: "credit scoring lands in essential services (Annex III, point 5)",
    facts: { name: "CreditWise", purpose: "Consumer credit scoring for loan decisions" },
    level: "HIGH",
    category: "essential_services",
  },
  {
    title: "exam proctoring lands in education (Annex III, point 3)",
    facts: { name: "ExamEye", description: "Automated proctoring and exam scoring" },
    level: "HIGH",
    category: "education",
  },
  {
    title: "border-control triage lands in migration (Annex III, point 7)",
    facts: { name: "BorderFlow", purpose: "Risk triage for visa application processing" },
    level: "HIGH",
    category: "migration",
  },
  {
    title: "fingerprint identification lands in biometrics (Annex III, point 1)",
    facts: { name: "PrintMatch", description: "Fingerprint identification service", technique: "COMPUTER_VISION" },
    level: "HIGH",
    category: "biometrics",
  },
  {
    title: "grid management lands in critical infrastructure (Annex III, point 2)",
    facts: { name: "GridPilot", purpose: "Load balancing for the electricity grid" },
    level: "HIGH",
    category: "critical_infrastructure",
  },
  {
    title: "recidivism scoring lands in law enforcement (Annex III, point 6)",
    facts: { name: "RiskScore LE", purpose: "Recidivism risk assessment for law enforcement" },
    level: "HIGH",
    category: "law_enforcement",
  },
  {
    title: "sentencing support lands in justice (Annex III, point 8)",
    facts: { name: "JusticeAid", purpose: "Research assistant supporting court decision drafting" },
    level: "HIGH",
    category: "justice",
  },

  // --- The corrected fraud carve-out (Annex III, point 5(b)) ---
  {
    title: "financial fraud detection is NOT high-risk (point 5(b) carve-out)",
    facts: { name: "FraudGuard", purpose: "Real-time fraud detection for card payments" },
    level: "MINIMAL",
    category: null,
    carveOut: true,
  },
  {
    title: "fraud detection + credit scoring still lands high (the carve-out is not a blanket)",
    facts: { name: "RiskSuite", purpose: "Credit scoring with built-in fraud detection" },
    level: "HIGH",
    category: "essential_services",
    carveOut: true,
  },

  // --- Art. 50 transparency -> LIMITED ---
  {
    title: "customer-service chatbot is transparency-only (Art. 50(1))",
    facts: { name: "HelpBot", purpose: "Customer service chatbot for order questions" },
    level: "LIMITED",
    category: null,
  },
  {
    title: "generative technique alone triggers Art. 50(2)",
    facts: { name: "DraftAssist", purpose: "Internal document summarisation", technique: "GENERATIVE_AI" },
    level: "LIMITED",
    category: null,
  },

  // --- Nothing matched -> MINIMAL ---
  {
    title: "inventory forecasting is minimal risk",
    facts: { name: "StockSense", purpose: "Warehouse inventory demand forecasting", technique: "STATISTICAL" },
    level: "MINIMAL",
    category: null,
  },
];

describe("screenAnnexIii (table-driven)", () => {
  it.each(CASES.map((c) => [c.title, c] as const))("%s", (_title, c) => {
    const screening = screenAnnexIii(c.facts);

    expect(screening.suggestedLevel).toBe(c.level);
    if (c.category !== undefined) {
      expect(screening.suggestedCategory).toBe(c.category);
    }
    if (c.prohibitedArticle) {
      expect(screening.prohibited.map((p) => p.article)).toContain(c.prohibitedArticle);
    }
    if (c.carveOut) {
      expect(screening.carveOuts.length).toBeGreaterThan(0);
      expect(screening.carveOuts[0].article).toBe("Annex III, point 5(b)");
    }
  });

  it("data categories participate in the screening text", () => {
    const screening = screenAnnexIii({
      name: "Generic classifier",
      dataCategories: ["biometric templates"],
    });
    expect(screening.suggestedLevel).toBe("HIGH");
    expect(screening.suggestedCategory).toBe("biometrics");
  });

  it("prohibited beats high-risk beats transparency", () => {
    const screening = screenAnnexIii({
      name: "Everything machine",
      purpose: "Social scoring with credit scoring and a chatbot front end",
    });
    expect(screening.suggestedLevel).toBe("UNACCEPTABLE");
    expect(screening.prohibited.length).toBeGreaterThan(0);
    expect(screening.highRisk.length).toBeGreaterThan(0);
    expect(screening.transparency.length).toBeGreaterThan(0);
  });

  it("returns empty hits and MINIMAL for empty facts", () => {
    const screening = screenAnnexIii({ name: "" });
    expect(screening).toEqual({
      prohibited: [],
      highRisk: [],
      transparency: [],
      carveOuts: [],
      suggestedLevel: "MINIMAL",
      suggestedCategory: null,
    });
  });
});
