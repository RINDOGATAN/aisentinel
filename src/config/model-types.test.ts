// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { MODEL_TYPE_KEYS, MODEL_TYPE_LABELS, modelTypeChoice, modelTypeLabel } from "./model-types";

describe("model types", () => {
  it("offers six choices, each labelled in both languages", () => {
    expect(MODEL_TYPE_KEYS).toHaveLength(6);
    for (const key of MODEL_TYPE_KEYS) {
      expect(MODEL_TYPE_LABELS[key].en).toBeTruthy();
      expect(MODEL_TYPE_LABELS[key].es).toBeTruthy();
    }
  });

  it("shows a chosen type as its label, and a typed one as written", () => {
    expect(modelTypeLabel("LANGUAGE_MODEL")).toBe("Language model");
    expect(modelTypeLabel("LANGUAGE_MODEL", "es")).toBe("Modelo de lenguaje");
    expect(modelTypeLabel("Classification / Ranking")).toBe("Classification / Ranking");
    expect(modelTypeLabel(null)).toBe("");
  });

  it("maps an older, typed value to Other in the drop-down", () => {
    expect(modelTypeChoice("VISION")).toBe("VISION");
    expect(modelTypeChoice("Multi-modal Classification")).toBe("OTHER");
    expect(modelTypeChoice("")).toBe("");
  });
});
