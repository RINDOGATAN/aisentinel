// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Display names for the compliance frameworks and their requirements, in the
 * screen's language, keyed by framework code and requirement code.
 *
 * The database keeps what the seed scripts wrote (English names and titles);
 * nothing here changes stored data. The Spanish screens map by code:
 *
 *   - EU AI Act, NIST AI RMF and ISO/IEC 42001: the tables below (titles as
 *     scripts/seed-frameworks.ts and src/config/eu-timeline-requirements.ts
 *     seed them; the EU titles follow the Spanish text of Regulation (EU)
 *     2024/1689 where it has one);
 *   - AIUC-1: src/config/aiuc1-requirements-es.ts and the domain names;
 *   - California ADMT, GDPR, Colorado, Texas, Washington: the Spanish title
 *     each pack already carries (src/config/admt-requirements.ts and
 *     src/config/regimes/).
 *
 * Descriptions follow the same split (./requirement-descriptions-es.ts for
 * the EU AI Act, NIST and ISO; ./aiuc1-requirements-es.ts for AIUC-1).
 *
 * A code with no entry falls back to the stored text, so a newly seeded row
 * shows in English rather than not at all. A test checks that every seeded
 * EU, NIST, ISO and AIUC-1 code has a Spanish title and description.
 *
 * Pure module: no Prisma, no React, no Next.
 */

import { ADMT_FRAMEWORK, ADMT_REQUIREMENTS, flattenAdmtRequirements } from "./admt-requirements";
import { REGIME_PACKS } from "./regimes";
import { flattenRegimeRequirements } from "./regimes/types";
import { AIUC1_DOMAIN_PARAPHRASES_ES, AIUC1_TITLES_ES, aiuc1RequirementDescriptionEs } from "./aiuc1-requirements-es";
import { allAiuc1Requirements } from "./aiuc1-requirements";
import {
  EU_AI_ACT_DESCRIPTIONS_ES,
  ISO_42001_DESCRIPTIONS_ES,
  NIST_AI_RMF_DESCRIPTIONS_ES,
} from "./requirement-descriptions-es";

type Locale = string;

/** Full names, as the framework tabs show them. */
const FRAMEWORK_NAMES: Record<string, { en: string; es: string }> = {
  EU_AI_ACT: { en: "EU AI Act", es: "Reglamento Europeo de IA" },
  NIST_AI_RMF: { en: "NIST AI Risk Management Framework", es: "NIST AI RMF (gestión de riesgos de la IA)" },
  ISO_42001: { en: "ISO/IEC 42001", es: "ISO/IEC 42001" },
  AIUC_1: { en: "AIUC-1", es: "AIUC-1" },
  [ADMT_FRAMEWORK.code]: {
    en: "California CCPA ADMT",
    es: "CCPA de California: decisiones automatizadas, evaluaciones de riesgos y auditorías",
  },
  EU_GDPR: { en: "GDPR (AI provisions)", es: "RGPD (disposiciones sobre IA)" },
  CO_SB_26_189: { en: "Colorado SB 26-189", es: "Colorado SB 26-189 (transparencia de la ADMT)" },
  TX_TRAIGA: { en: "Texas TRAIGA (HB 149)", es: "Texas TRAIGA (HB 149)" },
  WA_AI_RULES: { en: "Washington AI rules", es: "Normas de IA de Washington" },
};

/** Short chip labels for cross-framework links. */
const FRAMEWORK_SHORT: Record<string, { en: string; es: string }> = {
  EU_AI_ACT: { en: "EU", es: "RIA" },
  NIST_AI_RMF: { en: "NIST", es: "NIST" },
  ISO_42001: { en: "ISO", es: "ISO" },
  CA_CCPA_ADMT: { en: "CA", es: "CA" },
  EU_GDPR: { en: "GDPR", es: "RGPD" },
  CO_SB_26_189: { en: "CO", es: "CO" },
  TX_TRAIGA: { en: "TX", es: "TX" },
  WA_AI_RULES: { en: "WA", es: "WA" },
  AIUC_1: { en: "AIUC-1", es: "AIUC-1" },
};

/** Compact names for small cards (the system page's per-framework scores). */
const FRAMEWORK_COMPACT: Record<string, { en: string; es: string }> = {
  EU_AI_ACT: { en: "EU AI Act", es: "Reglamento Europeo de IA" },
  NIST_AI_RMF: { en: "NIST AI RMF", es: "NIST AI RMF" },
  ISO_42001: { en: "ISO/IEC 42001", es: "ISO/IEC 42001" },
  CA_CCPA_ADMT: { en: "California ADMT", es: "ADMT de California" },
  EU_GDPR: { en: "GDPR", es: "RGPD" },
  CO_SB_26_189: { en: "Colorado SB 26-189", es: "Colorado SB 26-189" },
  TX_TRAIGA: { en: "Texas TRAIGA", es: "Texas TRAIGA" },
  WA_AI_RULES: { en: "Washington AI rules", es: "Normas de IA de Washington" },
  AIUC_1: { en: "AIUC-1", es: "AIUC-1" },
};

/**
 * Spanish names for chips and for the framework part of a citation: the
 * usual Spanish abbreviations (RIA for the Reglamento de IA, RGPD) where one
 * exists, otherwise the name a Spanish reader would use.
 */
const FRAMEWORK_CHIP_ES: Record<string, string> = {
  EU_AI_ACT: "RIA",
  EU_GDPR: "RGPD",
  NIST_AI_RMF: "NIST AI RMF",
  ISO_42001: "ISO/IEC 42001",
  CA_CCPA_ADMT: "ADMT de California",
  CO_SB_26_189: "Colorado SB 26-189",
  TX_TRAIGA: "TRAIGA de Texas",
  WA_AI_RULES: "Normas de IA de Washington",
  AIUC_1: "AIUC-1",
};

/**
 * A framework code as it reads on a chip ("RIA 3/5") or before a citation
 * code. English keeps the code as it has always read ("EU AI ACT").
 */
export function frameworkChip(code: string, locale: Locale): string {
  if (locale === "es" && FRAMEWORK_CHIP_ES[code]) return FRAMEWORK_CHIP_ES[code];
  return code.replace(/_/g, " ");
}

/** Article and annex words in a citation code, in Spanish style ("art. 22", "anexo III"). */
function spanishCitationCode(code: string): string {
  return code.replace(/\bArts\./g, "arts.").replace(/\bArt\./g, "art.").replace(/\bAnnex\b/g, "anexo");
}

/** A structured citation as one label, e.g. "EU GDPR Art. 22" or, in Spanish, "RGPD art. 22". */
export function citationLabel(frameworkCode: string, code: string, locale: Locale): string {
  if (locale !== "es") return `${frameworkCode.replace(/_/g, " ")} ${code}`;
  return `${frameworkChip(frameworkCode, "es")} ${spanishCitationCode(code)}`;
}

/** Free-text citation prefixes, longest first, with their Spanish chip names. */
const CITATION_PREFIXES_ES: readonly [RegExp, string][] = [
  [/^EU AI ACT\b/i, "RIA"],
  [/^EU GDPR\b/, "RGPD"],
  [/^CA CCPA ADMT\b/, "ADMT de California"],
  [/^TX TRAIGA\b/, "TRAIGA de Texas"],
  [/^WA AI RULES\b/i, "Normas de IA de Washington"],
];

/**
 * A free-text citation such as "EU GDPR Art. 22(3)" in the screen's language:
 * in Spanish "RGPD art. 22(3)". English is returned as written.
 */
export function citationString(text: string, locale: Locale): string {
  if (locale !== "es") return text;
  let out = text;
  for (const [pattern, name] of CITATION_PREFIXES_ES) {
    if (pattern.test(out)) {
      out = out.replace(pattern, name);
      break;
    }
  }
  return spanishCitationCode(out);
}

/** A framework's compact name for small cards; the raw code only when the code is unknown. */
export function frameworkShortName(code: string, locale: Locale): string {
  const entry = FRAMEWORK_COMPACT[code];
  if (!entry) return code;
  return locale === "es" ? entry.es : entry.en;
}

export const EU_AI_ACT_TITLES_ES: Readonly<Record<string, string>> = {
  "Art. 1": "Objeto",
  "Art. 2": "Ámbito de aplicación",
  "Art. 3": "Definiciones",
  "Art. 4": "Alfabetización en materia de IA",
  "Art. 5": "Prácticas de IA prohibidas",
  "Art. 5(1)(a)": "Manipulación subliminal",
  "Art. 5(1)(b)": "Explotación de vulnerabilidades",
  "Art. 5(1)(c)": "Puntuación social",
  "Art. 5(1)(d)": "Actuación policial predictiva (individual)",
  "Art. 5(1)(e)": "Extracción no selectiva de imágenes para reconocimiento facial",
  "Art. 5(1)(f)": "Reconocimiento de emociones en el trabajo o en la educación",
  "Art. 5(1)(g)": "Categorización biométrica (datos sensibles)",
  "Art. 5(1)(h)": "Identificación biométrica remota en tiempo real",
  "Art. 6": "Reglas de clasificación de los sistemas de IA de alto riesgo",
  "Art. 6(1)": "Alto riesgo por la seguridad de los productos",
  "Art. 6(2)": "Alto riesgo del anexo III",
  "Art. 8": "Cumplimiento de los requisitos",
  "Art. 9": "Sistema de gestión de riesgos",
  "Art. 9(2)": "Detectar y analizar los riesgos conocidos y previsibles",
  "Art. 9(3)": "Evaluar los riesgos derivados de un uso indebido",
  "Art. 9(4)": "Adoptar medidas de gestión de riesgos",
  "Art. 9(5)": "Pruebas para asegurar niveles de riesgo adecuados",
  "Art. 10": "Datos y gobernanza de datos",
  "Art. 10(2)": "Prácticas de gobernanza de datos",
  "Art. 10(3)": "Representatividad de los datos de entrenamiento",
  "Art. 10(4)": "Tener en cuenta el contexto específico",
  "Art. 10(5)": "Categorías especiales de datos para vigilar los sesgos",
  "Art. 11": "Documentación técnica",
  "Art. 11(1)": "Documentación antes de la introducción en el mercado",
  "Art. 12": "Conservación de registros",
  "Art. 12(1)": "Capacidad de registro automático",
  "Art. 12(2)": "Trazabilidad del funcionamiento",
  "Art. 13": "Transparencia y comunicación de información a los responsables del despliegue",
  "Art. 13(1)": "Transparencia suficiente para interpretar los resultados",
  "Art. 13(2)": "Instrucciones de uso",
  "Art. 14": "Supervisión humana",
  "Art. 14(1)": "Diseño para una supervisión humana efectiva",
  "Art. 14(2)": "Medidas de supervisión en las instrucciones",
  "Art. 14(3)": "Comprender las capacidades y las limitaciones",
  "Art. 14(4)": "Capacidad de anular o interrumpir el sistema",
  "Art. 15": "Precisión, solidez y ciberseguridad",
  "Art. 15(1)": "Niveles de precisión adecuados",
  "Art. 15(2)": "Parámetros de precisión en las instrucciones",
  "Art. 15(3)": "Resistencia a los errores",
  "Art. 15(4)": "Solidez y redundancia técnica",
  "Art. 15(5)": "Medidas de ciberseguridad",
  "Art. 16": "Obligaciones de los proveedores de sistemas de IA de alto riesgo",
  "Art. 17": "Sistema de gestión de la calidad",
  "Art. 26": "Obligaciones de los responsables del despliegue de sistemas de IA de alto riesgo",
  "Art. 26(1)": "Uso conforme a las instrucciones",
  "Art. 26(2)": "Encomendar la supervisión humana",
  "Art. 26(5)": "Vigilar el funcionamiento e informar de los riesgos",
  "Art. 27": "Evaluación de impacto relativa a los derechos fundamentales",
  "Art. 27(1)": "Evaluación de impacto antes de la puesta en servicio",
  "Art. 27(2)": "Contenido de la evaluación de impacto",
  "Art. 27(3)": "Notificación a la autoridad de vigilancia del mercado",
  "Art. 49": "Registro",
  "Art. 50": "Obligaciones de transparencia de determinados sistemas de IA",
  "Art. 50(1)": "Aviso de interacción con una IA",
  "Art. 50(2)": "Marcado del contenido sintético",
  "Art. 50(3)": "Aviso de reconocimiento de emociones",
  "Art. 50(4)": "Aviso de ultrasuplantaciones",
  "Art. 53": "Obligaciones de los proveedores de modelos de IA de uso general",
  "Art. 53(1)(a)": "Documentación técnica",
  "Art. 53(1)(b)": "Información para los proveedores posteriores",
  "Art. 53(1)(c)": "Política de cumplimiento de los derechos de autor",
  "Art. 53(1)(d)": "Resumen de los datos de entrenamiento",
  "Art. 72": "Vigilancia poscomercialización por los proveedores",
  "Art. 73": "Notificación de incidentes graves",
  "Art. 73(1)": "Notificar los incidentes graves",
  "Art. 73(2)-(4)": "Plazos de notificación",
  "Art. 86": "Derecho a explicación de decisiones individuales",
  "Art. 99": "Sanciones",
  "Art. 99(3)": "Sanciones por prácticas prohibidas",
  "Art. 99(4)": "Sanciones por incumplimientos en sistemas de alto riesgo",
  "Art. 99(5)": "Sanciones por información incorrecta",
  "Art. 113": "Entrada en vigor y aplicación",
  "Art. 113(a) — 2 Feb 2025": "Se aplican las prohibiciones y la alfabetización en IA",
  "Art. 113(b) — 2 Aug 2025": "Se aplican las normas sobre IA de uso general, la gobernanza y las sanciones",
  "Art. 113 — 2 Aug 2026": "Se aplica la transparencia del art. 50 y empieza la supervisión de la IA de uso general",
  "Art. 5 — 2 Dec 2026": "Nuevas prohibiciones: material de abuso sexual infantil generado por IA e imágenes íntimas no consentidas",
  "Art. 113 — 2 Dec 2027": "Se aplican las obligaciones de alto riesgo del anexo III",
  "Art. 113(c) — 2 Aug 2028": "IA de alto riesgo integrada en productos del anexo I",
};

/** The timeline rows' codes carry an English date and a long dash; Spanish shows its own. */
export const EU_AI_ACT_CODES_ES: Readonly<Record<string, string>> = {
  "Art. 113(a) — 2 Feb 2025": "Art. 113(a), 2 feb 2025",
  "Art. 113(b) — 2 Aug 2025": "Art. 113(b), 2 ago 2025",
  "Art. 113 — 2 Aug 2026": "Art. 113, 2 ago 2026",
  "Art. 5 — 2 Dec 2026": "Art. 5, 2 dic 2026",
  "Art. 113 — 2 Dec 2027": "Art. 113, 2 dic 2027",
  "Art. 113(c) — 2 Aug 2028": "Art. 113(c), 2 ago 2028",
};

export const NIST_AI_RMF_TITLES_ES: Readonly<Record<string, string>> = {
  GOVERN: "Gobernar",
  "GOVERN 1": "Políticas de gestión de riesgos de la IA",
  "GOVERN 2": "Estructuras de rendición de cuentas",
  "GOVERN 3": "Diversidad de la plantilla y conocimientos de IA",
  "GOVERN 4": "Tolerancia al riesgo de la organización",
  "GOVERN 5": "Procesos de participación de las partes interesadas",
  "GOVERN 6": "Políticas para terceros",
  MAP: "Mapear",
  "MAP 1": "Contexto de uso previsto",
  "MAP 2": "Categorizar el sistema de IA",
  "MAP 3": "Beneficios y costes",
  "MAP 4": "Riesgos e impactos",
  "MAP 5": "Probabilidad e impacto",
  MEASURE: "Medir",
  "MEASURE 1": "Métodos y métricas adecuados",
  "MEASURE 2": "Evaluación de los sistemas de IA",
  "MEASURE 3": "Mecanismos de seguimiento",
  "MEASURE 4": "Comentarios para mejorar el modelo",
  MANAGE: "Gestionar",
  "MANAGE 1": "Priorización de los riesgos de la IA",
  "MANAGE 2": "Estrategias para maximizar los beneficios",
  "MANAGE 3": "Riesgos y beneficios de la IA de terceros",
  "MANAGE 4": "Tratamiento de riesgos documentado",
};

export const ISO_42001_TITLES_ES: Readonly<Record<string, string>> = {
  "4": "Contexto de la organización",
  "4.1": "Comprensión de la organización y de su contexto",
  "4.2": "Comprensión de las necesidades y expectativas de las partes interesadas",
  "4.3": "Determinación del alcance del sistema de gestión de la IA",
  "4.4": "Sistema de gestión de la IA",
  "5": "Liderazgo",
  "5.1": "Liderazgo y compromiso",
  "5.2": "Política de IA",
  "5.3": "Roles, responsabilidades y autoridades en la organización",
  "6": "Planificación",
  "6.1": "Acciones para abordar riesgos y oportunidades",
  "6.1.2": "Evaluación de riesgos de la IA",
  "6.1.3": "Tratamiento de riesgos de la IA",
  "6.1.4": "Evaluación de impacto del sistema de IA",
  "6.2": "Objetivos de la IA y planificación para lograrlos",
  "7": "Apoyo",
  "7.1": "Recursos",
  "7.2": "Competencia",
  "7.3": "Toma de conciencia",
  "7.4": "Comunicación",
  "7.5": "Información documentada",
  "8": "Operación",
  "8.1": "Planificación y control operacional",
  "8.2": "Evaluación de riesgos de la IA",
  "8.3": "Tratamiento de riesgos de la IA",
  "8.4": "Evaluación de impacto del sistema de IA",
  "9": "Evaluación del desempeño",
  "9.1": "Seguimiento, medición, análisis y evaluación",
  "9.2": "Auditoría interna",
  "9.3": "Revisión por la dirección",
  "10": "Mejora",
  "10.1": "Mejora continua",
  "10.2": "No conformidad y acción correctiva",
};

/** The AIUC-1 domain rows (codes A to F), as the agent-testing screen names them. */
const AIUC1_DOMAIN_TITLES_ES: Readonly<Record<string, string>> = {
  A: "Datos y privacidad",
  B: "Ciberseguridad",
  C: "Prevención de daños",
  D: "Fiabilidad",
  E: "Rendición de cuentas",
  F: "Sociedad",
};

function packTitles(rows: readonly { code: string; title: { es: string } }[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.code, r.title.es]));
}

/** Spanish titles by framework code, then requirement code. */
export const REQUIREMENT_TITLES_ES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  EU_AI_ACT: EU_AI_ACT_TITLES_ES,
  NIST_AI_RMF: NIST_AI_RMF_TITLES_ES,
  ISO_42001: ISO_42001_TITLES_ES,
  AIUC_1: { ...AIUC1_DOMAIN_TITLES_ES, ...AIUC1_TITLES_ES },
  [ADMT_FRAMEWORK.code]: packTitles(flattenAdmtRequirements(ADMT_REQUIREMENTS)),
  ...Object.fromEntries(
    REGIME_PACKS.map((pack) => [pack.framework.code, packTitles(flattenRegimeRequirements(pack.requirements))])
  ),
};

/**
 * Spanish descriptions by framework code, then requirement code: the EU AI
 * Act, NIST and ISO tables (./requirement-descriptions-es.ts), AIUC-1 built
 * the way the seed builds the English (paraphrase, application, tags,
 * source), and the text the ADMT and regime packs already carry.
 */
export const REQUIREMENT_DESCRIPTIONS_ES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  EU_AI_ACT: EU_AI_ACT_DESCRIPTIONS_ES,
  NIST_AI_RMF: NIST_AI_RMF_DESCRIPTIONS_ES,
  ISO_42001: ISO_42001_DESCRIPTIONS_ES,
  AIUC_1: {
    ...AIUC1_DOMAIN_PARAPHRASES_ES,
    ...Object.fromEntries(allAiuc1Requirements().map((r) => [r.code, aiuc1RequirementDescriptionEs(r)])),
  },
  [ADMT_FRAMEWORK.code]: Object.fromEntries(
    flattenAdmtRequirements(ADMT_REQUIREMENTS).map((r) => [r.code, r.description.es])
  ),
  ...Object.fromEntries(
    REGIME_PACKS.map((pack) => [
      pack.framework.code,
      Object.fromEntries(flattenRegimeRequirements(pack.requirements).map((r) => [r.code, r.description.es])),
    ])
  ),
};

/** A requirement's description in the screen's language, where a translation exists. */
export function requirementDescription(
  frameworkCode: string,
  code: string,
  storedDescription: string | null | undefined,
  locale: Locale
): string | null | undefined {
  if (locale !== "es") return storedDescription;
  return REQUIREMENT_DESCRIPTIONS_ES[frameworkCode]?.[code] ?? storedDescription;
}

/** A framework's full name in the screen's language; the stored name when the code is unknown. */
export function frameworkName(code: string, storedName: string | null | undefined, locale: Locale): string {
  const entry = FRAMEWORK_NAMES[code];
  if (!entry) return storedName ?? code;
  return locale === "es" ? entry.es : (storedName ?? entry.en);
}

/** A short label for chips, for any framework code. Never the raw code when the code is known. */
export function frameworkShort(code: string, locale: Locale): string {
  const entry = FRAMEWORK_SHORT[code];
  if (!entry) return code;
  return locale === "es" ? entry.es : entry.en;
}

/** A requirement's title in the screen's language; the stored title when there is no translation. */
export function requirementTitle(frameworkCode: string, code: string, storedTitle: string, locale: Locale): string {
  if (locale !== "es") return storedTitle;
  return REQUIREMENT_TITLES_ES[frameworkCode]?.[code] ?? storedTitle;
}

/** A requirement's code as shown; only the EU timeline rows differ in Spanish. */
export function requirementCode(frameworkCode: string, code: string, locale: Locale): string {
  if (locale === "es" && frameworkCode === "EU_AI_ACT") return EU_AI_ACT_CODES_ES[code] ?? code;
  return code;
}
