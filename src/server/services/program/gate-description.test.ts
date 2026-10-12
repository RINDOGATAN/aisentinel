// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { quickstartGateDescription } from "./gate-description";

describe("quick start oversight gate description", () => {
  it("says required for a high-risk system, with the level in words", () => {
    expect(quickstartGateDescription("AI Credit Scoring System", "HIGH", "en")).toBe(
      "Pre-deployment oversight gate for AI Credit Scoring System. Required because its risk level is high.",
    );
  });

  it("does not claim the law requires a gate on a minimal-risk system", () => {
    const en = quickstartGateDescription("Fraud Detection", "MINIMAL", "en");
    expect(en).not.toMatch(/Required|MINIMAL/);
    expect(en).toMatch(/risk level is minimal\.$/);
  });

  it("writes Spanish with the level in Spanish", () => {
    expect(quickstartGateDescription("Sistema de calificación crediticia con IA", "HIGH", "es")).toBe(
      "Punto de control previo al despliegue de Sistema de calificación crediticia con IA. Necesario por su clasificación de riesgo alto.",
    );
    const es = quickstartGateDescription("X", "MINIMAL", "es");
    expect(es).toMatch(/riesgo es mínimo\.$/);
    expect(es).not.toMatch(/MINIMAL|Necesario|gate/);
  });
});
