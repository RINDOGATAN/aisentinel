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

/**
 * The medical-device route as the healthcare template first wrote it, with a long
 * dash. Rows created before the template changed still carry it; it is shown in
 * the current wording in both languages.
 */
const LEGACY_MDR_ROUTE = "Art. 6(1) / Annex I (MDR) route \u2014 not Annex III";

/** English text for stored values whose wording has since changed. */
export const ANNEX_III_FREE_TEXT_EN: Readonly<Record<string, string>> = {
  [LEGACY_MDR_ROUTE]: "Art. 6(1) / Annex I (MDR) route, not Annex III",
};

/**
 * The form keys' names, as riskClassification.annexIII.<key> says them in
 * src/i18n/messages (a test keeps the two equal). Here for the server-side
 * documents, which do not load the message files.
 */
export const ANNEX_III_FORM_LABELS: Readonly<Record<"en" | "es", Record<(typeof ANNEX_III_FORM_KEYS)[number], string>>> = {
  en: {
    biometrics: "Biometrics",
    critical_infrastructure: "Critical infrastructure",
    education: "Education & vocational training",
    employment: "Employment & workers management",
    essential_services: "Essential private/public services",
    law_enforcement: "Law enforcement",
    migration: "Migration, asylum & border control",
    justice: "Administration of justice",
  },
  es: {
    biometrics: "Biometría",
    critical_infrastructure: "Infraestructuras críticas",
    education: "Educación y formación profesional",
    employment: "Empleo y gestión de los trabajadores",
    essential_services: "Servicios esenciales, públicos y privados",
    law_enforcement: "Garantía del cumplimiento del Derecho",
    migration: "Migración, asilo y control fronterizo",
    justice: "Administración de justicia y procesos democráticos",
  },
};

export const ANNEX_III_FREE_TEXT_ES: Readonly<Record<string, string>> = {
  "1. Biometrics": "1. Biometría",
  "4. Employment, workers management and access to self-employment": "4. Empleo, gestión de los trabajadores y acceso al autoempleo",
  "5(b). Creditworthiness assessment / credit scoring": "5(b). Evaluación de la solvencia y calificación crediticia",
  "5(d). Emergency healthcare patient triage": "5(d). Triaje de pacientes en la asistencia sanitaria de urgencia",
  "Art. 6(1) / Annex I (MDR) route, not Annex III": "Vía del art. 6(1) y del anexo I (productos sanitarios): no es el anexo III",
  [LEGACY_MDR_ROUTE]: "Vía del art. 6(1) y del anexo I (productos sanitarios): no es el anexo III",
  "5a_public_assistance": "5(a). Prestaciones y servicios de asistencia pública",
  "5d_emergency_triage": "5(d). Triaje de pacientes en la asistencia sanitaria de urgencia",
  employment_contracting: "4. Empleo, gestión de los trabajadores y acceso al autoempleo",
};

/** `formLabel` names a form key in the screen's language (riskClassification.annexIII.<key>). */
export function annexIIILabel(value: string, locale: string, formLabel: (key: string) => string): string {
  const i = (ANNEX_III_FORM_KEYS as readonly string[]).indexOf(value);
  if (i >= 0) return `${i + 1}. ${formLabel(value)}`;
  if (locale === "es") return ANNEX_III_FREE_TEXT_ES[value] ?? value;
  return ANNEX_III_FREE_TEXT_EN[value] ?? value;
}

/** The same label for a server-side document, with the form keys' names from ANNEX_III_FORM_LABELS. */
export function annexIIIText(value: string, locale: string): string {
  const names = locale === "es" ? ANNEX_III_FORM_LABELS.es : ANNEX_III_FORM_LABELS.en;
  return annexIIILabel(value, locale, (k) => names[k as keyof typeof names] ?? k);
}
