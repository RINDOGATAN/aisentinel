import { Prisma, PrismaClient } from "@prisma/client";

// PROVENANCE POLICY
// - Seeded entries are EDITORIAL, UNVERIFIED data: isVerified is false and
//   no verifiedAt/verifiedBy stamp is written. Verification stamps belong to
//   a real review workflow (e.g. Vendor.Watch sync), never to a seed script.
// - "EU AI Act compliant" is NOT a vendor-level binary (obligations are
//   per-system, per-role, and phased), so no euAiActCompliant flag is seeded;
//   the field stays null. Make claim-shaped, sourced, dated statements in
//   the description instead if needed.
// - Every description carries a data as-of stamp (CATALOG_DATA_AS_OF).
// contentAsOf: 2026-01 (editorial snapshot) / provenance reviewed 2026-07-05

const CATALOG_DATA_AS_OF = "2026-01";

const prisma = new PrismaClient();

interface CatalogAIModel {
  name: string;
  type: string;
  source: string;
}

interface VendorCatalogEntry {
  slug: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  website: string;
  tags: string[];
  certifications: string[];
  frameworks: string[];
  gdprCompliant?: boolean;
  hipaaCompliant?: boolean;
  dataLocations: string[];
  hasEuDataCenter?: boolean;
  aiCapabilities: string[];
  modelHosting?: string;
  privacyPolicyUrl?: string;
  trustCenterUrl?: string;
  dpaUrl?: string;
  securityPageUrl?: string;
  // New fields
  aiModels?: CatalogAIModel[];
  euAiActRole?: string;
  iso42001Certified?: boolean;
  supportsExplainability?: boolean;
  hasBiasMonitoring?: boolean;
  hasModelCard?: boolean;
  supportsAuditLogs?: boolean;
  hasDesignatedDpo?: boolean;
}

const vendors: VendorCatalogEntry[] = [
  // === LLM Providers ===
  {
    slug: "openai",
    name: "OpenAI",
    category: "LLM Provider",
    description: "Creator of the GPT model family, ChatGPT, and Sora. Leading provider of large language models and generative AI APIs.",
    website: "https://openai.com",
    tags: ["AI", "LLM", "GPT", "Generative AI", "NLP"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["NIST AI RMF"],
    gdprCompliant: true,
    hipaaCompliant: false,
    dataLocations: ["US", "EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Computer Vision", "Speech", "Code Generation"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://openai.com/policies/privacy-policy",
    trustCenterUrl: "https://trust.openai.com",
    aiModels: [
      { name: "GPT-5.1", type: "LLM", source: "OpenAI" },
      { name: "GPT-5", type: "LLM", source: "OpenAI" },
      { name: "o3", type: "LLM (reasoning)", source: "OpenAI" },
      { name: "GPT Image 1", type: "Image Generation", source: "OpenAI" },
      { name: "Sora 2", type: "Video Generation", source: "OpenAI" },
      { name: "Whisper", type: "Speech", source: "OpenAI" },
      { name: "text-embedding-3-large", type: "Embedding", source: "OpenAI" },
    ],
    euAiActRole: "Provider",
    supportsExplainability: false,
    hasBiasMonitoring: true,
    hasModelCard: true,
    supportsAuditLogs: true,
    hasDesignatedDpo: true,
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    category: "LLM Provider",
    description: "AI safety company building Claude, a family of large language models focused on safety and helpfulness.",
    website: "https://anthropic.com",
    tags: ["AI", "LLM", "Claude", "AI Safety", "NLP"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["NIST AI RMF"],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["LLM", "Computer Vision", "Code Generation"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.anthropic.com/privacy",
    trustCenterUrl: "https://trust.anthropic.com",
    aiModels: [
      { name: "Claude Opus 4.5", type: "LLM", source: "Anthropic" },
      { name: "Claude Sonnet 4.5", type: "LLM", source: "Anthropic" },
      { name: "Claude Haiku 4.5", type: "LLM", source: "Anthropic" },
    ],
    euAiActRole: "Provider",
    supportsExplainability: true,
    hasBiasMonitoring: true,
    hasModelCard: true,
    supportsAuditLogs: true,
    hasDesignatedDpo: true,
  },
  {
    slug: "google-vertex-ai",
    name: "Google (Vertex AI / Gemini)",
    category: "LLM Provider",
    description: "Google's Gemini family of multimodal AI models, available through Vertex AI platform and Google Cloud.",
    website: "https://cloud.google.com/vertex-ai",
    tags: ["AI", "LLM", "Gemini", "Multimodal", "NLP"],
    certifications: ["ISO 27001", "SOC 2 Type II", "ISO 27017", "ISO 27018"],
    frameworks: ["EU AI Act", "NIST AI RMF", "GDPR"],
    gdprCompliant: true,
    hipaaCompliant: true,
    dataLocations: ["US", "EU", "UK", "APAC"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Computer Vision", "Speech", "Code Generation", "Translation"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://cloud.google.com/terms/cloud-privacy-notice",
    trustCenterUrl: "https://cloud.google.com/security",
    dpaUrl: "https://cloud.google.com/terms/data-processing-addendum",
    aiModels: [
      { name: "Gemini 3 Pro", type: "LLM", source: "Google DeepMind" },
      { name: "Gemini 2.5 Flash", type: "LLM", source: "Google DeepMind" },
      { name: "Imagen 4", type: "Image Generation", source: "Google DeepMind" },
      { name: "Veo 3", type: "Video Generation", source: "Google DeepMind" },
      { name: "Chirp", type: "Speech", source: "Google Cloud" },
      { name: "gemini-embedding-001", type: "Embedding", source: "Google Cloud" },
    ],
    euAiActRole: "Provider",
    iso42001Certified: true,
    supportsExplainability: true,
    hasBiasMonitoring: true,
    hasModelCard: true,
    supportsAuditLogs: true,
    hasDesignatedDpo: true,
  },
  {
    slug: "meta-llama",
    name: "Meta (Llama)",
    category: "LLM Provider",
    description: "Meta's open-weight Llama family of large language models, available for self-hosting and commercial use.",
    website: "https://llama.meta.com",
    tags: ["AI", "LLM", "Open Source", "Llama", "NLP"],
    certifications: [],
    frameworks: [],
    gdprCompliant: false,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["LLM", "Computer Vision", "Code Generation"],
    modelHosting: "On-Premise",
    aiModels: [
      { name: "Llama 4 Maverick", type: "LLM", source: "Meta" },
      { name: "Llama 4 Scout", type: "LLM", source: "Meta" },
      { name: "Llama 3.3 70B", type: "LLM", source: "Meta" },
      { name: "Code Llama", type: "Code Generation", source: "Meta" },
    ],
    euAiActRole: "Provider",
    hasModelCard: true,
    supportsAuditLogs: false,
  },
  {
    slug: "mistral-ai",
    name: "Mistral AI",
    category: "LLM Provider",
    description: "European AI company building efficient open and commercial language models. Based in Paris.",
    website: "https://mistral.ai",
    tags: ["AI", "LLM", "European AI", "NLP"],
    certifications: [],
    frameworks: ["EU AI Act", "GDPR"],
    gdprCompliant: true,
    dataLocations: ["EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Code Generation"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://mistral.ai/terms/#privacy-policy",
    aiModels: [
      { name: "Mistral Large", type: "LLM", source: "Mistral AI" },
      { name: "Mistral Small", type: "LLM", source: "Mistral AI" },
      { name: "Codestral", type: "Code Generation", source: "Mistral AI" },
      { name: "Mistral Embed", type: "Embedding", source: "Mistral AI" },
    ],
    euAiActRole: "Provider",
    supportsExplainability: true,
    hasBiasMonitoring: false,
    hasModelCard: true,
    supportsAuditLogs: true,
  },
  {
    slug: "cohere",
    name: "Cohere",
    category: "LLM Provider",
    description: "Enterprise AI platform providing language models for search, generation, and classification with deployment flexibility.",
    website: "https://cohere.com",
    tags: ["AI", "LLM", "Enterprise AI", "NLP", "RAG"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["NIST AI RMF"],
    gdprCompliant: true,
    dataLocations: ["US", "EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Embeddings", "RAG"],
    modelHosting: "Hybrid",
    privacyPolicyUrl: "https://cohere.com/privacy",
    trustCenterUrl: "https://trust.cohere.com",
  },
  {
    slug: "ai21-labs",
    name: "AI21 Labs",
    category: "LLM Provider",
    description: "AI company building the Jamba family of foundation models and enterprise AI systems for tasks including summarization and text generation.",
    website: "https://www.ai21.com",
    tags: ["AI", "LLM", "Enterprise AI", "NLP"],
    certifications: ["SOC 2 Type II"],
    frameworks: [],
    gdprCompliant: true,
    dataLocations: ["US", "EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Summarization"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.ai21.com/privacy-policy",
  },
  {
    slug: "aleph-alpha",
    name: "Aleph Alpha",
    category: "LLM Provider",
    description: "European sovereign AI company based in Heidelberg, Germany. Now centered on the PhariaAI enterprise stack (successor to its earlier Luminous models), with a focus on EU data sovereignty.",
    website: "https://www.aleph-alpha.com",
    tags: ["AI", "LLM", "European AI", "Sovereign AI", "NLP"],
    certifications: ["ISO 27001"],
    frameworks: ["EU AI Act", "GDPR"],
    gdprCompliant: true,
    dataLocations: ["EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Multimodal"],
    modelHosting: "Hybrid",
    privacyPolicyUrl: "https://www.aleph-alpha.com/privacy-policy",
  },

  // === AI Platforms ===
  {
    slug: "microsoft-azure-ai",
    name: "Microsoft (Azure AI)",
    category: "AI Platform",
    description: "Microsoft's Azure AI platform offering OpenAI models, Cognitive Services, and ML infrastructure for enterprise.",
    website: "https://azure.microsoft.com/en-us/products/ai-services",
    tags: ["AI", "Cloud", "Enterprise AI", "Azure", "LLM"],
    certifications: ["ISO 27001", "SOC 2 Type II", "ISO 42001", "ISO 27017", "ISO 27018"],
    frameworks: ["EU AI Act", "NIST AI RMF", "GDPR"],
    gdprCompliant: true,
    hipaaCompliant: true,
    dataLocations: ["US", "EU", "UK", "APAC"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Computer Vision", "Speech", "Translation", "Document Intelligence"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://privacy.microsoft.com/en-us/privacystatement",
    trustCenterUrl: "https://www.microsoft.com/en-us/trust-center",
    dpaUrl: "https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum-DPA",
  },
  {
    slug: "aws-bedrock",
    name: "AWS (Bedrock)",
    category: "AI Platform",
    description: "Amazon's fully managed service for building generative AI applications with foundation models from multiple providers.",
    website: "https://aws.amazon.com/bedrock",
    tags: ["AI", "Cloud", "Enterprise AI", "AWS", "LLM"],
    certifications: ["ISO 27001", "SOC 2 Type II", "ISO 27017", "ISO 27018"],
    frameworks: ["NIST AI RMF", "GDPR"],
    gdprCompliant: true,
    hipaaCompliant: true,
    dataLocations: ["US", "EU", "UK", "APAC"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Computer Vision", "Embeddings"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://aws.amazon.com/privacy",
    trustCenterUrl: "https://aws.amazon.com/compliance",
    dpaUrl: "https://d1.awsstatic.com/legal/aws-gdpr/AWS_GDPR_DPA.pdf",
  },
  {
    slug: "google-cloud-ai",
    name: "Google Cloud AI Platform",
    category: "AI Platform",
    description: "Google Cloud's comprehensive AI/ML platform including AutoML, AI Platform Training, and pre-built AI APIs.",
    website: "https://cloud.google.com/ai-platform",
    tags: ["AI", "Cloud", "Enterprise AI", "GCP", "ML"],
    certifications: ["ISO 27001", "SOC 2 Type II", "ISO 27017", "ISO 27018"],
    frameworks: ["EU AI Act", "NIST AI RMF", "GDPR"],
    gdprCompliant: true,
    hipaaCompliant: true,
    dataLocations: ["US", "EU", "UK", "APAC"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Computer Vision", "Speech", "AutoML", "Translation"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://cloud.google.com/terms/cloud-privacy-notice",
    trustCenterUrl: "https://cloud.google.com/security",
    dpaUrl: "https://cloud.google.com/terms/data-processing-addendum",
  },
  {
    slug: "ibm-watsonx",
    name: "IBM watsonx",
    category: "AI Platform",
    description: "IBM's enterprise AI and data platform with foundation models, ML tools, and AI governance capabilities.",
    website: "https://www.ibm.com/watsonx",
    tags: ["AI", "Enterprise AI", "ML", "AI Governance"],
    certifications: ["ISO 27001", "SOC 2 Type II", "ISO 42001"],
    frameworks: ["EU AI Act", "NIST AI RMF", "GDPR"],
    gdprCompliant: true,
    hipaaCompliant: true,
    dataLocations: ["US", "EU", "UK"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "NLP", "ML", "AI Governance"],
    modelHosting: "Hybrid",
    privacyPolicyUrl: "https://www.ibm.com/privacy",
    trustCenterUrl: "https://www.ibm.com/trust",
    dpaUrl: "https://www.ibm.com/support/customer/csol/terms/?id=DPA",
  },
  {
    slug: "databricks",
    name: "Databricks",
    category: "AI Platform",
    description: "Unified analytics and AI platform built on Apache Spark, offering data lakehouse, MLflow, and Mosaic AI.",
    website: "https://www.databricks.com",
    tags: ["AI", "ML", "Data Platform", "MLOps", "Lakehouse"],
    certifications: ["ISO 27001", "SOC 2 Type II", "ISO 27017"],
    frameworks: ["NIST AI RMF", "GDPR"],
    gdprCompliant: true,
    hipaaCompliant: true,
    dataLocations: ["US", "EU", "UK", "APAC"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "ML", "Data Engineering"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.databricks.com/legal/privacypolicy",
    trustCenterUrl: "https://www.databricks.com/trust",
  },

  // === MLOps & Infrastructure ===
  {
    slug: "hugging-face",
    name: "Hugging Face",
    category: "MLOps & Infrastructure",
    description: "The AI community platform hosting models, datasets, and ML applications. Provides Inference API and model hub.",
    website: "https://huggingface.co",
    tags: ["AI", "ML", "Open Source", "Model Hub", "NLP"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["GDPR"],
    gdprCompliant: true,
    dataLocations: ["US", "EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["LLM", "Computer Vision", "Speech", "NLP"],
    modelHosting: "Hybrid",
    privacyPolicyUrl: "https://huggingface.co/privacy",
  },
  {
    slug: "weights-and-biases",
    name: "Weights & Biases",
    category: "MLOps & Infrastructure",
    description: "ML experiment tracking, model management, and dataset versioning platform for AI teams.",
    website: "https://wandb.ai",
    tags: ["AI", "MLOps", "Experiment Tracking", "ML"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["GDPR"],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["ML", "Experiment Tracking"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://wandb.ai/site/privacy",
  },
  {
    slug: "mlflow-databricks",
    name: "MLflow (Databricks)",
    category: "MLOps & Infrastructure",
    description: "Open-source platform for the ML lifecycle including experimentation, reproducibility, deployment, and model registry.",
    website: "https://mlflow.org",
    tags: ["AI", "MLOps", "Open Source", "ML Lifecycle"],
    certifications: [],
    frameworks: [],
    dataLocations: [],
    aiCapabilities: ["ML", "Model Management"],
    modelHosting: "On-Premise",
  },
  {
    slug: "neptune-ai",
    name: "Neptune.ai",
    category: "MLOps & Infrastructure",
    description: "Experiment tracking and model registry platform for ML teams to log, organize, and compare experiments.",
    website: "https://neptune.ai",
    tags: ["AI", "MLOps", "Experiment Tracking"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["GDPR"],
    gdprCompliant: true,
    dataLocations: ["EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["ML", "Experiment Tracking"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://neptune.ai/privacy-policy",
  },
  {
    slug: "comet-ml",
    name: "Comet ML",
    category: "MLOps & Infrastructure",
    description: "ML platform for tracking, comparing, explaining, and optimizing experiments and models.",
    website: "https://www.comet.com",
    tags: ["AI", "MLOps", "Experiment Tracking"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["GDPR"],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["ML", "Experiment Tracking"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.comet.com/privacy-policy",
  },

  // === Computer Vision ===
  {
    slug: "clarifai",
    name: "Clarifai",
    category: "Computer Vision",
    description: "AI platform specializing in computer vision, NLP, and audio recognition with pre-built and custom models.",
    website: "https://www.clarifai.com",
    tags: ["AI", "Computer Vision", "NLP", "Image Recognition"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["GDPR"],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["Computer Vision", "NLP", "Audio"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.clarifai.com/privacy",
  },
  {
    slug: "roboflow",
    name: "Roboflow",
    category: "Computer Vision",
    description: "End-to-end computer vision platform for building, training, and deploying vision models with annotation tools.",
    website: "https://roboflow.com",
    tags: ["AI", "Computer Vision", "Object Detection", "Image Annotation"],
    certifications: ["SOC 2 Type II"],
    frameworks: [],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["Computer Vision", "Object Detection"],
    modelHosting: "Hybrid",
    privacyPolicyUrl: "https://roboflow.com/privacy",
  },
  {
    slug: "landing-ai",
    name: "Landing AI",
    category: "Computer Vision",
    description: "Visual AI platform founded by Andrew Ng, focused on manufacturing and industrial inspection use cases.",
    website: "https://landing.ai",
    tags: ["AI", "Computer Vision", "Manufacturing", "Industrial AI"],
    certifications: [],
    frameworks: [],
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["Computer Vision", "Defect Detection"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://landing.ai/privacy-policy",
  },

  // === AI Agents & Automation ===
  {
    slug: "langchain",
    name: "LangChain",
    category: "AI Agents & Automation",
    description: "Open-source framework for building LLM-powered applications with chains, agents, and retrieval-augmented generation. Note: the framework itself is open source; certifications and compliance attributes relate to LangChain Inc. and its hosted LangSmith service, not to the library.",
    website: "https://www.langchain.com",
    tags: ["AI", "LLM", "Agents", "RAG", "Open Source"],
    certifications: ["SOC 2 Type II"],
    frameworks: [],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["LLM", "Agents", "RAG"],
    modelHosting: "Hybrid",
    privacyPolicyUrl: "https://www.langchain.com/privacy-policy",
  },
  {
    slug: "crewai",
    name: "CrewAI",
    category: "AI Agents & Automation",
    description: "Framework for orchestrating multi-agent AI systems with role-based agents, tools, and collaborative workflows.",
    website: "https://www.crewai.com",
    tags: ["AI", "Agents", "Multi-Agent", "Automation"],
    certifications: [],
    frameworks: [],
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["Agents", "Automation"],
    modelHosting: "Hybrid",
  },
  {
    slug: "autogen-microsoft",
    name: "AutoGen (Microsoft)",
    category: "AI Agents & Automation",
    description: "Microsoft's open-source framework for building multi-agent conversational AI systems.",
    website: "https://microsoft.github.io/autogen",
    tags: ["AI", "Agents", "Multi-Agent", "Open Source", "Microsoft"],
    certifications: [],
    frameworks: [],
    dataLocations: [],
    aiCapabilities: ["Agents", "Multi-Agent Systems"],
    modelHosting: "On-Premise",
  },

  // === AI Safety & Governance ===
  {
    slug: "credo-ai",
    name: "Credo AI",
    category: "AI Safety & Governance",
    description: "AI governance platform providing risk assessment, compliance automation, and responsible AI practices for enterprises.",
    website: "https://www.credo.ai",
    tags: ["AI", "AI Governance", "AI Safety", "Compliance", "Risk Management"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["EU AI Act", "NIST AI RMF", "ISO 42001"],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["AI Governance", "Risk Assessment"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.credo.ai/privacy-policy",
  },
  {
    slug: "holistic-ai",
    name: "Holistic AI",
    category: "AI Safety & Governance",
    description: "AI risk management platform offering auditing, bias detection, and compliance tools for responsible AI deployment.",
    website: "https://www.holisticai.com",
    tags: ["AI", "AI Governance", "Bias Detection", "Compliance", "Auditing"],
    certifications: [],
    frameworks: ["EU AI Act", "NIST AI RMF"],
    gdprCompliant: true,
    dataLocations: ["UK", "EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["AI Auditing", "Bias Detection"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.holisticai.com/privacy-policy",
  },
  {
    slug: "arthur-ai",
    name: "Arthur AI",
    category: "AI Safety & Governance",
    description: "AI performance monitoring and observability platform for detecting drift, bias, and anomalies in ML models.",
    website: "https://www.arthur.ai",
    tags: ["AI", "ML Monitoring", "AI Safety", "Model Observability"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["NIST AI RMF"],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["ML Monitoring", "Anomaly Detection"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.arthur.ai/privacy-policy",
  },

  // === Speech & NLP ===
  {
    slug: "assemblyai",
    name: "AssemblyAI",
    category: "Speech & NLP",
    description: "AI models for speech-to-text, speaker diarization, sentiment analysis, and audio intelligence.",
    website: "https://www.assemblyai.com",
    tags: ["AI", "Speech", "NLP", "Transcription", "Audio"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["GDPR"],
    gdprCompliant: true,
    dataLocations: ["US", "EU"],
    hasEuDataCenter: true,
    aiCapabilities: ["Speech", "NLP", "Audio Intelligence"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://www.assemblyai.com/privacy-policy",
    trustCenterUrl: "https://www.assemblyai.com/security",
  },
  {
    slug: "deepgram",
    name: "Deepgram",
    category: "Speech & NLP",
    description: "Enterprise speech AI platform offering real-time and batch speech-to-text, text-to-speech, and audio intelligence.",
    website: "https://deepgram.com",
    tags: ["AI", "Speech", "NLP", "Transcription", "Voice AI"],
    certifications: ["SOC 2 Type II"],
    frameworks: ["GDPR"],
    gdprCompliant: true,
    dataLocations: ["US"],
    hasEuDataCenter: false,
    aiCapabilities: ["Speech", "NLP", "Voice AI"],
    modelHosting: "Cloud",
    privacyPolicyUrl: "https://deepgram.com/privacy",
  },
  {
    slug: "speechmatics",
    name: "Speechmatics",
    category: "Speech & NLP",
    description: "UK-based speech technology company offering highly accurate speech recognition supporting 50+ languages.",
    website: "https://www.speechmatics.com",
    tags: ["AI", "Speech", "NLP", "Multilingual", "Transcription"],
    certifications: ["ISO 27001", "SOC 2 Type II"],
    frameworks: ["GDPR"],
    gdprCompliant: true,
    dataLocations: ["UK", "EU", "US"],
    hasEuDataCenter: true,
    aiCapabilities: ["Speech", "Multilingual NLP"],
    modelHosting: "Hybrid",
    privacyPolicyUrl: "https://www.speechmatics.com/privacy-policy",
    trustCenterUrl: "https://www.speechmatics.com/security",
  },
];

async function main() {
  console.log("Seeding AI Vendor Catalog...\n");

  let created = 0;
  let updated = 0;

  for (const vendor of vendors) {
    const data = {
      name: vendor.name,
      category: vendor.category,
      subcategory: vendor.subcategory,
      description: `${vendor.description} (Catalog data as of ${CATALOG_DATA_AS_OF}; editorial, unverified — confirm current status with the vendor.)`,
      website: vendor.website,
      tags: vendor.tags,
      certifications: vendor.certifications,
      frameworks: vendor.frameworks,
      gdprCompliant: vendor.gdprCompliant,
      // Deliberately null: "EU AI Act compliant" is not a vendor-level binary.
      euAiActCompliant: null,
      hipaaCompliant: vendor.hipaaCompliant,
      dataLocations: vendor.dataLocations,
      hasEuDataCenter: vendor.hasEuDataCenter,
      aiCapabilities: vendor.aiCapabilities,
      modelHosting: vendor.modelHosting,
      privacyPolicyUrl: vendor.privacyPolicyUrl,
      trustCenterUrl: vendor.trustCenterUrl,
      dpaUrl: vendor.dpaUrl,
      securityPageUrl: vendor.securityPageUrl,
      source: "seed",
      // Seeded data is editorial and unverified — no fabricated stamps.
      isVerified: false,
      verifiedAt: null,
      verifiedBy: null,
      // New fields
      ...(vendor.aiModels && { aiModels: vendor.aiModels as unknown as Prisma.InputJsonValue }),
      ...(vendor.euAiActRole && { euAiActRole: vendor.euAiActRole }),
      ...(vendor.iso42001Certified != null && { iso42001Certified: vendor.iso42001Certified }),
      ...(vendor.supportsExplainability != null && { supportsExplainability: vendor.supportsExplainability }),
      ...(vendor.hasBiasMonitoring != null && { hasBiasMonitoring: vendor.hasBiasMonitoring }),
      ...(vendor.hasModelCard != null && { hasModelCard: vendor.hasModelCard }),
      ...(vendor.supportsAuditLogs != null && { supportsAuditLogs: vendor.supportsAuditLogs }),
      ...(vendor.hasDesignatedDpo != null && { hasDesignatedDpo: vendor.hasDesignatedDpo }),
    };

    const result = await prisma.vendorCatalog.upsert({
      where: { slug: vendor.slug },
      create: { slug: vendor.slug, ...data },
      update: data,
    });

    // Check if it was created or updated by checking createdAt vs updatedAt
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
    console.log(`  ${vendor.name} (${vendor.category})`);
  }

  console.log(`\nDone! ${created} created, ${updated} updated. Total: ${vendors.length} vendors.`);

  // Print category summary
  const categories = new Map<string, number>();
  for (const v of vendors) {
    categories.set(v.category, (categories.get(v.category) || 0) + 1);
  }
  console.log("\nCategories:");
  for (const [cat, count] of categories) {
    console.log(`  ${cat}: ${count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
