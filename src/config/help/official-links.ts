// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Links to the official legal text, named once and reused.
 *
 * A help panel that points a reader at "the EU AI Act" without a link makes
 * them search; a link to the exact article does not. These are the primary
 * sources the product is built on, so the panel for a page can hand the reader
 * straight to the words of the law it enforces.
 *
 * EUR-Lex is the consolidated Regulation (EU) 2024/1689. Article deep links use
 * EUR-Lex's stable anchor form. NIST, ISO and AIUC-1 point at the publisher's
 * own page for the framework, which is the citable source of record. The
 * frontier-AI sources point at the issuing body (the California Legislature,
 * Cal OES, the California Attorney General, the European Commission) and, for
 * a policy proposal, at its author's own published document.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";

export interface OfficialLink {
  href: string;
  label: Localized;
}

const L = (en: string, es: string): Localized => ({ en, es });

/** The consolidated EU AI Act on EUR-Lex, and the articles the product cites. */
const EUR_LEX_2024_1689 =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689";

function euArticle(anchor: string, en: string, es: string): OfficialLink {
  return {
    href: `${EUR_LEX_2024_1689}#${anchor}`,
    label: L(en, es),
  };
}

export const OFFICIAL_LINKS = {
  euAiAct: {
    href: EUR_LEX_2024_1689,
    label: L(
      "EU AI Act: Regulation (EU) 2024/1689 (EUR-Lex)",
      "RIA: Reglamento (UE) 2024/1689 (EUR-Lex)",
    ),
  } as OfficialLink,
  euArt5: euArticle("art_5", "EU AI Act Art. 5: prohibited practices", "RIA, art. 5: prácticas prohibidas"),
  euArt6: euArticle("art_6", "EU AI Act Art. 6: high-risk classification", "RIA, art. 6: clasificación de alto riesgo"),
  euAnnexIII: euArticle("anx_III", "EU AI Act Annex III: high-risk areas", "RIA, anexo III: áreas de alto riesgo"),
  euArt9: euArticle("art_9", "EU AI Act Art. 9: risk management", "RIA, art. 9: gestión de riesgos"),
  euArt10: euArticle("art_10", "EU AI Act Art. 10: data and data governance", "RIA, art. 10: datos y gobernanza de datos"),
  euArt14: euArticle("art_14", "EU AI Act Art. 14: human oversight", "RIA, art. 14: supervisión humana"),
  euArt26: euArticle("art_26", "EU AI Act Art. 26: obligations of deployers", "RIA, art. 26: obligaciones de los responsables del despliegue"),
  euArt27: euArticle("art_27", "EU AI Act Art. 27: fundamental rights impact assessment", "RIA, art. 27: evaluación de impacto en los derechos fundamentales"),
  euArt43: euArticle("art_43", "EU AI Act Art. 43: conformity assessment", "RIA, art. 43: evaluación de la conformidad"),
  euArt50: euArticle("art_50", "EU AI Act Art. 50: transparency obligations", "RIA, art. 50: obligaciones de transparencia"),
  euArt72: euArticle("art_72", "EU AI Act Art. 72: post-market monitoring", "RIA, art. 72: vigilancia poscomercialización"),
  euArt73: euArticle("art_73", "EU AI Act Art. 73: reporting of serious incidents", "RIA, art. 73: notificación de incidentes graves"),
  euArt51: euArticle("art_51", "EU AI Act Art. 51: general-purpose AI models with systemic risk", "RIA, art. 51: modelos de IA de uso general con riesgo sistémico"),
  euArt53: euArticle("art_53", "EU AI Act Art. 53: obligations of providers of general-purpose AI models", "RIA, art. 53: obligaciones de los proveedores de modelos de IA de uso general"),
  euArt55: euArticle("art_55", "EU AI Act Art. 55: obligations for models with systemic risk", "RIA, art. 55: obligaciones para modelos con riesgo sistémico"),
  euArt93: euArticle("art_93", "EU AI Act Art. 93: power to request measures", "RIA, art. 93: poderes para solicitar la adopción de medidas"),
  euArt113: euArticle("art_113", "EU AI Act Art. 113: entry into force and application", "RIA, art. 113: entrada en vigor y aplicación"),
  gpaiCodeOfPractice: {
    href: "https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai",
    label: L(
      "European Commission: the General-Purpose AI Code of Practice",
      "Comisión Europea: el Código de buenas prácticas de IA de uso general",
    ),
  } as OfficialLink,
  gpaiCodePressRelease: {
    href: "https://ec.europa.eu/commission/presscorner/api/files/document/print/en/ip_25_1787/IP_25_1787_EN.pdf",
    label: L(
      "European Commission press release of 10 July 2025: the Code of Practice is available",
      "Nota de prensa de la Comisión Europea de 10 de julio de 2025: el Código de buenas prácticas está disponible",
    ),
  } as OfficialLink,
  gpaiEnforcementFaq: {
    href: "https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/commissions-enforcement-powers-related-ai-act-obligations-providers-most-advanced-models",
    label: L(
      "AI Act Service Desk: the Commission's enforcement powers from 2 August 2026",
      "Servicio de asistencia del RIA: los poderes de ejecución de la Comisión desde el 2 de agosto de 2026",
    ),
  } as OfficialLink,
  caSb53: {
    href: "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB53",
    label: L(
      "California SB 53, Transparency in Frontier Artificial Intelligence Act (Business and Professions Code, sec. 22757.10 and following)",
      "California SB 53, Ley de transparencia en la inteligencia artificial de frontera (Código de Negocios y Profesiones, art. 22757.10 y siguientes)",
    ),
  } as OfficialLink,
  caOesFrontierReporting: {
    href: "https://www.caloes.ca.gov/office-of-the-director/operations/homeland-security/california-cybersecurity-integration-center/transparency-in-frontier-ai-act-reporting/",
    label: L(
      "California Office of Emergency Services: Transparency in Frontier AI Act reporting",
      "Oficina de Servicios de Emergencia de California: notificaciones conforme a la ley de IA de frontera",
    ),
  } as OfficialLink,
  caAgSb53: {
    href: "https://www.oag.ca.gov/sb53",
    label: L(
      "California Attorney General: SB 53 whistleblower reports",
      "Fiscal General de California: denuncias de alertadores conforme a la SB 53",
    ),
  } as OfficialLink,
  anthropicAdvancedAiFramework: {
    href: "https://www-cdn.anthropic.com/files/4zrzovbb/website/0a58d567024a8b448ff15158ebc3625328dfcc1f.pdf",
    label: L(
      "Anthropic's Advanced AI Framework, June 2026 (a policy proposal, not law)",
      "Advanced AI Framework de Anthropic, junio de 2026 (una propuesta, no una ley)",
    ),
  } as OfficialLink,
  gdpr: {
    href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
    label: L("GDPR: Regulation (EU) 2016/679 (EUR-Lex)", "RGPD: Reglamento (UE) 2016/679 (EUR-Lex)"),
  } as OfficialLink,
  nistRmf: {
    href: "https://www.nist.gov/itl/ai-risk-management-framework",
    label: L("NIST AI Risk Management Framework", "Marco de gestión de riesgos de IA del NIST"),
  } as OfficialLink,
  iso42001: {
    href: "https://www.iso.org/standard/81230.html",
    label: L("ISO/IEC 42001: AI management systems", "ISO/IEC 42001: sistemas de gestión de IA"),
  } as OfficialLink,
  aiuc1: {
    href: "https://standard.aiuc-1.com/",
    label: L("AIUC-1: AI agent certification standard", "AIUC-1: norma de certificación de agentes de IA"),
  } as OfficialLink,
} as const;

export type OfficialLinkKey = keyof typeof OFFICIAL_LINKS;
