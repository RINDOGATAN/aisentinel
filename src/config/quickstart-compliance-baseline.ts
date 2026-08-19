// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Quickstart compliance baseline.
 *
 * When the quickstart builds a program, it creates real artifacts: a
 * registered system with a documented risk classification, a drafted policy
 * pack, oversight gates, and Art. 50 transparency profiles. This module maps
 * those FACTS onto the framework requirements they genuinely evidence, so a
 * five-minute setup produces an honestly pre-assessed compliance picture
 * instead of a wall of NOT_ASSESSED.
 *
 * Principles (do not loosen without legal review):
 * - Nothing is ever auto-marked COMPLIANT. The strongest claim is
 *   PARTIALLY_COMPLIANT, always with evidence naming the artifact.
 * - NOT_APPLICABLE is used only where the reason is structural and stated:
 *   scope/definitional articles, and provider-side obligations for systems
 *   the organization merely deploys.
 * - Everything else stays NOT_ASSESSED.
 *
 * Evidence text ends with an explicit review prompt; these are starting
 * points for the compliance workflow, not conclusions.
 *
 * lawReviewedAsOf: pending — rides the next content sign-off round together
 * with program-guidance.ts.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";

/**
 * Rule-pack version. Bump on any content change (rules, statuses, evidence
 * text) so exported artifacts can state which revision produced them.
 * See src/config/rule-pack-versions.ts.
 */
export const QUICKSTART_BASELINE_VERSION = "2026.08.1";
export const QUICKSTART_BASELINE_LAW_REVIEWED_AS_OF = "2026-08-18";

export type BaselineFramework = "EU_AI_ACT" | "NIST_AI_RMF" | "ISO_42001";
export type BaselineStatus = "PARTIALLY_COMPLIANT" | "NOT_APPLICABLE";

export interface BaselineRule {
  framework: BaselineFramework;
  /** ComplianceRequirement.code — unknown codes are silently skipped */
  code: string;
  status: BaselineStatus;
  /** apply only to systems that received an oversight gate */
  requiresGate?: boolean;
  /** apply only when the run drafted/derived a policy pack (lawfirm or industry path) */
  requiresPolicies?: boolean;
  /** apply only to generative systems that received an Art. 50 transparency profile */
  requiresTransparencyProfile?: boolean;
  evidence: Localized;
}

const REVIEW_PROMPT: Localized = {
  en: "Baseline set by Quick Start from generated artifacts — review and confirm.",
  es: "Base establecida por el Inicio Rápido a partir de los artefactos generados: revisar y confirmar.",
};

const ev = (l: Localized): Localized => ({
  en: `${l.en} ${REVIEW_PROMPT.en}`,
  es: `${l.es} ${REVIEW_PROMPT.es}`,
});

export const QUICKSTART_COMPLIANCE_BASELINE: BaselineRule[] = [
  // ── EU AI Act ─────────────────────────────────────────────────────
  {
    framework: "EU_AI_ACT",
    code: "Art. 1",
    status: "NOT_APPLICABLE",
    evidence: ev({
      en: "Subject-matter provision; imposes no organisational obligation.",
      es: "Disposición sobre el objeto del Reglamento; no impone obligaciones a la organización.",
    }),
  },
  {
    framework: "EU_AI_ACT",
    code: "Art. 2",
    status: "NOT_APPLICABLE",
    evidence: ev({
      en: "Scope provision; imposes no organisational obligation.",
      es: "Disposición sobre el ámbito de aplicación; no impone obligaciones a la organización.",
    }),
  },
  {
    framework: "EU_AI_ACT",
    code: "Art. 3",
    status: "NOT_APPLICABLE",
    evidence: ev({
      en: "Definitions provision; imposes no organisational obligation.",
      es: "Disposición de definiciones; no impone obligaciones a la organización.",
    }),
  },
  {
    framework: "EU_AI_ACT",
    code: "Art. 4",
    status: "PARTIALLY_COMPLIANT",
    requiresPolicies: true,
    evidence: ev({
      en: "The AI Use Policy drafted by Quick Start mandates AI-awareness training for all personnel before tool access; training delivery and records are pending.",
      es: "La Política de uso de IA generada por el Inicio Rápido exige formación de concienciación sobre IA para todo el personal antes del acceso a las herramientas; la impartición y los registros de formación están pendientes.",
    }),
  },
  {
    framework: "EU_AI_ACT",
    code: "Art. 50",
    status: "PARTIALLY_COMPLIANT",
    requiresTransparencyProfile: true,
    evidence: ev({
      en: "An Art. 50 transparency profile has been created for this system documenting the applicable obligations, and the disclosure policy covering AI-generated output is drafted.",
      es: "Se ha creado un perfil de transparencia del Art. 50 para este sistema que documenta las obligaciones aplicables, y la política de comunicación sobre resultados generados por IA está redactada.",
    }),
  },
  {
    framework: "EU_AI_ACT",
    code: "Art. 50(1)",
    status: "NOT_APPLICABLE",
    evidence: ev({
      en: "Provider-side obligation (interaction disclosure design); the organisation deploys this third-party system and does not provide it.",
      es: "Obligación del proveedor (diseño de la información sobre interacción con IA); la organización actúa como responsable del despliegue de este sistema de terceros y no como proveedor.",
    }),
  },
  {
    framework: "EU_AI_ACT",
    code: "Art. 50(2)",
    status: "NOT_APPLICABLE",
    evidence: ev({
      en: "Provider-side obligation (machine-readable marking of synthetic content); the organisation deploys this third-party system and does not provide it.",
      es: "Obligación del proveedor (marcado legible por máquina del contenido sintético); la organización actúa como responsable del despliegue de este sistema de terceros y no como proveedor.",
    }),
  },
  {
    framework: "EU_AI_ACT",
    code: "Art. 50(3)",
    status: "NOT_APPLICABLE",
    evidence: ev({
      en: "No emotion-recognition or biometric-categorisation capability is in scope for this system as deployed.",
      es: "El sistema, tal como se despliega, no incluye capacidades de reconocimiento de emociones ni de categorización biométrica.",
    }),
  },
  // ── NIST AI RMF ───────────────────────────────────────────────────
  {
    framework: "NIST_AI_RMF",
    code: "GOVERN",
    status: "PARTIALLY_COMPLIANT",
    requiresPolicies: true,
    evidence: ev({
      en: "Governance foundation in place: a six-policy pack is drafted, an accountable AI role is designated in policy, and every system is registered with a documented risk classification.",
      es: "Base de gobernanza establecida: paquete de seis políticas redactado, rol responsable de IA designado en las políticas y todos los sistemas registrados con clasificación de riesgo documentada.",
    }),
  },
  {
    framework: "NIST_AI_RMF",
    code: "GOVERN 1",
    status: "PARTIALLY_COMPLIANT",
    requiresPolicies: true,
    evidence: ev({
      en: "Policies, processes and procedures drafted (AI use, governance, data governance, procurement, incident response, transparency); approval and publication pending.",
      es: "Políticas, procesos y procedimientos redactados (uso de IA, gobernanza, gobernanza de datos, contratación, respuesta a incidentes, transparencia); aprobación y publicación pendientes.",
    }),
  },
  {
    framework: "NIST_AI_RMF",
    code: "GOVERN 2",
    status: "PARTIALLY_COMPLIANT",
    requiresPolicies: true,
    evidence: ev({
      en: "Accountability structures defined in the drafted AI Use Policy: designated AI officer role, approved-tool register, and escalation paths.",
      es: "Estructuras de responsabilidad definidas en la Política de uso de IA redactada: rol de Responsable de IA, registro de herramientas aprobadas y vías de escalado.",
    }),
  },
  {
    framework: "NIST_AI_RMF",
    code: "MAP",
    status: "PARTIALLY_COMPLIANT",
    evidence: ev({
      en: "Context mapped: the system is registered with purpose, technique, deployment role and vendor, and carries a documented EU AI Act risk classification.",
      es: "Contexto cartografiado: el sistema está registrado con finalidad, técnica, rol de despliegue y proveedor, y cuenta con una clasificación de riesgo documentada conforme al Reglamento de IA de la UE.",
    }),
  },
  {
    framework: "NIST_AI_RMF",
    code: "MAP 1",
    status: "PARTIALLY_COMPLIANT",
    evidence: ev({
      en: "Context established through the AI system register entry: intended purpose, deployment setting, and personal-data processing are documented.",
      es: "Contexto establecido mediante la entrada del registro de sistemas de IA: finalidad prevista, entorno de despliegue y tratamiento de datos personales documentados.",
    }),
  },
  {
    framework: "NIST_AI_RMF",
    code: "MANAGE 1",
    status: "PARTIALLY_COMPLIANT",
    requiresGate: true,
    evidence: ev({
      en: "A pre-deployment oversight gate is defined for this system as an internal control; the gate review is pending.",
      es: "Se ha definido un punto de control previo al despliegue para este sistema como control interno; la revisión del control está pendiente.",
    }),
  },
  // ── ISO/IEC 42001 ─────────────────────────────────────────────────
  {
    framework: "ISO_42001",
    code: "5.2",
    status: "PARTIALLY_COMPLIANT",
    requiresPolicies: true,
    evidence: ev({
      en: "AI policy pack drafted covering use, governance, data governance, procurement, incident response and transparency; management approval pending.",
      es: "Paquete de políticas de IA redactado (uso, gobernanza, gobernanza de datos, contratación, respuesta a incidentes y transparencia); aprobación por la dirección pendiente.",
    }),
  },
  {
    framework: "ISO_42001",
    code: "5.3",
    status: "PARTIALLY_COMPLIANT",
    requiresPolicies: true,
    evidence: ev({
      en: "Roles, responsibilities and authorities for AI governance are defined in the drafted policy pack (AI officer, approvers, oversight assignments).",
      es: "Los roles, responsabilidades y autoridades de la gobernanza de IA están definidos en el paquete de políticas redactado (Responsable de IA, aprobadores, asignaciones de supervisión).",
    }),
  },
  {
    framework: "ISO_42001",
    code: "6.1.2",
    status: "PARTIALLY_COMPLIANT",
    evidence: ev({
      en: "An AI risk classification with documented rationale exists for this system; the full risk assessment process (treatment, acceptance) is pending.",
      es: "Existe una clasificación de riesgo de IA con justificación documentada para este sistema; el proceso completo de evaluación de riesgos (tratamiento, aceptación) está pendiente.",
    }),
  },
];

/** Convenience: rules grouped by framework+code for the executor. */
export function baselineRuleKey(rule: BaselineRule): string {
  return `${rule.framework}:${rule.code}`;
}

/**
 * Notes written into the Art. 50 transparency profile the quickstart creates
 * for generative systems: a documented deployer-posture review, not a claim
 * that obligations are met.
 */
export const TRANSPARENCY_PROFILE_NOTES: Localized = {
  en: "Initial Art. 50 review generated by Quick Start for a third-party generative AI system used by the organisation as deployer: provider-side duties (interaction disclosure design, machine-readable marking) rest with the system's provider; no emotion-recognition or biometric-categorisation capability is in scope; AI-generated text is produced for professional work product under human review, not published to inform the public on matters of public interest. Re-review if the deployment changes (public-facing chatbots, published content, or new capabilities). Baseline set by Quick Start — review and confirm.",
  es: "Revisión inicial del Art. 50 generada por el Inicio Rápido para un sistema de IA generativa de terceros utilizado por la organización como responsable del despliegue: las obligaciones del proveedor (diseño de la información sobre interacción, marcado legible por máquina) corresponden al proveedor del sistema; no hay capacidades de reconocimiento de emociones ni de categorización biométrica en el alcance; el texto generado por IA se destina a producto de trabajo profesional bajo revisión humana, no a informar al público sobre asuntos de interés general. Reevaluar si el despliegue cambia (chatbots de cara al público, contenido publicado o nuevas capacidades). Base establecida por el Inicio Rápido: revisar y confirmar.",
};
