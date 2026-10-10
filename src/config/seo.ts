// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The page title and description, in both languages.
 *
 * English is the site default (src/app/layout.tsx). The landing (src/app/page.tsx)
 * returns the Spanish pair when Spanish applies: `?lang=es`, or the `locale` cookie
 * set to `es` with no `?lang=` (the same rule the landing uses in the browser). The
 * landing also sets document.title when the visitor toggles the language.
 *
 * The Spanish copy follows the Spanish landing: it names nine frameworks and claims
 * no open code, no hardware and no hosting location.
 */

import type { Locale } from "@/lib/locale-cookie";

export const SEO: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  en: {
    title: "AI SENTINEL: AI governance software for the EU AI Act, NIST AI RMF, ISO 42001, AIUC-1 and five more frameworks",
    description:
      "Open-source AI governance platform. AI system registry, EU AI Act risk classification, impact assessments, and compliance mapping across nine frameworks: the EU AI Act, NIST AI RMF, ISO/IEC 42001, AIUC-1 (the certification standard for AI agents), the GDPR and the California, Colorado, Texas and Washington AI rules. Human oversight, incident management and a complete program in minutes.",
    ogLocale: "en_US",
  },
  es: {
    title: "AI SENTINEL: software de gobernanza de la IA para el Reglamento de IA, NIST AI RMF, ISO 42001, AIUC-1 y cinco marcos más",
    description:
      "Software de gobernanza de la IA. Registro de sistemas de IA, clasificación de riesgo según el Reglamento de IA de la UE, evaluaciones de impacto y correspondencia con nueve marcos: el Reglamento de IA, el NIST AI RMF, la ISO/IEC 42001, AIUC-1 (la norma de certificación para agentes de IA), el RGPD y las normas de IA de California, Colorado, Texas y Washington. Supervisión humana, gestión de incidentes y un programa completo en minutos.",
    ogLocale: "es_ES",
  },
};

/** Shared by the default (English) metadata and the Spanish landing metadata. */
export const OG_IMAGES = [{ url: "/apple-touch-icon.png", width: 180, height: 180, alt: "AI SENTINEL logo" }];
export const TWITTER_IMAGES = ["/favicon.png"];

/** The language the landing shows: `?lang=` first, then the cookie (last `locale` value wins). */
export function landingLocale(lang: string | string[] | undefined, cookieLocale: Locale): Locale {
  const v = Array.isArray(lang) ? lang[0] : lang;
  if (v === "es" || v === "en") return v;
  return cookieLocale;
}
