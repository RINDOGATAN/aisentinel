// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { mapRole, mapTechnique } from "./dpc-import-mapping";

describe("mapRole (DPO euAiActRole → AIS AISystemRole)", () => {
  it("maps known roles case/space-insensitively", () => {
    expect(mapRole("Provider")).toBe("PROVIDER");
    expect(mapRole(" deployer ")).toBe("DEPLOYER");
    expect(mapRole("IMPORTER")).toBe("IMPORTER");
    expect(mapRole("Distributor")).toBe("DISTRIBUTOR");
    expect(mapRole("user")).toBe("USER");
  });

  it("defaults unknown/empty to DEPLOYER (a firm mostly deploys third-party AI)", () => {
    expect(mapRole(null)).toBe("DEPLOYER");
    expect(mapRole(undefined)).toBe("DEPLOYER");
    expect(mapRole("")).toBe("DEPLOYER");
    expect(mapRole("operator")).toBe("DEPLOYER");
  });
});

describe("mapTechnique (DPO modelType/aiTechniques → AIS AITechnique)", () => {
  it("classifies an LLM as GENERATIVE_AI, not NLP (generative wins)", () => {
    expect(mapTechnique("LLM", [])).toBe("GENERATIVE_AI");
    expect(mapTechnique("Large Language Model", ["language"])).toBe("GENERATIVE_AI");
    expect(mapTechnique(null, ["Generative AI"])).toBe("GENERATIVE_AI");
  });

  it("recognises the main techniques", () => {
    expect(mapTechnique("agentic workflow", [])).toBe("AGENTIC_AI");
    expect(mapTechnique("Computer Vision", [])).toBe("COMPUTER_VISION");
    expect(mapTechnique("speech to text", [])).toBe("SPEECH_RECOGNITION");
    expect(mapTechnique(null, ["NLP"])).toBe("NLP");
    expect(mapTechnique("transformer neural net", [])).toBe("DEEP_LEARNING");
    expect(mapTechnique("rule-based engine", [])).toBe("RULE_BASED");
    expect(mapTechnique("statistical model", [])).toBe("STATISTICAL");
    expect(mapTechnique("machine learning", [])).toBe("MACHINE_LEARNING");
  });

  it("falls through to OTHER when nothing matches", () => {
    expect(mapTechnique(null, null)).toBe("OTHER");
    expect(mapTechnique("", [])).toBe("OTHER");
    expect(mapTechnique("quantum abacus", ["unknowable"])).toBe("OTHER");
  });
});
