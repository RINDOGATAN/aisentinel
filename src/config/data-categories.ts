// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The sensitive-category vocabulary, and the words used for disclosures.
 *
 * Free-text data categories are what most registers hold, and they are useless
 * for scoping: nothing can tell "email address" from "inferred condition". This
 * module gives the small controlled list that the obligations actually turn on,
 * drawn from where the duties differ: the GDPR's special categories, the
 * California sensitive personal information list, Washington's consumer health
 * data, biometric statutes, and children's data.
 *
 * It is deliberately short. A vocabulary nobody can hold in their head gets
 * filled in badly, and a badly filled register is worse than a sparse one.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

export type Localized = { en: string; es: string };

export const SENSITIVE_CATEGORY_IDS = [
  "health",
  "biometric",
  "genetic",
  "precise_location",
  "financial",
  "government_id",
  "racial_ethnic",
  "religious_philosophical",
  "political_union",
  "sex_life_orientation",
  "immigration_status",
  "communications_content",
  "children",
  "criminal",
] as const;

export type SensitiveCategoryId = (typeof SENSITIVE_CATEGORY_IDS)[number];

export interface SensitiveCategory {
  id: SensitiveCategoryId;
  label: Localized;
  /** Where the heightened duty comes from, in short form. */
  basis: Localized;
}

export const SENSITIVE_CATEGORIES: SensitiveCategory[] = [
  {
    id: "health",
    label: { en: "Health", es: "Salud" },
    basis: {
      en: "GDPR Art. 9; CCPA sensitive personal information; Washington consumer health data, which reaches health inferred from non-health data",
      es: "RGPD art. 9; información personal sensible de la CCPA; datos de salud del consumidor de Washington, que alcanzan a la salud inferida a partir de datos no sanitarios",
    },
  },
  {
    id: "biometric",
    label: { en: "Biometric", es: "Biométrico" },
    basis: {
      en: "GDPR Art. 9 where used to identify; Illinois and Texas biometric statutes; EU AI Act Annex III",
      es: "RGPD art. 9 cuando se usa para identificar; leyes biométricas de Illinois y Texas; anexo III del Reglamento de IA",
    },
  },
  {
    id: "genetic",
    label: { en: "Genetic", es: "Genético" },
    basis: { en: "GDPR Art. 9; state genetic privacy statutes", es: "RGPD art. 9; leyes estatales de privacidad genética" },
  },
  {
    id: "precise_location",
    label: { en: "Precise location", es: "Ubicación precisa" },
    basis: {
      en: "CCPA sensitive personal information; treated as health data where it shows a visit to care",
      es: "Información personal sensible de la CCPA; se trata como dato de salud cuando revela una visita asistencial",
    },
  },
  {
    id: "financial",
    label: { en: "Financial account", es: "Cuenta financiera" },
    basis: { en: "CCPA sensitive personal information; state breach statutes", es: "Información personal sensible de la CCPA; leyes estatales de notificación de brechas" },
  },
  {
    id: "government_id",
    label: { en: "Government identifier", es: "Identificador oficial" },
    basis: { en: "CCPA sensitive personal information; state breach statutes", es: "Información personal sensible de la CCPA; leyes estatales de notificación de brechas" },
  },
  {
    id: "racial_ethnic",
    label: { en: "Racial or ethnic origin", es: "Origen racial o étnico" },
    basis: { en: "GDPR Art. 9; CCPA; state anti-discrimination duties", es: "RGPD art. 9; CCPA; deberes estatales contra la discriminación" },
  },
  {
    id: "religious_philosophical",
    label: { en: "Religious or philosophical beliefs", es: "Convicciones religiosas o filosóficas" },
    basis: { en: "GDPR Art. 9; CCPA", es: "RGPD art. 9; CCPA" },
  },
  {
    id: "political_union",
    label: { en: "Political opinions or union membership", es: "Opiniones políticas o afiliación sindical" },
    basis: { en: "GDPR Art. 9", es: "RGPD art. 9" },
  },
  {
    id: "sex_life_orientation",
    label: { en: "Sex life or sexual orientation", es: "Vida sexual u orientación sexual" },
    basis: { en: "GDPR Art. 9; CCPA", es: "RGPD art. 9; CCPA" },
  },
  {
    id: "immigration_status",
    label: { en: "Immigration or citizenship status", es: "Situación migratoria o nacionalidad" },
    basis: { en: "CCPA sensitive personal information", es: "Información personal sensible de la CCPA" },
  },
  {
    id: "communications_content",
    label: { en: "Contents of communications", es: "Contenido de las comunicaciones" },
    basis: { en: "CCPA sensitive personal information; wiretap statutes", es: "Información personal sensible de la CCPA; leyes de interceptación" },
  },
  {
    id: "children",
    label: { en: "Children's data", es: "Datos de menores" },
    basis: { en: "COPPA; state age-appropriate duties; GDPR Art. 8", es: "COPPA; deberes estatales de adecuación a la edad; RGPD art. 8" },
  },
  {
    id: "criminal",
    label: { en: "Criminal offences", es: "Infracciones penales" },
    basis: { en: "GDPR Art. 10", es: "RGPD art. 10" },
  },
];

export function sensitiveCategoryLabel(id: string, locale: "en" | "es"): string {
  return SENSITIVE_CATEGORIES.find((c) => c.id === id)?.label[locale] ?? id;
}

/** Recipient types, mirroring the Prisma enum. */
export const RECIPIENT_TYPES = [
  "PROCESSOR",
  "SERVICE_PROVIDER",
  "CONTROLLER",
  "JOINT_CONTROLLER",
  "THIRD_PARTY",
  "ADVERTISING_PLATFORM",
  "DATA_BROKER",
  "AFFILIATE",
  "PUBLIC_AUTHORITY",
  "OTHER",
] as const;
export type RecipientTypeId = (typeof RECIPIENT_TYPES)[number];

/** Data-protection roles, mirroring the Prisma enum. */
export const DATA_ROLES = [
  "UNDETERMINED",
  "CONTROLLER",
  "JOINT_CONTROLLER",
  "PROCESSOR",
  "SUB_PROCESSOR",
  "THIRD_PARTY",
] as const;
export type DataRoleId = (typeof DATA_ROLES)[number];

/**
 * Recipient types that mean the data left the organisation's control for the
 * recipient's own purposes. Under most US state laws a disclosure to one of
 * these is a "sale" or a "share" unless an exemption applies, which is the
 * distinction that decides whether an opt-out or an opt-in is needed.
 */
export const RECIPIENTS_BEYOND_OUR_CONTROL: RecipientTypeId[] = [
  "CONTROLLER",
  "THIRD_PARTY",
  "ADVERTISING_PLATFORM",
  "DATA_BROKER",
];

export function isBeyondOurControl(type: string): boolean {
  return (RECIPIENTS_BEYOND_OUR_CONTROL as readonly string[]).includes(type);
}
