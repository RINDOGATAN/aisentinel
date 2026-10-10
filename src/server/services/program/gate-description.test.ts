// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { quickstartGateDescription } from "./gate-description";

describe("quick start oversight gate description", () => {
  it("keeps the English text unchanged", () => {
    expect(quickstartGateDescription("AI Credit Scoring System", "HIGH", "en")).toBe(
      "Pre-deployment oversight gate for AI Credit Scoring System. Required due to HIGH risk classification.",
    );
  });

  it("writes Spanish with the level in Spanish", () => {
    expect(quickstartGateDescription("Sistema de calificación crediticia con IA", "HIGH", "es")).toBe(
      "Punto de control previo al despliegue de Sistema de calificación crediticia con IA. Necesario por su clasificación de riesgo alto.",
    );
    expect(quickstartGateDescription("X", "MINIMAL", "es")).toMatch(/riesgo mínimo\.$/);
    expect(quickstartGateDescription("X", "MINIMAL", "es")).not.toMatch(/MINIMAL|Required|gate/);
  });
});
