// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** A new unified assessment is titled in the content language, with a colon and no long dash. */

import { describe, it, expect } from "vitest";
import { unifiedAssessmentTitle } from "./starter-artifacts";

describe("unifiedAssessmentTitle", () => {
  it("reads in Spanish and in English, with a colon", () => {
    expect(unifiedAssessmentTitle("CV-Screen", "es")).toBe("Evaluación unificada de impacto de la IA: CV-Screen");
    expect(unifiedAssessmentTitle("CV-Screen", "en")).toBe("Unified AI impact assessment: CV-Screen");
    for (const locale of ["es", "en"] as const) expect(unifiedAssessmentTitle("X", locale)).not.toMatch(/[–—]/);
  });
});
