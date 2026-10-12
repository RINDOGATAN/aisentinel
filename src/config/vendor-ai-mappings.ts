// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Vendor AI Mappings
 *
 * Maps VendorCatalog categories to AI governance artifacts for the
 * AI Governance Quick Start feature. When a user imports a vendor,
 * these mappings determine what AI systems, risk classifications,
 * and oversight gates are auto-generated.
 *
 * Every text that becomes part of an organisation's records is Localized
 * (en/es) and resolved with the requester's content locale at preview and
 * execute time. The catalog's own vendor descriptions are not translated.
 */

import type { AITechnique, AISystemRole, AIRiskLevel, GateType } from "@prisma/client";
import type { ContentLocale, Localized } from "./lawfirm-ai-toolkit";

// ============================================================
// TYPES
// ============================================================

export interface VendorAIMapping {
  /** Display label for this category group */
  label: Localized;
  /** Vendor catalog categories that map to this group */
  catalogCategories: string[];
  /** AI system to create for the vendor */
  system: {
    nameSuffix: Localized;
    technique: AITechnique;
    role: AISystemRole;
    purpose: Localized;
    processesPersonalData: boolean;
  };
  /** Risk classification */
  riskLevel: AIRiskLevel;
  riskRationale: Localized;
  /** Stored as written; shown in the reader's language by src/lib/annex-iii-label.ts. */
  annexIIICategory?: string;
  /** Whether this mapping requires an oversight gate */
  requiresOversightGate: boolean;
  gateType?: GateType;
}

// ============================================================
// CATEGORY MAPPINGS
// ============================================================

export const VENDOR_AI_MAPPINGS: Record<string, VendorAIMapping> = {
  llm: {
    label: { en: "LLM Provider", es: "Proveedor de LLM" },
    catalogCategories: ["LLM Provider"],
    system: {
      nameSuffix: { en: "LLM Platform", es: "Plataforma de LLM" },
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: { en: "Generative AI platform used for text generation, summarization, translation, and conversational AI capabilities", es: "Plataforma de IA generativa utilizada para generar, resumir y traducir textos y para funciones de IA conversacional" },
      processesPersonalData: true,
    },
    riskLevel: "LIMITED",
    riskRationale: { en: "Generative AI system with transparency obligations under EU AI Act Art. 50. Users must be informed they are interacting with an AI system. Risk of hallucination and potential processing of personal data in prompts.", es: "Sistema de IA generativa sujeto a las obligaciones de transparencia del art. 50 del RIA. Debe informarse a los usuarios de que interactúan con un sistema de IA. Riesgo de alucinaciones y posible tratamiento de datos personales en las instrucciones." },
    requiresOversightGate: false,
  },

  aiPlatform: {
    label: { en: "AI Platform", es: "Plataforma de IA" },
    // "AI & Machine Learning" is the snapshot's top-level AI category; subcategory
    // matches (e.g. "LLM Provider") take precedence in findAIMappingForCategory.
    catalogCategories: ["AI Platform", "AI & Machine Learning", "ML Platform", "Generative AI", "AI Tools"],
    system: {
      nameSuffix: { en: "AI Platform", es: "Plataforma de IA" },
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: { en: "AI development and deployment platform providing model hosting, fine-tuning, and inference capabilities", es: "Plataforma de desarrollo y despliegue de IA que ofrece alojamiento de modelos, ajuste fino e inferencia" },
      processesPersonalData: true,
    },
    riskLevel: "LIMITED",
    riskRationale: { en: "AI platform with transparency obligations. Downstream use cases may elevate risk depending on application domain. Regular review recommended as deployment scope evolves.", es: "Plataforma de IA sujeta a obligaciones de transparencia. Los casos de uso posteriores pueden elevar el riesgo según el ámbito de aplicación. Se recomienda revisarla periódicamente a medida que cambie el alcance del despliegue." },
    requiresOversightGate: false,
  },

  mlops: {
    label: { en: "MLOps & Infrastructure", es: "MLOps e infraestructura" },
    catalogCategories: ["MLOps & Infrastructure", "ML Observability", "Vector Database"],
    system: {
      nameSuffix: { en: "MLOps Infrastructure", es: "Infraestructura de MLOps" },
      technique: "MACHINE_LEARNING",
      role: "DEPLOYER",
      purpose: { en: "Machine learning operations infrastructure for model training, versioning, monitoring, and deployment pipelines", es: "Infraestructura de operaciones de aprendizaje automático para el entrenamiento, el control de versiones, la supervisión y los flujos de despliegue de modelos" },
      processesPersonalData: false,
    },
    riskLevel: "MINIMAL",
    riskRationale: { en: "Infrastructure tooling that supports ML workflows. Does not directly make decisions affecting individuals. Risk depends on the models deployed through the platform.", es: "Herramientas de infraestructura que dan soporte a los flujos de aprendizaje automático. No toman directamente decisiones que afecten a personas. El riesgo depende de los modelos que se desplieguen a través de la plataforma." },
    requiresOversightGate: false,
  },

  computerVision: {
    label: { en: "Computer Vision", es: "Visión artificial" },
    catalogCategories: ["Computer Vision"],
    system: {
      nameSuffix: { en: "Computer Vision System", es: "Sistema de visión artificial" },
      technique: "COMPUTER_VISION",
      role: "DEPLOYER",
      purpose: { en: "Computer vision system for image/video analysis, object detection, or visual recognition tasks", es: "Sistema de visión artificial para el análisis de imágenes o vídeo, la detección de objetos o tareas de reconocimiento visual" },
      processesPersonalData: true,
    },
    riskLevel: "HIGH",
    riskRationale: { en: "Computer vision systems may involve biometric processing or remote identification. EU AI Act Annex III covers biometric identification and categorization. Requires conformity assessment and human oversight before deployment.", es: "Los sistemas de visión artificial pueden implicar tratamiento biométrico o identificación remota. El anexo III del RIA incluye la identificación y la categorización biométricas. Requiere evaluación de la conformidad y supervisión humana antes del despliegue." },
    annexIIICategory: "1. Biometrics",
    requiresOversightGate: true,
    gateType: "PRE_DEPLOYMENT",
  },

  agents: {
    label: { en: "AI Agents & Automation", es: "Agentes de IA y automatización" },
    catalogCategories: ["AI Agents & Automation"],
    system: {
      nameSuffix: { en: "AI Agent", es: "Agente de IA" },
      technique: "AGENTIC_AI",
      role: "DEPLOYER",
      purpose: { en: "Autonomous AI agent system capable of planning, executing multi-step tasks, and taking actions with limited human supervision", es: "Sistema de agentes de IA autónomos capaz de planificar, llevar a cabo tareas de varios pasos y realizar acciones con una supervisión humana limitada" },
      processesPersonalData: true,
    },
    riskLevel: "HIGH",
    riskRationale: { en: "Agentic AI systems operate with significant autonomy, making decisions and taking actions that may affect individuals. EU AI Act requires human oversight for autonomous decision-making systems. Risk of unintended actions and cascading errors.", es: "Los sistemas de IA agéntica funcionan con una autonomía considerable y toman decisiones y realizan acciones que pueden afectar a personas. El RIA exige supervisión humana para los sistemas que deciden de forma autónoma. Riesgo de acciones no previstas y de errores en cascada." },
    requiresOversightGate: true,
    gateType: "PRE_DEPLOYMENT",
  },

  safety: {
    label: { en: "AI Safety & Governance", es: "Seguridad y gobernanza de la IA" },
    catalogCategories: ["AI Safety & Governance"],
    system: {
      nameSuffix: { en: "AI Safety Tool", es: "Herramienta de seguridad de la IA" },
      technique: "OTHER",
      role: "DEPLOYER",
      purpose: { en: "AI safety, monitoring, and governance tooling used to ensure responsible AI deployment and compliance", es: "Herramientas de seguridad, supervisión y gobernanza de la IA utilizadas para garantizar un despliegue responsable de la IA y el cumplimiento normativo" },
      processesPersonalData: false,
    },
    riskLevel: "MINIMAL",
    riskRationale: { en: "AI governance and safety tooling that supports compliance monitoring. Does not make autonomous decisions affecting individuals. Supports rather than replaces human oversight.", es: "Herramientas de gobernanza y seguridad de la IA que dan soporte a la supervisión del cumplimiento. No toman decisiones autónomas que afecten a personas. Refuerzan la supervisión humana en lugar de sustituirla." },
    requiresOversightGate: false,
  },

  speechNlp: {
    label: { en: "Speech & NLP", es: "Voz y PLN" },
    catalogCategories: ["Speech & NLP", "Speech AI", "Translation"],
    system: {
      nameSuffix: { en: "NLP System", es: "Sistema de PLN" },
      technique: "NLP",
      role: "DEPLOYER",
      purpose: { en: "Natural language processing system for speech recognition, text analysis, sentiment analysis, or language understanding", es: "Sistema de procesamiento del lenguaje natural para reconocimiento de voz, análisis de textos, análisis de sentimiento o comprensión del lenguaje" },
      processesPersonalData: true,
    },
    riskLevel: "LIMITED",
    riskRationale: { en: "NLP/speech systems have transparency obligations under EU AI Act. Users must be informed of AI interaction. Emotion recognition or biometric voice analysis would elevate to HIGH risk.", es: "Los sistemas de PLN y de voz están sujetos a obligaciones de transparencia conforme al RIA. Debe informarse a los usuarios de que interactúan con una IA. El reconocimiento de emociones o el análisis biométrico de la voz elevarían el sistema a riesgo alto." },
    requiresOversightGate: false,
  },
};

/** Default/generic mapping used when a vendor's category doesn't match any known group */
export const GENERIC_AI_MAPPING: VendorAIMapping = {
  label: { en: "AI Tool", es: "Herramienta de IA" },
  catalogCategories: [],
  system: {
    nameSuffix: { en: "AI Tool", es: "Herramienta de IA" },
    technique: "OTHER",
    role: "DEPLOYER",
    purpose: { en: "Third-party AI-powered tool deployed within the organization", es: "Herramienta de terceros basada en IA desplegada en la organización" },
    processesPersonalData: true,
  },
  riskLevel: "LIMITED",
  riskRationale: { en: "AI system with transparency obligations. Specific risk level should be reviewed based on the actual use case and whether the system makes or influences decisions affecting individuals.", es: "Sistema de IA sujeto a obligaciones de transparencia. El nivel de riesgo concreto debe revisarse según el caso de uso real y según si el sistema toma o influye en decisiones que afectan a personas." },
  requiresOversightGate: false,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Find the AI mapping group for a given vendor catalog category string.
 * Returns the generic fallback if no specific mapping exists.
 */
export function findAIMappingForCategory(
  catalogCategory: string,
  subcategory?: string | null,
): VendorAIMapping {
  // Try subcategory first for more precise mapping
  if (subcategory) {
    const subLower = subcategory.toLowerCase();
    for (const mapping of Object.values(VENDOR_AI_MAPPINGS)) {
      if (mapping.catalogCategories.some(c => c.toLowerCase() === subLower)) {
        return mapping;
      }
    }
  }
  // Fall back to top-level category
  const lower = catalogCategory.toLowerCase();
  for (const mapping of Object.values(VENDOR_AI_MAPPINGS)) {
    if (mapping.catalogCategories.some(c => c.toLowerCase() === lower)) {
      return mapping;
    }
  }
  return GENERIC_AI_MAPPING;
}

/** The name of the system created for a catalog vendor, in the given locale. */
export function vendorSystemName(vendorName: string, mapping: VendorAIMapping, locale: ContentLocale): string {
  return `${vendorName} ${mapping.system.nameSuffix[locale]}`;
}

/** Both locale variants of the system name, so dedupe holds across a locale switch. */
export function vendorSystemNames(vendorName: string, mapping: VendorAIMapping): string[] {
  return [vendorSystemName(vendorName, mapping, "en"), vendorSystemName(vendorName, mapping, "es")];
}

/** The description of the system created for a catalog vendor, in the given locale. */
export function vendorSystemDescription(vendorName: string, mapping: VendorAIMapping, locale: ContentLocale): string {
  return locale === "es"
    ? `Sistema de IA de ${vendorName} desplegado en la organización. ${mapping.system.purpose.es}`
    : `AI system deployed from ${vendorName}. ${mapping.system.purpose.en}`;
}
