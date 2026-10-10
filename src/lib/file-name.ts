// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Download file names. The export routes build names from record names with
 * `replace(/[^a-zA-Z0-9]/g, "-")`, which turned every accented letter into a hyphen
 * ("Sistema-de-calificaci-n-crediticia"). Taking the accents off first keeps the
 * letter ("calificacion"), as the program pack already does (fileSlug).
 */
export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** The localized first word(s) of each export's file name. */
export const EXPORT_FILE_PREFIX = {
  program: { en: "AI-Governance-Program", es: "Programa-de-gobernanza-de-IA" },
  aiuc1: { en: "AIUC-1-evidence", es: "Evidencias-AIUC-1" },
  threatModel: { en: "Threat-model", es: "Modelo-de-amenazas" },
  unified: {
    assessment: { en: "unified-impact-assessment", es: "evaluacion-unificada-de-impacto" },
    notice: { en: "multi-jurisdictional-ai-notice", es: "aviso-multijurisdiccional-de-ia" },
    protocol: { en: "human-review-and-appeal-protocol", es: "protocolo-de-revision-humana-y-recurso" },
    "agentic-addendum": { en: "agentic-addendum", es: "anexo-agentico" },
  },
} as const;
