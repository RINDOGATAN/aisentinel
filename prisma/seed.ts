import { PrismaClient, AIAssessmentType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding AI SENTINEL database...");

  // ============================================================
  // SKILL PACKAGES (Premium Features)
  // ============================================================

  console.log("Creating skill packages...");

  const STRIPE_PRICE_CONFORMITY = process.env.STRIPE_PRICE_CONFORMITY || null;
  const STRIPE_PRICE_BIAS = process.env.STRIPE_PRICE_BIAS || null;
  const STRIPE_PRICE_SHADOW = process.env.STRIPE_PRICE_SHADOW || null;
  const STRIPE_PRICE_VENDOR_CATALOG = process.env.STRIPE_PRICE_VENDOR_CATALOG || null;
  const STRIPE_PRICE_COMPLETE = process.env.STRIPE_PRICE_COMPLETE || null;

  const skillPackages = [
    {
      id: "skill-conformity",
      skillId: "com.todolaw.aisentinel.conformity",
      name: "CONFORMITY",
      displayName: "Conformity Assessment",
      assessmentType: AIAssessmentType.CONFORMITY,
      description: "EU AI Act Annex VI/VII conformity assessment template for high-risk AI systems.",
      isPremium: true,
      isActive: true,
      stripePriceId: STRIPE_PRICE_CONFORMITY,
      priceAmount: 900,
      priceCurrency: "eur",
    },
    {
      id: "skill-bias-fairness",
      skillId: "com.todolaw.aisentinel.bias-fairness",
      name: "BIAS_FAIRNESS",
      displayName: "Bias & Fairness Assessment",
      assessmentType: AIAssessmentType.BIAS_FAIRNESS,
      description: "Comprehensive bias and fairness assessment for AI systems covering demographic parity, equalized odds, and disparate impact.",
      isPremium: true,
      isActive: true,
      stripePriceId: STRIPE_PRICE_BIAS,
      priceAmount: 900,
      priceCurrency: "eur",
    },
    {
      id: "skill-shadow-ai",
      skillId: "com.todolaw.aisentinel.shadow-ai",
      name: "SHADOW_AI",
      displayName: "Shadow AI Discovery",
      assessmentType: null,
      description: "Discover unauthorized AI tools across your organization with scanning, self-reporting portal, and policy enforcement.",
      isPremium: true,
      isActive: true,
      stripePriceId: STRIPE_PRICE_SHADOW,
      priceAmount: 900,
      priceCurrency: "eur",
    },
    {
      id: "skill-vendor-catalog",
      skillId: "com.todolaw.aisentinel.vendor-catalog",
      name: "VENDOR_CATALOG",
      displayName: "AI Vendor Catalog",
      assessmentType: null,
      description: "Pre-audited AI vendor catalog with compliance badges, trust center links, and auto-fill when adding vendors.",
      isPremium: true,
      isActive: true,
      stripePriceId: STRIPE_PRICE_VENDOR_CATALOG,
      priceAmount: 900,
      priceCurrency: "eur",
    },
    {
      id: "skill-complete",
      skillId: "com.todolaw.aisentinel.complete",
      name: "COMPLETE",
      displayName: "Complete AI Governance Suite",
      assessmentType: null,
      description: "Full access to all premium features: Conformity Assessment, Bias & Fairness Assessment, Shadow AI Discovery, and AI Vendor Catalog.",
      isPremium: true,
      isActive: true,
      stripePriceId: STRIPE_PRICE_COMPLETE,
      priceAmount: 1900,
      priceCurrency: "eur",
    },
  ];

  for (const pkg of skillPackages) {
    await prisma.skillPackage.upsert({
      where: { id: pkg.id },
      update: pkg,
      create: pkg,
    });
  }

  console.log(`Created ${skillPackages.length} skill packages`);

  // ============================================================
  // PLATFORM ADMIN
  // ============================================================

  console.log("Creating platform admin...");

  await prisma.platformAdmin.upsert({
    where: { email: "smaldonado@privacycloud.com" },
    update: { isActive: true },
    create: {
      email: "smaldonado@privacycloud.com",
      name: "Sergio Maldonado",
      isActive: true,
    },
  });

  console.log("Created platform admin");

  // ============================================================
  // DEMO ORGANIZATION
  // ============================================================

  console.log("Creating demo organization...");

  const demoOrg = await prisma.organization.upsert({
    where: { slug: "acme-ai" },
    update: { domain: "privacycloud.com" },
    create: {
      id: "demo-organization",
      name: "Acme AI Corp (Demo)",
      slug: "acme-ai",
      domain: "privacycloud.com",
      settings: { isDemo: true },
    },
  });

  // ============================================================
  // DEMO USER
  // ============================================================

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@aisentinel.example" },
    update: {},
    create: {
      id: "demo-user",
      email: "demo@aisentinel.example",
      name: "Demo User",
      emailVerified: new Date(),
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: demoOrg.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      userId: demoUser.id,
      role: "AI_OFFICER",
    },
  });

  console.log("Created demo user as AI_OFFICER");

  // ============================================================
  // 4 SAMPLE AI SYSTEMS
  // ============================================================

  console.log("Creating sample AI systems...");

  const chatbot = await prisma.aISystem.upsert({
    where: { id: "demo-system-chatbot" },
    update: {},
    create: {
      id: "demo-system-chatbot",
      organizationId: demoOrg.id,
      name: "Customer Support Chatbot",
      description: "LLM-powered chatbot handling customer inquiries across web and mobile channels. Uses GPT-4 for response generation with RAG over knowledge base.",
      technique: "GENERATIVE_AI",
      role: "DEPLOYER",
      status: "DEPLOYED",
      purpose: "Automate first-line customer support to reduce response times and handle common inquiries 24/7.",
      businessOwner: "Customer Success",
      technicalOwner: "AI Engineering",
      deploymentDate: new Date("2025-06-15"),
      processesPersonalData: true,
    },
  });

  const hrScreening = await prisma.aISystem.upsert({
    where: { id: "demo-system-hr-screening" },
    update: {},
    create: {
      id: "demo-system-hr-screening",
      organizationId: demoOrg.id,
      name: "Resume Screening System",
      description: "ML-based candidate resume screening and ranking system used in the hiring pipeline. Scores candidates based on job-fit criteria.",
      technique: "MACHINE_LEARNING",
      role: "DEPLOYER",
      status: "TESTING",
      purpose: "Pre-screen job applications to identify top candidates and reduce time-to-hire.",
      businessOwner: "Human Resources",
      technicalOwner: "Data Science Team",
      processesPersonalData: true,
    },
  });

  const fraudDetection = await prisma.aISystem.upsert({
    where: { id: "demo-system-fraud" },
    update: {},
    create: {
      id: "demo-system-fraud",
      organizationId: demoOrg.id,
      name: "Transaction Fraud Detection",
      description: "Real-time deep learning model that monitors financial transactions and flags potentially fraudulent activity for human review.",
      technique: "DEEP_LEARNING",
      role: "PROVIDER",
      status: "DEPLOYED",
      purpose: "Detect and prevent fraudulent transactions in real-time to protect customers and reduce financial losses.",
      businessOwner: "Risk & Compliance",
      technicalOwner: "ML Platform Team",
      deploymentDate: new Date("2025-03-01"),
      processesPersonalData: true,
    },
  });

  const contentMod = await prisma.aISystem.upsert({
    where: { id: "demo-system-content-mod" },
    update: {},
    create: {
      id: "demo-system-content-mod",
      organizationId: demoOrg.id,
      name: "Content Moderation Agent",
      description: "Agentic AI system that reviews user-generated content for policy violations. Uses multi-modal analysis (text + images) with human-in-the-loop escalation.",
      technique: "AGENTIC_AI",
      role: "DEPLOYER",
      status: "DEVELOPMENT",
      purpose: "Automate content moderation to maintain platform safety standards while reducing manual review burden.",
      businessOwner: "Trust & Safety",
      technicalOwner: "AI Engineering",
      processesPersonalData: true,
    },
  });

  console.log("Created 4 sample AI systems");

  // ============================================================
  // AI MODELS (linked to systems)
  // ============================================================

  console.log("Creating sample AI models...");

  await prisma.aIModel.upsert({
    where: { id: "demo-model-gpt4" },
    update: {},
    create: {
      id: "demo-model-gpt4",
      aiSystemId: chatbot.id,
      organizationId: demoOrg.id,
      name: "GPT-4o",
      provider: "OpenAI",
      modelType: "Large Language Model",
      version: "2024-11-20",
      knownLimitations: "May hallucinate factual information. Not suitable for medical, legal, or financial advice without human oversight.",
    },
  });

  await prisma.aIModel.upsert({
    where: { id: "demo-model-screening" },
    update: {},
    create: {
      id: "demo-model-screening",
      aiSystemId: hrScreening.id,
      organizationId: demoOrg.id,
      name: "ResumeRank v2.1",
      provider: "Internal",
      modelType: "Classification / Ranking",
      version: "2.1.0",
      trainingDataSummary: "Trained on 50,000 anonymized resume-job pairs from 2020-2024. Includes synthetic data augmentation for underrepresented categories.",
      knownLimitations: "Potential bias toward candidates from well-known institutions. Requires regular fairness audits.",
    },
  });

  await prisma.aIModel.upsert({
    where: { id: "demo-model-fraud" },
    update: {},
    create: {
      id: "demo-model-fraud",
      aiSystemId: fraudDetection.id,
      organizationId: demoOrg.id,
      name: "FraudNet v3.0",
      provider: "Internal",
      modelType: "Anomaly Detection",
      version: "3.0.2",
      trainingDataSummary: "Trained on 2M+ labeled transactions (2022-2024). Validated against holdout set with 0.98 AUC-ROC.",
      knownLimitations: "Higher false positive rate on international transactions. Performance degrades with novel fraud patterns until retrained.",
      performanceMetrics: { "auc_roc": 0.98, "precision": 0.95, "recall": 0.91 },
    },
  });

  console.log("Created 3 sample AI models");

  // ============================================================
  // RISK CLASSIFICATIONS
  // ============================================================

  console.log("Creating risk classifications...");

  await prisma.riskClassification.upsert({
    where: { aiSystemId: chatbot.id },
    update: {},
    create: {
      aiSystemId: chatbot.id,
      organizationId: demoOrg.id,
      riskLevel: "LIMITED",
      rationale: "Customer-facing chatbot with transparency obligations under EU AI Act Art. 50. Users must be informed they are interacting with an AI system. No high-risk categorization as the system does not make decisions with significant legal effects.",
      classifiedBy: demoUser.id,
    },
  });

  await prisma.riskClassification.upsert({
    where: { aiSystemId: hrScreening.id },
    update: {},
    create: {
      aiSystemId: hrScreening.id,
      organizationId: demoOrg.id,
      riskLevel: "HIGH",
      rationale: "Employment and worker management AI system falls under EU AI Act Annex III, Category 4. Resume screening directly influences recruitment decisions affecting natural persons. Requires conformity assessment, risk management system, and human oversight.",
      annexIIICategory: "Employment, workers management and access to self-employment (Annex III, 4)",
      classifiedBy: demoUser.id,
    },
  });

  await prisma.riskClassification.upsert({
    where: { aiSystemId: fraudDetection.id },
    update: {},
    create: {
      aiSystemId: fraudDetection.id,
      organizationId: demoOrg.id,
      riskLevel: "HIGH",
      rationale: "AI system used for creditworthiness assessment and fraud detection in financial services. Falls under Annex III, Category 5(b). Decisions may affect access to financial services. Requires ongoing monitoring and human oversight for flagged transactions.",
      annexIIICategory: "Access to and enjoyment of essential private and public services (Annex III, 5)",
      classifiedBy: demoUser.id,
    },
  });

  await prisma.riskClassification.upsert({
    where: { aiSystemId: contentMod.id },
    update: {},
    create: {
      aiSystemId: contentMod.id,
      organizationId: demoOrg.id,
      riskLevel: "LIMITED",
      rationale: "Content moderation system with human-in-the-loop escalation. While it processes user content, final decisions on content removal involve human review. Transparency obligations apply. Not classified as high-risk as it does not fall under Annex III categories.",
      classifiedBy: demoUser.id,
    },
  });

  console.log("Created 4 risk classifications");

  // ============================================================
  // SAMPLE ASSESSMENTS
  // ============================================================

  console.log("Creating sample assessments...");

  // Check if FRIA template exists (created by seed-assessment-templates)
  const friaTemplate = await prisma.aIAssessmentTemplate.findFirst({
    where: { type: "FRIA", isSystem: true },
  });

  if (friaTemplate) {
    await prisma.aIAssessment.upsert({
      where: { id: "demo-assessment-fria-hr" },
      update: {},
      create: {
        id: "demo-assessment-fria-hr",
        organizationId: demoOrg.id,
        aiSystemId: hrScreening.id,
        templateId: friaTemplate.id,
        title: "FRIA - Resume Screening System",
        type: "FRIA",
        status: "IN_PROGRESS",
        createdBy: demoUser.id,
        responses: {
          "fria1_1": "Resume Screening System used in the hiring pipeline to pre-screen job applications.",
          "fria1_2": "Deployed across all business units for external hiring processes.",
        },
      },
    });
    console.log("  Created FRIA assessment for HR Screening");
  } else {
    console.log("  Skipping FRIA assessment (template not found - run db:seed-templates first)");
  }

  // Check if AI Risk template exists
  const aiRiskTemplate = await prisma.aIAssessmentTemplate.findFirst({
    where: { type: "AI_RISK", isSystem: true },
  });

  if (aiRiskTemplate) {
    await prisma.aIAssessment.upsert({
      where: { id: "demo-assessment-risk-fraud" },
      update: {},
      create: {
        id: "demo-assessment-risk-fraud",
        organizationId: demoOrg.id,
        aiSystemId: fraudDetection.id,
        templateId: aiRiskTemplate.id,
        title: "AI Risk Assessment - Fraud Detection",
        type: "AI_RISK",
        status: "APPROVED",
        riskScore: 65,
        createdBy: demoUser.id,
        approvedBy: demoUser.id,
        approvedAt: new Date("2025-04-10"),
        responses: {
          "air1_1": "Real-time transaction fraud detection using deep learning anomaly detection.",
          "air1_2": "HIGH",
          "air2_1": "False positives may block legitimate transactions, causing customer frustration and potential financial harm.",
          "air2_2": "Model drift may reduce detection accuracy over time without regular retraining.",
        },
      },
    });
    console.log("  Created AI Risk assessment for Fraud Detection");
  } else {
    console.log("  Skipping AI Risk assessment (template not found - run db:seed-templates first)");
  }

  // ============================================================
  // AUDIT LOG ENTRIES
  // ============================================================

  console.log("Creating sample audit log entries...");

  const auditEntries = [
    {
      id: "demo-audit-1",
      organizationId: demoOrg.id,
      userId: demoUser.id,
      entityType: "AISystem",
      entityId: chatbot.id,
      action: "CREATE",
      changes: { name: "Customer Support Chatbot" },
    },
    {
      id: "demo-audit-2",
      organizationId: demoOrg.id,
      userId: demoUser.id,
      entityType: "AISystem",
      entityId: chatbot.id,
      action: "UPDATE",
      changes: { status: { from: "DRAFT", to: "DEPLOYED" } },
    },
    {
      id: "demo-audit-3",
      organizationId: demoOrg.id,
      userId: demoUser.id,
      entityType: "RiskClassification",
      entityId: hrScreening.id,
      action: "CREATE",
      changes: { riskLevel: "HIGH" },
    },
    {
      id: "demo-audit-4",
      organizationId: demoOrg.id,
      userId: demoUser.id,
      entityType: "AISystem",
      entityId: fraudDetection.id,
      action: "CREATE",
      changes: { name: "Transaction Fraud Detection" },
    },
    {
      id: "demo-audit-5",
      organizationId: demoOrg.id,
      userId: demoUser.id,
      entityType: "AISystem",
      entityId: contentMod.id,
      action: "CREATE",
      changes: { name: "Content Moderation Agent" },
    },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.upsert({
      where: { id: entry.id },
      update: {},
      create: entry,
    });
  }

  console.log(`Created ${auditEntries.length} audit log entries`);

  console.log("\nSeeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
