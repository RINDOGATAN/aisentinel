// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One agent's AIUC-1 evidence file, as Markdown.
 *
 * Written for the auditor and for the team preparing for them. It leads with
 * what stands between the agent and the audit (open items), then walks the
 * six domains: each requirement's state, its latest test in full (method,
 * result, what was observed, where the evidence lives, who and when), any
 * acceptance or not-applicable reason, and the earlier tests.
 *
 * Deterministic: the same record gives the same text, so the SHA-256 in the
 * footer identifies it. The route adds the generation stamp.
 */

import { AIUC1_FRAMEWORK } from "@/config/aiuc1-requirements";
import {
  retestDue,
  type AgentReadiness,
  type RequirementState,
  type Tally,
} from "@/config/aiuc1-evidence";

type Locale = "en" | "es";

const DOMAIN_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    A: "Data and privacy",
    B: "Security",
    C: "Safety",
    D: "Reliability",
    E: "Accountability",
    F: "Society",
  },
  es: {
    A: "Datos y privacidad",
    B: "Ciberseguridad",
    C: "Prevención de daños",
    D: "Fiabilidad",
    E: "Rendición de cuentas",
    F: "Sociedad",
  },
};

const L = {
  en: {
    title: "AIUC-1 evidence file",
    agent: "Agent",
    organization: "Organization",
    standard: "Standard",
    standardLine: (v: string, read: string) => `AIUC-1, release ${v} (read ${read})`,
    readyYes: "Ready for the audit: every applicable requirement has a current pass or an accepted partial result.",
    readyNo: "Not yet ready for the audit.",
    overall: "Overall",
    openItems: "Open items",
    noOpenItems: "None.",
    domains: "The six domains",
    state: {
      "not-tested": "Not tested",
      pass: "Pass",
      retest: "Passed, due for a retest",
      partial: "Partial",
      fail: "Fail",
      "not-applicable": "Not applicable",
    } satisfies Record<RequirementState, string>,
    acceptedPartial: "Partial, accepted",
    reasonMissing: "Marked not applicable without a reason, so it still counts as applicable.",
    optional: "Supplemental in the standard (optional)",
    latest: "Latest test",
    method: "What was done",
    result: "Result",
    observed: "What was observed",
    evidence: "Where the evidence lives",
    performedBy: "Performed by",
    recordedBy: "Recorded by",
    testedOn: "Tested on",
    retestBy: "Retest by",
    accepted: "Accepted by",
    reason: "Reason",
    notApplicableReason: "Why it does not apply",
    earlier: "Earlier tests",
    otherEvidence: "Other evidence",
    none: "None recorded.",
    source: "Requirement titles are the standard's own; the text of each requirement is published at",
    notACertificate:
      "This file records the tests the organization ran and what it decided. It is not a certificate: AIUC-1 certification needs an accredited third-party audit.",
    tally: (t: Tally) =>
      `${t.tested} of ${t.applicable} tested, ${t.ready} counting (${t.pass} pass, ${t.acceptedPartial} accepted partial), ${t.fail} fail, ${t.partial - t.acceptedPartial} partial not accepted, ${t.retest} due for a retest, ${t.notApplicable} not applicable`,
  },
  es: {
    title: "Expediente de pruebas AIUC-1",
    agent: "Agente",
    organization: "Organización",
    standard: "Norma",
    standardLine: (v: string, read: string) => `AIUC-1, versión ${v} (consultada el ${read})`,
    readyYes: "Listo para la auditoría: cada requisito aplicable tiene un resultado superado vigente o un resultado parcial aceptado.",
    readyNo: "Todavía no está listo para la auditoría.",
    overall: "En conjunto",
    openItems: "Pendientes",
    noOpenItems: "Ninguno.",
    domains: "Los seis ámbitos",
    state: {
      "not-tested": "Sin probar",
      pass: "Superada",
      retest: "Superada, toca repetirla",
      partial: "Parcial",
      fail: "No superada",
      "not-applicable": "No aplica",
    } satisfies Record<RequirementState, string>,
    acceptedPartial: "Parcial, aceptada",
    reasonMissing: "Marcado como no aplicable sin motivo, así que sigue contando como aplicable.",
    optional: "Complementario en la norma (opcional)",
    latest: "Última prueba",
    method: "Qué se hizo",
    result: "Resultado",
    observed: "Qué se observó",
    evidence: "Dónde están las pruebas",
    performedBy: "Realizada por",
    recordedBy: "Registrada por",
    testedOn: "Fecha de la prueba",
    retestBy: "Repetir antes del",
    accepted: "Aceptada por",
    reason: "Motivo",
    notApplicableReason: "Por qué no aplica",
    earlier: "Pruebas anteriores",
    otherEvidence: "Otras pruebas documentales",
    none: "Nada registrado.",
    source: "Los títulos de los requisitos son los de la propia norma; el texto de cada requisito está publicado en",
    notACertificate:
      "Este expediente recoge las pruebas que hizo la organización y lo que decidió. No es un certificado: la certificación AIUC-1 exige una auditoría externa acreditada.",
    tally: (t: Tally) =>
      `${t.tested} de ${t.applicable} probados, ${t.ready} cuentan (${t.pass} superados, ${t.acceptedPartial} parciales aceptados), ${t.fail} no superados, ${t.partial - t.acceptedPartial} parciales sin aceptar, ${t.retest} por repetir, ${t.notApplicable} no aplican`,
  },
} as const;

const RESULT = {
  en: { PASS: "Pass", PARTIAL: "Partial", FAIL: "Fail" },
  es: { PASS: "Superada", PARTIAL: "Parcial", FAIL: "No superada" },
} as const;

export interface Aiuc1EvidenceDocInput {
  agentName: string;
  organizationName: string;
  readiness: AgentReadiness;
  /** Display names for user ids; an unknown id is shown as it is. */
  people: Record<string, string>;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Keeps a free-text value on its line: no Markdown headings or breaks sneak in. */
function inline(text: string): string {
  return text.replace(/\s*\n\s*/g, " / ").trim();
}

export function renderAiuc1EvidenceDoc(input: Aiuc1EvidenceDocInput, locale: Locale): string {
  const t = L[locale];
  const who = (id: string) => input.people[id] ?? id;
  const { readiness } = input;
  const out: string[] = [];

  out.push(`# ${t.title}: ${inline(input.agentName)}`, "");
  out.push(`- ${t.agent}: ${inline(input.agentName)}`);
  out.push(`- ${t.organization}: ${inline(input.organizationName)}`);
  out.push(`- ${t.standard}: ${t.standardLine(AIUC1_FRAMEWORK.version, AIUC1_FRAMEWORK.readOn)}`);
  out.push("");
  out.push(`**${readiness.overall.readyForAudit ? t.readyYes : t.readyNo}**`, "");
  out.push(`${t.overall}: ${t.tally(readiness.overall)}.`, "");

  // Open items first: what stands between this agent and the audit.
  out.push(`## ${t.openItems}`, "");
  const open = readiness.domains.flatMap((d) => d.requirements.filter((r) => r.applicable && !r.ready));
  if (open.length === 0) out.push(t.noOpenItems);
  for (const r of open) {
    const note = r.reasonMissing ? ` ${t.reasonMissing}` : "";
    out.push(`- ${r.code} ${r.requirement.title}: ${t.state[r.state]}.${note}`);
  }
  out.push("");

  out.push(`## ${t.domains}`, "");
  for (const d of readiness.domains) {
    out.push(`### ${d.code}. ${DOMAIN_LABELS[locale][d.code]}`, "");
    out.push(`${t.tally(d)}.`, "");
    for (const r of d.requirements) {
      const stateText =
        r.state === "partial" && r.acceptance ? t.acceptedPartial : t.state[r.state];
      out.push(`#### ${r.code} ${r.requirement.title}: ${stateText}`, "");
      if (r.requirement.application === "supplemental") out.push(`- ${t.optional}`);
      if (r.reasonMissing) out.push(`- ${t.reasonMissing}`);
      if (r.notApplicableReason) out.push(`- ${t.notApplicableReason}: ${inline(r.notApplicableReason)}`);
      if (r.latest) {
        const x = r.latest;
        out.push(`- ${t.latest}: ${RESULT[locale][x.result]}`);
        out.push(`  - ${t.testedOn}: ${day(x.testedAt)}`);
        if (x.result === "PASS") out.push(`  - ${t.retestBy}: ${day(retestDue(x.testedAt))}`);
        out.push(`  - ${t.method}: ${inline(x.method)}`);
        if (x.observed) out.push(`  - ${t.observed}: ${inline(x.observed)}`);
        if (x.evidenceRef) out.push(`  - ${t.evidence}: ${inline(x.evidenceRef)}`);
        if (x.performedBy) out.push(`  - ${t.performedBy}: ${inline(x.performedBy)}`);
        out.push(`  - ${t.recordedBy}: ${inline(who(x.recordedBy))}, ${day(x.recordedAt)}`);
      } else if (r.applicable) {
        out.push(`- ${t.latest}: ${t.none}`);
      }
      if (r.acceptance) {
        out.push(
          `- ${t.accepted}: ${inline(who(r.acceptance.acceptedBy))}, ${day(r.acceptance.acceptedAt)}. ${t.reason}: ${inline(r.acceptance.reason)}`,
        );
      }
      const earlier = r.tests.slice(1);
      if (earlier.length > 0) {
        out.push(`- ${t.earlier}:`);
        for (const x of earlier) {
          out.push(`  - ${day(x.testedAt)}, ${RESULT[locale][x.result]}: ${inline(x.method)}`);
        }
      }
      if (r.otherEvidence.length > 0) {
        out.push(`- ${t.otherEvidence}:`);
        for (const e of r.otherEvidence) {
          out.push(`  - ${inline(e.title)}${e.url ? ` (${e.url})` : ""}, ${day(e.addedAt)}`);
        }
      }
      out.push("");
    }
  }

  out.push("---", "");
  out.push(`${t.source} ${AIUC1_FRAMEWORK.sourceUrl}`, "");
  out.push(t.notACertificate, "");
  return out.join("\n");
}
