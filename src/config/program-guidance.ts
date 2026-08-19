// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program guidance content
 *
 * Prescriptive layer of the AI Governance Program page: per-category rollout
 * recommendations (lawfirm profile), gap → action templates for the 90-day
 * plan, and the professional-duties coverage grid mapping each duty to the
 * controls the program puts in place.
 *
 * Conventions mirror src/config/lawfirm-ai-toolkit.ts: all prose is
 * Localized (en/es) because it renders into the exported program report;
 * legal-adjacent prose carries the review marker.
 *
 * lawReviewedAsOf: see PROGRAM_GUIDANCE_LAW_REVIEWED_AS_OF.
 * Professional-responsibility sign-off PENDING — this file has not yet been
 * through the sign-off dossier round; treat prose as editorial until then.
 */

import {
  LAWFIRM_POLICY_PACK,
  type Localized,
} from "./lawfirm-ai-toolkit";

// ── Review marker ───────────────────────────────────────────────────

/** Guidance content review date. Sign-off pending. */
export const PROGRAM_GUIDANCE_LAW_REVIEWED_AS_OF = "2026-08-18";

export const PROGRAM_GUIDANCE_REVIEW_MARKER: Localized = {
  en: `Law reviewed as of ${PROGRAM_GUIDANCE_LAW_REVIEWED_AS_OF}; professional-responsibility sign-off pending.`,
  es: `Revisión jurídica a fecha de ${PROGRAM_GUIDANCE_LAW_REVIEWED_AS_OF}; pendiente de validación de responsabilidad profesional.`,
};

const withMarker = (l: Localized): Localized => ({
  en: `${l.en}\n\n${PROGRAM_GUIDANCE_REVIEW_MARKER.en}`,
  es: `${l.es}\n\n${PROGRAM_GUIDANCE_REVIEW_MARKER.es}`,
});

// ── Types ───────────────────────────────────────────────────────────

export type RolloutStage = "ADOPT" | "PILOT" | "RESTRICT" | "HOLD";

export interface RolloutRecommendation {
  /** Lawfirm category id from LAWFIRM_TOOL_CATEGORIES */
  categoryId: string;
  stage: RolloutStage;
  summary: Localized;
  preconditions: Localized[];
}

/**
 * Gap identifiers produced by the maturity model.
 * MUST stay in sync with src/server/services/program/maturity.ts (built in
 * parallel; not imported here so this config stays a leaf module — the
 * program router cross-checks the two at runtime/tests).
 */
export type GapId =
  | "no-systems"
  | "unclassified-systems"
  | "high-risk-without-gate"
  | "overdue-gates"
  | "draft-policies"
  | "unlinked-policies"
  | "missing-transparency-profiles"
  | "marking-overdue"
  | "unassessed-vendors"
  | "untriaged-shadow-reports"
  | "unassessed-compliance";

export interface ActionTemplate {
  id: GapId;
  title: Localized;
  detail: Localized;
  /** In-app deep link */
  href: string;
  effort: "S" | "M" | "L";
}

export type DutyId =
  | "competence"
  | "confidentiality"
  | "communication"
  | "candor"
  | "supervision"
  | "fees";

export type DutyControlRef =
  | { kind: "policy"; policyId: string }
  | { kind: "gateType"; gateType: string }
  | { kind: "register" }
  | { kind: "transparency" }
  | { kind: "training"; note: Localized };

export interface ProfessionalDuty {
  id: DutyId;
  label: Localized;
  description: Localized;
  controls: DutyControlRef[];
}

// ── Rollout recommendations (lawfirm profile) ───────────────────────

export const LAWFIRM_ROLLOUT_RECOMMENDATIONS: RolloutRecommendation[] = [
  {
    categoryId: "GENERAL_ASSISTANT",
    stage: "ADOPT",
    summary: withMarker({
      en: "Adopt firm-wide on approved, firm-provisioned accounts. General assistants deliver the broadest productivity gain, and the controls that matter are account configuration and training — not prohibition, which only drives use underground.",
      es: "Adoptar en todo el despacho mediante cuentas corporativas aprobadas. Los asistentes generalistas aportan la mayor ganancia de productividad, y los controles decisivos son la configuración de las cuentas y la formación, no la prohibición, que solo desplaza el uso a la sombra.",
    }),
    preconditions: [
      {
        en: "Firm-provisioned accounts with a verified no-training configuration",
        es: "Cuentas proporcionadas por el despacho con configuración de no entrenamiento verificada",
      },
      {
        en: "AI-awareness training completed before access is granted",
        es: "Formación de concienciación sobre IA completada antes de conceder el acceso",
      },
      {
        en: "Prompt-hygiene rules in force: no matter identifiers or privileged content in unapproved tools",
        es: "Normas de higiene en las instrucciones en vigor: sin identificadores de asuntos ni contenido amparado por el secreto profesional en herramientas no aprobadas",
      },
    ],
  },
  {
    categoryId: "LEGAL_RESEARCH",
    stage: "ADOPT",
    summary: withMarker({
      en: "Adopt for all fee earners on the firm's research subscriptions. Citation-grounded research assistants are the lowest-risk, highest-value entry point — provided every authority is verified against the primary source before it leaves the firm.",
      es: "Adoptar para todos los profesionales a través de las suscripciones de investigación del despacho. Los asistentes de investigación fundamentados en citas son la puerta de entrada de menor riesgo y mayor valor, siempre que toda cita se verifique contra la fuente original antes de salir del despacho.",
    }),
    preconditions: [
      {
        en: "Mandatory citation verification before any filing or client delivery",
        es: "Verificación obligatoria de citas antes de cualquier presentación ante un tribunal o entrega al cliente",
      },
      {
        en: "Vendor confidentiality terms reviewed for the matter context entered",
        es: "Condiciones de confidencialidad del proveedor revisadas para el contexto del asunto que se introduce",
      },
    ],
  },
  {
    categoryId: "CONTRACT_CLM",
    stage: "PILOT",
    summary: withMarker({
      en: "Pilot with one practice group on a defined matter set before firm-wide rollout. Contract AI touches client work product directly, so the pre-deployment gate, information barriers, and professional review must be proven at pilot scale first.",
      es: "Pilotar con un área de práctica sobre un conjunto definido de asuntos antes de la implantación general. La IA contractual incide directamente en el producto del trabajo para clientes, por lo que el punto de control previo al despliegue, las barreras de información y la revisión profesional deben acreditarse primero a escala de piloto.",
    }),
    preconditions: [
      {
        en: "Pre-deployment oversight gate passed for the pilot scope",
        es: "Punto de control previo al despliegue superado para el alcance del piloto",
      },
      {
        en: "Information barriers between matters verified in the processing environment",
        es: "Barreras de información entre asuntos verificadas en el entorno de tratamiento",
      },
      {
        en: "Qualified professional review before any AI-assisted deliverable reaches a client",
        es: "Revisión por un profesional cualificado antes de que cualquier entregable asistido por IA llegue a un cliente",
      },
    ],
  },
  {
    categoryId: "EDISCOVERY",
    stage: "PILOT",
    summary: withMarker({
      en: "Pilot within the litigation support team under a documented defensibility protocol. TAR workflows are well accepted where validation is documented — undocumented use is the actual risk.",
      es: "Pilotar en el equipo de apoyo procesal bajo un protocolo de defendibilidad documentado. Los flujos de TAR gozan de amplia aceptación cuando la validación está documentada; el riesgo real es el uso sin documentar.",
    }),
    preconditions: [
      {
        en: "Documented defensibility protocol: seed sets, validation sampling, recall metrics",
        es: "Protocolo de defendibilidad documentado: conjuntos de entrenamiento, muestreo de validación y métricas de exhaustividad",
      },
      {
        en: "Privilege screening before any production",
        es: "Cribado del secreto profesional antes de cualquier entrega",
      },
      {
        en: "Protocol disclosure where the court or the parties require it",
        es: "Comunicación del protocolo cuando el tribunal o las partes lo exijan",
      },
    ],
  },
  {
    categoryId: "TRANSCRIPTION_DICTATION",
    stage: "RESTRICT",
    summary: withMarker({
      en: "Restrict to internal, non-privileged use until the consent workflow is enforced. Meeting bots that join client calls are the most common source of inadvertent confidentiality breaches in firms today.",
      es: "Restringir al uso interno y no amparado por el secreto profesional hasta que el flujo de consentimiento esté implantado. Los bots de reuniones que se unen a llamadas con clientes son hoy la fuente más habitual de brechas de confidencialidad involuntarias en los despachos.",
    }),
    preconditions: [
      {
        en: "Participant-consent workflow enforced for every recording",
        es: "Flujo de consentimiento de los participantes aplicado a toda grabación",
      },
      {
        en: "No recording of privileged client calls without express clearance",
        es: "Prohibición de grabar llamadas con clientes amparadas por el secreto profesional sin autorización expresa",
      },
      {
        en: "Transcripts retained and purged per the matter retention schedule",
        es: "Transcripciones conservadas y suprimidas conforme al calendario de conservación del asunto",
      },
    ],
  },
  {
    categoryId: "TRANSLATION",
    stage: "ADOPT",
    summary: withMarker({
      en: "Adopt for working translations under the firm's professional-tier account. Keep sworn human translation mandatory for anything filed with a court or executed by the parties.",
      es: "Adoptar para traducciones de trabajo mediante la cuenta profesional del despacho. Mantener obligatoria la traducción humana jurada para todo lo que se presente ante un tribunal o firmen las partes.",
    }),
    preconditions: [
      {
        en: "Professional tier with no-training terms and EU data residency configured",
        es: "Nivel profesional con cláusula de no entrenamiento y residencia de datos en la UE configuradas",
      },
      {
        en: "Sworn human translation required for filings and executed instruments",
        es: "Traducción humana jurada exigida para escritos procesales y documentos firmados",
      },
    ],
  },
  {
    categoryId: "PRACTICE_MANAGEMENT",
    stage: "ADOPT",
    summary: withMarker({
      en: "Adopt inside the existing practice-management platform. Risk is contained by the platform's matter-level permissions; the new obligation is lawyer review of AI-drafted entries before they bind the firm or bill the client.",
      es: "Adoptar dentro de la plataforma de gestión del despacho ya existente. El riesgo queda contenido por los permisos por asunto de la plataforma; la nueva obligación es la revisión por el abogado de los borradores generados por IA antes de que vinculen al despacho o se facturen al cliente.",
    }),
    preconditions: [
      {
        en: "Matter-level access permissions verified for AI features",
        es: "Permisos de acceso por asunto verificados para las funciones de IA",
      },
      {
        en: "Lawyer review of AI-drafted billing entries before submission",
        es: "Revisión por el abogado de las partidas de facturación generadas por IA antes de su presentación",
      },
    ],
  },
  {
    categoryId: "DMS_KNOWLEDGE",
    stage: "PILOT",
    summary: withMarker({
      en: "Pilot on a walled corpus before opening the firm-wide knowledge assistant. Retrieval-time enforcement of ethical walls is the make-or-break control — verify it under test, then scale.",
      es: "Pilotar sobre un corpus delimitado antes de abrir el asistente de conocimiento a todo el despacho. La aplicación de las barreras de información en el momento de la recuperación es el control decisivo: verificarla en pruebas y, después, escalar.",
    }),
    preconditions: [
      {
        en: "Retrieval-time ethical-wall enforcement verified on the pilot corpus",
        es: "Aplicación de las barreras de información en la recuperación verificada sobre el corpus del piloto",
      },
      {
        en: "Conflicts screens and lateral-hire restrictions propagated to the index",
        es: "Controles de conflictos de interés y restricciones por incorporaciones laterales propagados al índice",
      },
      {
        en: "Cross-matter leakage testing before firm-wide rollout",
        es: "Pruebas de filtración entre asuntos antes de la implantación general",
      },
    ],
  },
];

// ── Action templates (90-day plan) ──────────────────────────────────

export const PROGRAM_ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: "no-systems",
    title: { en: "Run the quick start", es: "Ejecutar el inicio rápido" },
    detail: {
      en: "Register the AI tools your organization actually uses to create the program baseline: systems, risk classifications, oversight gates, and policies in one pass.",
      es: "Registra las herramientas de IA que tu organización utiliza realmente para crear la base del programa: sistemas, clasificaciones de riesgo, puntos de control y políticas en un solo paso.",
    },
    href: "/governance/quickstart",
    effort: "S",
  },
  {
    id: "unclassified-systems",
    title: { en: "Classify remaining systems", es: "Clasificar los sistemas pendientes" },
    detail: {
      en: "Give every registered system an EU AI Act risk classification so obligations and controls can attach to it.",
      es: "Asigna a cada sistema registrado una clasificación de riesgo conforme al Reglamento de IA de la UE para que las obligaciones y controles queden vinculados.",
    },
    href: "/governance/risk-classification",
    effort: "S",
  },
  {
    id: "high-risk-without-gate",
    title: {
      en: "Add oversight gates to high-risk systems",
      es: "Añadir puntos de control a los sistemas de alto riesgo",
    },
    detail: {
      en: "Create a pre-deployment oversight gate for every high-risk system so nothing ships without a documented human decision.",
      es: "Crea un punto de control previo al despliegue para cada sistema de alto riesgo, de modo que nada se despliegue sin una decisión humana documentada.",
    },
    href: "/governance/oversight/new",
    effort: "M",
  },
  {
    id: "overdue-gates",
    title: { en: "Clear overdue oversight reviews", es: "Resolver los controles vencidos" },
    detail: {
      en: "Decide the oversight gates that are past their review date — an overdue gate is a control that exists on paper only.",
      es: "Decide los puntos de control que han superado su fecha de revisión: un control vencido es un control que solo existe sobre el papel.",
    },
    href: "/governance/oversight",
    effort: "M",
  },
  {
    id: "draft-policies",
    title: {
      en: "Approve and publish the policy pack",
      es: "Aprobar y publicar el paquete de políticas",
    },
    detail: {
      en: "Review the generated policies, approve them through the governance workflow, publish them, and circulate them to everyone they bind.",
      es: "Revisa las políticas generadas, apruébalas mediante el flujo de gobernanza, publícalas y comunícalas a todas las personas a las que obligan.",
    },
    href: "/governance/policies",
    effort: "M",
  },
  {
    id: "unlinked-policies",
    title: { en: "Link policies to systems", es: "Vincular las políticas a los sistemas" },
    detail: {
      en: "Attach each policy to the AI systems it governs so coverage is traceable system by system.",
      es: "Vincula cada política a los sistemas de IA que regula para que la cobertura sea trazable sistema a sistema.",
    },
    href: "/governance/policies",
    effort: "S",
  },
  {
    id: "missing-transparency-profiles",
    title: {
      en: "Complete Art. 50 transparency profiles",
      es: "Completar los perfiles de transparencia del Art. 50",
    },
    detail: {
      en: "Record the Art. 50 transparency posture for each generative system: user disclosure, content marking, and applicable exceptions.",
      es: "Registra la situación de transparencia del Art. 50 de cada sistema generativo: información al usuario, marcado de contenidos y excepciones aplicables.",
    },
    href: "/governance/ai-registry",
    effort: "M",
  },
  {
    id: "marking-overdue",
    title: {
      en: "Resolve overdue content-marking obligations",
      es: "Resolver las obligaciones de marcado vencidas",
    },
    detail: {
      en: "Implement machine-readable marking for AI-generated content on the systems whose marking deadline has passed.",
      es: "Implanta el marcado legible por máquina de los contenidos generados por IA en los sistemas cuyo plazo de marcado ya ha vencido.",
    },
    href: "/governance/ai-registry",
    effort: "M",
  },
  {
    id: "unassessed-vendors",
    title: { en: "Assess AI vendor risk", es: "Evaluar el riesgo de los proveedores de IA" },
    detail: {
      en: "Complete due diligence and assign a risk level to each AI vendor, starting with those serving several systems.",
      es: "Completa la diligencia debida y asigna un nivel de riesgo a cada proveedor de IA, empezando por los que dan servicio a varios sistemas.",
    },
    href: "/governance/vendors",
    effort: "M",
  },
  {
    id: "untriaged-shadow-reports",
    title: { en: "Triage shadow AI reports", es: "Triar los informes de IA en la sombra" },
    detail: {
      en: "Review each discovered tool and decide its disposition: approve into the registry, restrict, or block.",
      es: "Revisa cada herramienta descubierta y decide su destino: aprobarla e incorporarla al registro, restringirla o bloquearla.",
    },
    href: "/governance/shadow-ai",
    effort: "S",
  },
  {
    id: "unassessed-compliance",
    title: { en: "Start the compliance assessment", es: "Iniciar la evaluación de cumplimiento" },
    detail: {
      en: "Work through the unassessed requirement mappings framework by framework, attaching evidence as you go.",
      es: "Avanza por las correspondencias de requisitos sin evaluar, marco por marco, adjuntando evidencias sobre la marcha.",
    },
    href: "/governance/compliance",
    effort: "L",
  },
];

// ── Professional duties grid (lawfirm profile) ──────────────────────

export const LAWFIRM_PROFESSIONAL_DUTIES: ProfessionalDuty[] = [
  {
    id: "competence",
    label: {
      en: "Competence & technological competence",
      es: "Deber de competencia",
    },
    description: withMarker({
      en: "The duty of competence extends to the technology used in a representation: lawyers must understand the capabilities and limits of the AI tools they rely on and keep that understanding current.",
      es: "El deber de competencia se extiende a la tecnología empleada en el asesoramiento: los abogados deben comprender las capacidades y límites de las herramientas de IA que utilizan y mantener actualizado ese conocimiento.",
    }),
    controls: [
      { kind: "policy", policyId: "lf-genai-practice" },
      { kind: "register" },
      {
        kind: "training",
        note: {
          en: "AI-awareness training for all fee earners and staff",
          es: "Formación en IA para todos los profesionales y el personal",
        },
      },
    ],
  },
  {
    id: "confidentiality",
    label: {
      en: "Confidentiality",
      es: "Secreto profesional y confidencialidad",
    },
    description: withMarker({
      en: "Client information must remain protected when AI tools are involved: no privileged or confidential content in unapproved services, contractual no-training guarantees, and access confined to the engagement team.",
      es: "La información del cliente debe permanecer protegida cuando intervienen herramientas de IA: nada de contenido confidencial o amparado por el secreto profesional en servicios no aprobados, garantías contractuales de no entrenamiento y acceso limitado al equipo del asunto.",
    }),
    controls: [
      { kind: "policy", policyId: "lf-confidentiality" },
      { kind: "policy", policyId: "lf-ai-use" },
    ],
  },
  {
    id: "communication",
    label: {
      en: "Client communication & informed consent",
      es: "Deber de información al cliente",
    },
    description: withMarker({
      en: "Clients are entitled to know when AI materially contributes to their work and to restrict its use on their matters; engagement terms and disclosures make that real.",
      es: "El cliente tiene derecho a saber cuándo la IA contribuye de forma sustancial a su trabajo y a restringir su uso en sus asuntos; la hoja de encargo y la información al cliente lo hacen efectivo.",
    }),
    controls: [
      { kind: "policy", policyId: "lf-client-disclosure" },
      { kind: "transparency" },
    ],
  },
  {
    id: "candor",
    label: {
      en: "Candor to the tribunal",
      es: "Deber de veracidad ante el tribunal",
    },
    description: withMarker({
      en: "Nothing AI-assisted reaches a court unverified: every citation and factual assertion is checked against the primary source, and errors are corrected promptly.",
      es: "Nada asistido por IA llega a un tribunal sin verificar: toda cita y afirmación de hecho se comprueba contra la fuente original, y los errores se rectifican de inmediato.",
    }),
    controls: [
      { kind: "policy", policyId: "lf-genai-practice" },
      { kind: "gateType", gateType: "PRE_DEPLOYMENT" },
    ],
  },
  {
    id: "supervision",
    label: {
      en: "Supervision of lawyers and staff",
      es: "Deber de supervisión",
    },
    description: withMarker({
      en: "Managerial lawyers must establish clear AI policies and training, and supervise AI-assisted work by juniors and staff to the same standard as any delegated work.",
      es: "Los abogados con responsabilidades de dirección deben establecer políticas y formación claras sobre IA y supervisar el trabajo asistido por IA de los abogados junior y del personal con el mismo estándar que cualquier trabajo delegado.",
    }),
    controls: [
      { kind: "policy", policyId: "lf-genai-practice" },
      { kind: "policy", policyId: "lf-ai-use" },
      { kind: "gateType", gateType: "PRE_DEPLOYMENT" },
    ],
  },
  {
    id: "fees",
    label: {
      en: "Fees & billing integrity",
      es: "Honorarios y facturación",
    },
    description: withMarker({
      en: "Billing must fairly reflect AI-assisted work: time saved is not billed as if performed manually, and AI-related fee arrangements are disclosed in the engagement terms.",
      es: "La facturación debe reflejar fielmente el trabajo asistido por IA: el tiempo ahorrado no se factura como si el trabajo fuera manual, y los acuerdos de honorarios relacionados con la IA constan en la hoja de encargo.",
    }),
    controls: [{ kind: "policy", policyId: "lf-client-disclosure" }],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────

export function getRolloutForCategory(
  categoryId: string,
): RolloutRecommendation | undefined {
  return LAWFIRM_ROLLOUT_RECOMMENDATIONS.find(
    (r) => r.categoryId === categoryId,
  );
}

export function getActionTemplate(gapId: GapId): ActionTemplate | undefined {
  return PROGRAM_ACTION_TEMPLATES.find((a) => a.id === gapId);
}

/** Referenced by tests; keeps the policy-pack ids visible at the seam. */
export const KNOWN_POLICY_IDS = LAWFIRM_POLICY_PACK.map((p) => p.id);
