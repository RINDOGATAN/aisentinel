// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The Annex III category of a risk classification, as shown.
 *
 * Two kinds of value reach a classification: the category keys the risk
 * classification form offers (`riskClassification.annexIII.<key>`), and the
 * free-text categories the industry templates and the vendor mappings write
 * (src/config/ai-governance-templates.ts, vendor-ai-mappings.ts), which the
 * Spanish template localizer leaves untouched by design. On a Spanish screen those
 * free-text values printed in English ("5(b). Creditworthiness assessment"), so
 * the known ones have their Spanish text here. Anything else is shown as stored.
 */

export const ANNEX_III_FORM_KEYS = [
  "biometrics",
  "critical_infrastructure",
  "education",
  "employment",
  "essential_services",
  "law_enforcement",
  "migration",
  "justice",
] as const;

export const ANNEX_III_FREE_TEXT_ES: Readonly<Record<string, string>> = {
  "1. Biometrics": "1. Biometría",
  "4. Employment, workers management and access to self-employment": "4. Empleo, gestión de los trabajadores y acceso al autoempleo",
  "5(b). Creditworthiness assessment / credit scoring": "5(b). Evaluación de la solvencia y calificación crediticia",
  "5(d). Emergency healthcare patient triage": "5(d). Triaje de pacientes en la asistencia sanitaria de urgencia",
  "Art. 6(1) / Annex I (MDR) route — not Annex III": "Vía del art. 6(1) y del anexo I (productos sanitarios): no es el anexo III",
  "5a_public_assistance": "5(a). Prestaciones y servicios de asistencia pública",
  "5d_emergency_triage": "5(d). Triaje de pacientes en la asistencia sanitaria de urgencia",
  employment_contracting: "4. Empleo, gestión de los trabajadores y acceso al autoempleo",
};

/** `formLabel` names a form key in the screen's language (riskClassification.annexIII.<key>). */
export function annexIIILabel(value: string, locale: string, formLabel: (key: string) => string): string {
  const i = (ANNEX_III_FORM_KEYS as readonly string[]).indexOf(value);
  if (i >= 0) return `${i + 1}. ${formLabel(value)}`;
  if (locale === "es") return ANNEX_III_FREE_TEXT_ES[value] ?? value;
  return value;
}
