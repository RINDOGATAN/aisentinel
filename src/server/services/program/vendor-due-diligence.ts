// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * First-draft findings for a vendor due-diligence review, pre-filled from the
 * vendor catalogue.
 *
 * Two lists, never merged: what the catalogue states (a starting point the
 * reviewer must confirm against the contract and the vendor's own documents)
 * and what it does not state (open questions). A field the catalogue leaves
 * empty is a question, never an assumed "no": the same rule the regime
 * resolvers follow for undetermined facts.
 *
 * Pure: no Prisma, no Next.
 */

export type DdLocale = "en" | "es";

/** The catalogue fields this review reads (a subset of VendorCatalog). */
export interface CatalogFacts {
  name: string;
  certifications: string[];
  dataLocations: string[];
  hasEuDataCenter: boolean | null;
  dpaUrl: string | null;
  trustCenterUrl: string | null;
  dpaGdprScore: number | null;
  transferSafeguards: string | null;
  aiCapabilities: string[];
  modelHosting: string | null;
  euAiActRole: string | null;
  iso42001Certified: boolean | null;
  aiIncidentNotificationSLA: string | null;
  dataProcessingTransparency: string | null;
  hasRecentBreach: boolean | null;
  subprocessorCount: number | null;
}

const L = {
  en: {
    known: "Stated in the vendor catalog (confirm against the contract and the vendor's own documents):",
    open: "Open questions (not stated in the catalog):",
    certifications: "Certifications",
    dataLocations: "Data locations",
    euDc: "EU data centre",
    dpa: "Data processing agreement published",
    trust: "Trust centre",
    gdprScore: "GDPR clause coverage of the published DPA (catalog analysis)",
    transfers: "Transfer safeguards",
    capabilities: "AI capabilities",
    hosting: "Model hosting",
    role: "EU AI Act role the vendor states",
    iso42001: "ISO/IEC 42001 certified",
    sla: "AI incident notification commitment",
    transparency: "Data processing transparency",
    breach: "Publicly reported breach in the catalog's window",
    subprocessors: "Subprocessors listed in the catalog",
    yes: "yes",
    no: "no",
    qTraining: "Is the organisation's data used to train or improve the vendor's models, and can that be switched off by contract?",
    qRetention: "How long are inputs and outputs retained, and where?",
    qCerts: "Which security and AI management certifications does the vendor hold, with their scope and date?",
    qLocations: "Where is data stored and processed, including by subprocessors?",
    qDpa: "Is there a data processing agreement, and does it cover AI-specific use?",
    qTransfers: "Which safeguards cover transfers outside the EEA?",
    qRole: "Is the vendor a provider of the AI system under the EU AI Act, and will it supply instructions for use (Art. 13)?",
    qSla: "How quickly will the vendor notify an AI incident or a personal data breach?",
    qSubprocessors: "Which subprocessors handle the organisation's data?",
    qBreach: "Has the vendor had a security incident affecting customer data in the last three years?",
  },
  es: {
    known: "Indicado en el catálogo de proveedores (confírmalo con el contrato y la documentación del propio proveedor):",
    open: "Preguntas abiertas (no indicadas en el catálogo):",
    certifications: "Certificaciones",
    dataLocations: "Ubicación de los datos",
    euDc: "Centro de datos en la UE",
    dpa: "Contrato de encargo del tratamiento publicado",
    trust: "Centro de confianza",
    gdprScore: "Cobertura de cláusulas del RGPD del contrato publicado (análisis del catálogo)",
    transfers: "Garantías para transferencias",
    capabilities: "Capacidades de IA",
    hosting: "Alojamiento del modelo",
    role: "Papel en el Reglamento de IA que declara el proveedor",
    iso42001: "Certificación ISO/IEC 42001",
    sla: "Compromiso de notificación de incidentes de IA",
    transparency: "Transparencia del tratamiento de datos",
    breach: "Brecha comunicada públicamente en el periodo del catálogo",
    subprocessors: "Subencargados indicados en el catálogo",
    yes: "sí",
    no: "no",
    qTraining: "¿Se usan los datos de la organización para entrenar o mejorar los modelos del proveedor, y puede impedirse por contrato?",
    qRetention: "¿Durante cuánto tiempo y dónde se conservan las entradas y los resultados?",
    qCerts: "¿Qué certificaciones de seguridad y de gestión de la IA tiene el proveedor, con su alcance y fecha?",
    qLocations: "¿Dónde se almacenan y tratan los datos, también por los subencargados?",
    qDpa: "¿Existe un contrato de encargo del tratamiento y cubre el uso específico de IA?",
    qTransfers: "¿Qué garantías cubren las transferencias fuera del EEE?",
    qRole: "¿Es el proveedor el proveedor del sistema de IA según el Reglamento de IA, y facilitará instrucciones de uso (art. 13)?",
    qSla: "¿Con qué rapidez notificará el proveedor un incidente de IA o una brecha de datos personales?",
    qSubprocessors: "¿Qué subencargados tratan los datos de la organización?",
    qBreach: "¿Ha sufrido el proveedor un incidente de seguridad que afectara a datos de clientes en los últimos tres años?",
  },
} as const;

const yn = (v: boolean, l: (typeof L)[DdLocale]) => (v ? l.yes : l.no);

export function vendorDueDiligenceFindings(c: CatalogFacts, locale: DdLocale): string {
  const l = L[locale];
  const known: string[] = [];
  const open: string[] = [l.qTraining, l.qRetention];

  if (c.certifications.length > 0) known.push(`${l.certifications}: ${c.certifications.join(", ")}`);
  else open.push(l.qCerts);
  if (c.iso42001Certified !== null) known.push(`${l.iso42001}: ${yn(c.iso42001Certified, l)}`);

  if (c.dataLocations.length > 0) {
    const eu = c.hasEuDataCenter === null ? "" : ` (${l.euDc}: ${yn(c.hasEuDataCenter, l)})`;
    known.push(`${l.dataLocations}: ${c.dataLocations.join(", ")}${eu}`);
  } else open.push(l.qLocations);

  if (c.dpaUrl) {
    const score = c.dpaGdprScore === null ? "" : `; ${l.gdprScore}: ${c.dpaGdprScore}/100`;
    known.push(`${l.dpa}: ${c.dpaUrl}${score}`);
  } else open.push(l.qDpa);
  if (c.trustCenterUrl) known.push(`${l.trust}: ${c.trustCenterUrl}`);

  if (c.transferSafeguards) known.push(`${l.transfers}: ${c.transferSafeguards}`);
  else open.push(l.qTransfers);

  if (c.aiCapabilities.length > 0) known.push(`${l.capabilities}: ${c.aiCapabilities.join(", ")}`);
  if (c.modelHosting) known.push(`${l.hosting}: ${c.modelHosting}`);

  if (c.euAiActRole) known.push(`${l.role}: ${c.euAiActRole}`);
  else open.push(l.qRole);

  if (c.aiIncidentNotificationSLA) known.push(`${l.sla}: ${c.aiIncidentNotificationSLA}`);
  else open.push(l.qSla);

  if (c.dataProcessingTransparency) known.push(`${l.transparency}: ${c.dataProcessingTransparency}`);

  if (c.subprocessorCount !== null && c.subprocessorCount > 0) known.push(`${l.subprocessors}: ${c.subprocessorCount}`);
  else open.push(l.qSubprocessors);

  if (c.hasRecentBreach !== null) known.push(`${l.breach}: ${yn(c.hasRecentBreach, l)}`);
  else open.push(l.qBreach);

  const out: string[] = [];
  if (known.length > 0) out.push(l.known, ...known.map((k) => `- ${k}`), "");
  out.push(l.open, ...open.map((q) => `- ${q}`));
  return out.join("\n");
}

/** Reads the catalogue row shape (Prisma VendorCatalog) into CatalogFacts. */
export function toCatalogFacts(row: {
  name: string;
  certifications: string[];
  dataLocations: string[];
  hasEuDataCenter: boolean | null;
  dpaUrl: string | null;
  trustCenterUrl: string | null;
  dpaGdprScore: number | null;
  transferSafeguards: string | null;
  aiCapabilities: string[];
  modelHosting: string | null;
  euAiActRole: string | null;
  iso42001Certified: boolean | null;
  aiIncidentNotificationSLA: string | null;
  dataProcessingTransparency: string | null;
  hasRecentBreach: boolean | null;
  subprocessors: unknown;
}): CatalogFacts {
  const subs = Array.isArray(row.subprocessors) ? row.subprocessors.length : null;
  return { ...row, subprocessorCount: subs };
}
