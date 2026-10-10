// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The program pack: everything a governance professional hands to a board, a
 * regulator, an auditor or a client, in one ZIP and in the reader's language.
 *
 *   README (the index)          every document with its state and files,
 *                               what stayed out and why, what is still a
 *                               draft, which legal packs await sign-off
 *   program PDF                 the same report the Program page exports
 *   AI system register PDF
 *   policies/                   one Markdown document per policy
 *   obligations (.md and .ics)  the dated calendar, importable into Outlook
 *   systems/<name>/             the cross-border documents and data flow per system
 *   vendor due diligence (.md)
 *   AI inventory (.csv)         in the spreadsheet-import format, so it
 *                               round-trips into another organization
 *   sensitive data, threat models (.md)
 *   assessment portfolio, model inventory (PDF)
 *   AIUC-1 evidence/            one document per AI agent
 *   MANIFEST                    a SHA-256 digest for every file
 *
 * What goes in is the document register's answer
 * (src/config/document-register.ts, through src/lib/document-pack.ts): the
 * documents that are ready and, when asked for, the drafts. A draft carries
 * DRAFT (BORRADOR) in its file name and its gaps on its first page, so a
 * reader who opens one file alone still learns it is not finished. Every
 * generated document also keeps its own gap blocks and review markers.
 */

import type { PrismaClient } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { createTranslator } from "next-intl";
import { evaluateRegister } from "@/config/document-register";
import { markDraft, planPack } from "@/lib/document-pack";
import { loadDocumentFacts } from "@/server/services/program/document-facts";
import type { DraftNote } from "@/server/services/export/draft-gaps-page";
import { AssessmentPortfolioReport } from "@/server/services/export/assessment-portfolio";
import { ModelInventoryReport } from "@/server/services/export/model-inventory";
import {
  loadAssessmentPortfolioData,
  loadModelInventoryData,
} from "@/server/services/export/document-data";
import { agentReadiness, isAgentSystem } from "@/config/aiuc1-evidence";
import { loadAgentRows } from "@/server/services/aiuc1/readiness";
import { renderAiuc1EvidenceDoc } from "@/server/services/export/aiuc1-evidence-doc";
import { createZip, type ZipEntry } from "@/lib/zip";
import { buildIcs } from "@/lib/ics";
import { renderProgramPdf } from "@/server/services/export/program-pdf";
import { loadRegisterExportData } from "@/server/services/export/register-data";
import { AISystemRegisterReport } from "@/server/services/export/ai-system-register";
import { getObligationsData } from "@/server/services/obligations/obligations-data";
import { getConfirmationSummary } from "@/server/services/provenance/summary";
import { loadSystemScope } from "@/server/services/scope/system-scope";
import {
  buildAgenticAddendumArtifact,
  buildAssessmentArtifact,
  buildNoticeArtifact,
  buildProtocolArtifact,
} from "@/server/services/artifacts/build-artifacts";
import { renderArtifactMarkdown } from "@/server/services/artifacts/render-markdown";
import { pendingPacks } from "@/config/legal-signoff";
import {
  SENSITIVE_FACTORS,
  SENSITIVE_FACTORS_REVIEW_MARKER,
} from "@/config/sensitive-data-factors";
import { sensitiveCategoryLabel } from "@/config/data-categories";
import { renderThreatModelDoc } from "@/server/services/export/threat-model-doc";
import {
  exportStamp,
  renderManifest,
  sha256,
  type ManifestEntry,
} from "@/server/services/export/integrity";

type Locale = "en" | "es";

const L = {
  en: {
    readme: "00-README.md",
    program: "01-ai-governance-program.pdf",
    register: "02-ai-system-register.pdf",
    policiesDir: "03-policies",
    obligationsMd: "04-obligations-calendar.md",
    obligationsIcs: "04-obligations-calendar.ics",
    systemsDir: "05-systems",
    vendors: "06-vendor-due-diligence.md",
    inventory: "07-ai-inventory.csv",
    sensitive: "08-sensitive-data-analyses.md",
    threats: "09-threat-models.md",
    assessmentPortfolio: "10-assessment-portfolio.pdf",
    modelInventory: "11-ai-model-inventory.pdf",
    aiuc1Dir: "12-aiuc1-evidence",
    manifest: "99-MANIFEST.txt",
    draftMark: "DRAFT",
    title: "AI governance program pack",
    generated: "Generated",
    contents: "Contents",
    items: {
      program: "The program report: governance map, maturity scorecard, 90-day plan, and the snapshot it was rendered from.",
      register: "The register of AI systems, with risk tier, vendor and owners.",
      policies: "One document per policy, with its status. Drafts are marked as drafts.",
      obligations: "The dated obligations for the jurisdictions declared, as a document and as a calendar file (.ics) for Outlook or Google Calendar.",
      systems: "Per system: the unified impact assessment, the multi-jurisdiction notice and the human-review protocol (and the agentic addendum where it applies). Unanswered questions appear as open items, never as silence.",
      vendors: "The due-diligence reviews of each AI vendor: what is known, and what is still open.",
      inventory: "The AI inventory as a spreadsheet, in the format the import accepts.",
      sensitive: "The five-factor analyses: how the organization decided whether a set of data is health data or another sensitive category, with the reasoning per factor, the band, the decision and the owner.",
      threats: "The threat models: what each system can see and do, what could go wrong, the controls against each scenario, and whether those controls were tested.",
      assessmentPortfolio: "Every assessment with its type, status and who reviewed and approved it.",
      modelInventory: "The AI models recorded on each system, with provider, version and known limitations.",
      aiuc1: "Per AI agent: the AIUC-1 evidence, requirement by requirement, with each test and who recorded it.",
      manifest: "The integrity manifest: a SHA-256 digest for every file above, the application version that produced them, and the version and legal review date of every rule pack in force at that moment.",
    },
    status: "Status of this pack",
    assurance: "{pct}% of the auto-generated items have been confirmed by a person ({confirmed} of {total}).",
    drafts: "Policies, impact assessments and vendor reviews are drafts until approved. Their status is stated in each document.",
    pending: "Legal sign-off is still pending for: {packs}. Content from these packs is a considered first draft, not legal advice.",
    allSignedOff: "Every regulatory pack cited has been signed off.",
    noJurisdictions: "No operating jurisdictions are declared, so the per-system cross-border documents were not generated. Declare them in Settings and export again.",
    noPolicies: "No policies yet.",
    policyMeta: "Type: {type} · Status: {status} · Version: {version}",
    effective: "Effective",
    review: "Review",
    description: "Description",
    text: "Text",
    obligationsTitle: "Obligations calendar",
    obligationsIntro: "Dated obligations for the jurisdictions declared. An obligation whose scope cannot be determined yet is listed as such.",
    colDate: "Date",
    colInstrument: "Instrument",
    colProvision: "Provision",
    colObligation: "Obligation",
    colApplies: "Applies",
    applies: { applies: "Yes", unknown: "Not yet determined", "does-not-apply": "No" } as Record<string, string>,
    calendarName: "AI obligations: {org}",
    vendorsTitle: "Vendor due diligence",
    flowTitle: "Data flow",
    flowRole: "Data protection role",
    flowTransactionRole: "Role in the transaction",
    flowRetention: "Retention",
    flowIn: "What comes in",
    flowOut: "Where it goes",
    flowNoSources: "No data sources recorded.",
    flowNoRecipients: "No recipients recorded.",
    flowCategories: "Categories",
    flowSensitive: "Sensitive categories",
    flowPersonal: "Personal data",
    flowContract: "Contract",
    flowMissing: "not recorded",
    sensitiveTitle: "Sensitive data analyses",
    noSensitive: "No sensitive data analyses yet.",
    sensitiveBand: "Band",
    sensitiveSuggested: "Band derived by the rule",
    sensitiveOwner: "Owner",
    sensitiveDecision: "Decision",
    sensitiveOpen: "Not yet completed",
    sensitiveCompleted: "Completed",
    sensitiveFactors: "Factors",
    noVendors: "No vendors yet.",
    noReview: "No review yet.",
    nextReview: "Next review",
    riskLevel: "Risk level",
    notSet: "not set",
    index: {
      readyOnly: "This pack holds the documents that are ready. Drafts were not asked for.",
      withDrafts: "This pack holds the documents that are ready and the drafts. A draft has DRAFT in its file name and its gaps on its first page.",
      colDocument: "Document",
      colState: "State",
      colFiles: "Files",
      empty: "No document is ready yet.",
      notIncluded: "Not in this pack",
      whatEachHolds: "What each file holds",
      manifestNote: "{file} lists a SHA-256 digest for every file in the pack, so any single file can be checked.",
    },
    draftNote: {
      title: "This document is a draft",
      intro: "It can be shared for review, but it is not finished. These gaps remain:",
      generated: "Generated {date}",
    },
    reasons: {
      draftsNotRequested: "draft ({gaps}); drafts were not asked for",
      needsInput: "{needs}",
      notYet: "not in AI SENTINEL yet",
      screenOnly: "shown on screen only",
      perRecord: "chosen per system and framework on its own page",
      separateExport: "exported on its own page, by period",
      empty: "nothing to write yet",
    },
  },
  es: {
    readme: "00-LEEME.md",
    program: "01-programa-de-gobernanza-de-la-ia.pdf",
    register: "02-registro-de-sistemas-de-ia.pdf",
    policiesDir: "03-politicas",
    obligationsMd: "04-calendario-de-obligaciones.md",
    obligationsIcs: "04-calendario-de-obligaciones.ics",
    systemsDir: "05-sistemas",
    vendors: "06-diligencia-debida-de-proveedores.md",
    inventory: "07-inventario-de-ia.csv",
    sensitive: "08-analisis-de-datos-sensibles.md",
    threats: "09-modelos-de-amenazas.md",
    assessmentPortfolio: "10-cartera-de-evaluaciones.pdf",
    modelInventory: "11-inventario-de-modelos-de-ia.pdf",
    aiuc1Dir: "12-evidencias-aiuc-1",
    manifest: "99-MANIFIESTO.txt",
    draftMark: "BORRADOR",
    title: "Paquete del programa de gobernanza de la IA",
    generated: "Generado",
    contents: "Contenido",
    items: {
      program: "El informe del programa: mapa de gobernanza, cuadro de madurez, plan de 90 días y la instantánea a partir de la que se generó.",
      register: "El registro de sistemas de IA, con nivel de riesgo, proveedor y responsables.",
      policies: "Un documento por política, con su estado. Los borradores figuran como borradores.",
      obligations: "Las obligaciones con fecha para las jurisdicciones declaradas, como documento y como archivo de calendario (.ics) para Outlook o Google Calendar.",
      systems: "Por sistema: la evaluación de impacto unificada, el aviso multijurisdiccional y el protocolo de revisión humana (y el anexo agéntico cuando procede). Las preguntas sin responder figuran como puntos abiertos, nunca como silencio.",
      vendors: "Las revisiones de diligencia debida de cada proveedor de IA: lo que se sabe y lo que sigue abierto.",
      inventory: "El inventario de IA como hoja de cálculo, en el formato que admite la importación.",
      sensitive: "Los análisis por factores: cómo decidió la organización si un conjunto de datos es dato de salud u otra categoría sensible, con el razonamiento de cada factor, la banda, la decisión y el responsable.",
      threats: "Los modelos de amenazas: qué puede ver y hacer cada sistema, qué podría salir mal, los controles de cada escenario y si esos controles se han probado.",
      assessmentPortfolio: "Todas las evaluaciones con su tipo, su estado y quién las revisó y aprobó.",
      modelInventory: "Los modelos de IA registrados en cada sistema, con proveedor, versión y limitaciones conocidas.",
      aiuc1: "Por agente de IA: las evidencias AIUC-1, requisito por requisito, con cada prueba y quién la registró.",
      manifest: "El manifiesto de integridad: una huella SHA-256 de cada fichero anterior, la versión de la aplicación que los generó y la versión y la fecha de revisión jurídica de cada paquete de reglas vigente en ese momento.",
    },
    status: "Estado de este paquete",
    assurance: "El {pct}% de los elementos generados automáticamente ha sido confirmado por una persona ({confirmed} de {total}).",
    drafts: "Las políticas, las evaluaciones de impacto y las revisiones de proveedores son borradores hasta su aprobación. Cada documento indica su estado.",
    pending: "Sigue pendiente la validación jurídica de: {packs}. El contenido de estos paquetes es un primer borrador razonado, no asesoramiento jurídico.",
    allSignedOff: "Todos los paquetes normativos citados cuentan con validación jurídica.",
    noJurisdictions: "No hay jurisdicciones de actividad declaradas, por lo que no se han generado los documentos transfronterizos por sistema. Decláralas en Configuración y vuelve a exportar.",
    noPolicies: "Todavía no hay políticas.",
    policyMeta: "Tipo: {type} · Estado: {status} · Versión: {version}",
    effective: "Vigencia",
    review: "Revisión",
    description: "Descripción",
    text: "Texto",
    obligationsTitle: "Calendario de obligaciones",
    obligationsIntro: "Obligaciones con fecha para las jurisdicciones declaradas. Una obligación cuyo alcance todavía no puede determinarse figura como tal.",
    colDate: "Fecha",
    colInstrument: "Instrumento",
    colProvision: "Disposición",
    colObligation: "Obligación",
    colApplies: "Se aplica",
    applies: { applies: "Sí", unknown: "Por determinar", "does-not-apply": "No" } as Record<string, string>,
    calendarName: "Obligaciones de IA: {org}",
    vendorsTitle: "Diligencia debida de proveedores",
    flowTitle: "Flujo de datos",
    flowRole: "Rol en protección de datos",
    flowTransactionRole: "Rol en la transacción",
    flowRetention: "Conservación",
    flowIn: "Qué entra",
    flowOut: "A dónde va",
    flowNoSources: "No hay fuentes de datos registradas.",
    flowNoRecipients: "No hay destinatarios registrados.",
    flowCategories: "Categorías",
    flowSensitive: "Categorías sensibles",
    flowPersonal: "Datos personales",
    flowContract: "Contrato",
    flowMissing: "sin registrar",
    sensitiveTitle: "Análisis de datos sensibles",
    noSensitive: "Todavía no hay análisis de datos sensibles.",
    sensitiveBand: "Banda",
    sensitiveSuggested: "Banda derivada por la regla",
    sensitiveOwner: "Responsable",
    sensitiveDecision: "Decisión",
    sensitiveOpen: "Sin completar",
    sensitiveCompleted: "Completado",
    sensitiveFactors: "Factores",
    noVendors: "Todavía no hay proveedores.",
    noReview: "Sin revisión todavía.",
    nextReview: "Próxima revisión",
    riskLevel: "Nivel de riesgo",
    notSet: "sin indicar",
    index: {
      readyOnly: "Este paquete contiene los documentos que están listos. No se han pedido los borradores.",
      withDrafts: "Este paquete contiene los documentos que están listos y los borradores. Un borrador lleva BORRADOR en el nombre del fichero y lo que le falta en su primera página.",
      colDocument: "Documento",
      colState: "Estado",
      colFiles: "Ficheros",
      empty: "Todavía no hay ningún documento listo.",
      notIncluded: "Fuera de este paquete",
      whatEachHolds: "Qué contiene cada fichero",
      manifestNote: "{file} recoge una huella SHA-256 de cada fichero del paquete, para que cualquiera de ellos pueda comprobarse por separado.",
    },
    draftNote: {
      title: "Este documento es un borrador",
      intro: "Puede compartirse para revisión, pero no está terminado. Le falta lo siguiente:",
      generated: "Generado el {date}",
    },
    reasons: {
      draftsNotRequested: "borrador ({gaps}); no se han pedido los borradores",
      needsInput: "{needs}",
      notYet: "aún no en AI SENTINEL",
      screenOnly: "solo se muestra en pantalla",
      perRecord: "se elige por sistema y marco en su propia página",
      separateExport: "se exporta en su propia página, por periodo",
      empty: "todavía no hay nada que incluir",
    },
  },
} as const;


/** Human names for codes that would otherwise reach the reader raw. */
const NAMES = {
  en: {
    instrument: {
      "eu-ai-act": "EU AI Act",
      "tx-traiga": "Texas TRAIGA",
      "ut-aipa": "Utah AI Policy Act",
      "ccpa-admt": "California CCPA (ADMT)",
      "ccpa-risk-assessments": "California CCPA (risk assessments)",
      "ccpa-cyber-audits": "California CCPA (cybersecurity audits)",
    } as Record<string, string>,
    pack: {
      EU_AI_ACT: "EU AI Act",
      CA_CCPA_ADMT: "California CCPA (ADMT)",
      EU_GDPR: "GDPR",
      CO_SB_26_189: "Colorado SB 26-189",
      TX_TRAIGA: "Texas TRAIGA",
      WA_AI_RULES: "Washington AI rules",
    } as Record<string, string>,
    policyType: {
      AI_USAGE: "AI use", AI_GOVERNANCE: "AI governance", AI_ETHICS: "AI ethics",
      AI_RISK_MANAGEMENT: "Risk management", AI_DATA_GOVERNANCE: "Data governance",
      AI_PROCUREMENT: "Procurement", AI_INCIDENT_RESPONSE: "Incident response",
      AI_TRANSPARENCY: "Transparency", CUSTOM: "Custom",
    } as Record<string, string>,
    policyStatus: {
      DRAFT: "Draft", UNDER_REVIEW: "Under review", APPROVED: "Approved", PUBLISHED: "Published", ARCHIVED: "Archived",
    } as Record<string, string>,
    vendorRisk: { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as Record<string, string>,
    reviewStatus: { DRAFT: "draft", IN_PROGRESS: "in progress", COMPLETED: "completed", EXPIRED: "expired" } as Record<string, string>,
  },
  es: {
    instrument: {
      "eu-ai-act": "Reglamento de IA de la UE",
      "tx-traiga": "TRAIGA de Texas",
      "ut-aipa": "Ley de Política de IA de Utah",
      "ccpa-admt": "CCPA de California (ADMT)",
      "ccpa-risk-assessments": "CCPA de California (evaluaciones de riesgos)",
      "ccpa-cyber-audits": "CCPA de California (auditorías de ciberseguridad)",
    } as Record<string, string>,
    pack: {
      EU_AI_ACT: "Reglamento de IA de la UE",
      CA_CCPA_ADMT: "CCPA de California (ADMT)",
      EU_GDPR: "RGPD",
      CO_SB_26_189: "SB 26-189 de Colorado",
      TX_TRAIGA: "TRAIGA de Texas",
      WA_AI_RULES: "normas de IA de Washington",
    } as Record<string, string>,
    policyType: {
      AI_USAGE: "Uso de la IA", AI_GOVERNANCE: "Gobernanza de la IA", AI_ETHICS: "Ética de la IA",
      AI_RISK_MANAGEMENT: "Gestión de riesgos", AI_DATA_GOVERNANCE: "Gobernanza de datos",
      AI_PROCUREMENT: "Contratación", AI_INCIDENT_RESPONSE: "Respuesta a incidentes",
      AI_TRANSPARENCY: "Transparencia", CUSTOM: "Personalizada",
    } as Record<string, string>,
    policyStatus: {
      DRAFT: "Borrador", UNDER_REVIEW: "En revisión", APPROVED: "Aprobada", PUBLISHED: "Publicada", ARCHIVED: "Archivada",
    } as Record<string, string>,
    vendorRisk: { CRITICAL: "Crítico", HIGH: "Alto", MEDIUM: "Medio", LOW: "Bajo" } as Record<string, string>,
    reviewStatus: { DRAFT: "borrador", IN_PROGRESS: "en curso", COMPLETED: "completada", EXPIRED: "caducada" } as Record<string, string>,
  },
} as const;

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

export function fileSlug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const mdCell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function csvCell(v: string): string {
  return /[",;\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** The words of the document register, on the server, in the reader's language. */
async function registerWords(locale: Locale): Promise<(key: string, values?: Record<string, string | number>) => string> {
  const messages = (await import(`../../../i18n/messages/${locale}.json`)).default as Record<string, unknown>;
  return createTranslator({
    locale,
    messages,
    namespace: "documentRegister",
    onError: () => undefined,
    getMessageFallback: ({ key }: { key: string }) => key.split(".").pop() ?? key,
  } as unknown as Parameters<typeof createTranslator>[0]) as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
}

/** A path with the draft mark on its last part: "03-policies/01-x.md" → "03-policies/01-DRAFT-x.md". */
function markDraftPath(path: string, mark: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? markDraft(path, mark) : `${path.slice(0, slash + 1)}${markDraft(path.slice(slash + 1), mark)}`;
}

export async function buildProgramPack(
  prisma: PrismaClient,
  args: {
    organizationId: string;
    userId: string;
    orgName: string;
    locale: Locale;
    /**
     * Whether the drafts go in too, marked as drafts. The dashboard's
     * "Download ready documents" asks for the ready ones only unless the box
     * is ticked; the Program page and the pilot's export keep everything.
     */
    includeDrafts?: boolean;
  },
): Promise<{ zip: Uint8Array; filename: string; files: string[] }> {
  const { organizationId, userId, orgName, locale } = args;
  const includeDrafts = args.includeDrafts ?? true;
  const l = L[locale];
  const n = NAMES[locale];
  const today = new Date().toISOString().slice(0, 10);
  const entries: ZipEntry[] = [];

  // What goes in: the register's own answer, the one the dashboard shows.
  const facts = await loadDocumentFacts(prisma, organizationId);
  const documents = evaluateRegister(facts);
  const plan = planPack(documents, { includeDrafts });
  const packed = new Map(plan.include.map((d) => [d.entry.id, d]));
  const tr = await registerWords(locale);
  const gapsOf = (id: string): string[] =>
    (packed.get(id)?.gaps ?? []).map((g) => tr(`gaps.${g.key}`, { count: g.count }));
  const isDraft = (id: string) => packed.get(id)?.state === "draft";
  const draftNote = (id: string): DraftNote | null =>
    isDraft(id)
      ? {
          title: l.draftNote.title,
          intro: l.draftNote.intro,
          gaps: gapsOf(id),
          generated: fill(l.draftNote.generated, { date: today }),
        }
      : null;
  /** The files written for each register document, for the index. */
  const filesOf = new Map<string, string[]>();
  const add = (doc: string, name: string, data: ZipEntry["data"]) => {
    const draft = isDraft(doc);
    const finalName = draft ? markDraftPath(name, l.draftMark) : name;
    let body = data;
    if (draft && typeof data === "string" && finalName.endsWith(".md")) {
      // A Markdown draft opens on its gaps, as a PDF draft opens on a page of them.
      body = [
        `> **${l.draftNote.title}.** ${l.draftNote.intro}`,
        ...gapsOf(doc).map((g) => `> - ${g}`),
        "",
        data,
      ].join("\n");
    }
    entries.push({ name: finalName, data: body });
    filesOf.set(doc, [...(filesOf.get(doc) ?? []), finalName]);
  };

  // PDFs
  if (packed.has("programReport")) {
    const program = await renderProgramPdf(prisma, {
      organizationId,
      userId,
      orgName,
      locale,
      draftNote: draftNote("programReport"),
    });
    add("programReport", l.program, new Uint8Array(program.buffer));
  }
  const registerRows = await loadRegisterExportData(prisma, organizationId);
  if (packed.has("systemRegister")) {
    const registerPdf = await renderToBuffer(
      AISystemRegisterReport({ systems: registerRows, orgName, draftNote: draftNote("systemRegister"), locale }),
    );
    add("systemRegister", l.register, new Uint8Array(registerPdf));
  }

  // Policies
  const policies = packed.has("policies")
    ? await prisma.aIPolicy.findMany({
        where: { organizationId },
        orderBy: [{ type: "asc" }, { title: "asc" }],
      })
    : [];
  policies.forEach((p, i) => {
    const meta = fill(l.policyMeta, {
      type: n.policyType[p.type] ?? p.type,
      status: n.policyStatus[p.status] ?? p.status,
      version: p.currentVersion,
    });
    const dates = [
      p.effectiveDate ? `${l.effective}: ${day(p.effectiveDate)}` : "",
      p.reviewDate ? `${l.review}: ${day(p.reviewDate)}` : "",
    ].filter(Boolean);
    const md = [
      `# ${p.title}`,
      "",
      `${meta}${dates.length ? ` · ${dates.join(" · ")}` : ""}`,
      "",
      ...(p.description ? [`## ${l.description}`, "", p.description, ""] : []),
      `## ${l.text}`,
      "",
      p.content ?? "",
      "",
    ].join("\n");
    add("policies", `${l.policiesDir}/${String(i + 1).padStart(2, "0")}-${fileSlug(p.title)}.md`, md);
  });

  // Obligations
  if (packed.has("obligationsCalendar")) {
    const obligations = await getObligationsData(prisma, organizationId, locale);
    const relevant = obligations.rows.filter((r) => r.applicability !== "does-not-apply");
    const obligationsMd = [
      `# ${l.obligationsTitle}: ${orgName}`,
      "",
      l.obligationsIntro,
      "",
      `| ${l.colDate} | ${l.colInstrument} | ${l.colProvision} | ${l.colObligation} | ${l.colApplies} |`,
      "|---|---|---|---|---|",
      ...relevant.map(
        (r) =>
          `| ${r.dateIso.slice(0, 10)} | ${mdCell(n.instrument[r.instrument] ?? r.instrument)} | ${mdCell(r.provision)} | ${mdCell(r.title)} | ${l.applies[r.applicability] ?? r.applicability} |`,
      ),
      "",
      obligations.reviewMarker,
      "",
    ].join("\n");
    add("obligationsCalendar", l.obligationsMd, obligationsMd);
    add(
      "obligationsCalendar",
      l.obligationsIcs,
      buildIcs(
        relevant.map((r) => ({
          uid: `${r.id}-${organizationId}@aisentinel`,
          date: r.dateIso.slice(0, 10),
          summary: `${n.instrument[r.instrument] ?? r.instrument} ${r.provision}: ${r.title}`,
          description: [
            r.whatItMeans,
            r.inScope.length ? r.inScope.map((s) => s.name).join(", ") : "",
            l.applies[r.applicability] ?? "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        })),
        { calendarName: fill(l.calendarName, { org: orgName }) },
      ),
    );
  }

  // Per-system documents: the cross-border documents (which need declared
  // places, as the register says) and the data flow (part of the register).
  const perSystemDocs = ["impactAssessment", "notice", "humanReviewProtocol"].some((id) => packed.has(id));
  const systems =
    perSystemDocs || packed.has("systemRegister")
      ? await prisma.aISystem.findMany({
          where: { organizationId, status: { not: "RETIRED" } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];
  for (const system of systems) {
    const dir = `${l.systemsDir}/${fileSlug(system.name)}`;
    if (perSystemDocs) {
      const scope = await loadSystemScope(prisma, organizationId, system.id);
      if (scope.jurisdictionsDeclared) {
        const assessment = await prisma.aIAssessment.findFirst({
          where: { organizationId, aiSystemId: system.id },
          orderBy: { updatedAt: "desc" },
          select: { responses: true },
        });
        const input = {
          scope,
          answers: (assessment?.responses ?? {}) as Record<string, unknown>,
          locale,
          generatedAt: today,
        };
        const docs: [string, string, ReturnType<typeof buildAssessmentArtifact>][] = [];
        if (packed.has("impactAssessment")) {
          docs.push([
            "impactAssessment",
            locale === "es" ? "evaluacion-de-impacto.md" : "impact-assessment.md",
            buildAssessmentArtifact(input),
          ]);
          if (scope.overlayTags.includes("agentic")) {
            docs.push([
              "impactAssessment",
              locale === "es" ? "anexo-agentico.md" : "agentic-addendum.md",
              buildAgenticAddendumArtifact(input),
            ]);
          }
        }
        if (packed.has("notice")) {
          docs.push(["notice", locale === "es" ? "aviso.md" : "notice.md", buildNoticeArtifact(input)]);
        }
        if (packed.has("humanReviewProtocol")) {
          docs.push([
            "humanReviewProtocol",
            locale === "es" ? "protocolo-de-revision-humana.md" : "human-review-protocol.md",
            buildProtocolArtifact(input),
          ]);
        }
        for (const [doc, file, artifact] of docs) {
          add(doc, `${dir}/${file}`, renderArtifactMarkdown(artifact));
        }
      }
    }
    if (!packed.has("systemRegister")) continue;

    // The data flow, as facts rather than prose: who sends what in, who
    // receives what, under which contract, for how long.
    const flow = await prisma.aISystem.findFirst({
      where: { id: system.id, organizationId },
      select: {
        dataRole: true,
        transactionRole: true,
        retentionPeriod: true,
        dataSources: {
          orderBy: { createdAt: "asc" },
          select: {
            name: true,
            sourceType: true,
            origin: true,
            retentionPeriod: true,
            containsPersonalData: true,
            dataCategories: true,
            sensitiveCategories: true,
          },
        },
        dataRecipients: {
          orderBy: { createdAt: "asc" },
          select: {
            name: true,
            type: true,
            purpose: true,
            dataCategories: true,
            sensitiveCategories: true,
            contractRef: true,
            transferMechanism: true,
            retentionPeriod: true,
          },
        },
      },
    });
    if (flow) {
      const md = [`# ${l.flowTitle}: ${system.name}`, ""];
      md.push(`${l.flowRole}: ${flow.dataRole}`, "");
      if (flow.transactionRole) md.push(`${l.flowTransactionRole}: ${flow.transactionRole}`, "");
      if (flow.retentionPeriod) md.push(`${l.flowRetention}: ${flow.retentionPeriod}`, "");
      md.push(`## ${l.flowIn}`, "");
      if (flow.dataSources.length === 0) md.push(l.flowNoSources, "");
      for (const src of flow.dataSources) {
        md.push(`### ${src.name}`, "");
        md.push(
          [
            src.sourceType,
            src.origin ?? null,
            src.containsPersonalData ? l.flowPersonal : null,
            src.retentionPeriod ? `${l.flowRetention}: ${src.retentionPeriod}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          "",
        );
        if (src.dataCategories.length > 0) md.push(`${l.flowCategories}: ${src.dataCategories.join(", ")}`, "");
        if (src.sensitiveCategories.length > 0) {
          md.push(
            `${l.flowSensitive}: ${src.sensitiveCategories.map((c) => sensitiveCategoryLabel(c, locale)).join(", ")}`,
            "",
          );
        }
      }
      md.push(`## ${l.flowOut}`, "");
      if (flow.dataRecipients.length === 0) md.push(l.flowNoRecipients, "");
      for (const rec of flow.dataRecipients) {
        md.push(`### ${rec.name}`, "");
        md.push(rec.type, "");
        if (rec.purpose) md.push(rec.purpose, "");
        if (rec.sensitiveCategories.length > 0) {
          md.push(
            `${l.flowSensitive}: ${rec.sensitiveCategories.map((c) => sensitiveCategoryLabel(c, locale)).join(", ")}`,
            "",
          );
        }
        md.push(
          `${l.flowContract}: ${rec.contractRef ?? l.flowMissing} · ${l.flowRetention}: ${rec.retentionPeriod ?? l.flowMissing}${rec.transferMechanism ? ` · ${rec.transferMechanism}` : ""}`,
          "",
        );
      }
      add("systemRegister", `${dir}/${locale === "es" ? "flujo-de-datos.md" : "data-flow.md"}`, md.join("\n"));
    }
  }

  // Vendors
  if (packed.has("vendorDueDiligence")) {
    const vendors = await prisma.aIVendor.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { assessments: { orderBy: { createdAt: "desc" } } },
    });
    const vendorMd = [`# ${l.vendorsTitle}: ${orgName}`, ""];
    if (vendors.length === 0) vendorMd.push(l.noVendors, "");
    for (const v of vendors) {
      vendorMd.push(`## ${v.name}`, "", `${l.riskLevel}: ${v.riskLevel ? n.vendorRisk[v.riskLevel] ?? v.riskLevel : l.notSet}`, "");
      if (v.assessments.length === 0) vendorMd.push(l.noReview, "");
      for (const a of v.assessments) {
        vendorMd.push(
          `### ${a.title} (${n.reviewStatus[a.status] ?? a.status}${a.nextReviewDate ? ` · ${l.nextReview}: ${day(a.nextReviewDate)}` : ""})`,
          "",
          a.findings ?? "",
          "",
        );
      }
    }
    add("vendorDueDiligence", l.vendors, vendorMd.join("\n"));
  }

  // Inventory CSV, in the import format (part of the AI system register).
  if (packed.has("systemRegister")) {
    const header =
      locale === "es"
        ? ["Nombre", "Descripción", "Finalidad", "Proveedor", "Técnica", "Rol", "Estado", "Responsable", "Responsable técnico", "Datos personales", "Nivel de riesgo"]
        : ["Name", "Description", "Purpose", "Vendor", "Technique", "Role", "Status", "Business owner", "Technical owner", "Personal data", "Risk level"];
    const sep = locale === "es" ? ";" : ",";
    const csvRows = registerRows.map((r) =>
      [
        r.name,
        r.description ?? "",
        r.purpose ?? "",
        r.vendorName ?? "",
        r.technique,
        r.role,
        r.status,
        r.businessOwner ?? "",
        r.technicalOwner ?? "",
        r.processesPersonalData ? (locale === "es" ? "Sí" : "Yes") : "No",
        r.riskLevel ?? "",
      ]
        .map(csvCell)
        .join(sep),
    );
    add("systemRegister", l.inventory, `﻿${[header.join(sep), ...csvRows].join("\r\n")}\r\n`);
  }

  // Sensitive data analyses: the reasoning, not only the answer.
  if (packed.has("sensitiveData")) {
    const sensitiveRows = await prisma.sensitiveDataAssessment.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: { aiSystem: { select: { name: true } } },
    });
    const sensitiveMd = [`# ${l.sensitiveTitle}: ${orgName}`, "", SENSITIVE_FACTORS_REVIEW_MARKER[locale], ""];
    if (sensitiveRows.length === 0) sensitiveMd.push(l.noSensitive, "");
    for (const row of sensitiveRows) {
      const factors = (row.factors ?? {}) as Record<string, { rating?: string; reasoning?: string }>;
      sensitiveMd.push(`## ${row.subject}`, "");
      sensitiveMd.push(
        `${row.completedAt ? l.sensitiveCompleted : l.sensitiveOpen}${row.aiSystem ? ` · ${row.aiSystem.name}` : ""}${row.owner ? ` · ${l.sensitiveOwner}: ${row.owner}` : ""}`,
        "",
      );
      if (row.description) sensitiveMd.push(row.description, "");
      sensitiveMd.push(
        `${l.sensitiveBand}: ${row.band ?? "—"}${row.suggestedBand && row.suggestedBand !== row.band ? ` (${l.sensitiveSuggested}: ${row.suggestedBand})` : ""}`,
        "",
      );
      if (row.bandRationale) sensitiveMd.push(row.bandRationale, "");
      sensitiveMd.push(`### ${l.sensitiveFactors}`, "");
      for (const factor of SENSITIVE_FACTORS) {
        const entry = factors[factor.id];
        sensitiveMd.push(
          `- **${factor.label[locale]}** (${entry?.rating ?? "—"}): ${entry?.reasoning?.trim() || "—"}`,
        );
      }
      sensitiveMd.push("");
      if (row.decision) sensitiveMd.push(`### ${l.sensitiveDecision}`, "", row.decision, "");
      if (row.nextReviewDate) {
        sensitiveMd.push(`${l.nextReview}: ${row.nextReviewDate.toISOString().slice(0, 10)}`, "");
      }
    }
    add("sensitiveData", l.sensitive, sensitiveMd.join("\n"));
  }

  // Threat models: the builder-facing half of the record.
  if (packed.has("threatModel")) {
    const threatModels = await prisma.threatModel.findMany({
      where: { organizationId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      include: {
        aiSystem: { select: { name: true } },
        scenarios: {
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
          include: {
            controls: {
              orderBy: { createdAt: "asc" },
              include: { tests: { orderBy: { testedAt: "desc" } } },
            },
          },
        },
      },
    });
    if (threatModels.length > 0) {
      const docs = threatModels.map((m) =>
        renderThreatModelDoc(
          {
            name: m.name,
            systemSummary: m.systemSummary,
            systemName: m.aiSystem?.name ?? null,
            capabilities: m.capabilities,
            reviewedAt: m.reviewedAt,
            organizationName: orgName,
            scenarios: m.scenarios,
          },
          locale,
          new Date(),
        ),
      );
      add("threatModel", l.threats, docs.join("\n\n---\n\n"));
    }
  }

  // Assessment portfolio and model inventory: the same PDFs as their pages.
  if (packed.has("assessmentPortfolio")) {
    const rows = await loadAssessmentPortfolioData(prisma, organizationId);
    const pdf = await renderToBuffer(
      AssessmentPortfolioReport({ assessments: rows, orgName, draftNote: draftNote("assessmentPortfolio"), locale }),
    );
    add("assessmentPortfolio", l.assessmentPortfolio, new Uint8Array(pdf));
  }
  if (packed.has("modelInventory")) {
    const rows = await loadModelInventoryData(prisma, organizationId);
    const pdf = await renderToBuffer(ModelInventoryReport({ models: rows, orgName, locale }));
    add("modelInventory", l.modelInventory, new Uint8Array(pdf));
  }

  // AIUC-1 evidence, one document per agent, as the agent's page exports it.
  if (packed.has("aiuc1Evidence")) {
    const candidates = await prisma.aISystem.findMany({
      where: { organizationId, status: { not: "RETIRED" } },
      select: { id: true, name: true, technique: true, agentProfile: { select: { autonomy: true } } },
      orderBy: { name: "asc" },
    });
    const agents = candidates.filter((s) =>
      isAgentSystem({ technique: s.technique, autonomy: s.agentProfile?.autonomy }),
    );
    const rowsByAgent = await loadAgentRows(prisma, organizationId, agents.map((a) => a.id));
    const now = new Date();
    for (const agent of agents) {
      const readiness = agentReadiness(rowsByAgent.get(agent.id) ?? new Map(), now);
      const ids = [
        ...new Set(
          readiness.domains.flatMap((d) =>
            d.requirements.flatMap((r) => [
              ...r.tests.map((x) => x.recordedBy),
              ...(r.acceptance ? [r.acceptance.acceptedBy] : []),
            ]),
          ),
        ),
      ];
      const users = ids.length
        ? await prisma.user.findMany({
            where: { id: { in: ids }, organizationMemberships: { some: { organizationId } } },
            select: { id: true, name: true, email: true },
          })
        : [];
      const people = Object.fromEntries(users.map((u) => [u.id, u.name || u.email]));
      add(
        "aiuc1Evidence",
        `${l.aiuc1Dir}/${fileSlug(agent.name)}.md`,
        renderAiuc1EvidenceDoc({ agentName: agent.name, organizationName: orgName, readiness, people }, locale),
      );
    }
  }

  // The index (README) last but first in the archive, so it can describe what
  // was actually produced: every register document, its state and its files,
  // then what stayed out and why.
  const stateWord = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    return doc ? tr(`state.${doc.status.state}`) : "";
  };
  const contents = plan.include.filter((d) => (filesOf.get(d.entry.id) ?? []).length > 0);
  const leftOut = [
    ...plan.leftOut,
    // Included by the plan but nothing to write (no rows): said, not hidden.
    ...plan.include
      .filter((d) => (filesOf.get(d.entry.id) ?? []).length === 0)
      .map((d) => ({ entry: d.entry, reason: "empty" as const, doc: documents.find((x) => x.id === d.entry.id)! })),
  ];
  const reasonText = (item: (typeof leftOut)[number]) => {
    const status = item.doc.status;
    if (item.reason === "needsInput" && status.state === "needsInput") {
      return tr("needs", { input: tr(`inputs.${status.input}`) });
    }
    if (item.reason === "draftsNotRequested" && status.state === "draft") {
      return fill(l.reasons.draftsNotRequested, {
        gaps: status.gaps.map((g) => tr(`gaps.${g.key}`, { count: g.count })).join("; "),
      });
    }
    return l.reasons[item.reason === "needsInput" ? "empty" : item.reason];
  };
  const confirmation = await getConfirmationSummary(prisma, organizationId);
  const pending = pendingPacks(["EU_AI_ACT", "CA_CCPA_ADMT", "EU_GDPR", "CO_SB_26_189", "TX_TRAIGA", "WA_AI_RULES"]);
  const describe: [string, string, string][] = [
    ["programReport", l.program, l.items.program],
    ["systemRegister", l.register, l.items.register],
    ["policies", `${l.policiesDir}/`, l.items.policies],
    ["obligationsCalendar", `${l.obligationsMd}, ${l.obligationsIcs}`, l.items.obligations],
    ["impactAssessment", `${l.systemsDir}/`, l.items.systems],
    ["vendorDueDiligence", l.vendors, l.items.vendors],
    ["systemRegister", l.inventory, l.items.inventory],
    ["sensitiveData", l.sensitive, l.items.sensitive],
    ["threatModel", l.threats, l.items.threats],
    ["assessmentPortfolio", l.assessmentPortfolio, l.items.assessmentPortfolio],
    ["modelInventory", l.modelInventory, l.items.modelInventory],
    ["aiuc1Evidence", `${l.aiuc1Dir}/`, l.items.aiuc1],
  ];
  const readme = [
    `# ${l.title}: ${orgName}`,
    "",
    `${l.generated}: ${today}`,
    "",
    includeDrafts ? l.index.withDrafts : l.index.readyOnly,
    "",
    `## ${l.contents}`,
    "",
    ...(contents.length === 0
      ? [l.index.empty]
      : [
          `| ${l.index.colDocument} | ${l.index.colState} | ${l.index.colFiles} |`,
          "|---|---|---|",
          ...contents.map((d) => {
            const files = filesOf.get(d.entry.id) ?? [];
            const shown = files.length > 4 ? [...files.slice(0, 3), `+${files.length - 3}`] : files;
            return `| ${mdCell(tr(`items.${d.entry.id}`))} | ${stateWord(d.entry.id)} | ${shown.map((f) => (f.startsWith("+") ? f : `\`${f}\``)).join(", ")} |`;
          }),
        ]),
    "",
    ...(leftOut.length > 0
      ? [`## ${l.index.notIncluded}`, "", ...leftOut.map((item) => `- ${tr(`items.${item.entry.id}`)}: ${reasonText(item)}`), ""]
      : []),
    `## ${l.index.whatEachHolds}`,
    "",
    ...describe
      .filter(([id]) => (filesOf.get(id) ?? []).length > 0)
      .map(([, file, text]) => `- \`${file}\`: ${text}`),
    `- \`${l.manifest}\`: ${l.items.manifest}`,
    "",
    `## ${l.status}`,
    "",
    confirmation.total > 0
      ? fill(l.assurance, { pct: confirmation.weightedPct, confirmed: confirmation.confirmed, total: confirmation.total })
      : "",
    "",
    l.drafts,
    "",
    pending.length > 0
      ? fill(l.pending, { packs: pending.map((id) => n.pack[id] ?? id).join(", ") })
      : l.allSignedOff,
    "",
    fill(l.index.manifestNote, { file: l.manifest }),
    "",
  ].join("\n");
  entries.unshift({ name: l.readme, data: readme });

  // The manifest goes in last and covers every other file: a reader can check
  // any single file in the archive without trusting the archive as a whole.
  const stamp = await exportStamp();
  const manifestEntries: ManifestEntry[] = entries.map((e) => {
    const bytes =
      typeof e.data === "string" ? new TextEncoder().encode(e.data) : e.data;
    return { name: e.name, bytes: bytes.length, sha256: sha256(bytes) };
  });
  entries.push({
    name: l.manifest,
    data: renderManifest(stamp, manifestEntries, locale),
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Organization",
      entityId: organizationId,
      action: "EXPORT_PROGRAM_PACK",
      changes: {
        format: "zip",
        locale,
        files: entries.length,
        includeDrafts,
        documents: contents.map((d) => d.entry.id),
        appVersion: stamp.appVersion,
        commit: stamp.commit,
        generatedAt: stamp.generatedAt,
      },
    },
  });

  const filename = `${locale === "es" ? "Paquete-programa-IA" : "AI-Program-Pack"}-${fileSlug(orgName)}-${today}.zip`;
  return { zip: createZip(entries), filename, files: entries.map((e) => e.name) };
}
