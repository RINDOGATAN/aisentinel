// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Industry Templates for AI Governance Quick Start
 *
 * Each template provides a pre-built AI governance program scaffold with
 * common AI systems, risk classifications, oversight gates, and policies.
 *
 * EU AI Act citations verified against the FINAL text of Regulation (EU)
 * 2024/1689 (transparency = Art. 50; Annex III 5(b) creditworthiness
 * expressly EXCLUDES financial-fraud detection; medical-device AI is
 * high-risk via Art. 6(1)/Annex I (MDR), not Annex III 5(a); emergency
 * healthcare triage = Annex III 5(d)).
 * lawReviewedAsOf: 2026-07-05
 */

import type { AITechnique, AISystemRole, AIRiskLevel, GateType, PolicyType } from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

export interface AIGovernanceSystem {
  name: string;
  description: string;
  technique: AITechnique;
  role: AISystemRole;
  purpose: string;
  processesPersonalData: boolean;
  riskLevel: AIRiskLevel;
  riskRationale: string;
  annexIIICategory?: string;
  gateType?: GateType;
}

export interface AIGovernancePolicy {
  title: string;
  type: PolicyType;
  description: string;
  content: string;
}

export interface AIGovernanceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  systems: AIGovernanceSystem[];
  policies: AIGovernancePolicy[];
}

// ============================================================
// TEMPLATES
// ============================================================

export const AI_GOVERNANCE_TEMPLATES: AIGovernanceTemplate[] = [
  // ──────────────────────────────────────────────────
  // E-COMMERCE
  // ──────────────────────────────────────────────────
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "AI systems common in online retail: product recommendations, chatbots, fraud detection, dynamic pricing, and AI-powered search.",
    icon: "ShoppingCart",
    systems: [
      {
        name: "Product Recommendation Engine",
        description: "AI-driven product recommendation system that analyzes browsing behavior, purchase history, and user preferences to suggest relevant products.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Personalize product recommendations to improve customer experience and increase conversion rates",
        processesPersonalData: true,
        riskLevel: "MINIMAL",
        riskRationale: "Product recommendation engines are not listed in EU AI Act Annex III and carry no Art. 50 transparency duty of their own, so they are minimal-risk under the Act. Obligations arise instead from the GDPR (profiling, Art. 22 where decisions are solely automated with significant effects) and, for online platforms, DSA Art. 27 recommender-system transparency.",
      },
      {
        name: "Customer Support Chatbot",
        description: "AI-powered chatbot handling customer inquiries, order tracking, returns, and FAQ responses.",
        technique: "GENERATIVE_AI",
        role: "DEPLOYER",
        purpose: "Provide automated customer support for common inquiries, reducing response time and improving customer satisfaction",
        processesPersonalData: true,
        riskLevel: "LIMITED",
        riskRationale: "Conversational AI system with transparency obligations under EU AI Act Art. 50. Users must be clearly informed they are interacting with an AI system. Risk of hallucination in responses.",
      },
      {
        name: "Transaction Fraud Detection",
        description: "Real-time AI system analyzing transaction patterns to detect and prevent fraudulent purchases.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Detect and prevent fraudulent transactions in real-time to protect customers and the business from financial losses",
        processesPersonalData: true,
        riskLevel: "MINIMAL",
        riskRationale: "NOT high-risk under the EU AI Act: Annex III 5(b) (creditworthiness/credit scoring) expressly excludes 'AI systems used for the purpose of detecting financial fraud'. Fraud detection is therefore outside Annex III. Automated blocking of transactions can still engage GDPR Art. 22 (right to human intervention), so human-review mechanisms remain required.",
      },
      {
        name: "Dynamic Pricing Engine",
        description: "AI system that adjusts product prices based on demand, competition, inventory levels, and customer segments.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Optimize product pricing in real-time based on market conditions and demand signals",
        processesPersonalData: true,
        riskLevel: "LIMITED",
        riskRationale: "Pricing system that may use personal data for segmentation. Transparency obligations apply regarding AI-driven pricing. Risk of discriminatory pricing if demographic data is used directly or indirectly.",
      },
      {
        name: "AI-Powered Product Search",
        description: "Semantic search engine using NLP to understand natural language product queries and return relevant results.",
        technique: "NLP",
        role: "DEPLOYER",
        purpose: "Improve product discovery through natural language understanding and semantic search capabilities",
        processesPersonalData: false,
        riskLevel: "MINIMAL",
        riskRationale: "Search functionality that does not make decisions affecting individuals. Processes search queries but does not profile users or make consequential decisions.",
      },
    ],
    policies: [
      {
        title: "AI Usage Policy - E-commerce",
        type: "AI_USAGE",
        description: "Governs the acceptable use of AI systems across e-commerce operations",
        content: "This policy establishes guidelines for the responsible use of AI systems in our e-commerce operations. All AI systems that interact with customers, process personal data, or influence purchasing decisions must be registered in the AI Registry before deployment.\n\nProduct recommendation engines and dynamic pricing systems must clearly disclose AI involvement to customers. Customer support chatbots must identify themselves as AI systems at the start of each interaction. Fraud detection systems must provide human review mechanisms for flagged transactions.\n\nAll teams deploying AI systems must complete AI awareness training and adhere to the organization's data protection policies when processing customer data through AI systems.",
      },
      {
        title: "AI Transparency Policy - E-commerce",
        type: "AI_TRANSPARENCY",
        description: "Ensures transparency in AI-driven customer interactions and decisions",
        content: "This policy ensures customers are appropriately informed about AI systems that affect their shopping experience. In compliance with EU AI Act Article 50, all customer-facing AI systems must clearly disclose AI involvement.\n\nChatbots and virtual assistants must identify themselves as AI at the start of each conversation. AI-generated product recommendations must be labeled as such. Dynamic pricing must not discriminate based on protected characteristics, and customers must be able to request human review of AI-driven decisions that significantly affect them.\n\nRegular transparency reports must be published documenting which AI systems are in use, their purposes, and their impact on customer experiences.",
      },
    ],
  },

  // ──────────────────────────────────────────────────
  // HEALTHCARE
  // ──────────────────────────────────────────────────
  {
    id: "healthcare",
    name: "Healthcare",
    description: "AI systems in healthcare settings: clinical decision support, medical imaging analysis, patient triage, and drug interaction checking.",
    icon: "Heart",
    systems: [
      {
        name: "Clinical Decision Support System",
        description: "AI system providing clinicians with evidence-based treatment recommendations, diagnostic suggestions, and risk assessments.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Support clinical decision-making by providing AI-driven diagnostic suggestions and treatment recommendations based on patient data and medical literature",
        processesPersonalData: true,
        riskLevel: "HIGH",
        riskRationale: "AI system intended for use in healthcare that directly influences clinical decisions affecting patient health and safety. High-risk via EU AI Act Art. 6(1): clinical decision support is typically software as a medical device under the MDR (Reg. (EU) 2017/745, Rule 11 — usually Class IIa or higher), i.e. a product covered by Annex I Union harmonisation legislation subject to third-party conformity assessment. Not an Annex III listing.",
        annexIIICategory: "Art. 6(1) / Annex I (MDR) route — not Annex III",
        gateType: "PRE_DEPLOYMENT",
      },
      {
        name: "Medical Imaging Analysis",
        description: "Deep learning system for analyzing medical images (X-rays, MRIs, CT scans) to assist radiologists in detecting anomalies.",
        technique: "DEEP_LEARNING",
        role: "DEPLOYER",
        purpose: "Assist radiologists by analyzing medical images for potential anomalies, improving diagnostic accuracy and reducing analysis time",
        processesPersonalData: true,
        riskLevel: "HIGH",
        riskRationale: "AI system processing sensitive health data and directly influencing diagnostic decisions. As medical-device software under the MDR (Reg. (EU) 2017/745), it is high-risk via EU AI Act Art. 6(1)/Annex I — the medical-device route, not Annex III. Requires rigorous validation and human oversight.",
        annexIIICategory: "Art. 6(1) / Annex I (MDR) route — not Annex III",
        gateType: "PRE_DEPLOYMENT",
      },
      {
        name: "Patient Triage Chatbot",
        description: "AI-powered triage system that assesses patient symptoms, urgency levels, and directs patients to appropriate care pathways.",
        technique: "GENERATIVE_AI",
        role: "DEPLOYER",
        purpose: "Provide initial patient assessment and triage, directing patients to appropriate care levels based on reported symptoms",
        processesPersonalData: true,
        riskLevel: "HIGH",
        riskRationale: "AI system making triage decisions that affect patient access to urgent care. Incorrect triage could delay critical care. Where used for emergency healthcare patient triage, it falls under EU AI Act Annex III 5(d) (evaluation/classification of emergency calls and emergency healthcare patient triage systems). Requires robust human oversight and fallback mechanisms.",
        annexIIICategory: "5(d). Emergency healthcare patient triage",
        gateType: "PRE_DEPLOYMENT",
      },
      {
        name: "Drug Interaction Checker",
        description: "AI system analyzing medication combinations to identify potential adverse drug interactions and contraindications.",
        technique: "EXPERT_SYSTEM",
        role: "DEPLOYER",
        purpose: "Detect potential drug interactions and contraindications to improve patient safety in medication management",
        processesPersonalData: true,
        riskLevel: "HIGH",
        riskRationale: "Safety-critical AI system where errors could lead to adverse drug events. Directly impacts patient safety through medication-related decisions. As clinical software under the MDR, it is high-risk via EU AI Act Art. 6(1)/Annex I (medical-device route), not Annex III.",
        annexIIICategory: "Art. 6(1) / Annex I (MDR) route — not Annex III",
        gateType: "PRE_DEPLOYMENT",
      },
    ],
    policies: [
      {
        title: "AI Usage Policy - Healthcare",
        type: "AI_USAGE",
        description: "Governs the acceptable use of AI systems in healthcare operations",
        content: "This policy establishes strict guidelines for AI system usage in healthcare settings. All AI systems must be registered, risk-classified, and approved through human oversight gates before clinical deployment.\n\nAI systems must never replace clinical judgment — they serve as decision support tools only. Clinicians retain full responsibility for all patient care decisions. All AI-generated recommendations must be reviewed by qualified healthcare professionals before acting on them.\n\nAI systems processing patient data must comply with HIPAA, GDPR (for EU patients), and applicable medical device regulations. Regular validation against clinical outcomes is mandatory.",
      },
      {
        title: "AI Ethics Policy - Healthcare",
        type: "AI_ETHICS",
        description: "Ethical principles governing AI use in patient care",
        content: "This policy establishes ethical principles for AI in healthcare. Patient safety is the paramount concern — no AI system shall be deployed if there is reasonable evidence it could compromise patient safety.\n\nAI systems must be designed and validated to perform equitably across patient demographics. Bias testing across age, gender, ethnicity, and socioeconomic factors is mandatory before deployment. Systems showing disparate performance must be remediated or withdrawn.\n\nPatients have the right to know when AI is involved in their care, to understand how AI recommendations are generated, and to request purely human-driven care pathways when available.",
      },
      {
        title: "AI Risk Management Policy - Healthcare",
        type: "AI_RISK_MANAGEMENT",
        description: "Risk management framework for healthcare AI systems",
        content: "This policy establishes the risk management framework for AI systems in healthcare. All AI systems must undergo comprehensive risk assessment using the FRIA (Fundamental Rights Impact Assessment) methodology before deployment.\n\nHigh-risk systems require conformity assessment, continuous monitoring of clinical outcomes, and incident reporting within 24 hours of any adverse event potentially linked to AI malfunction. Regular model performance audits must be conducted quarterly.\n\nA dedicated AI oversight committee reviews all high-risk AI deployments and has authority to suspend any system that poses unacceptable risk to patient safety.",
      },
    ],
  },

  // ──────────────────────────────────────────────────
  // FINANCIAL SERVICES
  // ──────────────────────────────────────────────────
  {
    id: "financial",
    name: "Financial Services",
    description: "AI systems in banking and financial services: credit scoring, fraud detection, AML monitoring, robo-advisory, and customer support.",
    icon: "Landmark",
    systems: [
      {
        name: "AI Credit Scoring System",
        description: "Machine learning system evaluating creditworthiness of natural persons based on financial history, behavioral data, and alternative data sources.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Evaluate creditworthiness of natural persons for lending decisions, credit limit adjustments, and loan pricing",
        processesPersonalData: true,
        riskLevel: "HIGH",
        riskRationale: "EU AI Act Annex III 5(b) explicitly lists AI systems intended to evaluate the creditworthiness of natural persons or establish their credit score as high-risk (fraud-detection systems are excluded from that point). Decisions directly affect individuals' access to financial services. Requires explainability, bias testing, and human oversight.",
        annexIIICategory: "5(b). Creditworthiness assessment / credit scoring",
        gateType: "PRE_DEPLOYMENT",
      },
      {
        name: "Financial Fraud Detection",
        description: "Real-time AI system monitoring transactions for fraudulent patterns, anomalous behavior, and suspicious activities.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Detect and prevent financial fraud in real-time by analyzing transaction patterns, behavioral biometrics, and account activity",
        processesPersonalData: true,
        riskLevel: "MINIMAL",
        riskRationale: "NOT high-risk under the EU AI Act: Annex III 5(b) expressly excludes 'AI systems used for the purpose of detecting financial fraud' from the creditworthiness listing. False positives can still deny access to financial services, so GDPR Art. 22 human-review mechanisms and internal monitoring remain essential.",
      },
      {
        name: "Anti-Money Laundering Monitor",
        description: "AI system for detecting potential money laundering activities, suspicious transaction patterns, and sanctions screening.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Monitor transactions for potential money laundering, terrorist financing, and sanctions violations as required by regulatory obligations",
        processesPersonalData: true,
        riskLevel: "HIGH",
        riskRationale: "Regulatory compliance system that can trigger account restrictions and reporting to financial intelligence units. Affects individuals' access to financial services. Must balance regulatory obligations with privacy rights.",
        gateType: "PRE_DEPLOYMENT",
      },
      {
        name: "Robo-Advisory Platform",
        description: "AI-driven investment advisory system providing automated portfolio management, asset allocation, and investment recommendations.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Provide automated investment advice and portfolio management based on client risk profiles and market conditions",
        processesPersonalData: true,
        riskLevel: "LIMITED",
        riskRationale: "Advisory system with transparency obligations. While it influences financial decisions, clients maintain control over investment execution. MiFID II suitability requirements apply alongside AI transparency obligations.",
      },
      {
        name: "Banking Support Bot",
        description: "Conversational AI for customer banking inquiries, account information, and basic transaction support.",
        technique: "GENERATIVE_AI",
        role: "DEPLOYER",
        purpose: "Handle routine customer banking inquiries, provide account information, and assist with basic transactions",
        processesPersonalData: true,
        riskLevel: "LIMITED",
        riskRationale: "Customer-facing AI system with transparency obligations under EU AI Act Art. 50. Must disclose AI nature to customers. Handles sensitive financial data requiring appropriate access controls.",
      },
    ],
    policies: [
      {
        title: "AI Governance Policy - Financial Services",
        type: "AI_GOVERNANCE",
        description: "Comprehensive AI governance framework for financial institutions",
        content: "This policy establishes the AI governance framework for our financial institution. An AI Governance Committee, reporting to the Board Risk Committee, oversees all AI deployments and sets risk appetite for AI usage.\n\nAll AI systems must be classified under the EU AI Act risk framework. High-risk systems (credit scoring, fraud detection, AML) require conformity assessment, ongoing monitoring, and quarterly model validation. Model risk management follows supervisory expectations from ECB/EBA guidelines.\n\nAI models must undergo independent validation before production deployment. Model documentation must include intended use, training data descriptions, performance metrics, known limitations, and bias testing results.",
      },
      {
        title: "AI Risk Management Policy - Financial Services",
        type: "AI_RISK_MANAGEMENT",
        description: "Risk management framework for AI systems in financial services",
        content: "This policy defines the risk management framework for AI systems. All AI models are subject to the three lines of defense: first line (model owners), second line (model risk management), and third line (internal audit).\n\nModel risk is assessed across five dimensions: accuracy, stability, bias/fairness, explainability, and cybersecurity. High-risk models undergo stress testing, sensitivity analysis, and champion-challenger validation. Models exceeding risk thresholds require remediation within 30 days.\n\nIncident management requires immediate notification of the AI Governance Committee for any model failure affecting customer outcomes, regulatory compliance, or financial loss exceeding defined thresholds.",
      },
      {
        title: "AI Transparency Policy - Financial Services",
        type: "AI_TRANSPARENCY",
        description: "Transparency requirements for AI-driven financial decisions",
        content: "This policy ensures transparency in AI-driven financial decisions. Customers have the right to explanation for any AI-influenced decision that significantly affects them, including credit decisions, fraud alerts, and investment recommendations.\n\nExplainability requirements are tiered by risk level: HIGH-risk systems must provide individualized explanations of key decision factors; LIMITED-risk systems must disclose AI involvement and provide general information about the decision logic.\n\nRegulatory reporting on AI usage, model performance, and fairness metrics is published annually. The AI model inventory is maintained with full lineage tracking from development through retirement.",
      },
    ],
  },

  // ──────────────────────────────────────────────────
  // SAAS / TECHNOLOGY
  // ──────────────────────────────────────────────────
  {
    id: "saas",
    name: "SaaS / Technology",
    description: "AI systems common in technology companies: code assistants, content generation, analytics AI, chatbots, and AI-powered search.",
    icon: "Cloud",
    systems: [
      {
        name: "AI Code Assistant",
        description: "AI-powered code completion, review, and generation tool used by the development team.",
        technique: "GENERATIVE_AI",
        role: "DEPLOYER",
        purpose: "Accelerate software development through AI-powered code suggestions, code review assistance, and automated documentation",
        processesPersonalData: false,
        riskLevel: "LIMITED",
        riskRationale: "Generative AI system with transparency obligations. Code may inadvertently contain or generate references to personal data. Intellectual property and code security considerations apply. Low direct risk to individuals.",
      },
      {
        name: "AI Content Generator",
        description: "Generative AI platform for creating marketing copy, documentation, blog posts, and communication materials.",
        technique: "GENERATIVE_AI",
        role: "DEPLOYER",
        purpose: "Generate marketing content, documentation, and communications to improve content production efficiency",
        processesPersonalData: false,
        riskLevel: "LIMITED",
        riskRationale: "Content generation AI with transparency obligations under EU AI Act Art. 50. AI-generated content must be labeled as such. Risk of hallucination, copyright issues, and brand misrepresentation.",
      },
      {
        name: "Product Analytics AI",
        description: "AI system analyzing product usage patterns, user behavior, and engagement metrics to drive product decisions.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Analyze product usage patterns and user behavior to inform product development decisions and improve user experience",
        processesPersonalData: true,
        riskLevel: "MINIMAL",
        riskRationale: "Analytics system that provides aggregate insights for product teams. Does not make individual-level decisions. Standard data protection obligations apply for personal data processing.",
      },
      {
        name: "Customer Support Chatbot",
        description: "AI chatbot handling customer support inquiries, ticket routing, and knowledge base interactions.",
        technique: "GENERATIVE_AI",
        role: "DEPLOYER",
        purpose: "Provide automated first-line customer support, handle common inquiries, and route complex issues to human agents",
        processesPersonalData: true,
        riskLevel: "LIMITED",
        riskRationale: "Conversational AI system with transparency obligations. Must disclose AI nature to users. Processes customer data including support inquiries that may contain sensitive information.",
      },
      {
        name: "AI-Powered Search",
        description: "Semantic search system using embeddings and NLP for documentation, knowledge base, and product search.",
        technique: "NLP",
        role: "DEPLOYER",
        purpose: "Provide intelligent search across product documentation and knowledge base using semantic understanding",
        processesPersonalData: false,
        riskLevel: "MINIMAL",
        riskRationale: "Search functionality that processes queries without making decisions affecting individuals. Minimal risk classification as it serves as a utility function.",
      },
    ],
    policies: [
      {
        title: "AI Usage Policy - Technology",
        type: "AI_USAGE",
        description: "Guidelines for responsible AI usage across technology operations",
        content: "This policy governs the use of AI tools and systems across our technology organization. All AI systems must be registered in the AI Registry before use, whether internally developed or third-party. Employees must complete AI awareness training before using generative AI tools.\n\nCode assistants may be used for development acceleration but all AI-generated code must undergo standard code review. Confidential code, customer data, and proprietary algorithms must not be shared with external AI services without approval. AI-generated content must be reviewed for accuracy and labeled as AI-assisted.\n\nTeams are encouraged to innovate with AI but must follow the registration and risk assessment process for any new AI tool or use case before deployment.",
      },
      {
        title: "AI Data Governance Policy - Technology",
        type: "AI_DATA_GOVERNANCE",
        description: "Data governance requirements for AI system inputs and outputs",
        content: "This policy establishes data governance requirements for all AI systems. Data used for AI training, fine-tuning, or inference must be inventoried, classified, and processed in accordance with data protection regulations.\n\nCustomer data may only be processed through AI systems that have been approved through the risk assessment process. Data retention for AI purposes follows the organization's data retention schedule. Personal data used for model training requires a valid legal basis and must be documented.\n\nAI model outputs that reference or contain personal data must be treated with the same classification as the input data. Data minimization principles apply — only necessary data should be provided to AI systems.",
      },
    ],
  },

  // ──────────────────────────────────────────────────
  // MANUFACTURING
  // ──────────────────────────────────────────────────
  {
    id: "manufacturing",
    name: "Manufacturing",
    description: "AI systems in manufacturing: predictive maintenance, quality inspection, supply chain optimization, and safety monitoring.",
    icon: "Factory",
    systems: [
      {
        name: "Predictive Maintenance System",
        description: "AI system analyzing sensor data from manufacturing equipment to predict failures and optimize maintenance schedules.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Predict equipment failures and optimize maintenance schedules to reduce downtime and maintenance costs",
        processesPersonalData: false,
        riskLevel: "LIMITED",
        riskRationale: "Industrial AI system processing equipment sensor data. Does not directly affect individuals. Transparency obligations apply regarding AI-driven maintenance decisions. Failure could affect production but not safety-critical.",
      },
      {
        name: "AI Quality Inspection",
        description: "Computer vision system for automated quality control, defect detection, and product inspection on production lines.",
        technique: "COMPUTER_VISION",
        role: "DEPLOYER",
        purpose: "Automate visual quality inspection to detect defects, ensure product consistency, and reduce manual inspection costs",
        processesPersonalData: false,
        riskLevel: "LIMITED",
        riskRationale: "Quality control AI system processing product images. Does not process personal data or make decisions affecting individuals. Product safety implications require monitoring but standard risk classification applies.",
      },
      {
        name: "Supply Chain Optimizer",
        description: "AI system optimizing supply chain logistics, inventory management, and demand forecasting.",
        technique: "MACHINE_LEARNING",
        role: "DEPLOYER",
        purpose: "Optimize supply chain operations through demand forecasting, inventory optimization, and logistics planning",
        processesPersonalData: false,
        riskLevel: "MINIMAL",
        riskRationale: "Operational optimization AI that processes business data for logistics decisions. No direct impact on individuals. Standard monitoring for business performance accuracy.",
      },
      {
        name: "Worker Safety Monitor",
        description: "AI-powered safety monitoring system using cameras and sensors to detect safety hazards, PPE compliance, and unsafe behaviors.",
        technique: "COMPUTER_VISION",
        role: "DEPLOYER",
        purpose: "Monitor workplace safety conditions, detect hazards, and ensure compliance with safety protocols to prevent workplace injuries",
        processesPersonalData: true,
        riskLevel: "HIGH",
        riskRationale: "EU AI Act Annex III Section 4 covers AI systems used in employment and worker management. Worker monitoring systems that can identify individuals and affect their employment conditions are high-risk. Privacy impact on workers requires careful human oversight.",
        annexIIICategory: "4. Employment, workers management and access to self-employment",
        gateType: "PRE_DEPLOYMENT",
      },
    ],
    policies: [
      {
        title: "AI Usage Policy - Manufacturing",
        type: "AI_USAGE",
        description: "Guidelines for AI usage in manufacturing operations",
        content: "This policy establishes guidelines for AI usage in manufacturing. All AI systems deployed on the factory floor must be registered, risk-assessed, and approved before operational use. Safety-critical AI systems require additional review by the HSE (Health, Safety & Environment) team.\n\nWorker-facing AI systems (safety monitoring, performance analytics) must comply with worker consultation requirements and data protection regulations. Workers must be informed about AI monitoring and its purposes. AI systems must not be used for covert surveillance.\n\nPredictive maintenance and quality inspection systems must have defined fallback procedures for when AI systems are unavailable or produce uncertain results.",
      },
      {
        title: "AI Risk Management Policy - Manufacturing",
        type: "AI_RISK_MANAGEMENT",
        description: "Risk management for manufacturing AI systems",
        content: "This policy defines the risk management approach for AI in manufacturing. Safety-critical AI systems (worker safety monitoring, equipment safety) undergo enhanced risk assessment including failure mode analysis, edge case testing, and environmental condition validation.\n\nHigh-risk systems require pre-deployment conformity assessment, continuous monitoring dashboards, and quarterly performance reviews. Incident reporting is mandatory within 24 hours for any AI system failure that could have contributed to a safety event.\n\nModel drift monitoring is required for all production AI systems. Performance degradation beyond defined thresholds triggers automatic alerts and human review before continued operation.",
      },
    ],
  },

  // ──────────────────────────────────────────────────
  // PROFESSIONAL SERVICES
  // ──────────────────────────────────────────────────
  {
    id: "professional",
    name: "Professional Services",
    description: "AI systems in consulting, legal, and professional services: document analysis, contract review, knowledge management, and meeting summaries.",
    icon: "Briefcase",
    systems: [
      {
        name: "AI Document Analysis",
        description: "AI system for analyzing, summarizing, and extracting insights from large document sets, reports, and research materials.",
        technique: "NLP",
        role: "DEPLOYER",
        purpose: "Analyze and summarize documents, extract key information, and support knowledge discovery across large document collections",
        processesPersonalData: true,
        riskLevel: "LIMITED",
        riskRationale: "Document analysis AI that may process documents containing personal data. Transparency obligations apply. Risk depends on the sensitivity of documents processed and whether outputs influence decisions affecting individuals.",
      },
      {
        name: "AI Contract Review",
        description: "AI-powered contract analysis tool that identifies risks, clauses, obligations, and compliance issues in legal agreements.",
        technique: "NLP",
        role: "DEPLOYER",
        purpose: "Assist legal teams in reviewing contracts by identifying key clauses, risks, deviations from standards, and compliance obligations",
        processesPersonalData: true,
        riskLevel: "LIMITED",
        riskRationale: "Legal AI tool that supports but does not replace legal judgment. Transparency obligations apply. Risk mitigated by human legal review of all AI-identified items. Contracts may contain personal data requiring data protection measures.",
      },
      {
        name: "Knowledge Management AI",
        description: "AI-powered knowledge base that organizes institutional knowledge, answers questions, and surfaces relevant expertise.",
        technique: "GENERATIVE_AI",
        role: "DEPLOYER",
        purpose: "Organize and surface institutional knowledge to improve team productivity and knowledge sharing",
        processesPersonalData: false,
        riskLevel: "MINIMAL",
        riskRationale: "Internal knowledge tool that assists with information retrieval. Does not make decisions affecting individuals. Minimal risk as it serves as a utility for internal productivity.",
      },
      {
        name: "AI Meeting Summarizer",
        description: "AI system that records, transcribes, and summarizes meetings, generating action items and key decisions.",
        technique: "SPEECH_RECOGNITION",
        role: "DEPLOYER",
        purpose: "Automatically transcribe and summarize meetings to improve documentation and follow-up on action items",
        processesPersonalData: true,
        riskLevel: "MINIMAL",
        riskRationale: "Meeting recording AI with consent and notification requirements. Processes voice data (personal data) but does not make decisions affecting individuals. Participants must be informed of recording and AI processing.",
      },
    ],
    policies: [
      {
        title: "AI Usage Policy - Professional Services",
        type: "AI_USAGE",
        description: "Guidelines for AI tool usage in professional services",
        content: "This policy governs AI usage across our professional services practice. All AI tools must be registered and approved before use with client work. Client confidentiality must be maintained — client data must not be shared with external AI services without explicit client consent and contractual authorization.\n\nAI-generated analysis, advice, and deliverables must be reviewed by qualified professionals before delivery to clients. AI tools are aids to professional judgment, not replacements. Professionals remain accountable for all work product regardless of AI involvement.\n\nMeeting recording and transcription tools require participant notification and consent. Recordings containing client information must follow the firm's data retention and confidentiality policies.",
      },
      {
        title: "AI Data Governance Policy - Professional Services",
        type: "AI_DATA_GOVERNANCE",
        description: "Data governance for AI processing in professional services",
        content: "This policy establishes data governance for AI systems processing professional services data. Client engagement data, work product, and confidential information must be classified before processing through AI systems.\n\nAI systems must maintain information barriers between client engagements. Cross-client data processing through AI is prohibited unless anonymized and aggregated. Document analysis tools must be configured to prevent data leakage between client matters.\n\nRetention of AI-processed data follows the firm's records management policy. AI conversation histories and generated outputs must be retained or purged according to the applicable engagement retention schedule.",
      },
      {
        title: "AI Ethics Policy - Professional Services",
        type: "AI_ETHICS",
        description: "Ethical principles for AI use in professional advisory",
        content: "This policy establishes ethical principles for AI in professional services. Professionals must maintain competence in understanding AI capabilities and limitations relevant to their practice areas.\n\nAI must not be used to generate work that could mislead clients about the level of professional review applied. Clients must be informed when AI has been materially involved in producing deliverables. Billing transparency requires that AI-assisted efficiency gains are reflected appropriately.\n\nThe firm commits to using AI in ways that enhance rather than diminish the quality of professional judgment, uphold fiduciary duties, and maintain the trust that clients place in our expertise.",
      },
    ],
  },
];

// ============================================================
// HELPERS
// ============================================================

/**
 * Find a template by its ID.
 */
export function getTemplateById(id: string): AIGovernanceTemplate | undefined {
  return AI_GOVERNANCE_TEMPLATES.find((t) => t.id === id);
}
