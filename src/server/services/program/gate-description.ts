// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The description the quick start writes on the oversight gate it creates for a
 * system (vendor import and industry template paths), in the content language.
 * The law-firm path writes its own text (quickstart.ts).
 */

const LEVEL_ES: Record<string, string> = {
  UNACCEPTABLE: "inaceptable",
  HIGH: "alto",
  LIMITED: "limitado",
  MINIMAL: "mínimo",
};

const LEVEL_EN: Record<string, string> = {
  UNACCEPTABLE: "unacceptable",
  HIGH: "high",
  LIMITED: "limited",
  MINIMAL: "minimal",
};

/** Levels at which the law expects human oversight before deployment (EU AI Act Art. 14). */
const OVERSIGHT_EXPECTED = new Set(["HIGH", "UNACCEPTABLE"]);

/**
 * "Required" only where the risk level makes oversight a legal expectation; a
 * template may also add a gate to a limited or minimal-risk system, and then
 * the text says so without claiming the law requires it.
 */
export function quickstartGateDescription(systemName: string, riskLevel: string, locale: "en" | "es"): string {
  const expected = OVERSIGHT_EXPECTED.has(riskLevel);
  if (locale === "es") {
    const level = LEVEL_ES[riskLevel] ?? riskLevel.toLowerCase();
    return expected
      ? `Punto de control previo al despliegue de ${systemName}. Necesario por su clasificación de riesgo ${level}.`
      : `Punto de control previo al despliegue de ${systemName}, añadido por la plantilla. Su nivel de riesgo es ${level}.`;
  }
  const level = LEVEL_EN[riskLevel] ?? riskLevel.toLowerCase();
  return expected
    ? `Pre-deployment oversight gate for ${systemName}. Required because its risk level is ${level}.`
    : `Pre-deployment oversight gate for ${systemName}, added by the template. Its risk level is ${level}.`;
}
