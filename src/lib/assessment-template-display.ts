// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The name and description of a system assessment template in the language shown.
 *
 * AIAssessmentTemplate stores one English name and description (single-valued
 * columns; see scripts/seed-assessment-templates.ts), so a Spanish screen that
 * printed the row showed English. The bilingual text lives in
 * src/config/assessment-templates-v2.ts; this table repeats only the names and
 * descriptions (that config is large and also carries every question), and
 * assessment-template-display.test.ts fails if the two ever disagree.
 *
 * A v1 row (superseded, kept for the assessments that use it) shows the Spanish
 * name of its v2 successor; its own older description stays as stored. Custom
 * templates an organisation creates are shown exactly as written.
 */

type Text = { name: string; description?: string };

export const SYSTEM_TEMPLATE_ES: Record<string, Text> = {
  "system-fria-template-v2": {
    name: "Evaluación de impacto sobre los derechos fundamentales",
    description:
      "Evaluación conforme al artículo 27 del Reglamento de IA de la UE del impacto de un sistema de alto riesgo sobre los derechos fundamentales, con respuestas estructuradas que un regulador puede leer.",
  },
  "system-ai-risk-template-v2": {
    name: "Evaluación de riesgos de IA",
    description:
      "Evaluación estructurada de riesgos de IA que cubre riesgos técnicos, éticos y operativos y sus mitigaciones, alineada con el NIST AI RMF y la norma ISO 42001.",
  },
  "system-custom-template-v2": {
    name: "Evaluación personalizada",
    description:
      "Una evaluación flexible para revisiones personalizadas de gobernanza de IA, con respuestas de riesgo estructuradas y espacio para una justificación escrita.",
  },
  "system-conformity-template-v2": {
    name: "Evaluación de la conformidad",
    description:
      "Evaluación de la conformidad conforme al artículo 43 del Reglamento de IA de la UE para sistemas de alto riesgo: gestión de la calidad, documentación técnica, gestión de riesgos, transparencia y la declaración, con respuestas estructuradas.",
  },
  "system-bias-fairness-template-v2": {
    name: "Evaluación de sesgo y equidad",
    description:
      "Evaluación estructurada de sesgo y equidad que cubre la composición de los datos, las métricas de equidad, las pruebas desagregadas y la mitigación, alineada con el artículo 10 del Reglamento de IA de la UE y el NIST AI RMF.",
  },
  // v1 rows: the successor's name only.
  "system-fria-template": { name: "Evaluación de impacto sobre los derechos fundamentales" },
  "system-ai-risk-template": { name: "Evaluación de riesgos de IA" },
  "system-custom-template": { name: "Evaluación personalizada" },
  "system-conformity-template": { name: "Evaluación de la conformidad" },
  "system-bias-fairness-template": { name: "Evaluación de sesgo y equidad" },
};

type Row = { id?: string | null; name: string; description?: string | null };

export function templateName(row: Row, locale: string): string {
  if (locale !== "es" || !row.id) return row.name;
  return SYSTEM_TEMPLATE_ES[row.id]?.name ?? row.name;
}

export function templateDescription(row: Row, locale: string): string | null | undefined {
  if (locale !== "es" || !row.id) return row.description;
  return SYSTEM_TEMPLATE_ES[row.id]?.description ?? row.description;
}
