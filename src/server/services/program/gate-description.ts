// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The description the quick start writes on the oversight gate it creates for a
 * system (vendor import and industry template paths), in the content language.
 * The English text is the one the quick start always wrote. The law-firm path
 * writes its own text (quickstart.ts).
 */

const LEVEL_ES: Record<string, string> = {
  UNACCEPTABLE: "inaceptable",
  HIGH: "alto",
  LIMITED: "limitado",
  MINIMAL: "mínimo",
};

export function quickstartGateDescription(systemName: string, riskLevel: string, locale: "en" | "es"): string {
  if (locale === "es") {
    const level = LEVEL_ES[riskLevel] ?? riskLevel.toLowerCase();
    return `Punto de control previo al despliegue de ${systemName}. Necesario por su clasificación de riesgo ${level}.`;
  }
  return `Pre-deployment oversight gate for ${systemName}. Required due to ${riskLevel} risk classification.`;
}
