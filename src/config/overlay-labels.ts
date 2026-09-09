// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Human names for the overlay tags.
 *
 * The tags themselves ("gdpr:adm", "wa:companion") are a machine vocabulary
 * shared by the resolvers, the assessment template and the generated
 * documents. Anywhere one is shown to a person it needs a name, and it needs
 * to be the same name everywhere: a document that says "Colorado SB 26-189
 * (deployer)" and a screen that says something else about the same system
 * teaches the reader not to trust either.
 *
 * Bilingual, because the generated documents are produced in both languages
 * and previously named their regimes in English regardless of locale.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";
import type { OverlayTag } from "@/config/unified-assessment";

const L = (en: string, es: string): Localized => ({ en, es });

export const OVERLAY_LABELS: Record<OverlayTag, Localized> = {
  "eu:high-risk": L("EU AI Act (high-risk)", "Reglamento de IA de la UE (alto riesgo)"),
  "eu:art50": L("EU AI Act Art. 50 (transparency)", "Reglamento de IA de la UE, art. 50 (transparencia)"),
  "gdpr:core": L("GDPR", "RGPD"),
  "gdpr:adm": L("GDPR Art. 22 (automated decisions)", "RGPD, art. 22 (decisiones automatizadas)"),
  "gdpr:dpia": L("GDPR Art. 35 (impact assessment)", "RGPD, art. 35 (evaluación de impacto)"),
  "gdpr:special": L("GDPR Art. 9 (special categories)", "RGPD, art. 9 (categorías especiales)"),
  "admt:art10": L("California CCPA risk assessments (Art. 10)", "Evaluaciones de riesgo de la CCPA de California (art. 10)"),
  "admt:art11": L("California CCPA ADMT (Art. 11)", "ADMT de la CCPA de California (art. 11)"),
  "co:developer": L("Colorado SB 26-189 (developer)", "SB 26-189 de Colorado (desarrollador)"),
  "co:deployer": L("Colorado SB 26-189 (deployer)", "SB 26-189 de Colorado (responsable del despliegue)"),
  "tx:core": L("Texas TRAIGA", "TRAIGA de Texas"),
  "tx:government": L("Texas TRAIGA (government)", "TRAIGA de Texas (Administración)"),
  "tx:healthcare": L("Texas TRAIGA (health care)", "TRAIGA de Texas (sanidad)"),
  "wa:mhmda": L("Washington My Health My Data Act", "Ley My Health My Data de Washington"),
  "wa:genai-provenance": L("Washington HB 1170 (provenance)", "HB 1170 de Washington (procedencia)"),
  "wa:companion": L("Washington HB 2225 (companion chatbots)", "HB 2225 de Washington (chatbots de compañía)"),
  "wa:prior-auth": L("Washington RCW 48.43.830 (prior authorisation)", "RCW 48.43.830 de Washington (autorización previa)"),
  "wa:public-agency": L("Washington RCW 43.105 (public agencies)", "RCW 43.105 de Washington (entidades públicas)"),
  agentic: L("Agentic layer", "Capa agéntica"),
};

/** The common core is not an overlay, but it needs a name in the same places. */
export const CORE_LABEL: Localized = L("Common core", "Núcleo común");

export function overlayLabel(tag: string, locale: "en" | "es"): string {
  if (tag === "core") return CORE_LABEL[locale];
  const label = OVERLAY_LABELS[tag as OverlayTag];
  // An unknown tag shows as itself rather than disappearing: a silently
  // dropped regime is worse than an ugly one.
  return label ? label[locale] : tag;
}

/** Plain names for a set of tags, deduplicated, in the order given. */
export function overlayLabels(tags: readonly string[], locale: "en" | "es"): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const label = overlayLabel(tag, locale);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}
