// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { groupForClassification } from "./classification-groups";

describe("risk-level page grouping", () => {
  it("puts the systems with no risk level first, keeping the order of each group", () => {
    const systems = [
      { id: "a", riskClassification: { riskLevel: "HIGH" } },
      { id: "b", riskClassification: null },
      { id: "c" },
      { id: "d", riskClassification: { riskLevel: "MINIMAL" } },
    ];
    const { toClassify, classified } = groupForClassification(systems);
    expect(toClassify.map((s) => s.id)).toEqual(["b", "c"]);
    expect(classified.map((s) => s.id)).toEqual(["a", "d"]);
  });

  it("is empty for an empty registry", () => {
    expect(groupForClassification([])).toEqual({ toClassify: [], classified: [] });
  });
});
