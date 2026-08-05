// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Prompt-builder unit tests — pure functions, no network, no DB.
 * The builders must ground prompts in the provided registry facts, carry the
 * locale instruction, and (for the rationale) cite ONLY deterministic rule
 * hits.
 */

import { describe, it, expect } from "vitest";
import {
  buildAssessmentDraftSystemPrompt,
  buildAssessmentDraftUserPrompt,
  type AssessmentSystemContext,
} from "./assessment-draft";
import {
  buildRiskRationaleSystemPrompt,
  buildRiskRationaleUserPrompt,
} from "./risk-rationale";
import {
  buildAnnexIvSystemPrompt,
  buildAnnexIvUserPrompt,
  ANNEX_IV_SECTIONS,
} from "./annex-iv";
import { screenAnnexIii } from "@/config/annex-iii-rules";
import {
  buildTransparencyStatementSystemPrompt,
  buildTransparencyStatementUserPrompt,
  TRANSPARENCY_STATEMENT_SECTIONS,
} from "./transparency-statement";
import { suggestArt50Obligations } from "@/config/transparency-rules";

const context: AssessmentSystemContext = {
  organizationName: "Acme AI Corp",
  system: {
    name: "TalentRank",
    description: "Ranks job applicants",
    purpose: "CV screening and candidate ranking for hiring",
    technique: "MACHINE_LEARNING",
    role: "DEPLOYER",
    status: "DEPLOYED",
    processesPersonalData: true,
  },
  models: [
    {
      name: "rank-v2",
      provider: "In-house",
      modelType: "gradient boosting",
      version: "2.1",
      trainingDataSummary: "Historic hiring outcomes 2019-2024",
      knownLimitations: "Underrepresents career switchers",
    },
  ],
  dataSources: [
    {
      name: "ATS export",
      sourceType: "TRAINING",
      containsPersonalData: true,
      dataCategories: ["employment history", "education"],
    },
  ],
  riskLevel: "HIGH",
  annexIIICategory: "employment",
};

describe("assessment-draft prompts", () => {
  it("system prompt frames the assessment type and locale", () => {
    const en = buildAssessmentDraftSystemPrompt("FRIA", "en");
    expect(en).toContain("Fundamental Rights Impact Assessment");
    expect(en).toContain("Write the draft in English.");

    const es = buildAssessmentDraftSystemPrompt("CONFORMITY", "es");
    expect(es).toContain("Annex VI/VII");
    expect(es).toContain("castellano peninsular");
  });

  it("unknown types fall back to the custom framing", () => {
    expect(buildAssessmentDraftSystemPrompt("SOMETHING_ELSE")).toContain(
      "organization-defined"
    );
  });

  it("user prompt carries the registry facts, question, and current answer", () => {
    const prompt = buildAssessmentDraftUserPrompt({
      context,
      assessment: { title: "FRIA — TalentRank", type: "FRIA" },
      sectionTitle: "AI System Description",
      question: { text: "Describe the AI system.", helpText: "Include versions." },
      currentResponse: "TalentRank ranks applicants.",
    });

    expect(prompt).toContain("TalentRank");
    expect(prompt).toContain("Historic hiring outcomes 2019-2024");
    expect(prompt).toContain("employment history");
    expect(prompt).toContain("Describe the AI system.");
    expect(prompt).toContain("Include versions.");
    expect(prompt).toContain("TalentRank ranks applicants.");
    expect(prompt).toContain("Annex III category: employment");
  });

  it("omits the current-answer block when there is none", () => {
    const prompt = buildAssessmentDraftUserPrompt({
      context,
      assessment: { title: "FRIA", type: "FRIA" },
      sectionTitle: "S1",
      question: { text: "Q1" },
      currentResponse: "   ",
    });
    expect(prompt).not.toContain("current draft answer");
  });
});

describe("risk-rationale prompts", () => {
  it("grounds the prompt in the deterministic screening hits", () => {
    const screening = screenAnnexIii({
      name: "TalentRank",
      purpose: "CV screening and candidate ranking for hiring",
    });
    const prompt = buildRiskRationaleUserPrompt({
      context,
      screening,
      chosenLevel: "HIGH",
      chosenCategory: "employment",
    });

    expect(screening.suggestedLevel).toBe("HIGH");
    expect(prompt).toContain("Annex III, point 4");
    expect(prompt).toContain("Rule-suggested level: HIGH");
    expect(prompt).toContain("Level chosen by the classifier: HIGH (Annex III category: employment)");
  });

  it("says so when no rules matched", () => {
    const screening = screenAnnexIii({ name: "StockSense", purpose: "inventory forecasting" });
    const prompt = buildRiskRationaleUserPrompt({
      context,
      screening,
      chosenLevel: "MINIMAL",
    });
    expect(prompt).toContain("No prohibited, high-risk, or transparency rules matched.");
  });

  it("system prompt forbids citing beyond the hits and carries the locale", () => {
    const en = buildRiskRationaleSystemPrompt("en");
    expect(en).toContain("Do not cite articles that are not in the hits");
    expect(buildRiskRationaleSystemPrompt("es")).toContain("castellano peninsular");
  });
});

describe("annex-iv prompts", () => {
  it("system prompt enumerates every Annex IV heading in order", () => {
    const prompt = buildAnnexIvSystemPrompt("en");
    let lastIndex = -1;
    for (const section of ANNEX_IV_SECTIONS) {
      const index = prompt.indexOf(`## ${section}`);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    expect(prompt).toContain("never invent facts");
  });

  it("user prompt carries the registry facts", () => {
    const prompt = buildAnnexIvUserPrompt({ context });
    expect(prompt).toContain("Acme AI Corp");
    expect(prompt).toContain("rank-v2");
    expect(prompt).toContain("Underrepresents career switchers");
    expect(prompt).toContain("Risk classification: HIGH (Annex III category: employment)");
  });
});

describe("transparency-statement prompts", () => {
  const suggestions = suggestArt50Obligations({
    name: "Concierge chatbot",
    technique: "GENERATIVE_AI",
  });

  it("system prompt enumerates every statement heading in order and carries the doctrine", () => {
    const prompt = buildTransparencyStatementSystemPrompt("en");
    let lastIndex = -1;
    for (const section of TRANSPARENCY_STATEMENT_SECTIONS) {
      const index = prompt.indexOf(`## ${section}`);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    expect(prompt).toContain("never invent facts");
    expect(prompt).toContain("Write the document in English.");
    expect(buildTransparencyStatementSystemPrompt("es")).toContain("castellano peninsular");
  });

  it("user prompt serializes screening, profile, methods and deadline", () => {
    const prompt = buildTransparencyStatementUserPrompt({
      context,
      profile: {
        art50InteractionStatus: "IMPLEMENTED",
        art50MarkingStatus: "REQUIRED",
        art50EmotionStatus: "NOT_APPLICABLE",
        art50DeepfakeStatus: "NOT_APPLICABLE",
        markingMethods: ["c2pa_manifest", "invisible_watermark"],
        placedOnMarketBefore2Aug2026: true,
        notes: "Marking rollout scheduled for November.",
      },
      suggestions,
      markingDeadline: { deadline: "2026-12-02", graceApplies: true, overdue: false },
    });
    expect(prompt).toContain("Art. 50(1)");
    expect(prompt).toContain('trigger: "chatbot"');
    expect(prompt).toContain("C2PA manifest, invisible watermark (SynthID-style)");
    expect(prompt).toContain("Placed on the market before 2 August 2026: yes");
    expect(prompt).toContain("2026-12-02");
    expect(prompt).toContain("Reg. (EU) 2026/1744");
    expect(prompt).toContain("Marking rollout scheduled for November.");
  });

  it("user prompt carries the prohibition warning and the no-profile state", () => {
    const workplace = suggestArt50Obligations({
      name: "MoodWatch",
      purpose: "Emotion recognition in the workplace for productivity",
    });
    const prompt = buildTransparencyStatementUserPrompt({
      context,
      profile: null,
      suggestions: workplace,
      markingDeadline: null,
    });
    expect(prompt).toContain("PROHIBITION WARNING");
    expect(prompt).toContain("No transparency profile has been recorded yet");
  });
});
