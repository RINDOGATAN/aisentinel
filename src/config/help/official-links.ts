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
 * own page for the framework, which is the citable source of record.
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
      "EU AI Act — Regulation (EU) 2024/1689 (EUR-Lex)",
      "Reglamento de IA de la UE — Reglamento (UE) 2024/1689 (EUR-Lex)",
    ),
  } as OfficialLink,
  euArt5: euArticle("art_5", "EU AI Act Art. 5 — prohibited practices", "Reglamento de IA, art. 5 — prácticas prohibidas"),
  euArt6: euArticle("art_6", "EU AI Act Art. 6 — high-risk classification", "Reglamento de IA, art. 6 — clasificación de alto riesgo"),
  euAnnexIII: euArticle("anx_III", "EU AI Act Annex III — high-risk areas", "Reglamento de IA, anexo III — áreas de alto riesgo"),
  euArt9: euArticle("art_9", "EU AI Act Art. 9 — risk management", "Reglamento de IA, art. 9 — gestión de riesgos"),
  euArt10: euArticle("art_10", "EU AI Act Art. 10 — data and data governance", "Reglamento de IA, art. 10 — datos y gobernanza de datos"),
  euArt14: euArticle("art_14", "EU AI Act Art. 14 — human oversight", "Reglamento de IA, art. 14 — supervisión humana"),
  euArt26: euArticle("art_26", "EU AI Act Art. 26 — obligations of deployers", "Reglamento de IA, art. 26 — obligaciones de los responsables del despliegue"),
  euArt27: euArticle("art_27", "EU AI Act Art. 27 — fundamental rights impact assessment", "Reglamento de IA, art. 27 — evaluación de impacto sobre los derechos fundamentales"),
  euArt43: euArticle("art_43", "EU AI Act Art. 43 — conformity assessment", "Reglamento de IA, art. 43 — evaluación de la conformidad"),
  euArt50: euArticle("art_50", "EU AI Act Art. 50 — transparency obligations", "Reglamento de IA, art. 50 — obligaciones de transparencia"),
  euArt72: euArticle("art_72", "EU AI Act Art. 72 — post-market monitoring", "Reglamento de IA, art. 72 — vigilancia poscomercialización"),
  euArt73: euArticle("art_73", "EU AI Act Art. 73 — reporting of serious incidents", "Reglamento de IA, art. 73 — notificación de incidentes graves"),
  gdpr: {
    href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
    label: L("GDPR — Regulation (EU) 2016/679 (EUR-Lex)", "RGPD — Reglamento (UE) 2016/679 (EUR-Lex)"),
  } as OfficialLink,
  nistRmf: {
    href: "https://www.nist.gov/itl/ai-risk-management-framework",
    label: L("NIST AI Risk Management Framework", "Marco de gestión de riesgos de IA del NIST"),
  } as OfficialLink,
  iso42001: {
    href: "https://www.iso.org/standard/81230.html",
    label: L("ISO/IEC 42001 — AI management systems", "ISO/IEC 42001 — sistemas de gestión de IA"),
  } as OfficialLink,
  aiuc1: {
    href: "https://standard.aiuc-1.com/",
    label: L("AIUC-1 — AI agent certification standard", "AIUC-1 — norma de certificación de agentes de IA"),
  } as OfficialLink,
} as const;

export type OfficialLinkKey = keyof typeof OFFICIAL_LINKS;
