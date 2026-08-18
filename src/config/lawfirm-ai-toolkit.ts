// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Law-Firm AI Toolkit
 *
 * Curated catalog of AI tools that proliferate across law firms worldwide,
 * mapped to governance artifacts for the Quick Start law-firm path. Selecting
 * a tool generates an AIVendor, an AISystem, a RiskClassification, compliance
 * mappings, and (per category) an oversight gate; the pack below adds six
 * law-firm policies.
 *
 * All prose fields are Localized (en/es) because they become permanent org
 * records: the server resolves the requester's locale at preview/execute time
 * (see resolveContentLocale). System names are brand names and deliberately
 * NOT localized so name-based dedupe survives locale switches.
 *
 * Risk posture: every category is LIMITED risk. Law firms deploy these tools
 * as private actors; EU AI Act Annex III point 8(a) (administration of
 * justice) covers judicial authorities, not counsel — each rationale states
 * this so the classification is defensible. Oversight gates here are internal
 * control gates, independent of the risk tier.
 *
 * lawReviewedAsOf: see LAWFIRM_LAW_REVIEWED_AS_OF. Professional-responsibility
 * sign-off pending — treat rationales and policy text as editorial until then.
 */

import type {
  AITechnique,
  AISystemRole,
  AIRiskLevel,
  GateType,
  PolicyType,
} from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

export type ContentLocale = "en" | "es";
export type Localized = Record<ContentLocale, string>;

export interface LawFirmCategoryGovernance {
  technique: AITechnique;
  role: AISystemRole;
  purpose: Localized;
  processesPersonalData: boolean;
  riskLevel: AIRiskLevel;
  riskRationale: Localized;
  annexIIICategory?: string;
  /** Presence of gateType ⇒ an OversightGate is created for each system */
  gateType?: GateType;
}

export interface LawFirmToolCategory {
  id: string;
  label: Localized;
  description: Localized;
  governance: LawFirmCategoryGovernance;
}

export interface LawFirmTool {
  /** Stable slug used in wizard selection and metadata */
  id: string;
  /** Brand name — becomes AISystem.name; locale-invariant dedupe key */
  name: string;
  /** Becomes AIVendor.name (dedupe key; may collide with catalog imports, which links instead of duplicating) */
  vendor: string;
  website?: string;
  categoryId: string;
  description: Localized;
  /** Cross-link to scripts/seed-shadow-ai-tools.ts stable id */
  shadowToolId?: string;
  overrides?: Partial<
    Pick<
      LawFirmCategoryGovernance,
      "riskLevel" | "riskRationale" | "gateType" | "processesPersonalData" | "technique"
    >
  >;
}

export interface LawFirmPolicy {
  /** Stable id (not persisted; titles are the dedupe key like templates) */
  id: string;
  title: Localized;
  type: PolicyType;
  description: Localized;
  content: Localized;
}

// ============================================================
// REVIEW MARKER
// ============================================================

/** EU AI Act / professional-duty content review date. Sign-off pending. */
export const LAWFIRM_LAW_REVIEWED_AS_OF = "2026-08-18";

export const LAWFIRM_REVIEW_MARKER: Localized = {
  en: `Law reviewed as of ${LAWFIRM_LAW_REVIEWED_AS_OF}; professional-responsibility sign-off pending.`,
  es: `Revisión jurídica a fecha de ${LAWFIRM_LAW_REVIEWED_AS_OF}; pendiente de validación de responsabilidad profesional.`,
};

const withMarker = (l: Localized): Localized => ({
  en: `${l.en}\n\n${LAWFIRM_REVIEW_MARKER.en}`,
  es: `${l.es}\n\n${LAWFIRM_REVIEW_MARKER.es}`,
});

// ============================================================
// CATEGORIES
// ============================================================

export const LAWFIRM_TOOL_CATEGORIES: LawFirmToolCategory[] = [
  {
    id: "GENERAL_ASSISTANT",
    label: {
      en: "General AI Assistants",
      es: "Asistentes de IA generalistas",
    },
    description: {
      en: "General-purpose chat assistants and copilots used across the firm for drafting, summarizing, and research support.",
      es: "Asistentes conversacionales y copilotos de propósito general utilizados en todo el despacho para redactar, resumir y apoyar la investigación.",
    },
    governance: {
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: {
        en: "General-purpose generative AI assistant used by lawyers and staff for drafting, summarization, ideation, and research support across matters",
        es: "Asistente de IA generativa de propósito general utilizado por abogados y personal para redacción, resumen, ideación y apoyo a la investigación en los asuntos del despacho",
      },
      processesPersonalData: true,
      riskLevel: "LIMITED",
      riskRationale: withMarker({
        en: "Generative AI assistant with transparency obligations under EU AI Act Art. 50. The firm deploys it as a private actor, so Annex III point 8(a) (administration of justice) does not apply — that category covers judicial authorities, not counsel. Principal risks are professional, not regulatory tier: client-confidential or privileged information entered into prompts of a third-party service, hallucinated output conflicting with the duties of competence and candor, and outside-counsel guidelines that restrict or prohibit generative AI on specific client matters. Mandatory human review and an approved-tool configuration (no training on inputs) are the controlling mitigations.",
        es: "Asistente de IA generativa con obligaciones de transparencia conforme al Art. 50 del Reglamento de IA de la UE. El despacho lo utiliza como responsable del despliegue privado, por lo que no aplica el punto 8, letra a), del Anexo III (administración de justicia): esa categoría cubre a las autoridades judiciales, no a los abogados. Los riesgos principales son deontológicos, no de nivel regulatorio: introducción de información confidencial o amparada por el secreto profesional en las instrucciones de un servicio de terceros, resultados inventados («alucinaciones») contrarios a los deberes de competencia y de veracidad, y directrices de clientes para abogados externos que restringen o prohíben la IA generativa en determinados asuntos. La revisión humana obligatoria y una configuración aprobada (sin entrenamiento con los datos introducidos) son las medidas de control determinantes.",
      }),
      gateType: "PRE_DEPLOYMENT",
    },
  },
  {
    id: "LEGAL_RESEARCH",
    label: {
      en: "Legal Research AI",
      es: "IA de investigación jurídica",
    },
    description: {
      en: "AI-assisted legal research platforms with citation-grounded answers over case law and legislation.",
      es: "Plataformas de investigación jurídica asistida por IA con respuestas fundamentadas en jurisprudencia y legislación.",
    },
    governance: {
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: {
        en: "AI-assisted legal research over case law, legislation, and secondary sources, producing citation-grounded summaries and answers",
        es: "Investigación jurídica asistida por IA sobre jurisprudencia, legislación y doctrina, con resúmenes y respuestas fundamentadas en citas",
      },
      processesPersonalData: true,
      riskLevel: "LIMITED",
      riskRationale: withMarker({
        en: "Retrieval-grounded legal research AI. Limited risk under the EU AI Act: transparency obligations apply and the firm is a private deployer, not a judicial authority under Annex III 8(a). Even with retrieval grounding, hallucinated or misattributed citations remain the salient professional risk — every authority must be verified against the primary source before filing or client delivery, per the duty of candor to the tribunal. Vendor confidentiality terms govern what matter context may be entered.",
        es: "IA de investigación jurídica fundamentada en recuperación de fuentes. Riesgo limitado conforme al Reglamento de IA de la UE: aplican obligaciones de transparencia y el despacho actúa como responsable del despliegue privado, no como autoridad judicial del Anexo III 8 a). Aun con fundamentación en fuentes, las citas inventadas o mal atribuidas siguen siendo el riesgo profesional principal: toda cita debe verificarse contra la fuente original antes de presentarla ante un tribunal o entregarla al cliente, conforme al deber de veracidad. Las condiciones de confidencialidad del proveedor determinan qué contexto del asunto puede introducirse.",
      }),
    },
  },
  {
    id: "CONTRACT_CLM",
    label: {
      en: "Contract Drafting & Review AI",
      es: "IA de redacción y revisión contractual",
    },
    description: {
      en: "AI platforms for contract analysis, drafting, due diligence review, and contract lifecycle management.",
      es: "Plataformas de IA para análisis contractual, redacción, revisión de due diligence y gestión del ciclo de vida contractual.",
    },
    governance: {
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: {
        en: "AI-assisted contract analysis, drafting, and due diligence review supporting transactional and advisory work",
        es: "Análisis contractual, redacción y revisión de due diligence asistidos por IA en apoyo del trabajo transaccional y de asesoramiento",
      },
      processesPersonalData: true,
      riskLevel: "LIMITED",
      riskRationale: withMarker({
        en: "Contract AI that supports but does not replace legal judgment; limited risk with Art. 50 transparency obligations, deployed by the firm as a private actor outside Annex III 8(a). Client agreements are uploaded at scale, so confidentiality and privilege protection of the processing environment, information barriers between matters, and contractual no-training terms are the controlling concerns. AI-assisted work product is delivered to clients: qualified professional review before delivery is mandatory.",
        es: "IA contractual que apoya, pero no sustituye, el criterio jurídico; riesgo limitado con obligaciones de transparencia del Art. 50, desplegada por el despacho como actor privado fuera del Anexo III 8 a). Se cargan acuerdos de clientes a gran escala, por lo que la confidencialidad y la protección del secreto profesional en el entorno de tratamiento, las barreras de información entre asuntos y las cláusulas contractuales de no entrenamiento son las cuestiones determinantes. El producto del trabajo asistido por IA se entrega a clientes: la revisión previa por un profesional cualificado es obligatoria.",
      }),
      gateType: "PRE_DEPLOYMENT",
    },
  },
  {
    id: "EDISCOVERY",
    label: {
      en: "E-Discovery & Document Review AI",
      es: "IA de e-discovery y revisión documental",
    },
    description: {
      en: "Technology-assisted review (TAR), predictive coding, and generative review assistants for litigation document sets.",
      es: "Revisión asistida por tecnología (TAR), codificación predictiva y asistentes generativos de revisión para conjuntos documentales de litigios.",
    },
    governance: {
      technique: "MACHINE_LEARNING",
      role: "DEPLOYER",
      purpose: {
        en: "Machine-learning document review and technology-assisted review (TAR) for litigation discovery, investigations, and regulatory productions",
        es: "Revisión documental mediante aprendizaje automático y revisión asistida por tecnología (TAR) para la fase probatoria de litigios, investigaciones y requerimientos regulatorios",
      },
      processesPersonalData: true,
      riskLevel: "LIMITED",
      riskRationale: withMarker({
        en: "TAR/predictive-coding systems classify documents; they do not decide legal outcomes and the firm deploys them privately, outside Annex III 8(a). Limited risk with transparency obligations. The salient risks are procedural: defensibility of the review workflow before courts and opposing counsel (documented seed sets, validation sampling, recall metrics), disclosure obligations where TAR protocols must be agreed, chain-of-custody, protective-order compliance, and privilege screening before production.",
        es: "Los sistemas de TAR y codificación predictiva clasifican documentos; no deciden resultados jurídicos y el despacho los despliega de forma privada, fuera del Anexo III 8 a). Riesgo limitado con obligaciones de transparencia. Los riesgos relevantes son procesales: defendibilidad del flujo de revisión ante tribunales y la parte contraria (conjuntos de entrenamiento documentados, muestreo de validación, métricas de exhaustividad), obligaciones de revelación cuando los protocolos de TAR deben acordarse, cadena de custodia, cumplimiento de las órdenes de protección y cribado del secreto profesional antes de la entrega.",
      }),
      gateType: "PRE_DEPLOYMENT",
    },
  },
  {
    id: "TRANSCRIPTION_DICTATION",
    label: {
      en: "Transcription & Dictation AI",
      es: "IA de transcripción y dictado",
    },
    description: {
      en: "Meeting transcription, note-taking assistants, and professional dictation tools processing spoken matter content.",
      es: "Transcripción de reuniones, asistentes de notas y herramientas profesionales de dictado que procesan contenido hablado de los asuntos.",
    },
    governance: {
      technique: "SPEECH_RECOGNITION",
      role: "DEPLOYER",
      purpose: {
        en: "Speech-to-text transcription and dictation for meetings, hearings preparation, attendance notes, and document production",
        es: "Transcripción de voz a texto y dictado para reuniones, preparación de vistas, notas de asistencia y producción de documentos",
      },
      processesPersonalData: true,
      riskLevel: "LIMITED",
      riskRationale: withMarker({
        en: "Speech recognition with transparency obligations; deployed privately by the firm, outside Annex III. Voice recordings are personal data and frequently capture privileged conversations verbatim — recording requires informed participant consent, client calls need express clearance, and transcripts must follow the matter retention schedule. No emotion recognition or biometric categorisation is in scope; adding either would change the classification.",
        es: "Reconocimiento de voz con obligaciones de transparencia; desplegado de forma privada por el despacho, fuera del Anexo III. Las grabaciones de voz son datos personales y con frecuencia capturan literalmente conversaciones amparadas por el secreto profesional: grabar exige el consentimiento informado de los participantes, las llamadas con clientes requieren autorización expresa y las transcripciones deben seguir el calendario de conservación del asunto. No incluye reconocimiento de emociones ni categorización biométrica; incorporar cualquiera de ellos cambiaría la clasificación.",
      }),
    },
  },
  {
    id: "TRANSLATION",
    label: {
      en: "Machine Translation",
      es: "Traducción automática",
    },
    description: {
      en: "Neural machine translation used for foreign-language documents, correspondence, and cross-border matters.",
      es: "Traducción automática neuronal para documentos en otros idiomas, correspondencia y asuntos transfronterizos.",
    },
    governance: {
      technique: "NLP",
      role: "DEPLOYER",
      purpose: {
        en: "Neural machine translation of documents and correspondence in cross-border matters and multilingual client work",
        es: "Traducción automática neuronal de documentos y correspondencia en asuntos transfronterizos y trabajo multilingüe con clientes",
      },
      processesPersonalData: true,
      riskLevel: "LIMITED",
      riskRationale: withMarker({
        en: "Machine translation with transparency obligations; private deployment outside Annex III. Confidential and privileged documents are sent to a cloud service, so vendor data-processing terms, EU data residency, and deletion guarantees control the risk. Legal terms of art translate imperfectly — certified human translation remains required for filings and executed instruments.",
        es: "Traducción automática con obligaciones de transparencia; despliegue privado fuera del Anexo III. Se envían documentos confidenciales y protegidos por el secreto profesional a un servicio en la nube, por lo que las condiciones de tratamiento de datos del proveedor, la residencia de datos en la UE y las garantías de supresión determinan el riesgo. Los términos jurídicos se traducen de forma imperfecta: la traducción humana jurada sigue siendo necesaria para escritos procesales y documentos firmados.",
      }),
    },
  },
  {
    id: "PRACTICE_MANAGEMENT",
    label: {
      en: "Practice Management AI",
      es: "IA de gestión del despacho",
    },
    description: {
      en: "AI features inside practice-management platforms: matter summaries, time-entry drafting, and client intake support.",
      es: "Funciones de IA en plataformas de gestión del despacho: resúmenes de asuntos, borradores de registro de tiempos y apoyo a la captación de clientes.",
    },
    governance: {
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: {
        en: "AI-assisted matter management: summaries, time-entry drafting, intake triage, and workflow suggestions inside the firm's practice-management platform",
        es: "Gestión de asuntos asistida por IA: resúmenes, borradores de registro de tiempos, triaje de captación y sugerencias de flujo de trabajo dentro de la plataforma de gestión del despacho",
      },
      processesPersonalData: true,
      riskLevel: "LIMITED",
      riskRationale: withMarker({
        en: "Generative AI features embedded in the practice-management system; limited risk, private deployment outside Annex III. Matter and billing data include client identities and confidential engagement details, so access must remain scoped to engagement teams and AI features must respect existing matter-level permissions. Billing-entry drafting requires lawyer review for accuracy and billing-ethics compliance.",
        es: "Funciones de IA generativa integradas en el sistema de gestión del despacho; riesgo limitado, despliegue privado fuera del Anexo III. Los datos de asuntos y facturación incluyen identidades de clientes y detalles confidenciales del encargo, por lo que el acceso debe limitarse a los equipos del asunto y las funciones de IA deben respetar los permisos por asunto existentes. Los borradores de partidas de facturación requieren revisión del abogado por exactitud y deontología de la facturación.",
      }),
    },
  },
  {
    id: "DMS_KNOWLEDGE",
    label: {
      en: "Document Management & Knowledge AI",
      es: "IA de gestión documental y del conocimiento",
    },
    description: {
      en: "AI assistants over the firm's document management system and knowledge base, answering from the matter corpus.",
      es: "Asistentes de IA sobre el gestor documental y la base de conocimiento del despacho, que responden a partir del corpus de asuntos.",
    },
    governance: {
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: {
        en: "Firm-wide AI assistant over the document management system and knowledge base, retrieving and summarizing from the matter document corpus",
        es: "Asistente de IA a nivel de despacho sobre el gestor documental y la base de conocimiento, que recupera y resume a partir del corpus documental de asuntos",
      },
      processesPersonalData: true,
      riskLevel: "LIMITED",
      riskRationale: withMarker({
        en: "Retrieval-augmented assistant over the firm's privileged document corpus; limited risk, private deployment outside Annex III. The dominant risk is leakage between client matters: ethical walls and matter-level access controls must be enforced at retrieval time, not only at storage, so the assistant can never surface a document its user could not open directly. Conflicts screens and lateral-hire restrictions must propagate to the index.",
        es: "Asistente con recuperación aumentada sobre el corpus documental del despacho, protegido por el secreto profesional; riesgo limitado, despliegue privado fuera del Anexo III. El riesgo dominante es la filtración entre asuntos de distintos clientes: las barreras de información y los controles de acceso por asunto deben aplicarse en el momento de la recuperación, no solo en el almacenamiento, de modo que el asistente nunca muestre un documento que su usuario no podría abrir directamente. Los controles de conflictos de interés y las restricciones por incorporaciones laterales deben propagarse al índice.",
      }),
      gateType: "PRE_DEPLOYMENT",
    },
  },
];

// ============================================================
// TOOLS
// ============================================================

export const LAWFIRM_TOOLS: LawFirmTool[] = [
  // ---- General AI assistants -------------------------------------------
  {
    id: "chatgpt",
    name: "ChatGPT",
    vendor: "OpenAI",
    website: "https://chatgpt.com",
    categoryId: "GENERAL_ASSISTANT",
    shadowToolId: "shadow-tool-chatgpt",
    description: {
      en: "OpenAI's general-purpose assistant, the most widely used generative AI tool in professional settings, including informal use on firm devices.",
      es: "Asistente de propósito general de OpenAI, la herramienta de IA generativa más utilizada en entornos profesionales, incluido el uso informal en dispositivos del despacho.",
    },
  },
  {
    id: "claude",
    name: "Claude",
    vendor: "Anthropic",
    website: "https://claude.ai",
    categoryId: "GENERAL_ASSISTANT",
    shadowToolId: "shadow-tool-claude",
    description: {
      en: "Anthropic's assistant, adopted for long-document analysis and drafting; enterprise plans offer no-training data handling.",
      es: "Asistente de Anthropic, adoptado para el análisis de documentos extensos y la redacción; los planes de empresa ofrecen tratamiento de datos sin entrenamiento.",
    },
  },
  {
    id: "gemini",
    name: "Gemini",
    vendor: "Google",
    website: "https://gemini.google.com",
    categoryId: "GENERAL_ASSISTANT",
    shadowToolId: "shadow-tool-gemini",
    description: {
      en: "Google's assistant, integrated across Google Workspace where firms use Gmail and Docs.",
      es: "Asistente de Google, integrado en Google Workspace en los despachos que utilizan Gmail y Docs.",
    },
  },
  {
    id: "microsoft-365-copilot",
    name: "Microsoft 365 Copilot",
    vendor: "Microsoft",
    website: "https://www.microsoft.com/microsoft-365/copilot",
    categoryId: "GENERAL_ASSISTANT",
    shadowToolId: "shadow-tool-copilot",
    description: {
      en: "Copilot embedded in Word, Outlook, and Teams — often the first firm-sanctioned generative AI because it inherits the Microsoft 365 tenant boundary.",
      es: "Copilot integrado en Word, Outlook y Teams; a menudo la primera IA generativa autorizada por el despacho porque hereda el perímetro del tenant de Microsoft 365.",
    },
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    vendor: "Perplexity",
    website: "https://www.perplexity.ai",
    categoryId: "GENERAL_ASSISTANT",
    shadowToolId: "shadow-tool-perplexity",
    description: {
      en: "AI answer engine with cited web sources, used for quick factual and business research.",
      es: "Motor de respuestas de IA con fuentes web citadas, utilizado para investigación factual y de negocio rápida.",
    },
  },

  // ---- Legal research ---------------------------------------------------
  {
    id: "lexis-plus-ai",
    name: "Lexis+ AI",
    vendor: "LexisNexis",
    website: "https://www.lexisnexis.com/lexis-plus-ai",
    categoryId: "LEGAL_RESEARCH",
    shadowToolId: "shadow-tool-lexis-plus-ai",
    description: {
      en: "LexisNexis's generative research assistant with citation-grounded answers over its primary-law corpus.",
      es: "Asistente de investigación generativa de LexisNexis con respuestas fundamentadas en citas sobre su corpus de fuentes primarias.",
    },
  },
  {
    id: "westlaw-precision-ai",
    name: "Westlaw Precision AI",
    vendor: "Thomson Reuters",
    website: "https://legal.thomsonreuters.com/en/products/westlaw-precision",
    categoryId: "LEGAL_RESEARCH",
    shadowToolId: "shadow-tool-westlaw-precision",
    description: {
      en: "Thomson Reuters's AI-assisted research on Westlaw, with AI-Assisted Research answers linked to KeyCite-checked authority.",
      es: "Investigación asistida por IA de Thomson Reuters en Westlaw, con respuestas vinculadas a jurisprudencia verificada mediante KeyCite.",
    },
  },
  {
    id: "vlex-vincent",
    name: "vLex Vincent AI",
    vendor: "vLex",
    website: "https://vlex.com",
    categoryId: "LEGAL_RESEARCH",
    shadowToolId: "shadow-tool-vlex-vincent",
    description: {
      en: "vLex's research assistant with strong multi-jurisdictional and Spanish-language coverage.",
      es: "Asistente de investigación de vLex con amplia cobertura multijurisdiccional y en español.",
    },
  },

  // ---- Contract drafting & review --------------------------------------
  {
    id: "harvey",
    name: "Harvey",
    vendor: "Harvey",
    website: "https://www.harvey.ai",
    categoryId: "CONTRACT_CLM",
    shadowToolId: "shadow-tool-harvey",
    description: {
      en: "Legal AI platform for contract analysis, research, and drafting, widely adopted by large firms.",
      es: "Plataforma de IA jurídica para análisis contractual, investigación y redacción, ampliamente adoptada por grandes despachos.",
    },
  },
  {
    id: "cocounsel",
    name: "CoCounsel",
    vendor: "Thomson Reuters",
    website: "https://www.thomsonreuters.com/en/products/cocounsel",
    categoryId: "CONTRACT_CLM",
    shadowToolId: "shadow-tool-cocounsel",
    description: {
      en: "Thomson Reuters's legal AI assistant (formerly Casetext) for review, drafting, deposition preparation, and research workflows.",
      es: "Asistente de IA jurídica de Thomson Reuters (antes Casetext) para revisión, redacción, preparación de interrogatorios y flujos de investigación.",
    },
  },
  {
    id: "spellbook",
    name: "Spellbook",
    vendor: "Spellbook",
    website: "https://www.spellbook.legal",
    categoryId: "CONTRACT_CLM",
    shadowToolId: "shadow-tool-spellbook",
    description: {
      en: "Contract drafting assistant inside Microsoft Word, popular with smaller firms and in-house teams.",
      es: "Asistente de redacción contractual dentro de Microsoft Word, popular entre despachos pequeños y asesorías internas.",
    },
  },
  {
    id: "luminance",
    name: "Luminance",
    vendor: "Luminance",
    website: "https://www.luminance.com",
    categoryId: "CONTRACT_CLM",
    shadowToolId: "shadow-tool-luminance",
    description: {
      en: "AI contract review and negotiation platform used for due diligence and repapering exercises.",
      es: "Plataforma de IA para revisión y negociación de contratos, utilizada en due diligence y proyectos de renovación documental.",
    },
  },
  {
    id: "kira",
    name: "Kira",
    vendor: "Litera",
    website: "https://kirasystems.com",
    categoryId: "CONTRACT_CLM",
    shadowToolId: "shadow-tool-kira",
    description: {
      en: "Machine-learning contract analysis for M&A due diligence, now part of Litera.",
      es: "Análisis contractual mediante aprendizaje automático para due diligence de fusiones y adquisiciones, ahora parte de Litera.",
    },
  },
  {
    id: "robin-ai",
    name: "Robin AI",
    vendor: "Robin AI",
    website: "https://www.robinai.com",
    categoryId: "CONTRACT_CLM",
    shadowToolId: "shadow-tool-robin-ai",
    description: {
      en: "Contract copilot for review and negotiation with a managed legal-ops offering.",
      es: "Copiloto contractual para revisión y negociación con un servicio gestionado de operaciones jurídicas.",
    },
  },
  {
    id: "legora",
    name: "Legora",
    vendor: "Legora",
    website: "https://legora.com",
    categoryId: "CONTRACT_CLM",
    shadowToolId: "shadow-tool-legora",
    description: {
      en: "Collaborative legal AI workspace (formerly Leya) for review and drafting, growing quickly among European firms.",
      es: "Espacio de trabajo colaborativo de IA jurídica (antes Leya) para revisión y redacción, en rápida expansión entre despachos europeos.",
    },
  },
  {
    id: "ironclad",
    name: "Ironclad",
    vendor: "Ironclad",
    website: "https://ironcladapp.com",
    categoryId: "CONTRACT_CLM",
    shadowToolId: "shadow-tool-ironclad",
    description: {
      en: "Contract lifecycle management platform with AI review and repository intelligence.",
      es: "Plataforma de gestión del ciclo de vida contractual con revisión por IA e inteligencia sobre el repositorio.",
    },
  },

  // ---- E-discovery ------------------------------------------------------
  {
    id: "relativity-air",
    name: "Relativity aiR",
    vendor: "Relativity",
    website: "https://www.relativity.com",
    categoryId: "EDISCOVERY",
    shadowToolId: "shadow-tool-relativity-air",
    description: {
      en: "Generative AI review inside RelativityOne, the dominant e-discovery platform in large-firm litigation.",
      es: "Revisión con IA generativa dentro de RelativityOne, la plataforma de e-discovery dominante en litigios de grandes despachos.",
    },
  },
  {
    id: "everlaw",
    name: "Everlaw",
    vendor: "Everlaw",
    website: "https://www.everlaw.com",
    categoryId: "EDISCOVERY",
    shadowToolId: "shadow-tool-everlaw",
    description: {
      en: "Cloud e-discovery platform with predictive coding and the EverlawAI assistant.",
      es: "Plataforma de e-discovery en la nube con codificación predictiva y el asistente EverlawAI.",
    },
  },
  {
    id: "disco-cecilia",
    name: "DISCO Cecilia",
    vendor: "DISCO",
    website: "https://csdisco.com",
    categoryId: "EDISCOVERY",
    shadowToolId: "shadow-tool-disco-cecilia",
    description: {
      en: "DISCO's AI assistant for document review, timelines, and deposition preparation.",
      es: "Asistente de IA de DISCO para revisión documental, cronologías y preparación de interrogatorios.",
    },
  },
  {
    id: "logikcull",
    name: "Logikcull",
    vendor: "Reveal",
    website: "https://www.logikcull.com",
    categoryId: "EDISCOVERY",
    shadowToolId: "shadow-tool-logikcull",
    description: {
      en: "Self-service discovery automation for smaller matters and internal investigations, part of Reveal.",
      es: "Automatización de discovery en autoservicio para asuntos menores e investigaciones internas, parte de Reveal.",
    },
  },

  // ---- Transcription & dictation ---------------------------------------
  {
    id: "otter",
    name: "Otter AI",
    vendor: "Otter.ai",
    website: "https://otter.ai",
    categoryId: "TRANSCRIPTION_DICTATION",
    shadowToolId: "shadow-tool-otter",
    description: {
      en: "Meeting transcription assistant that frequently joins calls uninvited via calendar integration — a common shadow AI entry point.",
      es: "Asistente de transcripción de reuniones que a menudo se une a las llamadas sin invitación mediante la integración de calendario: una vía habitual de entrada de IA en la sombra.",
    },
  },
  {
    id: "fireflies",
    name: "Fireflies.ai",
    vendor: "Fireflies",
    website: "https://fireflies.ai",
    categoryId: "TRANSCRIPTION_DICTATION",
    shadowToolId: "shadow-tool-fireflies",
    description: {
      en: "AI notetaker that records, transcribes, and summarizes meetings across conferencing platforms.",
      es: "Tomador de notas con IA que graba, transcribe y resume reuniones en distintas plataformas de videoconferencia.",
    },
  },
  {
    id: "dragon-professional",
    name: "Dragon Professional",
    vendor: "Microsoft (Nuance)",
    website: "https://www.nuance.com/dragon.html",
    categoryId: "TRANSCRIPTION_DICTATION",
    shadowToolId: "shadow-tool-dragon",
    description: {
      en: "Professional dictation suite with a long legal heritage (Dragon Legal), including on-premise deployment options.",
      es: "Suite profesional de dictado con larga tradición jurídica (Dragon Legal), con opciones de despliegue local.",
    },
  },
  {
    id: "rev",
    name: "Rev",
    vendor: "Rev",
    website: "https://www.rev.com",
    categoryId: "TRANSCRIPTION_DICTATION",
    shadowToolId: "shadow-tool-rev",
    description: {
      en: "Transcription service combining AI drafts with human review, used for depositions and recorded evidence.",
      es: "Servicio de transcripción que combina borradores de IA con revisión humana, utilizado para declaraciones y pruebas grabadas.",
    },
  },
  {
    id: "verbit",
    name: "Verbit",
    vendor: "Verbit",
    website: "https://verbit.ai",
    categoryId: "TRANSCRIPTION_DICTATION",
    shadowToolId: "shadow-tool-verbit",
    description: {
      en: "Legal transcription and captioning platform serving court reporting and deposition workflows.",
      es: "Plataforma de transcripción y subtitulado jurídicos para flujos de actas judiciales y declaraciones.",
    },
  },

  // ---- Translation ------------------------------------------------------
  {
    id: "deepl",
    name: "DeepL",
    vendor: "DeepL",
    website: "https://www.deepl.com",
    categoryId: "TRANSLATION",
    shadowToolId: "shadow-tool-deepl",
    description: {
      en: "Neural machine translation widely used in European cross-border practice; Pro tier offers no-training and EU data residency.",
      es: "Traducción automática neuronal muy utilizada en la práctica transfronteriza europea; el nivel Pro ofrece no entrenamiento y residencia de datos en la UE.",
    },
  },

  // ---- Practice management ---------------------------------------------
  {
    id: "clio-duo",
    name: "Clio Duo",
    vendor: "Clio",
    website: "https://www.clio.com",
    categoryId: "PRACTICE_MANAGEMENT",
    shadowToolId: "shadow-tool-clio-duo",
    description: {
      en: "AI assistant inside Clio's practice-management suite: matter summaries, time-entry drafting, and task triage.",
      es: "Asistente de IA dentro de la suite de gestión de Clio: resúmenes de asuntos, borradores de registro de tiempos y triaje de tareas.",
    },
  },
  {
    id: "filevine-ai",
    name: "Filevine AI",
    vendor: "Filevine",
    website: "https://www.filevine.com",
    categoryId: "PRACTICE_MANAGEMENT",
    shadowToolId: "shadow-tool-filevine",
    description: {
      en: "AI features across Filevine's case-management platform, including demand-letter drafting and document summarization.",
      es: "Funciones de IA en la plataforma de gestión de expedientes de Filevine, incluida la redacción de reclamaciones y el resumen de documentos.",
    },
  },

  // ---- DMS & knowledge --------------------------------------------------
  {
    id: "imanage-ai",
    name: "iManage AI",
    vendor: "iManage",
    website: "https://imanage.com",
    categoryId: "DMS_KNOWLEDGE",
    shadowToolId: "shadow-tool-imanage-ai",
    description: {
      en: "AI services over the iManage document management system — the DMS of record at most large firms — including Ask iManage and document intelligence.",
      es: "Servicios de IA sobre el gestor documental iManage —el DMS de referencia en la mayoría de grandes despachos—, incluidos Ask iManage y la inteligencia documental.",
    },
  },
  {
    id: "netdocuments-ndmax",
    name: "NetDocuments ndMAX",
    vendor: "NetDocuments",
    website: "https://www.netdocuments.com",
    categoryId: "DMS_KNOWLEDGE",
    shadowToolId: "shadow-tool-ndmax",
    description: {
      en: "Generative AI suite over the NetDocuments DMS, answering from the firm's governed document corpus.",
      es: "Suite de IA generativa sobre el DMS de NetDocuments, que responde a partir del corpus documental gobernado del despacho.",
    },
  },
];

// ============================================================
// POLICY PACK
// ============================================================

export const LAWFIRM_POLICY_PACK: LawFirmPolicy[] = [
  {
    id: "lf-ai-use",
    title: {
      en: "AI Use Policy — Law Firm",
      es: "Política de uso de IA — Despacho de abogados",
    },
    type: "AI_USAGE",
    description: {
      en: "Firm-wide rules for which AI tools may be used, by whom, and under what conditions.",
      es: "Normas del despacho sobre qué herramientas de IA pueden utilizarse, por quién y en qué condiciones.",
    },
    content: withMarker({
      en: "This policy governs the use of artificial intelligence tools by all lawyers, trainees, and staff of the firm. Only tools listed in the firm's approved-tool register may be used for client work. The register records each tool's approved configuration, permitted data categories, and the partner or committee that approved it. Any tool not on the register is prohibited for matter-related work until reviewed and approved.\n\nUse of personal accounts for matter data is prohibited. Client documents, matter facts, client identities, and privileged communications must never be entered into consumer AI accounts or free tiers. Firm-approved tools must be accessed exclusively through firm-provisioned accounts configured so that inputs are not used for model training.\n\nThe firm designates an AI Officer responsible for maintaining the register, reviewing new tools, coordinating training, and monitoring compliance. All personnel must complete AI-awareness training before receiving access to approved generative AI tools, covering capabilities, limitations, confidentiality risks, and this policy's requirements.\n\nUse of approved tools is logged where the platform permits, and logs form part of the firm's audit trail. Suspected breaches of this policy — including entry of client data into unapproved tools — must be reported to the AI Officer immediately and are handled under the AI Incident Response Policy.",
      es: "Esta política regula el uso de herramientas de inteligencia artificial por todos los abogados, juristas en formación y personal del despacho. Solo las herramientas incluidas en el registro de herramientas aprobadas del despacho pueden utilizarse para trabajo de clientes. El registro recoge la configuración aprobada de cada herramienta, las categorías de datos permitidas y el socio o comité que la aprobó. Toda herramienta que no figure en el registro queda prohibida para trabajo relacionado con asuntos hasta su revisión y aprobación.\n\nQueda prohibido el uso de cuentas personales para datos de asuntos. Los documentos de clientes, los hechos de los asuntos, las identidades de los clientes y las comunicaciones amparadas por el secreto profesional no deben introducirse nunca en cuentas de IA de consumo ni en versiones gratuitas. Las herramientas aprobadas deben utilizarse exclusivamente a través de cuentas proporcionadas por el despacho, configuradas de modo que los datos introducidos no se utilicen para entrenar modelos.\n\nEl despacho designa un Responsable de IA encargado de mantener el registro, revisar nuevas herramientas, coordinar la formación y supervisar el cumplimiento. Todo el personal debe completar una formación de concienciación sobre IA antes de recibir acceso a las herramientas de IA generativa aprobadas, que cubra capacidades, limitaciones, riesgos de confidencialidad y los requisitos de esta política.\n\nEl uso de las herramientas aprobadas se registra cuando la plataforma lo permite, y los registros forman parte del registro de auditoría del despacho. Las sospechas de incumplimiento de esta política —incluida la introducción de datos de clientes en herramientas no aprobadas— deben comunicarse de inmediato al Responsable de IA y se gestionan conforme a la Política de respuesta a incidentes de IA.",
    }),
  },
  {
    id: "lf-genai-practice",
    title: {
      en: "Generative AI in Legal Practice",
      es: "IA generativa en el ejercicio de la abogacía",
    },
    type: "AI_GOVERNANCE",
    description: {
      en: "Professional standards for using generative AI in legal work: permitted uses, mandatory review, and citation verification.",
      es: "Estándares profesionales para el uso de IA generativa en el trabajo jurídico: usos permitidos, revisión obligatoria y verificación de citas.",
    },
    content: withMarker({
      en: "Generative AI may be used to accelerate legal work — first drafts, summaries, document comparison, research starting points, and translation drafts — but never to replace professional judgment. Prohibited uses include: generating advice delivered to a client without lawyer review, autonomous client communications, and any use a client's outside-counsel guidelines exclude for that matter.\n\nEvery AI output used in client work must be reviewed by a qualified lawyer who takes professional responsibility for it. The reviewing lawyer is accountable for the work product to the same standard as if drafted personally. Supervising lawyers must apply the same supervision duties to AI-assisted work by junior lawyers and staff as to any delegated work.\n\nCitation verification is mandatory: every authority, quotation, and factual assertion in AI-assisted output must be verified against the primary source before it is filed with any court or tribunal or delivered to a client. Filing unverified AI-generated citations may breach the duty of candor to the tribunal and exposes the firm and the individual lawyer to sanctions.\n\nPrompt discipline applies at all times: matter identifiers, client names, and privileged content may be entered only into tools approved for matter data under the AI Use Policy. When in doubt, anonymize. Lawyers must maintain technological competence regarding the capabilities and limitations of the AI tools they use, as required by their professional duty of competence.",
      es: "La IA generativa puede utilizarse para acelerar el trabajo jurídico —primeros borradores, resúmenes, comparación de documentos, puntos de partida de investigación y borradores de traducción—, pero nunca para sustituir el criterio profesional. Entre los usos prohibidos se incluyen: generar asesoramiento que se entregue a un cliente sin revisión de un abogado, comunicaciones autónomas con clientes y cualquier uso que las directrices del cliente para abogados externos excluyan para ese asunto.\n\nTodo resultado de IA utilizado en trabajo de clientes debe ser revisado por un abogado cualificado que asuma la responsabilidad profesional sobre el mismo. El abogado revisor responde del producto del trabajo con el mismo estándar que si lo hubiera redactado personalmente. Los abogados supervisores deben aplicar al trabajo asistido por IA de los abogados junior y del personal los mismos deberes de supervisión que a cualquier trabajo delegado.\n\nLa verificación de citas es obligatoria: toda cita de jurisprudencia o doctrina, toda transcripción literal y toda afirmación de hecho contenida en un resultado asistido por IA debe verificarse contra la fuente original antes de presentarse ante cualquier juzgado o tribunal o entregarse a un cliente. Presentar citas generadas por IA sin verificar puede vulnerar el deber de veracidad ante el tribunal y expone al despacho y al abogado a sanciones.\n\nLa disciplina en las instrucciones se aplica en todo momento: los identificadores de asuntos, los nombres de clientes y el contenido amparado por el secreto profesional solo pueden introducirse en herramientas aprobadas para datos de asuntos conforme a la Política de uso de IA. En caso de duda, anonimizar. Los abogados deben mantener competencia tecnológica sobre las capacidades y limitaciones de las herramientas de IA que utilizan, como exige su deber profesional de competencia.",
    }),
  },
  {
    id: "lf-client-disclosure",
    title: {
      en: "Client AI Disclosure & Engagement Letters",
      es: "Transparencia con el cliente sobre IA y hojas de encargo",
    },
    type: "AI_TRANSPARENCY",
    description: {
      en: "When and how the firm discloses AI use to clients, including engagement-letter language and billing transparency.",
      es: "Cuándo y cómo el despacho informa a los clientes del uso de IA, incluida la redacción de la hoja de encargo y la transparencia en la facturación.",
    },
    content: withMarker({
      en: "Clients must be informed when AI materially contributes to their deliverables. The firm's standard engagement letter includes a clause describing the categories of AI tools the firm may use, the safeguards applied (approved tools, no training on client data, mandatory lawyer review), and the client's right to restrict AI use on their matters. Material AI involvement in a specific deliverable is disclosed on request and whenever candor requires it.\n\nClient instructions prevail. Outside-counsel guidelines and matter-specific instructions restricting or prohibiting AI use are recorded against the matter at intake and propagate to the whole matter team. No AI tool may be used on a matter in breach of the client's recorded restrictions; the AI Officer maintains the mapping between client restrictions and tool availability.\n\nExpress client consent is obtained before client confidential information is processed by an AI tool outside the firm's approved, contractually protected environment, and before any AI use the engagement terms do not already cover.\n\nBilling must fairly reflect AI-assisted work. Time saved through AI assistance must not be billed as if performed manually; where the firm bills for AI-assisted tasks, entries describe the work honestly. Fee arrangements that pass AI platform costs to clients must be disclosed in the engagement terms.",
      es: "Los clientes deben ser informados cuando la IA contribuya de forma sustancial a sus entregables. La hoja de encargo estándar del despacho incluye una cláusula que describe las categorías de herramientas de IA que el despacho puede utilizar, las salvaguardias aplicadas (herramientas aprobadas, no entrenamiento con datos del cliente, revisión obligatoria por abogado) y el derecho del cliente a restringir el uso de IA en sus asuntos. La participación sustancial de IA en un entregable concreto se comunica a petición del cliente y siempre que el deber de lealtad lo exija.\n\nLas instrucciones del cliente prevalecen. Las directrices para abogados externos y las instrucciones específicas del asunto que restrinjan o prohíban el uso de IA se registran en el asunto desde su apertura y se comunican a todo el equipo. Ninguna herramienta de IA puede utilizarse en un asunto contraviniendo las restricciones registradas del cliente; el Responsable de IA mantiene la correspondencia entre restricciones de clientes y disponibilidad de herramientas.\n\nSe obtiene el consentimiento expreso del cliente antes de que su información confidencial sea tratada por una herramienta de IA fuera del entorno aprobado y contractualmente protegido del despacho, y antes de cualquier uso de IA no cubierto ya por los términos del encargo.\n\nLa facturación debe reflejar fielmente el trabajo asistido por IA. El tiempo ahorrado gracias a la IA no debe facturarse como si el trabajo se hubiera realizado manualmente; cuando el despacho factura tareas asistidas por IA, las partidas describen el trabajo con honestidad. Los acuerdos de honorarios que repercutan al cliente costes de plataformas de IA deben constar en los términos del encargo.",
    }),
  },
  {
    id: "lf-confidentiality",
    title: {
      en: "Confidentiality, Privilege & AI Systems",
      es: "Confidencialidad, secreto profesional y sistemas de IA",
    },
    type: "AI_DATA_GOVERNANCE",
    description: {
      en: "Data governance for AI processing of client and matter information: classification, ethical walls, retention, and no-training guarantees.",
      es: "Gobernanza de datos para el tratamiento por IA de información de clientes y asuntos: clasificación, barreras de información, conservación y garantías de no entrenamiento.",
    },
    content: withMarker({
      en: "All information must be classified before AI processing. Privileged communications, client confidential information, and personal data may only be processed by tools approved for those categories in the tool register. Public information and firm know-how carry fewer restrictions but remain subject to this policy.\n\nAI systems with access to the document management system or knowledge base must enforce matter-level access controls and ethical walls at retrieval time. An AI assistant must never return content its user could not open directly. Conflicts screens, lateral-hire restrictions, and information barriers between client matters propagate to every AI index and retrieval layer; cross-matter processing is prohibited unless anonymized and aggregated.\n\nNo firm or client data may be used to train third-party models. Every AI vendor contract must include a no-training clause, confidentiality terms at least equivalent to the firm's duties, breach notification, and deletion on termination. Cross-border transfers of matter data through AI services must comply with applicable data-protection law and the client's data-residency requirements.\n\nAI inputs and outputs are firm records: conversation histories, generated drafts, and transcripts containing matter information follow the matter's retention schedule and are purged with it. Personnel must not retain matter-related AI outputs in personal accounts or local stores outside the firm's systems.",
      es: "Toda la información debe clasificarse antes de su tratamiento por IA. Las comunicaciones amparadas por el secreto profesional, la información confidencial de clientes y los datos personales solo pueden tratarse con herramientas aprobadas para esas categorías en el registro de herramientas. La información pública y el conocimiento interno del despacho tienen menos restricciones, pero siguen sujetos a esta política.\n\nLos sistemas de IA con acceso al gestor documental o a la base de conocimiento deben aplicar los controles de acceso por asunto y las barreras de información en el momento de la recuperación. Un asistente de IA no debe devolver nunca contenido que su usuario no podría abrir directamente. Los controles de conflictos de interés, las restricciones por incorporaciones laterales y las barreras de información entre asuntos de distintos clientes se propagan a todos los índices y capas de recuperación de IA; el tratamiento cruzado entre asuntos está prohibido salvo anonimización y agregación.\n\nNingún dato del despacho o de clientes puede utilizarse para entrenar modelos de terceros. Todo contrato con un proveedor de IA debe incluir una cláusula de no entrenamiento, condiciones de confidencialidad al menos equivalentes a los deberes del despacho, notificación de brechas y supresión a la terminación. Las transferencias transfronterizas de datos de asuntos a través de servicios de IA deben cumplir la normativa de protección de datos aplicable y los requisitos de residencia de datos del cliente.\n\nLas entradas y salidas de IA son registros del despacho: los historiales de conversación, los borradores generados y las transcripciones con información de asuntos siguen el calendario de conservación del asunto y se suprimen con él. El personal no debe conservar resultados de IA relacionados con asuntos en cuentas personales ni en almacenamientos locales ajenos a los sistemas del despacho.",
    }),
  },
  {
    id: "lf-procurement",
    title: {
      en: "AI Vendor Vetting & Procurement",
      es: "Evaluación y contratación de proveedores de IA",
    },
    type: "AI_PROCUREMENT",
    description: {
      en: "Pre-adoption review and contractual requirements for AI tools, including pilots gated by oversight review.",
      es: "Revisión previa a la adopción y requisitos contractuales para herramientas de IA, incluidos pilotos sujetos a puntos de control.",
    },
    content: withMarker({
      en: "Every AI tool undergoes security, confidentiality, and data-protection review before any client data touches it. The review covers: where data is processed and stored, whether inputs train models, subprocessors, certifications (e.g. SOC 2, ISO 27001), the vendor's breach history, and the data-processing agreement. The AI Officer records the outcome in the vendor register and the approved-tool register.\n\nRequired contract terms for any tool processing matter data: an express no-training clause; confidentiality obligations at least equivalent to the firm's professional duties; breach notification within a defined period; data residency compatible with client requirements; audit or assurance rights; and certified deletion of firm data on termination. Deviations require sign-off by the AI Officer and the responsible partner.\n\nNew tools are piloted before firm-wide rollout. A pilot runs with a defined scope, non-sensitive or consented data, and an oversight gate: the pre-deployment review must pass before the tool is promoted to the approved register for general matter use.\n\nApproved vendors are re-reviewed at least annually and on any material change — new model providers, changed subprocessors, altered data-handling terms, or a security incident. Findings that undermine the original approval trigger suspension pending re-assessment.",
      es: "Toda herramienta de IA se somete a una revisión de seguridad, confidencialidad y protección de datos antes de que ningún dato de cliente pase por ella. La revisión abarca: dónde se tratan y almacenan los datos, si las entradas entrenan modelos, los subencargados, las certificaciones (p. ej., SOC 2, ISO 27001), el historial de brechas del proveedor y el acuerdo de encargo de tratamiento. El Responsable de IA registra el resultado en el registro de proveedores y en el registro de herramientas aprobadas.\n\nCláusulas contractuales exigidas para toda herramienta que trate datos de asuntos: cláusula expresa de no entrenamiento; obligaciones de confidencialidad al menos equivalentes a los deberes profesionales del despacho; notificación de brechas en un plazo definido; residencia de datos compatible con los requisitos de los clientes; derechos de auditoría o de garantía; y supresión certificada de los datos del despacho a la terminación. Las excepciones requieren la aprobación del Responsable de IA y del socio responsable.\n\nLas herramientas nuevas se pilotan antes de su implantación general. El piloto se ejecuta con un alcance definido, datos no sensibles o consentidos y un punto de control: la revisión previa al despliegue debe superarse antes de promover la herramienta al registro aprobado para uso general en asuntos.\n\nLos proveedores aprobados se revisan al menos anualmente y ante cualquier cambio sustancial: nuevos proveedores de modelos, cambios de subencargados, modificación de las condiciones de tratamiento de datos o un incidente de seguridad. Los hallazgos que desvirtúen la aprobación original conllevan la suspensión hasta una nueva evaluación.",
    }),
  },
  {
    id: "lf-incident",
    title: {
      en: "AI Incident Response — Legal Practice",
      es: "Respuesta a incidentes de IA — Ejercicio de la abogacía",
    },
    type: "AI_INCIDENT_RESPONSE",
    description: {
      en: "How the firm detects, escalates, and remediates AI incidents, from confidentiality breaches to hallucinated citations in filings.",
      es: "Cómo el despacho detecta, escala y corrige incidentes de IA, desde brechas de confidencialidad hasta citas inventadas en escritos procesales.",
    },
    content: withMarker({
      en: "AI incidents in legal practice include: client confidential or privileged information entered into an unapproved tool; a hallucinated citation or fabricated authority discovered in a filed document or client deliverable; suspected privilege waiver through third-party AI processing; an AI vendor security breach; and AI output that leaked content across matter walls. All personnel must report suspected incidents immediately to the AI Officer.\n\nEscalation is immediate for incidents touching filings or privilege: the responsible partner and the General Counsel (or ethics partner) are informed the same day. The AI Officer opens an incident record, preserves evidence — prompts, outputs, tool logs — and coordinates containment, including suspending the tool involved where warranted.\n\nNotification duties are assessed for every incident: the affected client (under the duty of candor and the engagement terms), the firm's professional-indemnity insurer, the data-protection authority and data subjects where personal-data breach thresholds are met, and the court where a filed document contained fabricated authority — prompt correction of the record is mandatory and takes precedence over reputational concerns.\n\nEvery incident closes with a post-incident review: root cause, whether the tool register, training, or contractual terms need changing, and any disciplinary follow-up. Lessons feed the AI Use Policy, the vendor register, and the firm's training program through the registro de auditoría — the audit trail kept for all AI governance actions.",
      es: "Los incidentes de IA en el ejercicio de la abogacía incluyen: la introducción de información confidencial o amparada por el secreto profesional en una herramienta no aprobada; el descubrimiento de una cita inventada o jurisprudencia inexistente en un documento presentado o en un entregable a cliente; la sospecha de pérdida del secreto profesional por tratamiento de IA de terceros; una brecha de seguridad de un proveedor de IA; y resultados de IA que filtren contenido entre barreras de asuntos. Todo el personal debe comunicar de inmediato al Responsable de IA cualquier sospecha de incidente.\n\nLa escalada es inmediata en incidentes que afecten a escritos procesales o al secreto profesional: se informa el mismo día al socio responsable y al director de la asesoría jurídica interna (o al socio de deontología). El Responsable de IA abre un registro del incidente, preserva las pruebas —instrucciones, resultados, registros de la herramienta— y coordina la contención, incluida la suspensión de la herramienta implicada cuando proceda.\n\nEn cada incidente se evalúan los deberes de notificación: al cliente afectado (por el deber de lealtad y los términos del encargo), a la aseguradora de responsabilidad civil profesional del despacho, a la autoridad de protección de datos y a los interesados cuando se alcancen los umbrales de brecha de datos personales, y al tribunal cuando un documento presentado contenga jurisprudencia inexistente: la rectificación inmediata ante el tribunal es obligatoria y prevalece sobre cualquier consideración reputacional.\n\nTodo incidente se cierra con una revisión posterior: causa raíz, necesidad de modificar el registro de herramientas, la formación o las condiciones contractuales, y las consecuencias disciplinarias que procedan. Las lecciones alimentan la Política de uso de IA, el registro de proveedores y el programa de formación del despacho a través del registro de auditoría de todas las acciones de gobernanza de IA.",
    }),
  },
];

// ============================================================
// HELPERS
// ============================================================

export function getLawFirmCategory(id: string): LawFirmToolCategory | undefined {
  return LAWFIRM_TOOL_CATEGORIES.find((c) => c.id === id);
}

/** Filter tools by id, preserving config (display) order. */
export function getLawFirmToolsById(ids: string[]): LawFirmTool[] {
  const wanted = new Set(ids);
  return LAWFIRM_TOOLS.filter((t) => wanted.has(t.id));
}

/** Effective governance for a tool: category governance + tool overrides. */
export function getToolGovernance(tool: LawFirmTool): LawFirmCategoryGovernance {
  const category = getLawFirmCategory(tool.categoryId);
  if (!category) {
    throw new Error(`Unknown law-firm tool category: ${tool.categoryId}`);
  }
  return { ...category.governance, ...(tool.overrides ?? {}) };
}

/**
 * Resolve the content locale from the same cookie next-intl reads
 * (src/i18n/request.ts). Used by preview and execute so they cannot diverge.
 */
export function resolveContentLocale(
  getCookie: (name: string) => string | undefined,
): ContentLocale {
  return getCookie("locale") === "es" ? "es" : "en";
}
