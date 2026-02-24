import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ToolSeed {
  id: string;
  name: string;
  vendor: string | null;
  category: string;
  description: string;
  website: string | null;
  riskIndicators: string[];
}

const tools: ToolSeed[] = [
  // LLM_CHAT (8)
  {
    id: "shadow-tool-chatgpt",
    name: "ChatGPT",
    vendor: "OpenAI",
    category: "LLM_CHAT",
    description: "General-purpose conversational AI assistant. GPT-4o multimodal model with text, image, and code capabilities.",
    website: "https://chat.openai.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "TRAINS_ON_INPUT", "CLOUD_HOSTED", "SOC2_CERTIFIED"],
  },
  {
    id: "shadow-tool-claude",
    name: "Claude",
    vendor: "Anthropic",
    category: "LLM_CHAT",
    description: "AI assistant focused on safety and helpfulness. Supports long context windows and complex reasoning tasks.",
    website: "https://claude.ai",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED", "GDPR_COMPLIANT"],
  },
  {
    id: "shadow-tool-gemini",
    name: "Gemini",
    vendor: "Google",
    category: "LLM_CHAT",
    description: "Google's multimodal AI model integrated across Google Workspace. Processes text, images, audio, and video.",
    website: "https://gemini.google.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED"],
  },
  {
    id: "shadow-tool-perplexity",
    name: "Perplexity AI",
    vendor: "Perplexity",
    category: "LLM_CHAT",
    description: "AI-powered search engine combining real-time web search with LLM-generated answers and citations.",
    website: "https://perplexity.ai",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED"],
  },
  {
    id: "shadow-tool-copilot",
    name: "Microsoft Copilot",
    vendor: "Microsoft",
    category: "LLM_CHAT",
    description: "AI assistant integrated into Microsoft 365 apps. Processes documents, emails, and Teams conversations.",
    website: "https://copilot.microsoft.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED", "GDPR_COMPLIANT"],
  },
  {
    id: "shadow-tool-grok",
    name: "Grok",
    vendor: "xAI",
    category: "LLM_CHAT",
    description: "AI assistant with real-time access to X (Twitter) data. Designed for unfiltered, witty responses.",
    website: "https://x.ai",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "TRAINS_ON_INPUT", "CLOUD_HOSTED"],
  },
  {
    id: "shadow-tool-llama",
    name: "Llama",
    vendor: "Meta",
    category: "LLM_CHAT",
    description: "Open-source large language model family. Can be self-hosted or accessed through various cloud providers.",
    website: "https://llama.meta.com",
    riskIndicators: ["ON_PREMISE_AVAILABLE", "REQUIRES_API_KEY"],
  },
  {
    id: "shadow-tool-mistral",
    name: "Mistral AI",
    vendor: "Mistral AI",
    category: "LLM_CHAT",
    description: "European AI company offering open and commercial language models. EU-based data processing available.",
    website: "https://mistral.ai",
    riskIndicators: ["CLOUD_HOSTED", "ON_PREMISE_AVAILABLE", "GDPR_COMPLIANT", "REQUIRES_API_KEY"],
  },

  // CODE_ASSISTANT (5)
  {
    id: "shadow-tool-gh-copilot",
    name: "GitHub Copilot",
    vendor: "GitHub / Microsoft",
    category: "CODE_ASSISTANT",
    description: "AI-powered code completion and generation tool integrated into IDEs. Suggests code based on context and comments.",
    website: "https://github.com/features/copilot",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED", "REQUIRES_API_KEY"],
  },
  {
    id: "shadow-tool-cursor",
    name: "Cursor",
    vendor: "Anysphere",
    category: "CODE_ASSISTANT",
    description: "AI-first code editor with built-in chat, code generation, and codebase-aware completions.",
    website: "https://cursor.sh",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "REQUIRES_API_KEY"],
  },
  {
    id: "shadow-tool-tabnine",
    name: "Tabnine",
    vendor: "Tabnine",
    category: "CODE_ASSISTANT",
    description: "AI code completion tool with on-premise deployment option. Trains on your codebase for personalized suggestions.",
    website: "https://tabnine.com",
    riskIndicators: ["CLOUD_HOSTED", "ON_PREMISE_AVAILABLE", "SOC2_CERTIFIED", "REQUIRES_API_KEY"],
  },
  {
    id: "shadow-tool-codewhisperer",
    name: "Amazon CodeWhisperer",
    vendor: "Amazon Web Services",
    category: "CODE_ASSISTANT",
    description: "AI coding companion from AWS. Generates code suggestions, scans for security vulnerabilities.",
    website: "https://aws.amazon.com/codewhisperer",
    riskIndicators: ["CLOUD_HOSTED", "SOC2_CERTIFIED", "REQUIRES_API_KEY"],
  },
  {
    id: "shadow-tool-replit",
    name: "Replit AI",
    vendor: "Replit",
    category: "CODE_ASSISTANT",
    description: "Cloud-based IDE with AI-powered code generation, debugging, and deployment capabilities.",
    website: "https://replit.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "TRAINS_ON_INPUT", "CLOUD_HOSTED"],
  },

  // IMAGE_GENERATION (5)
  {
    id: "shadow-tool-midjourney",
    name: "Midjourney",
    vendor: "Midjourney",
    category: "IMAGE_GENERATION",
    description: "AI image generation tool accessed via Discord. Creates high-quality images from text prompts.",
    website: "https://midjourney.com",
    riskIndicators: ["TRAINS_ON_INPUT", "CLOUD_HOSTED"],
  },
  {
    id: "shadow-tool-dalle",
    name: "DALL-E",
    vendor: "OpenAI",
    category: "IMAGE_GENERATION",
    description: "AI image generation model by OpenAI. Creates and edits images from natural language descriptions.",
    website: "https://openai.com/dall-e",
    riskIndicators: ["CLOUD_HOSTED", "SOC2_CERTIFIED", "REQUIRES_API_KEY"],
  },
  {
    id: "shadow-tool-stable-diffusion",
    name: "Stable Diffusion",
    vendor: "Stability AI",
    category: "IMAGE_GENERATION",
    description: "Open-source image generation model. Can be self-hosted for full data control.",
    website: "https://stability.ai",
    riskIndicators: ["ON_PREMISE_AVAILABLE", "CLOUD_HOSTED"],
  },
  {
    id: "shadow-tool-firefly",
    name: "Adobe Firefly",
    vendor: "Adobe",
    category: "IMAGE_GENERATION",
    description: "AI image generation integrated into Adobe Creative Cloud. Trained on licensed and public domain content.",
    website: "https://firefly.adobe.com",
    riskIndicators: ["CLOUD_HOSTED", "SOC2_CERTIFIED", "GDPR_COMPLIANT"],
  },
  {
    id: "shadow-tool-leonardo",
    name: "Leonardo AI",
    vendor: "Leonardo AI",
    category: "IMAGE_GENERATION",
    description: "AI image and video generation platform for creative professionals. Fine-tuning and style customization.",
    website: "https://leonardo.ai",
    riskIndicators: ["TRAINS_ON_INPUT", "CLOUD_HOSTED"],
  },

  // VIDEO_AUDIO (5)
  {
    id: "shadow-tool-runway",
    name: "Runway",
    vendor: "Runway",
    category: "VIDEO_AUDIO",
    description: "AI-powered video generation and editing platform. Text-to-video, image-to-video, and video editing tools.",
    website: "https://runwayml.com",
    riskIndicators: ["TRAINS_ON_INPUT", "CLOUD_HOSTED"],
  },
  {
    id: "shadow-tool-synthesia",
    name: "Synthesia",
    vendor: "Synthesia",
    category: "VIDEO_AUDIO",
    description: "AI video generation with realistic avatars. Creates training videos, presentations, and marketing content.",
    website: "https://synthesia.io",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED", "GDPR_COMPLIANT"],
  },
  {
    id: "shadow-tool-elevenlabs",
    name: "ElevenLabs",
    vendor: "ElevenLabs",
    category: "VIDEO_AUDIO",
    description: "AI voice synthesis and cloning platform. Text-to-speech with natural-sounding voices in multiple languages.",
    website: "https://elevenlabs.io",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "REQUIRES_API_KEY"],
  },
  {
    id: "shadow-tool-descript",
    name: "Descript",
    vendor: "Descript",
    category: "VIDEO_AUDIO",
    description: "AI-powered audio/video editor. Transcription, voice cloning, and text-based video editing.",
    website: "https://descript.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED"],
  },
  {
    id: "shadow-tool-suno",
    name: "Suno",
    vendor: "Suno AI",
    category: "VIDEO_AUDIO",
    description: "AI music generation platform. Creates songs with vocals, instruments, and lyrics from text prompts.",
    website: "https://suno.com",
    riskIndicators: ["TRAINS_ON_INPUT", "CLOUD_HOSTED"],
  },

  // WRITING_PRODUCTIVITY (5)
  {
    id: "shadow-tool-jasper",
    name: "Jasper",
    vendor: "Jasper AI",
    category: "WRITING_PRODUCTIVITY",
    description: "AI content creation platform for marketing teams. Generates blog posts, social media, ads, and email copy.",
    website: "https://jasper.ai",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED"],
  },
  {
    id: "shadow-tool-grammarly",
    name: "Grammarly AI",
    vendor: "Grammarly",
    category: "WRITING_PRODUCTIVITY",
    description: "AI writing assistant with grammar, style, and tone suggestions. Generative AI features for drafting and rewriting.",
    website: "https://grammarly.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED", "GDPR_COMPLIANT"],
  },
  {
    id: "shadow-tool-notion-ai",
    name: "Notion AI",
    vendor: "Notion Labs",
    category: "WRITING_PRODUCTIVITY",
    description: "AI features integrated into Notion workspace. Summarizes, drafts, and translates content within documents.",
    website: "https://notion.so",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED"],
  },
  {
    id: "shadow-tool-otter",
    name: "Otter AI",
    vendor: "Otter.ai",
    category: "WRITING_PRODUCTIVITY",
    description: "AI meeting transcription and note-taking. Records, transcribes, and summarizes meetings automatically.",
    website: "https://otter.ai",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "TRAINS_ON_INPUT", "CLOUD_HOSTED", "SOC2_CERTIFIED"],
  },
  {
    id: "shadow-tool-copyai",
    name: "Copy.ai",
    vendor: "Copy.ai",
    category: "WRITING_PRODUCTIVITY",
    description: "AI-powered marketing copy generator. Creates sales copy, blog posts, social media content, and more.",
    website: "https://copy.ai",
    riskIndicators: ["CLOUD_HOSTED"],
  },

  // BUSINESS_TOOLS (3)
  {
    id: "shadow-tool-einstein",
    name: "Salesforce Einstein",
    vendor: "Salesforce",
    category: "BUSINESS_TOOLS",
    description: "AI layer across the Salesforce platform. Predictive analytics, lead scoring, and automated recommendations for CRM.",
    website: "https://salesforce.com/einstein",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED", "GDPR_COMPLIANT"],
  },
  {
    id: "shadow-tool-hubspot-ai",
    name: "HubSpot AI",
    vendor: "HubSpot",
    category: "BUSINESS_TOOLS",
    description: "AI tools integrated into HubSpot CRM. Content generation, predictive lead scoring, and conversation intelligence.",
    website: "https://hubspot.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED", "GDPR_COMPLIANT"],
  },
  {
    id: "shadow-tool-zendesk-ai",
    name: "Zendesk AI",
    vendor: "Zendesk",
    category: "BUSINESS_TOOLS",
    description: "AI-powered customer service automation. Chatbots, ticket routing, sentiment analysis, and agent assistance.",
    website: "https://zendesk.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "SOC2_CERTIFIED", "GDPR_COMPLIANT"],
  },

  // DATA_ANALYTICS (3)
  {
    id: "shadow-tool-datarobot",
    name: "DataRobot",
    vendor: "DataRobot",
    category: "DATA_ANALYTICS",
    description: "Enterprise AI platform for building and deploying predictive models. Automated machine learning (AutoML).",
    website: "https://datarobot.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED", "ON_PREMISE_AVAILABLE", "SOC2_CERTIFIED"],
  },
  {
    id: "shadow-tool-h2o",
    name: "H2O.ai",
    vendor: "H2O.ai",
    category: "DATA_ANALYTICS",
    description: "Open-source machine learning platform. AutoML, feature engineering, and model deployment for enterprise.",
    website: "https://h2o.ai",
    riskIndicators: ["CLOUD_HOSTED", "ON_PREMISE_AVAILABLE", "SOC2_CERTIFIED", "REQUIRES_API_KEY"],
  },
  {
    id: "shadow-tool-wandb",
    name: "Weights & Biases",
    vendor: "Weights & Biases",
    category: "DATA_ANALYTICS",
    description: "ML experiment tracking and model management platform. Logs, visualizes, and compares ML experiments.",
    website: "https://wandb.ai",
    riskIndicators: ["CLOUD_HOSTED", "ON_PREMISE_AVAILABLE", "SOC2_CERTIFIED", "REQUIRES_API_KEY"],
  },

  // SEARCH (2)
  {
    id: "shadow-tool-you",
    name: "You.com",
    vendor: "You.com",
    category: "SEARCH",
    description: "AI-powered search engine with chat interface. Summarizes web results and generates answers with citations.",
    website: "https://you.com",
    riskIndicators: ["PROCESSES_PERSONAL_DATA", "CLOUD_HOSTED"],
  },
  {
    id: "shadow-tool-kagi",
    name: "Kagi",
    vendor: "Kagi Inc",
    category: "SEARCH",
    description: "Premium search engine with AI features. No ads, no tracking. Offers AI summarization and research tools.",
    website: "https://kagi.com",
    riskIndicators: ["CLOUD_HOSTED", "GDPR_COMPLIANT"],
  },
];

async function main() {
  console.log("Seeding Shadow AI tool catalog...\n");

  let count = 0;
  for (const tool of tools) {
    await prisma.shadowAITool.upsert({
      where: { id: tool.id },
      update: {
        name: tool.name,
        vendor: tool.vendor,
        category: tool.category,
        description: tool.description,
        website: tool.website,
        riskIndicators: tool.riskIndicators,
      },
      create: tool,
    });
    count++;
  }

  console.log(`Seeded ${count} AI tools across 8 categories:`);
  console.log("  - LLM_CHAT: 8");
  console.log("  - CODE_ASSISTANT: 5");
  console.log("  - IMAGE_GENERATION: 5");
  console.log("  - VIDEO_AUDIO: 5");
  console.log("  - WRITING_PRODUCTIVITY: 5");
  console.log("  - BUSINESS_TOOLS: 3");
  console.log("  - DATA_ANALYTICS: 3");
  console.log("  - SEARCH: 2");
}

main()
  .catch((e) => {
    console.error("Error seeding shadow AI tools:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
