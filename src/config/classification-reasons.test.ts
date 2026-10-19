// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { CLASSIFICATION_REASONS, addReason, reasonsFor } from "./classification-reasons";

describe("standard classification reasons", () => {
  it("has at least one reason for each of the four levels", () => {
    for (const level of ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"]) {
      expect(reasonsFor(level).length, level).toBeGreaterThan(0);
    }
  });

  it("cites an article of the Act in every reason, in both languages", () => {
    for (const r of CLASSIFICATION_REASONS) {
      expect(r.en, r.id).toMatch(/Art\. \d/);
      expect(r.es, r.id).toMatch(/art\. \d/);
    }
  });

  it("uses no long dash", () => {
    for (const r of CLASSIFICATION_REASONS) {
      expect(`${r.en}${r.es}`).not.toMatch(/[—–]|--/);
    }
  });

  it("adds a reason once, on its own line, keeping what was written", () => {
    expect(addReason("", "A.")).toBe("A.");
    expect(addReason("Own words.", "A.")).toBe("Own words.\nA.");
    expect(addReason("Own words.\nA.", "A.")).toBe("Own words.\nA.");
  });
});
