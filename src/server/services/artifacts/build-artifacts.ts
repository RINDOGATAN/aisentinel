// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The three artifacts of the unified workflow, assembled deterministically
 * from a system's resolved scope and its unified assessment answers:
 *
 *   1. the unified AI impact assessment,
 *   2. the multi-jurisdictional AI notice (universal core plus addenda),
 *   3. the human-review and appeal protocol,
 *
 * plus the agentic addendum produced by the stress test.
 *
 * Every paragraph traces to an answer. Where an answer is missing the
 * generator emits a gap carrying the obligation it would have satisfied, so
 * the document is honest about what is still open rather than quietly short.
 */

import {
  UNIFIED_ASSESSMENT_LAW_REVIEWED_AS_OF,
  UNIFIED_ASSESSMENT_VERSION,
  allUnifiedQuestions,
  selectUnifiedQuestions,
  type Citation,
  type OverlayTag,
  type SelectedSection,
  type UnifiedQuestion,
} from "@/config/unified-assessment";
import { runAgenticStressTest } from "@/config/agentic-stress-test";
import type { SystemScope } from "@/server/services/scope/system-scope";
import {
  collectGaps,
  gap,
  list,
  paragraph,
  table,
  type Artifact,
  type ArtifactSection,
  type Block,
} from "./types";

export type ContentLocale = "en" | "es";

const DISCLAIMER: Record<ContentLocale, string> = {
  en: "This document was assembled from the AI registry and the answers recorded in the unified impact assessment. It is a drafting aid, not legal advice, and the regulatory content it cites is pending legal sign-off. Review every section before it leaves the organisation.",
  es: "Este documento se ha compuesto a partir del registro de IA y de las respuestas recogidas en la evaluación de impacto unificada. Es una ayuda a la redacción, no asesoramiento jurídico, y el contenido normativo que cita está pendiente de validación jurídica. Revise cada apartado antes de que salga de la organización.",
};

const REGIME_LABELS: Record<string, string> = {
  "eu:high-risk": "EU AI Act (high-risk)",
  "eu:art50": "EU AI Act Art. 50 (transparency)",
  "gdpr:core": "GDPR",
  "gdpr:adm": "GDPR Art. 22 (automated decisions)",
  "gdpr:dpia": "GDPR Art. 35 (impact assessment)",
  "gdpr:special": "GDPR Art. 9 (special categories)",
  "admt:art10": "California CCPA risk assessments (Art. 10)",
  "admt:art11": "California CCPA ADMT (Art. 11)",
  "co:developer": "Colorado SB 26-189 (developer)",
  "co:deployer": "Colorado SB 26-189 (deployer)",
  "tx:core": "Texas TRAIGA",
  "tx:government": "Texas TRAIGA (government)",
  "tx:healthcare": "Texas TRAIGA (health care)",
  "wa:mhmda": "Washington My Health My Data Act",
  "wa:genai-provenance": "Washington HB 1170 (provenance)",
  "wa:companion": "Washington HB 2225 (companion chatbots)",
  "wa:prior-auth": "Washington RCW 48.43.830 (prior authorisation)",
  "wa:public-agency": "Washington RCW 43.105 (public agencies)",
  agentic: "Agentic layer",
};

export function regimeLabels(tags: readonly string[]): string[] {
  const labels = tags.map((t) => REGIME_LABELS[t]).filter((l): l is string => !!l);
  return labels.length > 0 ? [...new Set(labels)] : ["No regime resolved yet"];
}

/** Which framework each overlay tag belongs to. */
const TAG_FRAMEWORK: Record<string, string> = {
  "eu:high-risk": "EU_AI_ACT",
  "eu:art50": "EU_AI_ACT",
  "gdpr:core": "EU_GDPR",
  "gdpr:adm": "EU_GDPR",
  "gdpr:dpia": "EU_GDPR",
  "gdpr:special": "EU_GDPR",
  "admt:art10": "CA_CCPA_ADMT",
  "admt:art11": "CA_CCPA_ADMT",
  "co:developer": "CO_SB_26_189",
  "co:deployer": "CO_SB_26_189",
  "tx:core": "TX_TRAIGA",
  "tx:government": "TX_TRAIGA",
  "tx:healthcare": "TX_TRAIGA",
  "wa:mhmda": "WA_AI_RULES",
  "wa:genai-provenance": "WA_AI_RULES",
  "wa:companion": "WA_AI_RULES",
  "wa:prior-auth": "WA_AI_RULES",
  "wa:public-agency": "WA_AI_RULES",
};

/**
 * The frameworks whose citations may appear in this system's documents.
 *
 * A document that cites a state the organisation does not operate in reads as
 * boilerplate, and the practitioner stops trusting the citations that do
 * apply. NIST and ISO are voluntary standards rather than jurisdictional
 * regimes, so they are always citable; the EU AI Act is citable wherever the
 * organisation has an EU or EEA nexus, since its deployer duties do not depend
 * on the high-risk tier.
 */
export function applicableFrameworks(scope: SystemScope): Set<string> {
  const out = new Set<string>(["NIST_AI_RMF", "ISO_42001"]);
  for (const tag of scope.overlayTags) {
    const framework = TAG_FRAMEWORK[tag];
    if (framework) out.add(framework);
  }
  if (scope.jurisdictions.some((j) => j === "EU" || j === "EEA")) out.add("EU_AI_ACT");
  return out;
}

/**
 * Prefixes of the free-text citation strings used by the notice addenda and
 * the stress-test findings, so those can be scope-filtered too. Structured
 * `Citation` objects carry their framework; these do not.
 */
const CITATION_PREFIXES: [string, string][] = [
  ["EU AI Act", "EU_AI_ACT"],
  ["EU GDPR", "EU_GDPR"],
  ["CA CCPA ADMT", "CA_CCPA_ADMT"],
  ["CO SB 26-189", "CO_SB_26_189"],
  ["TX TRAIGA", "TX_TRAIGA"],
  ["WA ", "WA_AI_RULES"],
  ["NIST", "NIST_AI_RMF"],
  ["ISO", "ISO_42001"],
];

/**
 * Drop citation strings whose framework does not reach this system. A finding
 * or an addendum that cites a state the organisation does not operate in is
 * the boilerplate that makes a practitioner distrust every other citation in
 * the document.
 */
export function filterCitationStrings(
  citations: readonly string[],
  applicable: ReadonlySet<string>,
): string[] {
  return citations.filter((citation) => {
    const match = CITATION_PREFIXES.find(([prefix]) => citation.startsWith(prefix));
    // An unrecognised prefix is kept: silently dropping a citation we failed to
    // classify would be a worse failure than showing one too many.
    return !match || applicable.has(match[1]);
  });
}

function citationText(citations: readonly Citation[], applicable?: ReadonlySet<string>): string[] {
  return citations
    .filter((c) => !applicable || applicable.has(c.framework))
    .map((c) => `${c.framework.replace(/_/g, " ")} ${c.code}`);
}

export interface ArtifactInput {
  scope: SystemScope;
  /** Answers keyed by question id, as stored on the assessment. */
  answers: Record<string, unknown>;
  locale: ContentLocale;
  generatedAt: string;
}

/** An answer, trimmed, or null when nothing usable was recorded. */
function answerOf(answers: Record<string, unknown>, id: string): string | null {
  const raw = answers[id];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * One question rendered into a document: either the answer, or a gap carrying
 * the obligations that answer would have evidenced.
 */
function answerBlocks(
  input: ArtifactInput,
  question: UnifiedQuestion,
  locale: ContentLocale,
  applicable: ReadonlySet<string>,
): Block[] {
  const answer = answerOf(input.answers, question.id);
  if (answer) return [paragraph(answer)];
  return [gap(question.text[locale], citationText(question.satisfies, applicable))];
}

function questionsFor(
  sections: readonly SelectedSection[],
  target: "assessment" | "notice" | "protocol",
): { section: SelectedSection; question: UnifiedQuestion & { reason: string } }[] {
  const out: { section: SelectedSection; question: UnifiedQuestion & { reason: string } }[] = [];
  for (const section of sections) {
    for (const question of section.questions) {
      const feeds = question.feeds ?? ["assessment"];
      if (feeds.includes(target)) out.push({ section, question });
    }
  }
  return out;
}

function header(input: ArtifactInput, kind: Artifact["kind"], title: string, subtitle: string, sections: ArtifactSection[]): Artifact {
  return {
    kind,
    title,
    subtitle,
    organizationName: input.scope.organizationName,
    systemName: input.scope.system.name,
    generatedAt: input.generatedAt,
    contentVersion: UNIFIED_ASSESSMENT_VERSION,
    lawReviewedAsOf: UNIFIED_ASSESSMENT_LAW_REVIEWED_AS_OF,
    disclaimer: DISCLAIMER[input.locale],
    regimes: regimeLabels(input.scope.overlayTags),
    sections,
    gaps: collectGaps(sections),
  };
}

/** Undetermined regimes are stated up front: the reader must see what is unresolved. */
function scopeSection(input: ArtifactInput): ArtifactSection {
  const { scope, locale } = input;
  const blocks: Block[] = [
    paragraph(
      locale === "es"
        ? `Este documento se ha calibrado para las jurisdicciones declaradas por la organización: ${scope.jurisdictions.join(", ") || "ninguna declarada"}.`
        : `This document was calibrated to the jurisdictions the organisation has declared: ${scope.jurisdictions.join(", ") || "none declared"}.`,
    ),
    table(
      locale === "es" ? ["Régimen", "Situación"] : ["Regime", "Status"],
      [
        ...regimeLabels(scope.overlayTags).map((label) => [label, locale === "es" ? "Aplica" : "Applies"]),
        ...scope.undetermined.map((u) => [
          u.framework.replace(/_/g, " "),
          locale === "es" ? "Sin determinar" : "Undetermined",
        ]),
      ],
    ),
  ];
  if (scope.undetermined.length > 0) {
    blocks.push(
      gap(
        locale === "es"
          ? `Quedan regímenes sin determinar (${scope.undetermined.map((u) => u.framework.replace(/_/g, " ")).join(", ")}). Responda su cuestionario de aplicabilidad antes de considerar cerrado este documento.`
          : `Some regimes remain undetermined (${scope.undetermined.map((u) => u.framework.replace(/_/g, " ")).join(", ")}). Answer their applicability screening before treating this document as complete.`,
        scope.undetermined.flatMap((u) => u.openQuestions.map((q) => `${u.framework.replace(/_/g, " ")}: ${q}`)),
      ),
    );
  }
  if (!scope.admtResolved && scope.jurisdictions.includes("US_CA")) {
    blocks.push(
      gap(
        locale === "es"
          ? "La determinación de ADMT de California sigue sin resolverse, por lo que no se han aplicado sus capas."
          : "The California ADMT determination is still unresolved, so its overlays have not been applied.",
        ["CA CCPA ADMT § 7001(e)(1)"],
      ),
    );
  }
  return {
    heading: locale === "es" ? "Alcance y regímenes aplicables" : "Scope and applicable regimes",
    blocks,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. The unified impact assessment
// ═══════════════════════════════════════════════════════════════════════════

export function buildAssessmentArtifact(input: ArtifactInput): Artifact {
  const { locale } = input;
  const applicable = applicableFrameworks(input.scope);
  const sections = selectUnifiedQuestions(input.scope.overlayTags);
  const docSections: ArtifactSection[] = [scopeSection(input)];

  for (const section of sections) {
    const blocks: Block[] = [];
    if (section.intro) blocks.push(paragraph(section.intro[locale]));
    for (const question of section.questions) {
      blocks.push(paragraph(`**${question.text[locale]}**`));
      blocks.push(...answerBlocks(input, question, locale, applicable));
    }
    docSections.push({
      heading: section.title[locale],
      citations: [
        ...new Set(section.questions.flatMap((q) => citationText(q.satisfies, applicable))),
      ],
      blocks,
    });
  }

  return header(
    input,
    "assessment",
    locale === "es" ? "Evaluación de impacto de IA unificada" : "Unified AI impact assessment",
    locale === "es"
      ? "Un único expediente que responde a la evaluación de impacto sobre los derechos fundamentales del Reglamento de IA de la UE, la evaluación de impacto relativa a la protección de datos del RGPD, la evaluación de riesgos de ADMT de California y los regímenes de Colorado, Texas y Washington."
      : "One record answering the EU AI Act fundamental rights impact assessment, the GDPR data protection impact assessment, the California ADMT risk assessment, and the Colorado, Texas and Washington regimes.",
    docSections,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. The multi-jurisdictional notice
// ═══════════════════════════════════════════════════════════════════════════

interface AddendumSpec {
  tag: OverlayTag;
  heading: Record<ContentLocale, string>;
  citations: string[];
  /** Question ids whose answers belong in this addendum. */
  questionIds: string[];
  /** Statements that hold whatever the answers say. */
  statements: Record<ContentLocale, string>[];
}

const NOTICE_ADDENDA: AddendumSpec[] = [
  {
    tag: "gdpr:adm",
    heading: { en: "European Union and EEA", es: "Unión Europea y EEE" },
    citations: ["EU GDPR Art. 13(2)(f) / 14(2)(g)", "EU GDPR Art. 22", "EU GDPR Art. 15(1)(h)"],
    questionIds: ["dec_logic"],
    statements: [
      {
        en: "This decision is made by automated means. You have the right to obtain human intervention, to express your point of view and to contest the decision.",
        es: "Esta decisión se adopta por medios automatizados. Tiene derecho a obtener intervención humana, a expresar su punto de vista y a impugnar la decisión.",
      },
      {
        en: "You may ask us at any time to confirm whether automated decision-making is used about you, and to explain the logic, significance and consequences.",
        es: "Puede pedirnos en cualquier momento que confirmemos si se adoptan decisiones automatizadas sobre usted y que expliquemos la lógica, la importancia y las consecuencias.",
      },
    ],
  },
  {
    tag: "admt:art11",
    heading: { en: "California", es: "California" },
    citations: ["CA CCPA ADMT § 7220", "CA CCPA ADMT § 7221", "CA CCPA ADMT § 7222"],
    questionIds: ["not_ca_preuse", "rev_optout"],
    statements: [
      {
        en: "We use automated decision-making technology to make a significant decision about you. This notice is given before that use.",
        es: "Utilizamos tecnología de decisión automatizada para adoptar una decisión significativa sobre usted. Este aviso se facilita antes de ese uso.",
      },
      {
        en: "You may opt out of that use, or, where we rely on the human-appeal exception, ask a designated reviewer with authority to change the decision to review it. You may also ask for access to information about how the technology reached its output about you.",
        es: "Puede oponerse a ese uso o, cuando nos amparemos en la excepción de recurso humano, solicitar que una persona revisora designada con autoridad para cambiar la decisión la revise. También puede solicitar acceso a la información sobre cómo la tecnología llegó a su resultado.",
      },
    ],
  },
  {
    tag: "co:deployer",
    heading: { en: "Colorado", es: "Colorado" },
    citations: ["CO SB 26-189 CO-DEP-1", "CO SB 26-189 CO-DEP-2", "CO SB 26-189 CO-DEP-3"],
    questionIds: ["not_co_public"],
    statements: [
      {
        en: "Automated decision-making technology is used in this consequential decision about you. If the outcome is adverse, we will tell you the principal reasons, the categories of personal data that drove it, and how to correct inaccurate data and seek review.",
        es: "En esta decisión con consecuencias sobre usted se utiliza tecnología de decisión automatizada. Si el resultado le es desfavorable, le informaremos de las razones principales, de las categorías de datos personales que la determinaron y de cómo corregir datos inexactos y solicitar una revisión.",
      },
    ],
  },
  {
    tag: "tx:core",
    heading: { en: "Texas", es: "Texas" },
    citations: ["TX TRAIGA § 552.051(a)"],
    questionIds: ["not_ai_interaction"],
    statements: [
      {
        en: "You are interacting with an artificial intelligence system.",
        es: "Está interactuando con un sistema de inteligencia artificial.",
      },
    ],
  },
  {
    tag: "tx:healthcare",
    heading: { en: "Texas — health care", es: "Texas — asistencia sanitaria" },
    citations: ["TX TRAIGA § 552.051(b)"],
    questionIds: ["not_health_treatment"],
    statements: [
      {
        en: "An artificial intelligence system is used in connection with your care. This is disclosed to you no later than the date the service is first provided, or as soon as reasonably possible in an emergency.",
        es: "Se utiliza un sistema de inteligencia artificial en relación con su atención. Se le informa de ello a más tardar en la fecha en que se preste el servicio por primera vez, o tan pronto como sea razonablemente posible en caso de urgencia.",
      },
    ],
  },
  {
    tag: "wa:mhmda",
    heading: { en: "Washington — health data", es: "Washington — datos de salud" },
    citations: ["WA RCW 19.373.020", "WA RCW 19.373.030", "WA RCW 19.373.040"],
    questionIds: ["data_health_inference"],
    statements: [
      {
        en: "This system may derive health data about you from information that is not itself health information. We collect and share that data only with your consent, and you may confirm, access, withdraw consent and ask for deletion.",
        es: "Este sistema puede derivar datos de salud sobre usted a partir de información que no es sanitaria. Recogemos y compartimos esos datos únicamente con su consentimiento, y usted puede confirmarlos, acceder a ellos, retirar el consentimiento y solicitar su supresión.",
      },
    ],
  },
  {
    tag: "wa:genai-provenance",
    heading: { en: "Washington — generated content", es: "Washington — contenido generado" },
    citations: ["WA HB 1170 (2026)", "EU AI Act Art. 50(2)"],
    questionIds: ["not_provenance"],
    statements: [
      {
        en: "Image, video and audio content this system creates or materially alters carries provenance data so you can determine its origin.",
        es: "El contenido de imagen, vídeo y audio que este sistema crea o altera de forma sustancial incorpora datos de procedencia para que pueda determinar su origen.",
      },
    ],
  },
  {
    tag: "wa:companion",
    heading: { en: "Washington — companion chatbot", es: "Washington — chatbot de compañía" },
    citations: ["WA HB 2225 § 3", "WA HB 2225 § 4", "WA HB 2225 § 5"],
    questionIds: ["not_companion"],
    statements: [
      {
        en: "This companion is artificial and not human. You will be reminded of this at least every three hours, and every hour if you are under 18. If you express thoughts of suicide or self-harm, the system will respond with crisis resources under our published protocol.",
        es: "Este acompañante es artificial y no humano. Se le recordará al menos cada tres horas, y cada hora si es menor de 18 años. Si expresa pensamientos de suicidio o autolesión, el sistema responderá con recursos de crisis conforme a nuestro protocolo publicado.",
      },
    ],
  },
  {
    tag: "eu:art50",
    heading: { en: "AI interaction and generated content", es: "Interacción con IA y contenido generado" },
    citations: ["EU AI Act Art. 50(1)", "EU AI Act Art. 50(4)"],
    questionIds: ["not_ai_interaction"],
    statements: [
      {
        en: "You are interacting with an AI system, and content it generates or manipulates is disclosed as artificially generated.",
        es: "Está interactuando con un sistema de IA, y el contenido que genera o manipula se identifica como generado artificialmente.",
      },
    ],
  },
  {
    tag: "agentic",
    heading: { en: "Autonomous agents", es: "Agentes autónomos" },
    citations: ["EU GDPR Art. 13(2)(f) / 14(2)(g)", "EU AI Act Art. 50(1)"],
    questionIds: ["agt_notice_coverage"],
    statements: [
      {
        en: "Some steps in this process are carried out by an autonomous software agent acting on the system's output without a person reviewing each step. Where that happens, the same rights described above apply to the resulting decision.",
        es: "Algunas fases de este proceso las realiza un agente de software autónomo que actúa sobre el resultado del sistema sin que una persona revise cada paso. Cuando eso ocurra, los mismos derechos descritos arriba se aplican a la decisión resultante.",
      },
    ],
  },
];

export function buildNoticeArtifact(input: ArtifactInput): Artifact {
  const { locale, scope } = input;
  const active = new Set(scope.overlayTags);
  const applicable = applicableFrameworks(scope);
  const byId = new Map(allUnifiedQuestions().map(({ question }) => [question.id, question]));

  // Part 1: the universal core, drafted to the strictest formulation so it
  // stands alone in a jurisdiction that adds nothing.
  const coreQuestions = ["sys_description", "sys_purpose", "data_categories", "dec_description", "not_core", "rev_route"];
  const coreBlocks: Block[] = [
    paragraph(
      locale === "es"
        ? "Este apartado se aplica en todas las jurisdicciones. Los apartados siguientes añaden lo que exige cada régimen."
        : "This part applies in every jurisdiction. The parts that follow add what each regime requires on top.",
    ),
  ];
  for (const id of coreQuestions) {
    const question = byId.get(id);
    if (!question) continue;
    coreBlocks.push(paragraph(`**${question.text[locale]}**`));
    coreBlocks.push(...answerBlocks(input, question, locale, applicable));
  }

  const sections: ArtifactSection[] = [
    scopeSection(input),
    {
      heading: locale === "es" ? "Núcleo universal" : "Universal core",
      citations: filterCitationStrings(
        ["EU GDPR Art. 12", "EU AI Act Art. 26", "CA CCPA ADMT § 7220", "CO SB 26-189 CO-DEP-1"],
        applicable,
      ),
      blocks: coreBlocks,
    },
  ];

  const addenda: ArtifactSection[] = [];
  for (const spec of NOTICE_ADDENDA) {
    if (!active.has(spec.tag)) continue;
    const blocks: Block[] = spec.statements.map((s) => paragraph(s[locale]));
    for (const id of spec.questionIds) {
      const question = byId.get(id);
      if (!question) continue;
      blocks.push(...answerBlocks(input, question, locale, applicable));
    }
    addenda.push({
      heading: spec.heading[locale],
      citations: filterCitationStrings(spec.citations, applicable),
      blocks,
    });
  }

  if (addenda.length > 0) {
    sections.push({
      heading: locale === "es" ? "Anexos por jurisdicción" : "Jurisdictional addenda",
      blocks: [
        paragraph(
          locale === "es"
            ? "Cada anexo se aplica únicamente a las personas de esa jurisdicción y se añade al núcleo universal; no lo sustituye."
            : "Each addendum applies only to people in that jurisdiction and adds to the universal core; it does not replace it.",
        ),
      ],
      subsections: addenda,
    });
  } else {
    sections.push({
      heading: locale === "es" ? "Anexos por jurisdicción" : "Jurisdictional addenda",
      blocks: [
        gap(
          locale === "es"
            ? "Ningún régimen resuelto añade obligaciones de información. Confirme las jurisdicciones de la organización y el cuestionario de aplicabilidad antes de publicar este aviso."
            : "No resolved regime adds a notice obligation. Confirm the organisation's jurisdictions and the applicability screening before publishing this notice.",
          [],
        ),
      ],
    });
  }

  return header(
    input,
    "notice",
    locale === "es" ? "Aviso de IA multijurisdiccional" : "Multi-jurisdictional AI notice",
    locale === "es"
      ? "Un núcleo universal redactado conforme al régimen más exigente, más un anexo por cada jurisdicción que añade obligaciones propias."
      : "A universal core drafted to the strictest regime, plus one addendum for each jurisdiction that adds obligations of its own.",
    sections,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. The human-review and appeal protocol
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A citation shown only when its regime applies. A protocol that cites the
 * California sections at an organisation with no California nexus reads as
 * boilerplate, and a practitioner stops trusting the rest of the document.
 */
interface GatedCitation {
  text: string;
  requires?: OverlayTag;
}

const PROTOCOL_STEPS: {
  id: string;
  heading: Record<ContentLocale, string>;
  questionIds: string[];
  citations: GatedCitation[];
}[] = [
  {
    id: "trigger",
    heading: { en: "When the protocol applies", es: "Cuándo se aplica el protocolo" },
    questionIds: ["dec_description", "dec_human_role"],
    citations: [
      { text: "EU GDPR Art. 22", requires: "gdpr:adm" },
      { text: "CA CCPA ADMT § 7001(e)(1)", requires: "admt:art11" },
      { text: "CO SB 26-189 CO-DEP-4", requires: "co:deployer" },
    ],
  },
  {
    id: "route",
    heading: { en: "How a person asks for review", es: "Cómo solicita una persona la revisión" },
    questionIds: ["rev_route", "rev_optout"],
    citations: [
      { text: "EU GDPR Art. 22(3)", requires: "gdpr:adm" },
      { text: "CA CCPA ADMT § 7221(a)", requires: "admt:art11" },
      { text: "CO SB 26-189 CO-DEP-4", requires: "co:deployer" },
    ],
  },
  {
    id: "reviewer",
    heading: { en: "The reviewer and their authority", es: "La persona revisora y su autoridad" },
    questionIds: ["rev_reviewer", "meas_oversight"],
    citations: [
      { text: "EU GDPR Art. 22(3)", requires: "gdpr:adm" },
      { text: "CA CCPA ADMT § 7221(b)(1)", requires: "admt:art11" },
      { text: "EU AI Act Art. 14(1)", requires: "eu:high-risk" },
    ],
  },
  {
    id: "what",
    heading: { en: "What the reviewer must consider", es: "Qué debe valorar la persona revisora" },
    questionIds: ["dec_logic", "rev_explanation"],
    citations: [
      { text: "EU GDPR Art. 15(1)(h)", requires: "gdpr:adm" },
      { text: "EU AI Act Art. 86", requires: "eu:high-risk" },
      { text: "CA CCPA ADMT § 7222", requires: "admt:art11" },
    ],
  },
  {
    id: "timing",
    heading: { en: "Timelines and outcome", es: "Plazos y resultado" },
    questionIds: ["rev_timing"],
    citations: [
      { text: "CA CCPA ADMT § 7221", requires: "admt:art11" },
      { text: "CO SB 26-189 CO-DEP-4", requires: "co:deployer" },
    ],
  },
  {
    id: "correction",
    heading: { en: "Correcting the data behind the decision", es: "Corrección de los datos que sustentan la decisión" },
    questionIds: ["rev_correction"],
    citations: [
      { text: "EU GDPR Art. 5(1)(d)", requires: "gdpr:core" },
      { text: "CO SB 26-189 CO-DEP-4", requires: "co:deployer" },
    ],
  },
  {
    id: "records",
    heading: { en: "Records of every review", es: "Registro de cada revisión" },
    questionIds: ["gov_records"],
    citations: [
      { text: "CO SB 26-189 CO-REC-1", requires: "co:deployer" },
      { text: "EU AI Act Art. 12", requires: "eu:high-risk" },
    ],
  },
];

/** Ungated citations always show; gated ones only when their regime applies. */
function applicableCitations(citations: readonly GatedCitation[], active: ReadonlySet<string>): string[] {
  return citations.filter((c) => !c.requires || active.has(c.requires)).map((c) => c.text);
}

export function buildProtocolArtifact(input: ArtifactInput): Artifact {
  const { locale, scope } = input;
  const byId = new Map(allUnifiedQuestions().map(({ question }) => [question.id, question]));
  const active = new Set(scope.overlayTags);
  const applicable = applicableFrameworks(scope);

  const sections: ArtifactSection[] = [scopeSection(input)];

  for (const step of PROTOCOL_STEPS) {
    const blocks: Block[] = [];
    for (const id of step.questionIds) {
      const question = byId.get(id);
      if (!question) continue;
      // Only include overlay questions the system's scope actually selected.
      if (question.overlay && !active.has(question.overlay)) continue;
      blocks.push(paragraph(`**${question.text[locale]}**`));
      blocks.push(...answerBlocks(input, question, locale, applicable));
    }
    if (blocks.length === 0) continue;
    sections.push({
      heading: step.heading[locale],
      citations: applicableCitations(step.citations, active),
      blocks,
    });
  }

  // The variation table is the reason this is one protocol and not five.
  const variations: string[][] = [];
  if (active.has("gdpr:adm")) {
    variations.push([
      "EU / EEA",
      locale === "es" ? "Intervención humana, expresar el punto de vista, impugnar" : "Human intervention, express a view, contest",
      "GDPR Art. 22(3)",
    ]);
  }
  if (active.has("admt:art11")) {
    variations.push([
      "California",
      locale === "es" ? "Exclusión voluntaria, o persona revisora designada con autoridad para cambiar la decisión" : "Opt-out, or a designated reviewer with authority to change the decision",
      "CCPA ADMT § 7221",
    ]);
  }
  if (active.has("co:deployer")) {
    variations.push([
      "Colorado",
      locale === "es" ? "Corrección de datos y revisión tras una decisión desfavorable" : "Data correction and review after an adverse decision",
      "SB 26-189",
    ]);
  }
  if (active.has("wa:prior-auth")) {
    variations.push([
      "Washington",
      locale === "es" ? "La denegación la adopta un profesional colegiado; la herramienta nunca deniega" : "A licensed professional makes the denial; the tool never denies",
      "RCW 48.43.830",
    ]);
  }
  if (active.has("eu:high-risk")) {
    variations.push([
      "EU (high-risk)",
      locale === "es" ? "Derecho a una explicación de la decisión individual" : "Right to an explanation of the individual decision",
      "AI Act Art. 86",
    ]);
  }
  if (variations.length > 0) {
    sections.push({
      heading: locale === "es" ? "Variaciones por jurisdicción" : "Jurisdictional variations",
      blocks: [
        paragraph(
          locale === "es"
            ? "El flujo anterior es común. Esta tabla recoge lo que cada jurisdicción añade o formula de otro modo."
            : "The workflow above is common to all. This table records what each jurisdiction adds or words differently.",
        ),
        table(
          locale === "es" ? ["Jurisdicción", "Lo que exige", "Base"] : ["Jurisdiction", "What it requires", "Basis"],
          variations,
        ),
      ],
    });
  }

  return header(
    input,
    "protocol",
    locale === "es" ? "Protocolo de revisión humana y recurso" : "Human review and appeal protocol",
    locale === "es"
      ? "Un único flujo de revisión que satisface el art. 22.3 del RGPD, la excepción de recurso humano de California, el derecho de revisión de Colorado y el derecho a una explicación del Reglamento de IA."
      : "One review workflow satisfying GDPR Art. 22(3), the California human-appeal exception, the Colorado review right and the EU AI Act right to an explanation.",
    sections,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. The agentic addendum — the stress test as a document
// ═══════════════════════════════════════════════════════════════════════════

export function buildAgenticAddendumArtifact(input: ArtifactInput): Artifact {
  const { locale, scope } = input;
  const applicable = applicableFrameworks(scope);
  const result = runAgenticStressTest(scope.overlayTags);
  const byId = new Map(allUnifiedQuestions().map(({ question }) => [question.id, question]));

  if (result.applicable.length === 0) {
    return header(
      input,
      "agentic-addendum",
      locale === "es" ? "Anexo agéntico" : "Agentic addendum",
      locale === "es"
        ? "No se ha declarado ninguna delegación en un agente autónomo para este sistema."
        : "No handoff to an autonomous agent has been declared for this system.",
      [
        {
          heading: locale === "es" ? "Sin capa agéntica" : "No agentic layer",
          blocks: [
            gap(
              locale === "es"
                ? "Nadie ha respondido si este sistema entrega su resultado a un agente autónomo. Responda esa pregunta antes de dar por cerrado el análisis: la prueba de esfuerzo agéntica no se ha ejecutado."
                : "Nobody has answered whether this system hands its output to an autonomous agent. Answer that before treating the analysis as closed: the agentic stress test has not run.",
              [],
            ),
          ],
        },
      ],
    );
  }

  const severityLabel: Record<string, Record<ContentLocale, string>> = {
    breaks: { en: "Breaks", es: "Rompe" },
    weakens: { en: "Weakens", es: "Debilita" },
    watch: { en: "Watch", es: "Vigilar" },
  };
  const artifactLabel: Record<string, Record<ContentLocale, string>> = {
    assessment: { en: "Impact assessment", es: "Evaluación de impacto" },
    notice: { en: "Notice", es: "Aviso" },
    protocol: { en: "Review protocol", es: "Protocolo de revisión" },
  };

  const sections: ArtifactSection[] = [
    {
      heading: locale === "es" ? "Resumen" : "Summary",
      blocks: [
        paragraph(
          locale === "es"
            ? `La prueba de esfuerzo identifica ${result.applicable.length} punto(s) en los que la delegación en un agente autónomo afecta a los tres documentos: ${result.counts.breaks} que los rompen, ${result.counts.weakens} que los debilitan y ${result.counts.watch} a vigilar.`
            : `The stress test identifies ${result.applicable.length} point(s) at which the handoff to an autonomous agent affects the three documents: ${result.counts.breaks} that break them, ${result.counts.weakens} that weaken them and ${result.counts.watch} to watch.`,
        ),
        table(
          locale === "es" ? ["Hallazgo", "Gravedad", "Documentos afectados"] : ["Finding", "Severity", "Documents affected"],
          result.applicable.map((f) => [
            f.title[locale],
            severityLabel[f.severity][locale],
            f.artifacts.map((a) => artifactLabel[a][locale]).join(", "),
          ]),
        ),
      ],
    },
  ];

  for (const finding of result.applicable) {
    const blocks: Block[] = [
      paragraph(
        `**${locale === "es" ? "Lo que asumía el régimen" : "What the regime assumed"}:** ${finding.assumption[locale]}`,
      ),
      paragraph(
        `**${locale === "es" ? "Qué rompe la delegación" : "What the handoff breaks"}:** ${finding.breakage[locale]}`,
      ),
      paragraph(
        `**${locale === "es" ? "Disposición que exige la capa agéntica" : "Provision the agentic layer demands"}:** ${finding.provision[locale]}`,
      ),
    ];
    // Evidence: the answers that already address the provision, or the gap.
    const evidence = finding.evidencedBy
      .map((id) => ({ id, question: byId.get(id), answer: answerOf(input.answers, id) }))
      .filter((e) => e.question);
    const answered = evidence.filter((e) => e.answer);
    if (answered.length > 0) {
      blocks.push(
        paragraph(`**${locale === "es" ? "Lo que ya consta" : "What is already recorded"}:**`),
        list(answered.map((e) => `${e.question!.text[locale]} — ${e.answer}`)),
      );
    }
    const findingCitations = filterCitationStrings(finding.citations, applicable);
    for (const missing of evidence.filter((e) => !e.answer)) {
      blocks.push(gap(missing.question!.text[locale], findingCitations));
    }

    sections.push({
      heading: `${severityLabel[finding.severity][locale]} — ${finding.title[locale]}`,
      citations: findingCitations,
      blocks,
    });
  }

  return header(
    input,
    "agentic-addendum",
    locale === "es" ? "Anexo agéntico" : "Agentic addendum",
    locale === "es"
      ? "Dónde se rompe cada documento cuando el sistema entrega su resultado a un agente autónomo, y qué disposiciones exige esa capa."
      : "Where each document breaks when the system hands its output to an autonomous agent, and what provisions that layer demands.",
    sections,
  );
}
