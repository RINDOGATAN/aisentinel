/**
 * Vendor AI Mappings
 *
 * Maps VendorCatalog categories to AI governance artifacts for the
 * AI Governance Quick Start feature. When a user imports a vendor,
 * these mappings determine what AI systems, risk classifications,
 * and oversight gates are auto-generated.
 */

import type { AITechnique, AISystemRole, AIRiskLevel, GateType } from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

export interface VendorAIMapping {
  /** Display label for this category group */
  label: string;
  /** Vendor catalog categories that map to this group */
  catalogCategories: string[];
  /** AI system to create for the vendor */
  system: {
    nameSuffix: string;
    technique: AITechnique;
    role: AISystemRole;
    purpose: string;
    processesPersonalData: boolean;
  };
  /** Risk classification */
  riskLevel: AIRiskLevel;
  riskRationale: string;
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
    label: "LLM Provider",
    catalogCategories: ["LLM Provider"],
    system: {
      nameSuffix: "LLM Platform",
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: "Generative AI platform used for text generation, summarization, translation, and conversational AI capabilities",
      processesPersonalData: true,
    },
    riskLevel: "LIMITED",
    riskRationale: "Generative AI system with transparency obligations under EU AI Act Art. 52. Users must be informed they are interacting with an AI system. Risk of hallucination and potential processing of personal data in prompts.",
    requiresOversightGate: false,
  },

  aiPlatform: {
    label: "AI Platform",
    catalogCategories: ["AI Platform"],
    system: {
      nameSuffix: "AI Platform",
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      purpose: "AI development and deployment platform providing model hosting, fine-tuning, and inference capabilities",
      processesPersonalData: true,
    },
    riskLevel: "LIMITED",
    riskRationale: "AI platform with transparency obligations. Downstream use cases may elevate risk depending on application domain. Regular review recommended as deployment scope evolves.",
    requiresOversightGate: false,
  },

  mlops: {
    label: "MLOps & Infrastructure",
    catalogCategories: ["MLOps & Infrastructure"],
    system: {
      nameSuffix: "MLOps Infrastructure",
      technique: "MACHINE_LEARNING",
      role: "DEPLOYER",
      purpose: "Machine learning operations infrastructure for model training, versioning, monitoring, and deployment pipelines",
      processesPersonalData: false,
    },
    riskLevel: "MINIMAL",
    riskRationale: "Infrastructure tooling that supports ML workflows. Does not directly make decisions affecting individuals. Risk depends on the models deployed through the platform.",
    requiresOversightGate: false,
  },

  computerVision: {
    label: "Computer Vision",
    catalogCategories: ["Computer Vision"],
    system: {
      nameSuffix: "Computer Vision System",
      technique: "COMPUTER_VISION",
      role: "DEPLOYER",
      purpose: "Computer vision system for image/video analysis, object detection, or visual recognition tasks",
      processesPersonalData: true,
    },
    riskLevel: "HIGH",
    riskRationale: "Computer vision systems may involve biometric processing or remote identification. EU AI Act Annex III covers biometric identification and categorisation. Requires conformity assessment and human oversight before deployment.",
    annexIIICategory: "1. Biometrics",
    requiresOversightGate: true,
    gateType: "PRE_DEPLOYMENT",
  },

  agents: {
    label: "AI Agents & Automation",
    catalogCategories: ["AI Agents & Automation"],
    system: {
      nameSuffix: "AI Agent",
      technique: "AGENTIC_AI",
      role: "DEPLOYER",
      purpose: "Autonomous AI agent system capable of planning, executing multi-step tasks, and taking actions with limited human supervision",
      processesPersonalData: true,
    },
    riskLevel: "HIGH",
    riskRationale: "Agentic AI systems operate with significant autonomy, making decisions and taking actions that may affect individuals. EU AI Act requires human oversight for autonomous decision-making systems. Risk of unintended actions and cascading errors.",
    requiresOversightGate: true,
    gateType: "PRE_DEPLOYMENT",
  },

  safety: {
    label: "AI Safety & Governance",
    catalogCategories: ["AI Safety & Governance"],
    system: {
      nameSuffix: "AI Safety Tool",
      technique: "OTHER",
      role: "DEPLOYER",
      purpose: "AI safety, monitoring, and governance tooling used to ensure responsible AI deployment and compliance",
      processesPersonalData: false,
    },
    riskLevel: "MINIMAL",
    riskRationale: "AI governance and safety tooling that supports compliance monitoring. Does not make autonomous decisions affecting individuals. Supports rather than replaces human oversight.",
    requiresOversightGate: false,
  },

  speechNlp: {
    label: "Speech & NLP",
    catalogCategories: ["Speech & NLP"],
    system: {
      nameSuffix: "NLP System",
      technique: "NLP",
      role: "DEPLOYER",
      purpose: "Natural language processing system for speech recognition, text analysis, sentiment analysis, or language understanding",
      processesPersonalData: true,
    },
    riskLevel: "LIMITED",
    riskRationale: "NLP/speech systems have transparency obligations under EU AI Act. Users must be informed of AI interaction. Emotion recognition or biometric voice analysis would elevate to HIGH risk.",
    requiresOversightGate: false,
  },
};

/** Default/generic mapping used when a vendor's category doesn't match any known group */
export const GENERIC_AI_MAPPING: VendorAIMapping = {
  label: "AI Tool",
  catalogCategories: [],
  system: {
    nameSuffix: "AI Tool",
    technique: "OTHER",
    role: "DEPLOYER",
    purpose: "Third-party AI-powered tool deployed within the organization",
    processesPersonalData: true,
  },
  riskLevel: "LIMITED",
  riskRationale: "AI system with transparency obligations. Specific risk level should be reviewed based on the actual use case and whether the system makes or influences decisions affecting individuals.",
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
