// Maps Shadow AI tool categories and Vendor Catalog categories to AITechnique enum values.
// Used by the vendor "new" page and the shadow AI "register" dialog to pre-select technique.

export type AITechnique =
  | "MACHINE_LEARNING"
  | "DEEP_LEARNING"
  | "GENERATIVE_AI"
  | "AGENTIC_AI"
  | "NLP"
  | "COMPUTER_VISION"
  | "SPEECH_RECOGNITION"
  | "ROBOTICS"
  | "RULE_BASED"
  | "EXPERT_SYSTEM"
  | "STATISTICAL"
  | "OTHER";

const CATEGORY_MAP: Record<string, AITechnique> = {
  // Vendor Catalog categories
  "LLM Provider": "GENERATIVE_AI",
  "AI Writing": "GENERATIVE_AI",
  "AI Coding": "GENERATIVE_AI",
  "AI Image Generation": "GENERATIVE_AI",
  "AI Video": "GENERATIVE_AI",
  "AI Audio": "GENERATIVE_AI",
  "AI Assistant": "GENERATIVE_AI",
  "Computer Vision": "COMPUTER_VISION",
  "Speech Recognition": "SPEECH_RECOGNITION",
  "AI Platform": "MACHINE_LEARNING",
  "MLOps": "MACHINE_LEARNING",
  "Data Science": "MACHINE_LEARNING",
  "AI Analytics": "STATISTICAL",
  "AI Security": "MACHINE_LEARNING",
  "ML Platform": "MACHINE_LEARNING",
  "AI Tools": "GENERATIVE_AI",
  "Robotics": "ROBOTICS",
  "NLP": "NLP",
  // Shadow AI tool categories
  "AI_WRITING": "GENERATIVE_AI",
  "AI_CODING": "GENERATIVE_AI",
  "AI_IMAGE": "GENERATIVE_AI",
  "AI_VIDEO": "GENERATIVE_AI",
  "AI_AUDIO": "GENERATIVE_AI",
  "AI_CHATBOT": "GENERATIVE_AI",
  "AI_PRODUCTIVITY": "GENERATIVE_AI",
  "AI_SEARCH": "NLP",
};

const CAPABILITY_MAP: Record<string, AITechnique> = {
  "LLM": "GENERATIVE_AI",
  "Generative AI": "GENERATIVE_AI",
  "Computer Vision": "COMPUTER_VISION",
  "Speech": "SPEECH_RECOGNITION",
  "NLP": "NLP",
  "Robotics": "ROBOTICS",
};

/**
 * Suggests an AITechnique based on a category string (from catalog or shadow AI tool).
 * Returns undefined if no match is found.
 */
export function suggestTechnique(category: string): AITechnique | undefined {
  // Direct category match
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];

  // Case-insensitive partial match on category
  const lower = category.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Suggests an AITechnique based on AI capabilities array (from vendor catalog).
 * Returns the first match found.
 */
export function suggestTechniqueFromCapabilities(capabilities: string[]): AITechnique | undefined {
  for (const cap of capabilities) {
    if (CAPABILITY_MAP[cap]) return CAPABILITY_MAP[cap];
    // Partial match
    const lower = cap.toLowerCase();
    for (const [key, value] of Object.entries(CAPABILITY_MAP)) {
      if (lower.includes(key.toLowerCase())) return value;
    }
  }
  return undefined;
}
