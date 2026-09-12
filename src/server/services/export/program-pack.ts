// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The program pack: everything a governance professional hands to a board, a
 * regulator, an auditor or a client, in one ZIP and in the reader's language.
 *
 *   README                      what is inside, what is still a draft, and why
 *   program PDF                 the same report the Program page exports
 *   AI system register PDF
 *   policies/                   one Markdown document per policy
 *   obligations (.md and .ics)  the dated calendar, importable into Outlook
 *   systems/<name>/             the cross-border documents per system
 *   vendor due diligence (.md)
 *   AI inventory (.csv)         in the spreadsheet-import format, so it
 *                               round-trips into another organization
 *
 * Every generated document keeps its own gap blocks and review markers; the
 * README repeats the one thing a reader must not miss: which parts are drafts
 * and which legal packs are still awaiting sign-off.
 */

import type { PrismaClient } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
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
    manifest: "09-MANIFEST.txt",
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
    manifest: "09-MANIFIESTO.txt",
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

export async function buildProgramPack(
  prisma: PrismaClient,
  args: { organizationId: string; userId: string; orgName: string; locale: Locale },
): Promise<{ zip: Uint8Array; filename: string; files: string[] }> {
  const { organizationId, userId, orgName, locale } = args;
  const l = L[locale];
  const n = NAMES[locale];
  const today = new Date().toISOString().slice(0, 10);
  const entries: ZipEntry[] = [];

  // PDFs
  const program = await renderProgramPdf(prisma, { organizationId, userId, orgName, locale });
  entries.push({ name: l.program, data: new Uint8Array(program.buffer) });
  const registerRows = await loadRegisterExportData(prisma, organizationId);
  const registerPdf = await renderToBuffer(AISystemRegisterReport({ systems: registerRows, orgName }));
  entries.push({ name: l.register, data: new Uint8Array(registerPdf) });

  // Policies
  const policies = await prisma.aIPolicy.findMany({
    where: { organizationId },
    orderBy: [{ type: "asc" }, { title: "asc" }],
  });
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
    entries.push({
      name: `${l.policiesDir}/${String(i + 1).padStart(2, "0")}-${fileSlug(p.title)}.md`,
      data: md,
    });
  });

  // Obligations
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
  entries.push({ name: l.obligationsMd, data: obligationsMd });
  entries.push({
    name: l.obligationsIcs,
    data: buildIcs(
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
  });

  // Per-system cross-border documents
  const systems = await prisma.aISystem.findMany({
    where: { organizationId, status: { not: "RETIRED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  let jurisdictionsDeclared = true;
  for (const system of systems) {
    const scope = await loadSystemScope(prisma, organizationId, system.id);
    if (!scope.jurisdictionsDeclared) {
      jurisdictionsDeclared = false;
      break;
    }
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
    const dir = `${l.systemsDir}/${fileSlug(system.name)}`;
    const docs: [string, ReturnType<typeof buildAssessmentArtifact>][] = [
      [locale === "es" ? "evaluacion-de-impacto.md" : "impact-assessment.md", buildAssessmentArtifact(input)],
      [locale === "es" ? "aviso.md" : "notice.md", buildNoticeArtifact(input)],
      [locale === "es" ? "protocolo-de-revision-humana.md" : "human-review-protocol.md", buildProtocolArtifact(input)],
    ];
    if (scope.overlayTags.includes("agentic")) {
      docs.push([locale === "es" ? "anexo-agentico.md" : "agentic-addendum.md", buildAgenticAddendumArtifact(input)]);
    }
    for (const [file, artifact] of docs) {
      entries.push({ name: `${dir}/${file}`, data: renderArtifactMarkdown(artifact) });
    }

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
      entries.push({
        name: `${dir}/${locale === "es" ? "flujo-de-datos.md" : "data-flow.md"}`,
        data: md.join("\n"),
      });
    }
  }

  // Vendors
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
  entries.push({ name: l.vendors, data: vendorMd.join("\n") });

  // Inventory CSV, in the import format
  // Sensitive data analyses: the reasoning, not only the answer.
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
  entries.push({ name: l.sensitive, data: sensitiveMd.join("\n") });

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
  entries.push({ name: l.inventory, data: `﻿${[header.join(sep), ...csvRows].join("\r\n")}\r\n` });

  // README last, so it can describe what was actually produced
  const confirmation = await getConfirmationSummary(prisma, organizationId);
  const pending = pendingPacks(["EU_AI_ACT", "CA_CCPA_ADMT", "EU_GDPR", "CO_SB_26_189", "TX_TRAIGA", "WA_AI_RULES"]);
  const readme = [
    `# ${l.title}: ${orgName}`,
    "",
    `${l.generated}: ${today}`,
    "",
    `## ${l.contents}`,
    "",
    `- \`${l.program}\`: ${l.items.program}`,
    `- \`${l.register}\`: ${l.items.register}`,
    `- \`${l.policiesDir}/\`: ${policies.length > 0 ? l.items.policies : l.noPolicies}`,
    `- \`${l.obligationsMd}\`, \`${l.obligationsIcs}\`: ${l.items.obligations}`,
    `- \`${l.systemsDir}/\`: ${jurisdictionsDeclared ? l.items.systems : l.noJurisdictions}`,
    `- \`${l.vendors}\`: ${l.items.vendors}`,
    `- \`${l.inventory}\`: ${l.items.inventory}`,
    `- \`${l.sensitive}\`: ${l.items.sensitive}`,
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
  ].join("\n");
  entries.unshift({ name: l.readme, data: readme });

  if (!jurisdictionsDeclared) {
    // Drop any partial per-system output produced before the break.
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].name.startsWith(`${l.systemsDir}/`)) entries.splice(i, 1);
    }
  }

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
        appVersion: stamp.appVersion,
        commit: stamp.commit,
        generatedAt: stamp.generatedAt,
      },
    },
  });

  const filename = `${locale === "es" ? "Paquete-programa-IA" : "AI-Program-Pack"}-${fileSlug(orgName)}-${today}.zip`;
  return { zip: createZip(entries), filename, files: entries.map((e) => e.name) };
}
