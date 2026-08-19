// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Regulatory obligation milestones — the dated deadlines an organization's
 * own inventory is measured against.
 *
 * Pure leaf module, same doctrine as transparency-rules.ts and
 * annex-iii-rules.ts: no Prisma, no Next, no React, no network, no AI. It
 * receives organization and system facts as plain data and returns
 * evaluations; the caller resolves those facts from the database.
 *
 * DATE OWNERSHIP (do not violate — a duplicated literal is how calendars rot):
 *   - The two Art. 50 dates are owned by src/config/transparency-rules.ts and
 *     are IMPORTED here, never re-typed. A test asserts the equality.
 *   - The seeded Art. 113 requirement ROWS are owned by
 *     src/config/eu-timeline-requirements.ts; milestones cite them by code via
 *     `requirementCodes` so a server can resolve ComplianceRequirement ids for
 *     click-through. Dates are never re-derived from that prose.
 *   - Every other instrument's dates are owned here.
 *   - Import direction is one-way: transparency-rules must never import this.
 *
 * TRI-STATE APPLICABILITY IS MANDATORY. A milestone is "in-scope",
 * "out-of-scope" or "undetermined". Undeclared jurisdictions, an unclassified
 * system, or a missing ADMT determination all yield **undetermined** — never
 * "out-of-scope". Telling a customer a regime does not apply to them is an
 * assertion; we only make it from declared facts.
 *
 * lawReviewedAsOf: see REGULATORY_MILESTONES_LAW_REVIEWED_AS_OF. This content
 * has NOT been through legal sign-off — the marker says so.
 */

import type { Localized } from "./lawfirm-ai-toolkit";
import type { JurisdictionId } from "./jurisdictions";
import {
  ART50_APPLICABLE_FROM,
  ART50_MARKING_GRACE_DEADLINE,
  computeMarkingDeadline,
  type TransparencyObligationStatusValue,
} from "./transparency-rules";

/**
 * Rule-pack version. Bump on any content change (milestones, dates,
 * predicates) so exported artifacts can state which revision produced them.
 * See src/config/rule-pack-versions.ts.
 */
export const REGULATORY_MILESTONES_VERSION = "2026.08.1";
export const REGULATORY_MILESTONES_LAW_REVIEWED_AS_OF = "2026-08-19";

export const REGULATORY_MILESTONES_REVIEW_MARKER: Localized = {
  en: `Law reviewed as of ${REGULATORY_MILESTONES_LAW_REVIEWED_AS_OF}; legal sign-off pending.`,
  es: `Revisión jurídica a fecha de ${REGULATORY_MILESTONES_LAW_REVIEWED_AS_OF}; pendiente de validación jurídica.`,
};

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

export type InstrumentId =
  | "eu-ai-act"
  | "ccpa-admt"
  | "ccpa-risk-assessments"
  | "ccpa-cyber-audits"
  | "ca-ab-2013"
  | "ca-sb-53"
  | "ca-sb-942"
  | "tx-traiga"
  | "il-hb-3773"
  | "co-sb-26-189"
  | "nyc-ll-144"
  | "ut-aipa";

/**
 * Jurisdiction tokens this module reasons about — the shared vocabulary from
 * src/config/jurisdictions.ts, which mirrors the Prisma enum member-for-member
 * while staying client-safe. Re-exported so consumers of the calendar need
 * only one import.
 *
 * Note there is no city-level token: NYC Local Law 144 keys off `US_NY` and
 * says in its own text that it binds employers hiring in New York City.
 */
export type JurisdictionCode = JurisdictionId;

export type JurisdictionScope =
  | { kind: "eu" }
  | { kind: "us-state"; state: "CA" | "TX" | "IL" | "CO" | "UT" }
  | { kind: "us-city"; city: "NYC" };

export type MilestoneKind =
  | "applies"
  | "duty-live"
  | "deadline"
  | "grace-expiry"
  | "phase-in";

export type CountUnit = "systems" | "organization";

export type Applicability = "in-scope" | "out-of-scope" | "undetermined";

export type UndeterminedReason =
  | "no-jurisdictions"
  | "no-admt-determination"
  | "unclassified-system"
  | "no-revenue-tier"
  | "no-annex-i-determination"
  | "no-market-placement-date"
  | "no-sell-share-determination";

export type MilestonePhase = "past" | "imminent" | "upcoming" | "future";

/** Roll-up so a renderer can never conflate "unknown" with "zero". */
export type MilestoneApplicabilityRollup =
  | "applies"
  | "does-not-apply"
  | "unknown";

// ---------------------------------------------------------------------------
// Facts consumed (a sibling module resolves these from the database)
// ---------------------------------------------------------------------------

/**
 * ADMT facts per system. Every field is nullable and `determinedAt === null`
 * means nobody has made the §7001(e) determination yet — which makes every
 * California ADMT milestone *undetermined* for that system, never out of scope.
 */
export interface AdmtProfileFacts {
  isAdmt: boolean | null;
  /** §7001(e)(1) conjunction outcome. */
  humanInvolvement: "NONE" | "SUBSTANTIVE" | "UNDETERMINED";
  /** §7001(ddd) — empty means no significant decision domain applies. */
  significantDecisionDomains: string[];
  /** §7150(b)(1)-(6) risk-assessment triggers. */
  triggers: string[];
  riskAssessmentCompletedAt: Date | null;
  preUseNoticeReady: boolean | null;
  optOutMechanismReady: boolean | null;
  accessRequestProcessReady: boolean | null;
  /** null ⇒ every CCPA-ADMT milestone is undetermined for this system. */
  determinedAt: Date | null;
}

export interface MilestoneOrgContext {
  jurisdictions: JurisdictionCode[];
  /** false ⇒ US milestones are undetermined, not out-of-scope. */
  jurisdictionsDeclared: boolean;
  revenueTier: "OVER_100M" | "BETWEEN_50M_AND_100M" | "UNDER_50M" | null;
  sellsOrSharesPersonalInfo: boolean | null;
  /** CA SB 942 as amended by AB 853 — large-platform duties from 1 Jan 2027. */
  isLargeOnlinePlatform: boolean | null;
  /** Does the org itself develop/publish a generative AI system or model? */
  isGenerativeAiDeveloper: boolean | null;
  /** Employs people in the jurisdiction (drives IL/NYC employment rules). */
  hasEmployees: boolean | null;
}

export interface MilestoneSystemContext {
  id: string;
  name: string;
  riskLevel: "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL" | null;
  annexIiiCategory: string | null;
  /** null = undetermined: Annex I embedded lands 2028 instead of 2027. */
  isAnnexIProduct: boolean | null;
  /** Prisma AITechnique value. */
  technique: string;
  /** Prisma AISystemRole value. */
  role: string;
  /** Prisma AISystemStatus value (RETIRED filtered upstream). */
  status: string;
  processesPersonalData: boolean;
  placedOnMarketBefore2Aug2026: boolean | null;
  art50: {
    interaction: TransparencyObligationStatusValue | null;
    marking: TransparencyObligationStatusValue | null;
    emotion: TransparencyObligationStatusValue | null;
    deepfake: TransparencyObligationStatusValue | null;
  } | null;
  /** null ⇒ undetermined for every CCPA-ADMT milestone. */
  admt: AdmtProfileFacts | null;
}

// ---------------------------------------------------------------------------
// Milestone shape
// ---------------------------------------------------------------------------

export interface RegulatoryMilestone {
  /** Stable, kebab-case — used as a URL fragment and a React key. */
  id: string;
  instrument: InstrumentId;
  /** Official citation; not localized. */
  citation: string;
  provision: string;
  /** ISO "YYYY-MM-DD", UTC midnight. */
  date: string;
  dateBasis: "fixed" | "derived";
  /** Per-system date resolution for derived milestones (e.g. Art. 50 grace). */
  resolveDate?: (
    sys: MilestoneSystemContext,
    org: MilestoneOrgContext,
  ) => Date | null;
  scope: JurisdictionScope;
  kind: MilestoneKind;
  severity: "prohibition" | "obligation" | "reporting";
  countUnit: CountUnit;
  title: Localized;
  whatItMeans: Localized;
  /** Codes in the seeded Art. 113 subtree, for matrix click-through. */
  requirementCodes?: string[];
  href?: string;
  /** countUnit "systems" */
  applies?: (
    sys: MilestoneSystemContext,
    org: MilestoneOrgContext,
  ) => Applicability;
  /** countUnit "organization" */
  orgApplies?: (
    org: MilestoneOrgContext,
    systems: MilestoneSystemContext[],
  ) => Applicability;
  satisfiedBy?: (
    sys: MilestoneSystemContext,
    org: MilestoneOrgContext,
  ) => boolean;
  undeterminedReason?: (
    sys: MilestoneSystemContext | null,
    org: MilestoneOrgContext,
  ) => UndeterminedReason;
  lawReviewedAsOf: string;
}

export interface MilestoneEvaluation {
  milestone: RegulatoryMilestone;
  date: Date;
  /** Signed whole days; negative when past. Matches computeMarkingDeadline. */
  daysRemaining: number;
  phase: MilestonePhase;
  /** System ids, or [organizationId] for org-level milestones. */
  inScope: string[];
  satisfied: string[];
  undetermined: { id: string; reason: UndeterminedReason }[];
  outOfScope: number;
  overdue: boolean;
  applicability: MilestoneApplicabilityRollup;
}

// ---------------------------------------------------------------------------
// Predicate helpers
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO date (UTC midnight) from a Date, for milestone `date` fields. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Jurisdiction gate shared by every milestone. Undeclared is *undetermined*:
 * we cannot say a regime does not apply to an organization that has not told
 * us where it operates.
 */
function jurisdictionGate(
  org: MilestoneOrgContext,
  required: JurisdictionCode,
): Applicability | null {
  if (!org.jurisdictionsDeclared) return "undetermined";
  return org.jurisdictions.includes(required) ? null : "out-of-scope";
}

/** EU/EEA are treated together for AI Act purposes. */
function euGate(org: MilestoneOrgContext): Applicability | null {
  if (!org.jurisdictionsDeclared) return "undetermined";
  const inEu =
    org.jurisdictions.includes("EU") || org.jurisdictions.includes("EEA");
  return inEu ? null : "out-of-scope";
}

/** A system is generative when its technique says so. */
function isGenerative(sys: MilestoneSystemContext): boolean {
  return sys.technique === "GENERATIVE_AI";
}

/**
 * California ADMT scope for one system. Returns the tri-state; the caller
 * decides which article's duties follow.
 */
function admtArticle11Scope(
  sys: MilestoneSystemContext,
  org: MilestoneOrgContext,
): Applicability {
  const gate = jurisdictionGate(org, "US_CA");
  if (gate) return gate;
  if (!sys.admt || sys.admt.determinedAt === null || sys.admt.isAdmt === null) {
    return "undetermined";
  }
  if (!sys.admt.isAdmt) return "out-of-scope";
  // §7001(ddd): Article 11 bites only on a significant decision.
  if (sys.admt.significantDecisionDomains.length === 0) return "out-of-scope";
  // §7001(e): substantive human involvement means it is not ADMT after all.
  if (sys.admt.humanInvolvement === "UNDETERMINED") return "undetermined";
  if (sys.admt.humanInvolvement === "SUBSTANTIVE") return "out-of-scope";
  return "in-scope";
}

// ---------------------------------------------------------------------------
// The milestones
// ---------------------------------------------------------------------------

const REVIEWED = REGULATORY_MILESTONES_LAW_REVIEWED_AS_OF;

export const REGULATORY_MILESTONES: RegulatoryMilestone[] = [
  // ══ EU AI Act ═════════════════════════════════════════════════════
  {
    id: "eu-ai-act-prohibitions-literacy",
    instrument: "eu-ai-act",
    citation:
      "Reg. (EU) 2024/1689, Art. 113; Chapters I–II applicable from 2 February 2025",
    provision: "Arts. 4–5",
    date: "2025-02-02",
    dateBasis: "fixed",
    scope: { kind: "eu" },
    kind: "duty-live",
    severity: "prohibition",
    countUnit: "organization",
    requirementCodes: ["Art. 113(a) — 2 Feb 2025"],
    href: "/governance/ai-registry",
    title: {
      en: "EU prohibited practices and AI literacy are live",
      es: "Prácticas prohibidas y alfabetización en IA de la UE en vigor",
    },
    whatItMeans: {
      en: "The Art. 5 prohibitions have applied since 2 February 2025, as has the Art. 4 duty to ensure a sufficient level of AI literacy among staff and anyone operating AI on your behalf. The literacy duty was not deferred by the Digital Omnibus and applies to every deployer with EU staff — training records are the evidence.",
      es: "Las prohibiciones del art. 5 se aplican desde el 2 de febrero de 2025, al igual que el deber del art. 4 de garantizar un nivel suficiente de alfabetización en IA entre el personal y quienes operen IA por cuenta de la organización. El Ómnibus Digital no aplazó este deber y afecta a todo responsable del despliegue con personal en la UE: los registros de formación son la prueba.",
    },
    orgApplies: (org) => euGate(org) ?? "in-scope",
    undeterminedReason: () => "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "eu-ai-act-gpai-governance",
    instrument: "eu-ai-act",
    citation: "Reg. (EU) 2024/1689, Art. 113(b)",
    provision: "Chapters V, VII, XII",
    date: "2025-08-02",
    dateBasis: "fixed",
    scope: { kind: "eu" },
    kind: "duty-live",
    severity: "obligation",
    countUnit: "organization",
    requirementCodes: ["Art. 113(b) — 2 Aug 2025"],
    href: "/governance/compliance",
    title: {
      en: "GPAI obligations, governance and penalties are live",
      es: "Obligaciones de IA de uso general, gobernanza y sanciones en vigor",
    },
    whatItMeans: {
      en: "Since 2 August 2025: general-purpose AI model obligations, the governance architecture, the confidentiality rules and the penalty regime apply. Relevant to you as a deployer mainly through your providers' obligations and the contractual assurances you should be collecting from them.",
      es: "Desde el 2 de agosto de 2025 se aplican las obligaciones para modelos de IA de uso general, la arquitectura de gobernanza, las normas de confidencialidad y el régimen sancionador. Le afecta como responsable del despliegue sobre todo a través de las obligaciones de sus proveedores y de las garantías contractuales que debería estar recabando de ellos.",
    },
    orgApplies: (org) => euGate(org) ?? "in-scope",
    undeterminedReason: () => "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "eu-ai-act-art50-transparency",
    instrument: "eu-ai-act",
    // Date imported from transparency-rules.ts, which owns it.
    citation:
      "Reg. (EU) 2024/1689, Art. 50; applicable from 2 August 2026 (Art. 113)",
    provision: "Art. 50",
    date: isoDate(ART50_APPLICABLE_FROM),
    dateBasis: "fixed",
    scope: { kind: "eu" },
    kind: "applies",
    severity: "obligation",
    countUnit: "systems",
    requirementCodes: ["Art. 113 — 2 Aug 2026"],
    href: "/governance/ai-registry",
    title: {
      en: "EU AI Act transparency obligations apply",
      es: "Se aplican las obligaciones de transparencia del Reglamento de IA de la UE",
    },
    whatItMeans: {
      en: "Art. 50 has applied since 2 August 2026: people must be told when they are interacting with an AI system, synthetic content must be marked in a machine-readable format, and deepfakes and AI-generated text published to inform the public must be disclosed. Not deferred by the Digital Omnibus.",
      es: "El art. 50 se aplica desde el 2 de agosto de 2026: debe informarse a las personas cuando interactúan con un sistema de IA, el contenido sintético debe marcarse en un formato legible por máquina y deben revelarse las ultrafalsificaciones y el texto generado por IA publicado para informar al público. No fue aplazado por el Ómnibus Digital.",
    },
    applies: (sys, org) => {
      const gate = euGate(org);
      if (gate) return gate;
      // Any Art. 50 obligation marked REQUIRED puts the system in scope.
      if (sys.art50) {
        const required = Object.values(sys.art50).some(
          (status) => status === "REQUIRED" || status === "IMPLEMENTED",
        );
        if (required) return "in-scope";
        const anyAssessed = Object.values(sys.art50).some((s) => s !== null);
        return anyAssessed ? "out-of-scope" : "undetermined";
      }
      // No profile yet: generative systems are presumptively in scope but
      // unconfirmed; everything else is simply unknown.
      return isGenerative(sys) ? "undetermined" : "undetermined";
    },
    satisfiedBy: (sys) => {
      if (!sys.art50) return false;
      const statuses = Object.values(sys.art50).filter((s) => s !== null);
      if (statuses.length === 0) return false;
      return statuses.every((s) => s !== "REQUIRED");
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-market-placement-date" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "eu-ai-act-art50-marking-grace",
    instrument: "eu-ai-act",
    citation:
      "Reg. (EU) 2026/1744 (Digital Omnibus on AI) Art. 1(38), OJ L, 2026/1744, 24.7.2026 — four-month transitional period",
    provision: "Art. 50(2)",
    // Derived per system: grace deadline or the base date, decided in ONE
    // place — computeMarkingDeadline in transparency-rules.ts.
    date: isoDate(ART50_MARKING_GRACE_DEADLINE),
    dateBasis: "derived",
    resolveDate: (sys) =>
      computeMarkingDeadline({
        placedOnMarketBefore2Aug2026: sys.placedOnMarketBefore2Aug2026,
        markingStatus: sys.art50?.marking ?? null,
      })?.deadline ?? null,
    scope: { kind: "eu" },
    kind: "grace-expiry",
    severity: "obligation",
    countUnit: "systems",
    requirementCodes: ["Art. 113 — 2 Aug 2026"],
    href: "/governance/ai-registry",
    title: {
      en: "Machine-readable marking grace period expires",
      es: "Expira el período de gracia del marcado legible por máquina",
    },
    whatItMeans: {
      en: "Generative systems placed on the market before 2 August 2026 had until 2 December 2026 to implement machine-readable marking of synthetic output. After that date the Art. 50(2) duty applies without transition.",
      es: "Los sistemas generativos introducidos en el mercado antes del 2 de agosto de 2026 tenían hasta el 2 de diciembre de 2026 para implantar el marcado legible por máquina del contenido sintético. Pasada esa fecha, el deber del art. 50(2) se aplica sin transición.",
    },
    applies: (sys, org) => {
      const gate = euGate(org);
      if (gate) return gate;
      const marking = sys.art50?.marking ?? null;
      if (marking === null) return "undetermined";
      if (marking === "NOT_APPLICABLE") return "out-of-scope";
      if (sys.placedOnMarketBefore2Aug2026 === null) return "undetermined";
      return "in-scope";
    },
    satisfiedBy: (sys) => sys.art50?.marking === "IMPLEMENTED",
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-market-placement-date" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "eu-ai-act-art5-new-prohibitions",
    instrument: "eu-ai-act",
    citation:
      "Reg. (EU) 2026/1744 (Digital Omnibus on AI) — Art. 5(1)(ba) and 5(1)(bb), applicable from 2 December 2026",
    provision: "Art. 5(1)(ba)–(bb)",
    date: "2026-12-02",
    dateBasis: "fixed",
    scope: { kind: "eu" },
    kind: "applies",
    severity: "prohibition",
    countUnit: "systems",
    requirementCodes: ["Art. 5 — 2 Dec 2026"],
    href: "/governance/risk-classification",
    title: {
      en: "New EU prohibitions: AI-generated CSAM and intimate imagery",
      es: "Nuevas prohibiciones de la UE: material de abuso sexual infantil e imágenes íntimas generados por IA",
    },
    whatItMeans: {
      en: "From 2 December 2026 the Digital Omnibus adds two prohibited practices: AI systems for generating child sexual abuse material and non-consensual intimate imagery. Providers are in scope where such generation is intended or reasonably foreseeable absent safeguards; deployers on deliberate misuse. Most inventories will show zero systems here — that is a legitimate zero, not a gap.",
      es: "Desde el 2 de diciembre de 2026, el Ómnibus Digital añade dos prácticas prohibidas: los sistemas de IA para generar material de abuso sexual infantil e imágenes íntimas no consentidas. Los proveedores están incluidos cuando esa generación sea intencionada o razonablemente previsible sin salvaguardias; los responsables del despliegue, en caso de uso indebido deliberado. La mayoría de los inventarios mostrarán cero sistemas aquí: es un cero legítimo, no una carencia.",
    },
    applies: (sys, org) => {
      const gate = euGate(org);
      if (gate) return gate;
      // Only image/video-capable generative systems can plausibly be in scope.
      if (!isGenerative(sys)) return "out-of-scope";
      return "undetermined";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "unclassified-system" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "eu-ai-act-annex-iii-high-risk",
    instrument: "eu-ai-act",
    citation:
      "Reg. (EU) 2024/1689 Art. 113, as amended by Reg. (EU) 2026/1744 (Digital Omnibus on AI), OJ L, 2026/1744, 24.7.2026",
    provision: "Art. 113 / Annex III",
    date: "2027-12-02",
    dateBasis: "fixed",
    scope: { kind: "eu" },
    kind: "applies",
    severity: "obligation",
    countUnit: "systems",
    requirementCodes: ["Art. 113 — 2 Dec 2027"],
    href: "/governance/risk-classification",
    title: {
      en: "EU high-risk obligations apply (Annex III)",
      es: "Se aplican las obligaciones de alto riesgo de la UE (anexo III)",
    },
    whatItMeans: {
      en: "Standalone Annex III high-risk systems must meet the full Chapter III duties — risk management, data governance, technical documentation, logging, human oversight, conformity assessment and registration — plus an Art. 27 fundamental-rights impact assessment where you deploy in scope. Deferred from 2 August 2026 by the Digital Omnibus.",
      es: "Los sistemas autónomos de alto riesgo del anexo III deben cumplir todos los deberes del capítulo III —gestión de riesgos, gobernanza de datos, documentación técnica, registro de eventos, supervisión humana, evaluación de la conformidad y registro— además de una evaluación de impacto sobre los derechos fundamentales (art. 27) cuando el despliegue esté incluido. Aplazado desde el 2 de agosto de 2026 por el Ómnibus Digital.",
    },
    applies: (sys, org) => {
      const gate = euGate(org);
      if (gate) return gate;
      if (sys.riskLevel === null) return "undetermined";
      if (sys.riskLevel !== "HIGH") return "out-of-scope";
      if (sys.isAnnexIProduct === null) return "undetermined";
      return sys.isAnnexIProduct ? "out-of-scope" : "in-scope";
    },
    undeterminedReason: (sys, org) => {
      if (!org.jurisdictionsDeclared) return "no-jurisdictions";
      return sys && sys.riskLevel === null
        ? "unclassified-system"
        : "no-annex-i-determination";
    },
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "eu-ai-act-annex-i-high-risk",
    instrument: "eu-ai-act",
    citation:
      "Reg. (EU) 2024/1689 Art. 113(c), as amended by Reg. (EU) 2026/1744",
    provision: "Art. 6(1) / Annex I",
    date: "2028-08-02",
    dateBasis: "fixed",
    scope: { kind: "eu" },
    kind: "applies",
    severity: "obligation",
    countUnit: "systems",
    requirementCodes: ["Art. 113(c) — 2 Aug 2028"],
    href: "/governance/risk-classification",
    title: {
      en: "EU high-risk obligations apply to product-embedded AI (Annex I)",
      es: "Las obligaciones de alto riesgo se aplican a la IA integrada en productos (anexo I)",
    },
    whatItMeans: {
      en: "From 2 August 2028 (deferred from 2 August 2027): AI that is a safety component of — or is itself — a product covered by Union harmonisation legislation, such as a medical device under the MDR, falls under Art. 6(1) and the corresponding high-risk obligations.",
      es: "Desde el 2 de agosto de 2028 (aplazado desde el 2 de agosto de 2027): la IA que sea un componente de seguridad de —o constituya en sí misma— un producto cubierto por la legislación de armonización de la Unión, como un producto sanitario conforme al RPS, queda sujeta al art. 6(1) y a las obligaciones de alto riesgo correspondientes.",
    },
    applies: (sys, org) => {
      const gate = euGate(org);
      if (gate) return gate;
      if (sys.isAnnexIProduct === null) return "undetermined";
      return sys.isAnnexIProduct ? "in-scope" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared
        ? "no-annex-i-determination"
        : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },

  // ══ California — CCPA / ADMT ══════════════════════════════════════
  {
    id: "ccpa-risk-assessment-duty-live",
    instrument: "ccpa-risk-assessments",
    citation:
      "Cal. Code Regs. tit. 11, § 7150(b) (CPPA regulations, OAL-approved 22 September 2025, effective 1 January 2026)",
    provision: "§ 7150(b)",
    date: "2026-01-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "duty-live",
    severity: "reporting",
    countUnit: "organization",
    href: "/governance/assessments",
    title: {
      en: "California risk assessments are already required",
      es: "Las evaluaciones de riesgo de California ya son obligatorias",
    },
    whatItMeans: {
      en: "Since 1 January 2026 a documented risk assessment must be completed BEFORE initiating any of six triggering activities — including simply selling or sharing personal information, which captures most advertising pixels and audience integrations. This duty is live now, not in 2027.",
      es: "Desde el 1 de enero de 2026 debe completarse una evaluación de riesgo documentada ANTES de iniciar cualquiera de las seis actividades desencadenantes, incluida la simple venta o puesta en común de información personal, lo que abarca la mayoría de los píxeles publicitarios y las integraciones de audiencias. Este deber ya está vigente, no en 2027.",
    },
    orgApplies: (org, systems) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.sellsOrSharesPersonalInfo === true) return "in-scope";
      if (
        systems.some(
          (s) =>
            s.admt?.isAdmt === true &&
            s.admt.significantDecisionDomains.length > 0,
        )
      ) {
        return "in-scope";
      }
      if (
        org.sellsOrSharesPersonalInfo === null ||
        systems.some((s) => !s.admt || s.admt.determinedAt === null)
      ) {
        return "undetermined";
      }
      return "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared
        ? "no-sell-share-determination"
        : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ccpa-admt-article-11-rights",
    instrument: "ccpa-admt",
    citation:
      "Cal. Code Regs. tit. 11, §§ 7220–7222 (CPPA ADMT regulations); compliance required by 1 January 2027 (§ 7200(b))",
    provision: "Art. 11 (§§ 7220–7222)",
    date: "2027-01-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "applies",
    severity: "obligation",
    countUnit: "systems",
    href: "/governance/ai-registry",
    title: {
      en: "California ADMT rights: pre-use notice, opt-out, access",
      es: "Derechos ADMT de California: aviso previo, exclusión voluntaria y acceso",
    },
    whatItMeans: {
      en: "Where automated decision-making technology makes a significant decision — financial or lending services, housing, education, employment or independent contracting, or healthcare — you must publish a pre-use notice, offer an opt-out, and answer access requests explaining the logic and the outcome. This lands eleven months before the EU's Annex III high-risk duties.",
      es: "Cuando una tecnología de decisión automatizada adopta una decisión significativa —servicios financieros o crediticios, vivienda, educación, empleo o contratación independiente, o asistencia sanitaria—, debe publicar un aviso previo, ofrecer un derecho de exclusión y responder a las solicitudes de acceso explicando la lógica y el resultado. Llega once meses antes de los deberes de alto riesgo del anexo III de la UE.",
    },
    applies: admtArticle11Scope,
    satisfiedBy: (sys) =>
      sys.admt?.preUseNoticeReady === true &&
      sys.admt.optOutMechanismReady === true &&
      sys.admt.accessRequestProcessReady === true,
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-admt-determination" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ccpa-risk-assessment-backfill",
    instrument: "ccpa-risk-assessments",
    citation: "Cal. Code Regs. tit. 11, §§ 7150(b), 7155(b)",
    provision: "§ 7155(b)",
    date: "2027-12-31",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "deadline",
    severity: "reporting",
    countUnit: "organization",
    href: "/governance/assessments",
    title: {
      en: "Risk assessments for 2026–2027 activities must be complete",
      es: "Las evaluaciones de riesgo de las actividades de 2026-2027 deben estar completas",
    },
    whatItMeans: {
      en: "Processing that began before 1 January 2026 and continues must have a completed, documented risk assessment on file by 31 December 2027. Assessments are retained for as long as the processing continues, or five years after it ends — whichever is later.",
      es: "El tratamiento iniciado antes del 1 de enero de 2026 que continúe debe contar con una evaluación de riesgo completada y documentada antes del 31 de diciembre de 2027. Las evaluaciones se conservan mientras continúe el tratamiento o durante cinco años tras su finalización, lo que resulte posterior.",
    },
    orgApplies: (org, systems) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.sellsOrSharesPersonalInfo === true) return "in-scope";
      if (org.sellsOrSharesPersonalInfo === null) return "undetermined";
      return systems.some((s) => (s.admt?.triggers.length ?? 0) > 0)
        ? "in-scope"
        : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared
        ? "no-sell-share-determination"
        : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ccpa-risk-assessment-first-submission",
    instrument: "ccpa-risk-assessments",
    citation: "Cal. Code Regs. tit. 11, § 7157(a)",
    provision: "§ 7157(a)",
    date: "2028-04-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "deadline",
    severity: "reporting",
    countUnit: "organization",
    href: "/governance/assessments",
    title: {
      en: "First CPPA submission and executive attestation due",
      es: "Vence la primera presentación ante la CPPA y la certificación ejecutiva",
    },
    whatItMeans: {
      en: "By 1 April 2028 you must submit to the CPPA the number of risk assessments conducted in 2026 and 2027 — counts and personal-information categories, not the reports themselves — together with an attestation signed under penalty of perjury by a member of executive management. Separately, § 7157(e) lets the CPPA or the Attorney General demand the actual reports on 30 calendar days' notice.",
      es: "Antes del 1 de abril de 2028 debe presentar a la CPPA el número de evaluaciones de riesgo realizadas en 2026 y 2027 —recuentos y categorías de información personal, no los informes— junto con una certificación firmada bajo pena de perjurio por un miembro de la alta dirección. Por separado, el § 7157(e) permite a la CPPA o al Fiscal General exigir los informes en un plazo de 30 días naturales.",
    },
    orgApplies: (org) => jurisdictionGate(org, "US_CA") ?? "in-scope",
    undeterminedReason: () => "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ccpa-cyber-audit-tier-1",
    instrument: "ccpa-cyber-audits",
    citation: "Cal. Code Regs. tit. 11, § 7121(a)(1)",
    provision: "§ 7121(a)(1)",
    date: "2028-04-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "phase-in",
    severity: "reporting",
    countUnit: "organization",
    href: "/governance/settings",
    title: {
      en: "Cybersecurity audit due — businesses over $100M revenue",
      es: "Vence la auditoría de ciberseguridad: empresas con ingresos superiores a 100 M$",
    },
    whatItMeans: {
      en: "Businesses whose 2026 annual gross revenue exceeded $100 million must complete their first cybersecurity audit (covering 1 January 2027 to 1 January 2028) and file the § 7124 certification of completion by 1 April 2028. Each revenue tier measures a different year — check yours.",
      es: "Las empresas cuyos ingresos brutos anuales de 2026 superaron los 100 millones de dólares deben completar su primera auditoría de ciberseguridad (que cubre del 1 de enero de 2027 al 1 de enero de 2028) y presentar la certificación de finalización del § 7124 antes del 1 de abril de 2028. Cada tramo de ingresos mide un año distinto: compruebe el suyo.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.revenueTier === null) return "undetermined";
      return org.revenueTier === "OVER_100M" ? "in-scope" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-revenue-tier" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ccpa-cyber-audit-tier-2",
    instrument: "ccpa-cyber-audits",
    citation: "Cal. Code Regs. tit. 11, § 7121(a)(2)",
    provision: "§ 7121(a)(2)",
    date: "2029-04-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "phase-in",
    severity: "reporting",
    countUnit: "organization",
    href: "/governance/settings",
    title: {
      en: "Cybersecurity audit due — businesses $50M–$100M revenue",
      es: "Vence la auditoría de ciberseguridad: empresas con ingresos de 50-100 M$",
    },
    whatItMeans: {
      en: "Businesses whose 2027 annual gross revenue fell between $50 million and $100 million must complete their first cybersecurity audit (covering calendar 2028) and file the certification by 1 April 2029.",
      es: "Las empresas cuyos ingresos brutos anuales de 2027 se situaron entre 50 y 100 millones de dólares deben completar su primera auditoría de ciberseguridad (que cubre el año natural 2028) y presentar la certificación antes del 1 de abril de 2029.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.revenueTier === null) return "undetermined";
      return org.revenueTier === "BETWEEN_50M_AND_100M"
        ? "in-scope"
        : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-revenue-tier" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ccpa-cyber-audit-tier-3",
    instrument: "ccpa-cyber-audits",
    citation: "Cal. Code Regs. tit. 11, § 7121(a)(3)",
    provision: "§ 7121(a)(3)",
    date: "2030-04-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "phase-in",
    severity: "reporting",
    countUnit: "organization",
    href: "/governance/settings",
    title: {
      en: "Cybersecurity audit due — businesses under $50M revenue",
      es: "Vence la auditoría de ciberseguridad: empresas con ingresos inferiores a 50 M$",
    },
    whatItMeans: {
      en: "Businesses whose 2028 annual gross revenue was below $50 million must complete their first cybersecurity audit (covering calendar 2029) and file the certification by 1 April 2030. Note that the audit duty itself is triggered by the § 7120(b) test, not by revenue alone.",
      es: "Las empresas cuyos ingresos brutos anuales de 2028 fueron inferiores a 50 millones de dólares deben completar su primera auditoría de ciberseguridad (que cubre el año natural 2029) y presentar la certificación antes del 1 de abril de 2030. Tenga en cuenta que el deber de auditoría se activa por la prueba del § 7120(b), no solo por los ingresos.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.revenueTier === null) return "undetermined";
      return org.revenueTier === "UNDER_50M" ? "in-scope" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-revenue-tier" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },

  // ══ California — other instruments ════════════════════════════════
  {
    id: "ca-ab-2013-training-data",
    instrument: "ca-ab-2013",
    citation:
      "Cal. Bus. & Prof. Code § 3111 (AB 2013, Generative AI: Training Data Transparency), in force 1 January 2026",
    provision: "§ 3111",
    date: "2026-01-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "duty-live",
    severity: "obligation",
    countUnit: "organization",
    href: "/governance/ai-registry",
    title: {
      en: "California training-data transparency is live",
      es: "La transparencia sobre datos de entrenamiento de California está en vigor",
    },
    whatItMeans: {
      en: "Developers of generative AI systems made publicly available to Californians, released on or after 1 January 2022, must post a high-level summary of the datasets used to train them — sources, whether personal information or copyrighted material is included, and collection dates. This binds developers, not deployers of third-party tools.",
      es: "Los desarrolladores de sistemas de IA generativa puestos a disposición del público en California, lanzados a partir del 1 de enero de 2022, deben publicar un resumen general de los conjuntos de datos utilizados para entrenarlos: fuentes, si incluyen información personal o material protegido por derechos de autor, y fechas de recopilación. Vincula a los desarrolladores, no a quienes despliegan herramientas de terceros.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.isGenerativeAiDeveloper === null) return "undetermined";
      return org.isGenerativeAiDeveloper ? "in-scope" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-admt-determination" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ca-sb-53-frontier-ai",
    instrument: "ca-sb-53",
    citation:
      "Transparency in Frontier Artificial Intelligence Act (SB 53), in force 1 January 2026",
    provision: "TFAIA",
    date: "2026-01-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "duty-live",
    severity: "reporting",
    countUnit: "organization",
    href: "/governance/incidents",
    title: {
      en: "California frontier-AI transparency is live",
      es: "La transparencia sobre IA de frontera de California está en vigor",
    },
    whatItMeans: {
      en: "Frontier developers must publish a framework describing how they manage catastrophic risk, publish transparency reports on frontier models, report critical safety incidents to Cal OES, and honour whistleblower protections. Applies only to developers meeting the compute and revenue thresholds — almost no deployer is in scope.",
      es: "Los desarrolladores de modelos de frontera deben publicar un marco que describa cómo gestionan el riesgo catastrófico, publicar informes de transparencia sobre dichos modelos, notificar incidentes críticos de seguridad a Cal OES y respetar la protección de denunciantes. Solo se aplica a desarrolladores que superen los umbrales de cómputo e ingresos: casi ningún responsable del despliegue está incluido.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.isGenerativeAiDeveloper === null) return "undetermined";
      return org.isGenerativeAiDeveloper ? "undetermined" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-admt-determination" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ca-sb-942-ai-transparency",
    instrument: "ca-sb-942",
    citation:
      "California AI Transparency Act (SB 942), as amended by AB 853 — operative 2 August 2026",
    provision: "SB 942 / AB 853",
    date: "2026-08-02",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "applies",
    severity: "obligation",
    countUnit: "organization",
    href: "/governance/ai-registry",
    title: {
      en: "California AI content-provenance duties apply",
      es: "Se aplican los deberes de procedencia del contenido de IA de California",
    },
    whatItMeans: {
      en: "Operative since 2 August 2026 (AB 853 moved it from 1 January 2026 to align with the EU AI Act date): covered generative AI providers with more than one million monthly users must offer a free AI-detection tool and support manifest and latent provenance disclosures. Large online platform duties follow on 1 January 2027.",
      es: "Vigente desde el 2 de agosto de 2026 (la AB 853 la trasladó desde el 1 de enero de 2026 para alinearla con la fecha del Reglamento de IA de la UE): los proveedores de IA generativa cubiertos con más de un millón de usuarios mensuales deben ofrecer una herramienta gratuita de detección de IA y admitir divulgaciones de procedencia manifiestas y latentes. Los deberes de las grandes plataformas en línea llegan el 1 de enero de 2027.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.isGenerativeAiDeveloper === null) return "undetermined";
      return org.isGenerativeAiDeveloper ? "undetermined" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-admt-determination" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ca-sb-942-platform-duties",
    instrument: "ca-sb-942",
    citation:
      "California AI Transparency Act (SB 942) as amended by AB 853 — large online platform duties from 1 January 2027",
    provision: "SB 942 / AB 853 (platforms)",
    date: "2027-01-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CA" },
    kind: "applies",
    severity: "obligation",
    countUnit: "organization",
    href: "/governance/ai-registry",
    title: {
      en: "California large-platform provenance duties apply",
      es: "Se aplican los deberes de procedencia para grandes plataformas de California",
    },
    whatItMeans: {
      en: "From 1 January 2027 large online platforms must detect compliant provenance data, disclose system provenance to users, allow inspection, and must not knowingly strip provenance data or digital signatures from content they distribute.",
      es: "Desde el 1 de enero de 2027, las grandes plataformas en línea deben detectar datos de procedencia conformes, informar a los usuarios de la procedencia del sistema, permitir su inspección y no eliminar deliberadamente los datos de procedencia ni las firmas digitales del contenido que distribuyen.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_CA");
      if (gate) return gate;
      if (org.isLargeOnlinePlatform === null) return "undetermined";
      return org.isLargeOnlinePlatform ? "in-scope" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-admt-determination" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },

  // ══ Other US states ═══════════════════════════════════════════════
  {
    id: "tx-traiga-live",
    instrument: "tx-traiga",
    citation:
      "Texas Responsible AI Governance Act (HB 149), in force 1 January 2026",
    provision: "TRAIGA",
    date: "2026-01-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "TX" },
    kind: "duty-live",
    severity: "prohibition",
    countUnit: "organization",
    href: "/governance/policies",
    title: {
      en: "Texas TRAIGA is live",
      es: "La ley TRAIGA de Texas está en vigor",
    },
    whatItMeans: {
      en: "In force since 1 January 2026 for anyone doing business in Texas. Intent-based prohibitions on unlawful discrimination (disparate impact alone is expressly insufficient), infringement of constitutional rights, and behavioural manipulation inciting harm. Healthcare providers must disclose AI use to patients. Attorney-General enforcement with a 60-day cure period, and a safe harbour for compliance with the NIST AI RMF — which the framework you already track supports.",
      es: "En vigor desde el 1 de enero de 2026 para quien opere en Texas. Prohibiciones basadas en la intención sobre discriminación ilícita (el impacto dispar por sí solo es expresamente insuficiente), vulneración de derechos constitucionales y manipulación conductual que incite a causar daño. Los prestadores sanitarios deben informar a los pacientes del uso de IA. Aplicación por el Fiscal General con un plazo de subsanación de 60 días y un puerto seguro por cumplir el NIST AI RMF, que este producto ya sigue.",
    },
    orgApplies: (org) => jurisdictionGate(org, "US_TX") ?? "in-scope",
    undeterminedReason: () => "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "il-hb-3773-employment-ai",
    instrument: "il-hb-3773",
    citation:
      "Illinois HB 3773, amending the Illinois Human Rights Act (775 ILCS 5/2-102), in force 1 January 2026",
    provision: "775 ILCS 5/2-102",
    date: "2026-01-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "IL" },
    kind: "duty-live",
    severity: "obligation",
    countUnit: "organization",
    href: "/governance/policies",
    title: {
      en: "Illinois employment-AI rules are live (mechanics unsettled)",
      es: "Las normas de IA en el empleo de Illinois están en vigor (mecánica sin resolver)",
    },
    whatItMeans: {
      en: "In force since 1 January 2026: Illinois employers may not use AI with a discriminatory effect across recruitment, hiring, promotion, discipline or discharge — strict liability, intent is no defence — and may not use zip code as a proxy for a protected class. Employees must be notified when AI is used for those purposes. Important caveat: the Department of Human Rights withdrew its proposed implementing rules and has published no revised timeline, so the notice timing, means and conditions remain unspecified while the statutory duties are already enforceable.",
      es: "En vigor desde el 1 de enero de 2026: los empleadores de Illinois no pueden usar IA con efecto discriminatorio en selección, contratación, promoción, disciplina o despido —responsabilidad objetiva, la intención no es defensa— ni utilizar el código postal como sustituto de una categoría protegida. Debe notificarse a los empleados cuando se use IA con esos fines. Advertencia importante: el Departamento de Derechos Humanos retiró su propuesta de reglamento de desarrollo y no ha publicado un nuevo calendario, por lo que el momento, los medios y las condiciones de la notificación siguen sin concretarse mientras los deberes legales ya son exigibles.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_IL");
      if (gate) return gate;
      if (org.hasEmployees === null) return "undetermined";
      return org.hasEmployees ? "in-scope" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-admt-determination" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "co-sb-26-189-admt",
    instrument: "co-sb-26-189",
    citation:
      "Colorado SB 26-189 (signed 14 May 2026), repealing and replacing SB 24-205; effective 1 January 2027",
    provision: "SB 26-189",
    date: "2027-01-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "CO" },
    kind: "applies",
    severity: "obligation",
    countUnit: "organization",
    href: "/governance/ai-registry",
    title: {
      en: "Colorado's replacement ADMT transparency regime applies",
      es: "Se aplica el nuevo régimen de transparencia ADMT de Colorado",
    },
    whatItMeans: {
      en: "SB 26-189 repealed and replaced the original Colorado AI Act rather than merely delaying it: the duty of care, deployer risk-management programmes and impact assessments are gone. What takes effect on 1 January 2027 is a narrower transparency regime around automated decision-making that materially influences a consequential decision — advance notice, post-decision disclosures and consumer rights, structurally close to California's ADMT rules.",
      es: "La SB 26-189 derogó y sustituyó la ley de IA original de Colorado, en lugar de limitarse a aplazarla: desaparecen el deber de diligencia, los programas de gestión de riesgos del responsable del despliegue y las evaluaciones de impacto. Lo que entra en vigor el 1 de enero de 2027 es un régimen de transparencia más estrecho sobre la decisión automatizada que influya materialmente en una decisión con consecuencias: aviso previo, información posterior a la decisión y derechos del consumidor, estructuralmente próximo a las normas ADMT de California.",
    },
    orgApplies: (org) => jurisdictionGate(org, "US_CO") ?? "in-scope",
    undeterminedReason: () => "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "nyc-ll-144-bias-audit",
    instrument: "nyc-ll-144",
    citation:
      "NYC Local Law 144 of 2021, NYC Admin. Code § 20-870 et seq.; enforcement since 5 July 2023",
    provision: "LL 144",
    date: "2023-07-05",
    dateBasis: "fixed",
    scope: { kind: "us-city", city: "NYC" },
    kind: "duty-live",
    severity: "obligation",
    countUnit: "organization",
    href: "/governance/assessments",
    title: {
      en: "NYC automated employment decision tool rules are live",
      es: "Las normas de NYC sobre herramientas automatizadas de decisión laboral están en vigor",
    },
    whatItMeans: {
      en: "Employers using automated employment decision tools for hiring or promotion in New York City need an independent bias audit no more than one year old, must publish a summary of its results, and must notify candidates at least ten business days before use. Each day of unaudited use is a separate violation. A December 2025 State Comptroller audit found enforcement had been ineffective and the agency accepted most recommendations — expect a materially stricter posture.",
      es: "Los empleadores que usen herramientas automatizadas de decisión laboral para contratar o promocionar en la ciudad de Nueva York necesitan una auditoría de sesgo independiente de antigüedad no superior a un año, deben publicar un resumen de sus resultados y notificarlo a los candidatos al menos diez días hábiles antes de su uso. Cada día de uso sin auditoría es una infracción independiente. Una auditoría del Interventor del Estado de diciembre de 2025 concluyó que la aplicación había sido ineficaz y el organismo aceptó la mayoría de las recomendaciones: cabe esperar una postura notablemente más estricta.",
    },
    orgApplies: (org) => {
      const gate = jurisdictionGate(org, "US_NY");
      if (gate) return gate;
      if (org.hasEmployees === null) return "undetermined";
      return org.hasEmployees ? "in-scope" : "out-of-scope";
    },
    undeterminedReason: (_sys, org) =>
      org.jurisdictionsDeclared ? "no-admt-determination" : "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
  {
    id: "ut-aipa-disclosure",
    instrument: "ut-aipa",
    citation:
      "Utah AI Policy Act (SB 149, 2024), as amended by SB 226 and HB 452 (2025); in force since 1 May 2024",
    provision: "Utah AIPA",
    date: "2024-05-01",
    dateBasis: "fixed",
    scope: { kind: "us-state", state: "UT" },
    kind: "duty-live",
    severity: "obligation",
    countUnit: "organization",
    href: "/governance/policies",
    title: {
      en: "Utah generative-AI disclosure rules are live",
      es: "Las normas de divulgación de IA generativa de Utah están en vigor",
    },
    whatItMeans: {
      en: "SB 226 narrowed the original act considerably: disclosure of generative AI is required when a consumer directly asks, and affirmatively in a high-risk interaction — one involving health, financial or biometric data, or advice on financial, legal or healthcare matters. A safe harbour applies where the system itself clearly discloses that it is not human at the outset of and throughout the interaction.",
      es: "La SB 226 estrechó considerablemente la ley original: la divulgación del uso de IA generativa es obligatoria cuando el consumidor lo pregunta directamente, y de forma afirmativa en una interacción de alto riesgo, aquella que implica datos de salud, financieros o biométricos, o asesoramiento en materia financiera, jurídica o sanitaria. Existe un puerto seguro cuando el propio sistema declara con claridad que no es humano al inicio de la interacción y durante toda ella.",
    },
    orgApplies: (org) => jurisdictionGate(org, "US_UT") ?? "in-scope",
    undeterminedReason: () => "no-jurisdictions",
    lawReviewedAsOf: REVIEWED,
  },
];

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

const IMMINENT_DAYS = 90;
const UPCOMING_DAYS = 365;

function phaseFor(daysRemaining: number): MilestonePhase {
  if (daysRemaining < 0) return "past";
  if (daysRemaining <= IMMINENT_DAYS) return "imminent";
  if (daysRemaining <= UPCOMING_DAYS) return "upcoming";
  return "future";
}

export interface EvaluateInput {
  org: MilestoneOrgContext;
  systems: MilestoneSystemContext[];
  /** Organization id, used as the subject id for org-level milestones. */
  organizationId?: string;
  /** REQUIRED for determinism — never defaulted to `new Date()` internally. */
  nowIso: string;
  milestones?: RegulatoryMilestone[];
}

/**
 * Evaluate one milestone against an organization and its inventory.
 *
 * The three counts (`inScope`, `undetermined`, `outOfScope`) are disjoint and
 * are never summed by callers: "4 in scope · 2 undetermined" is two numbers,
 * because an undetermined system is not a system we know to be exempt.
 */
export function evaluateMilestone(
  milestone: RegulatoryMilestone,
  input: EvaluateInput,
): MilestoneEvaluation {
  const now = new Date(input.nowIso);
  const orgId = input.organizationId ?? "__organization__";

  const inScope: string[] = [];
  const satisfied: string[] = [];
  const undetermined: { id: string; reason: UndeterminedReason }[] = [];
  let outOfScope = 0;
  let resolvedDate = new Date(`${milestone.date}T00:00:00.000Z`);

  if (milestone.countUnit === "organization") {
    const applicability =
      milestone.orgApplies?.(input.org, input.systems) ?? "undetermined";
    if (applicability === "in-scope") {
      inScope.push(orgId);
    } else if (applicability === "undetermined") {
      undetermined.push({
        id: orgId,
        reason: milestone.undeterminedReason?.(null, input.org) ?? "no-jurisdictions",
      });
    } else {
      outOfScope = 1;
    }
  } else {
    for (const sys of input.systems) {
      const applicability = milestone.applies?.(sys, input.org) ?? "undetermined";
      if (applicability === "in-scope") {
        inScope.push(sys.id);
        if (milestone.satisfiedBy?.(sys, input.org)) satisfied.push(sys.id);
        // A derived milestone takes the latest per-system deadline so the
        // headline date never understates the work remaining.
        if (milestone.dateBasis === "derived" && milestone.resolveDate) {
          const perSystem = milestone.resolveDate(sys, input.org);
          if (perSystem && perSystem.getTime() > resolvedDate.getTime()) {
            resolvedDate = perSystem;
          }
        }
      } else if (applicability === "undetermined") {
        undetermined.push({
          id: sys.id,
          reason:
            milestone.undeterminedReason?.(sys, input.org) ?? "no-jurisdictions",
        });
      } else {
        outOfScope += 1;
      }
    }
  }

  const daysRemaining = Math.ceil(
    (resolvedDate.getTime() - now.getTime()) / DAY_MS,
  );
  const outstanding = inScope.length - satisfied.length;

  return {
    milestone,
    date: resolvedDate,
    daysRemaining,
    phase: phaseFor(daysRemaining),
    inScope,
    satisfied,
    undetermined,
    outOfScope,
    overdue: daysRemaining < 0 && outstanding > 0,
    applicability:
      inScope.length > 0
        ? "applies"
        : undetermined.length > 0
          ? "unknown"
          : "does-not-apply",
  };
}

/** Evaluate every milestone, sorted by date then id — fully deterministic. */
export function evaluateMilestones(
  input: EvaluateInput,
): MilestoneEvaluation[] {
  const milestones = input.milestones ?? REGULATORY_MILESTONES;
  return milestones
    .map((m) => evaluateMilestone(m, input))
    .sort((a, b) => {
      const delta = a.date.getTime() - b.date.getTime();
      if (delta !== 0) return delta;
      return a.milestone.id < b.milestone.id ? -1 : 1;
    });
}

/** Look up a milestone by id (for deep links and click-through). */
export function getMilestone(id: string): RegulatoryMilestone | undefined {
  return REGULATORY_MILESTONES.find((m) => m.id === id);
}
