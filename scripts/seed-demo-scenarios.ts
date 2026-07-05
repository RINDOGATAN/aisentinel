import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Populating comprehensive demo scenarios...\n");

  // Get existing org and user
  const org = await prisma.organization.findUnique({ where: { slug: "acme-ai" } });
  if (!org) throw new Error("Demo org not found — run `npx prisma db seed` first");

  const user = await prisma.user.findUnique({ where: { email: "demo@aisentinel.example" } });
  if (!user) throw new Error("Demo user not found — run `npx prisma db seed` first");

  const orgId = org.id;
  const userId = user.id;

  // ============================================================
  // 1. ADDITIONAL AI SYSTEMS (cover DRAFT + RETIRED statuses)
  // ============================================================

  console.log("1. Creating additional AI systems...");

  const predictiveMaintenance = await prisma.aISystem.upsert({
    where: { id: "demo-system-pred-maint" },
    update: {},
    create: {
      id: "demo-system-pred-maint",
      organizationId: orgId,
      name: "Predictive Maintenance Engine",
      description: "IoT sensor data analysis using time-series forecasting to predict equipment failures in manufacturing plants. Processes sensor readings, vibration data, and temperature logs.",
      technique: "DEEP_LEARNING",
      role: "PROVIDER",
      status: "DEPLOYED",
      purpose: "Predict equipment failures before they occur to reduce downtime and maintenance costs.",
      businessOwner: "Operations",
      technicalOwner: "IoT Platform Team",
      deploymentDate: new Date("2025-01-10"),
      processesPersonalData: false,
    },
  });

  const sentimentAnalysis = await prisma.aISystem.upsert({
    where: { id: "demo-system-sentiment" },
    update: {},
    create: {
      id: "demo-system-sentiment",
      organizationId: orgId,
      name: "Employee Sentiment Analysis",
      description: "NLP-based system analyzing employee survey responses and internal communications to gauge organizational sentiment and detect early signs of workplace issues.",
      technique: "NLP",
      role: "DEPLOYER",
      status: "DRAFT",
      purpose: "Provide HR leadership with aggregate insights into employee morale and engagement trends.",
      businessOwner: "Human Resources",
      technicalOwner: "People Analytics Team",
      processesPersonalData: true,
    },
  });

  const legacyRecommender = await prisma.aISystem.upsert({
    where: { id: "demo-system-recommender" },
    update: {},
    create: {
      id: "demo-system-recommender",
      organizationId: orgId,
      name: "Product Recommender v1 (Legacy)",
      description: "Collaborative filtering recommendation engine that was used for product suggestions on the e-commerce platform. Replaced by the newer v2 system using deep learning.",
      technique: "MACHINE_LEARNING",
      role: "DEPLOYER",
      status: "RETIRED",
      purpose: "Provide personalized product recommendations to customers based on browsing and purchase history.",
      businessOwner: "E-Commerce",
      technicalOwner: "ML Platform Team",
      deploymentDate: new Date("2023-06-01"),
      retirementDate: new Date("2025-11-30"),
      processesPersonalData: true,
    },
  });

  const creditScoring = await prisma.aISystem.upsert({
    where: { id: "demo-system-credit" },
    update: {},
    create: {
      id: "demo-system-credit",
      organizationId: orgId,
      name: "Credit Risk Scoring Model",
      description: "Gradient boosting model that evaluates creditworthiness of loan applicants based on financial history, employment data, and behavioral signals. Outputs a risk score and recommended decision.",
      technique: "MACHINE_LEARNING",
      role: "DEPLOYER",
      status: "TESTING",
      purpose: "Automate initial credit risk assessment to accelerate loan processing while maintaining consistent risk standards.",
      businessOwner: "Lending Operations",
      technicalOwner: "Risk Analytics Team",
      processesPersonalData: true,
    },
  });

  console.log("  Created 4 additional AI systems (total: 8)");

  // ============================================================
  // 2. ADDITIONAL AI MODELS
  // ============================================================

  console.log("2. Creating additional AI models...");

  await prisma.aIModel.upsert({
    where: { id: "demo-model-content-mod" },
    update: {},
    create: {
      id: "demo-model-content-mod",
      aiSystemId: "demo-system-content-mod",
      organizationId: orgId,
      name: "ContentGuard v1.2",
      provider: "Internal",
      modelType: "Multi-modal Classification",
      version: "1.2.0",
      trainingDataSummary: "Fine-tuned on 200K labeled content samples (text + image) from moderation queues 2023-2025.",
      knownLimitations: "May struggle with nuanced sarcasm and culturally-specific references. Image analysis limited to common formats.",
      performanceMetrics: { "accuracy": 0.94, "precision": 0.92, "recall": 0.89 },
    },
  });

  await prisma.aIModel.upsert({
    where: { id: "demo-model-pred-maint" },
    update: {},
    create: {
      id: "demo-model-pred-maint",
      aiSystemId: predictiveMaintenance.id,
      organizationId: orgId,
      name: "FailurePredict LSTM v2",
      provider: "Internal",
      modelType: "Time-series Forecasting",
      version: "2.0.1",
      trainingDataSummary: "Trained on 3 years of sensor data from 500+ manufacturing machines. 12M time-series records.",
      knownLimitations: "Prediction horizon limited to 72 hours. Performance drops for equipment types with fewer than 100 historical failure events.",
      performanceMetrics: { "mae_hours": 4.2, "precision_72h": 0.91, "recall_72h": 0.87 },
    },
  });

  await prisma.aIModel.upsert({
    where: { id: "demo-model-credit" },
    update: {},
    create: {
      id: "demo-model-credit",
      aiSystemId: creditScoring.id,
      organizationId: orgId,
      name: "CreditScore XGBoost v3",
      provider: "Internal",
      modelType: "Classification (Binary)",
      version: "3.1.0",
      trainingDataSummary: "Trained on 500K anonymized loan applications (2020-2025) with known outcomes. Features include payment history, debt-to-income, employment stability.",
      knownLimitations: "May show bias toward younger applicants with thin credit files. Geographic bias observed in certain regions with lower data coverage.",
      performanceMetrics: { "auc_roc": 0.92, "gini": 0.84, "ks_statistic": 0.68 },
    },
  });

  console.log("  Created 3 additional models (total: 6)");

  // ============================================================
  // 3. DATA SOURCES
  // ============================================================

  console.log("3. Creating AI system data sources...");

  const dataSources = [
    {
      id: "demo-ds-chatbot-kb",
      aiSystemId: "demo-system-chatbot",
      organizationId: orgId,
      name: "Customer Knowledge Base",
      sourceType: "INPUT" as const,
      description: "RAG knowledge base containing product documentation, FAQ, and support articles. Updated weekly.",
      containsPersonalData: false,
      dataCategories: ["product_docs", "faq", "support_articles"],
    },
    {
      id: "demo-ds-chatbot-logs",
      aiSystemId: "demo-system-chatbot",
      organizationId: orgId,
      name: "Chat Conversation Logs",
      sourceType: "OUTPUT" as const,
      description: "Stored conversation transcripts for quality assurance and model improvement. Retained for 90 days.",
      containsPersonalData: true,
      dataCategories: ["conversation_text", "user_email", "session_metadata"],
    },
    {
      id: "demo-ds-hr-resumes",
      aiSystemId: "demo-system-hr-screening",
      organizationId: orgId,
      name: "Applicant Resume Dataset",
      sourceType: "INPUT" as const,
      description: "Parsed resume data from applicant tracking system. Includes work history, education, skills, and certifications.",
      containsPersonalData: true,
      dataCategories: ["name", "email", "work_history", "education", "skills"],
    },
    {
      id: "demo-ds-hr-training",
      aiSystemId: "demo-system-hr-screening",
      organizationId: orgId,
      name: "Historical Hiring Decisions",
      sourceType: "TRAINING" as const,
      description: "50K anonymized resume-decision pairs from 2020-2024 used to train the ranking model.",
      containsPersonalData: false,
      dataCategories: ["anonymized_resumes", "hiring_outcomes", "job_descriptions"],
    },
    {
      id: "demo-ds-fraud-txns",
      aiSystemId: "demo-system-fraud",
      organizationId: orgId,
      name: "Transaction Stream",
      sourceType: "INPUT" as const,
      description: "Real-time financial transaction data including amount, merchant, location, device fingerprint, and behavioral signals.",
      containsPersonalData: true,
      dataCategories: ["transaction_amount", "merchant_id", "device_fingerprint", "ip_address"],
    },
    {
      id: "demo-ds-fraud-training",
      aiSystemId: "demo-system-fraud",
      organizationId: orgId,
      name: "Labeled Fraud Dataset",
      sourceType: "TRAINING" as const,
      description: "2M+ labeled transactions (2022-2024) with confirmed fraud/legitimate classification.",
      containsPersonalData: false,
      dataCategories: ["anonymized_transactions", "fraud_labels", "feature_vectors"],
    },
    {
      id: "demo-ds-credit-input",
      aiSystemId: creditScoring.id,
      organizationId: orgId,
      name: "Loan Application Data",
      sourceType: "INPUT" as const,
      description: "Applicant financial profile including income, employment, existing debts, and credit bureau data.",
      containsPersonalData: true,
      dataCategories: ["income", "employment_history", "credit_score", "debt_to_income"],
    },
  ];

  for (const ds of dataSources) {
    await prisma.aISystemDataSource.upsert({
      where: { id: ds.id },
      update: {},
      create: ds,
    });
  }

  console.log(`  Created ${dataSources.length} data sources`);

  // ============================================================
  // 4. RISK CLASSIFICATIONS for new systems
  // ============================================================

  console.log("4. Creating risk classifications for new systems...");

  await prisma.riskClassification.upsert({
    where: { aiSystemId: predictiveMaintenance.id },
    update: {},
    create: {
      aiSystemId: predictiveMaintenance.id,
      organizationId: orgId,
      riskLevel: "MINIMAL",
      rationale: "Predictive maintenance system processes only IoT sensor data (no personal data). Does not make decisions affecting natural persons. Pure operational efficiency tool. Classified as minimal risk under EU AI Act.",
      classifiedBy: userId,
    },
  });

  await prisma.riskClassification.upsert({
    where: { aiSystemId: sentimentAnalysis.id },
    update: {},
    create: {
      aiSystemId: sentimentAnalysis.id,
      organizationId: orgId,
      riskLevel: "HIGH",
      rationale: "Employee sentiment analysis falls under EU AI Act Annex III, Category 4 (Employment). System processes employee communications to derive emotional/sentiment insights, which could influence employment decisions. Art. 5(1)(f) prohibitions on emotion recognition in workplaces apply unless for safety/medical purposes.",
      annexIIICategory: "Employment, workers management and access to self-employment (Annex III, 4)",
      classifiedBy: userId,
    },
  });

  await prisma.riskClassification.upsert({
    where: { aiSystemId: legacyRecommender.id },
    update: {},
    create: {
      aiSystemId: legacyRecommender.id,
      organizationId: orgId,
      riskLevel: "MINIMAL",
      rationale: "Product recommendation engine for e-commerce. Does not make decisions with significant effects on individuals. Classified as minimal risk. Note: system is now retired.",
      classifiedBy: userId,
    },
  });

  await prisma.riskClassification.upsert({
    where: { aiSystemId: creditScoring.id },
    update: {},
    create: {
      aiSystemId: creditScoring.id,
      organizationId: orgId,
      riskLevel: "HIGH",
      rationale: "Credit risk scoring directly affects access to financial services (Annex III, Category 5(b)). Decisions determine loan approval/rejection with significant financial impact on individuals. Requires conformity assessment, bias monitoring, and full human oversight on rejections.",
      annexIIICategory: "Access to and enjoyment of essential private and public services (Annex III, 5)",
      classifiedBy: userId,
    },
  });

  console.log("  Created 4 additional risk classifications (total: 8)");

  // ============================================================
  // 5. RISK CLASSIFICATION HISTORY (reclassification scenarios)
  // ============================================================

  console.log("5. Creating risk classification history...");

  // Get existing risk classification for chatbot
  const chatbotRisk = await prisma.riskClassification.findUnique({
    where: { aiSystemId: "demo-system-chatbot" },
  });

  if (chatbotRisk) {
    await prisma.riskClassificationHistory.upsert({
      where: { id: "demo-risk-history-chatbot-1" },
      update: {},
      create: {
        id: "demo-risk-history-chatbot-1",
        riskClassificationId: chatbotRisk.id,
        previousLevel: "MINIMAL",
        newLevel: "LIMITED",
        rationale: "Reclassified from MINIMAL to LIMITED after review. The chatbot directly interacts with natural persons and must comply with transparency obligations under Art. 50 (users must be informed they are interacting with AI).",
        changedBy: userId,
        changedAt: new Date("2025-07-01"),
      },
    });
  }

  // Get existing risk classification for sentiment analysis
  const sentimentRisk = await prisma.riskClassification.findUnique({
    where: { aiSystemId: sentimentAnalysis.id },
  });

  if (sentimentRisk) {
    await prisma.riskClassificationHistory.upsert({
      where: { id: "demo-risk-history-sentiment-1" },
      update: {},
      create: {
        id: "demo-risk-history-sentiment-1",
        riskClassificationId: sentimentRisk.id,
        previousLevel: "LIMITED",
        newLevel: "HIGH",
        rationale: "Initially classified as LIMITED but reclassified to HIGH after legal review determined that analyzing employee communications for sentiment constitutes emotion recognition in the workplace (Art. 5(1)(f)). The system's outputs could influence employment decisions.",
        changedBy: userId,
        changedAt: new Date("2025-12-15"),
      },
    });
  }

  console.log("  Created 2 risk classification history entries");

  // ============================================================
  // 6. COMPREHENSIVE ASSESSMENTS (all statuses)
  // ============================================================

  console.log("6. Creating assessments in all statuses...");

  const friaTemplate = await prisma.aIAssessmentTemplate.findFirst({
    where: { id: "system-fria-template" },
  });
  const aiRiskTemplate = await prisma.aIAssessmentTemplate.findFirst({
    where: { id: "system-ai-risk-template" },
  });
  const customTemplate = await prisma.aIAssessmentTemplate.findFirst({
    where: { id: "system-custom-template" },
  });

  // FRIA for Credit Scoring — UNDER_REVIEW (fully filled out)
  if (friaTemplate) {
    await prisma.aIAssessment.upsert({
      where: { id: "demo-assessment-fria-credit" },
      update: {},
      create: {
        id: "demo-assessment-fria-credit",
        organizationId: orgId,
        aiSystemId: creditScoring.id,
        templateId: friaTemplate.id,
        title: "FRIA - Credit Risk Scoring Model",
        type: "FRIA",
        status: "UNDER_REVIEW",
        createdBy: userId,
        reviewedBy: userId,
        reviewedAt: new Date("2026-01-20"),
        responses: {
          fria1_1: "Credit Risk Scoring Model (CreditScore XGBoost v3) is an automated credit assessment system that evaluates loan applicants based on financial history, employment data, and behavioral signals. It outputs a numerical risk score (0-1000) and a recommended decision (approve/refer/decline).",
          fria1_2: "The system is integrated into the loan origination workflow. When a customer submits a loan application, the model processes their data and returns a score within 2 seconds. Scores above 700 are auto-approved; scores below 400 are auto-declined; scores 400-700 are referred to human underwriters.",
          fria1_3: "Continuous operation during business hours (8am-8pm). Expected to process 500-1000 applications daily. Planned for indefinite use with quarterly model retraining.",
          fria1_4: "Deployed across all EU member states where the company operates lending services (currently: Germany, France, Netherlands, Spain, Italy). Covers both consumer and small business lending.",
          fria2_1: "Direct: Loan applicants (consumers and small businesses). Indirect: Family members and dependents of applicants whose financial situation may be affected. Third-party: Credit bureau data subjects.",
          fria2_2: "Yes — the system may disproportionately affect: (1) Young adults with thin credit files, (2) Immigrants and expats with limited local credit history, (3) Self-employed individuals with irregular income patterns, (4) Persons recovering from financial hardship or illness.",
          fria2_3: "Estimated 150,000-200,000 applications per year across all markets. Each application affects at minimum the applicant and their immediate household (estimated 400,000+ individuals indirectly affected).",
          fria2_4: "Consumer advisory panel consulted during design phase. Pilot testing with 500 applicants who provided feedback on the experience. Data protection officer reviewed the processing activities.",
          fria3_1: "Risk of demographic bias in lending decisions. Analysis shows potential disparate impact on: age groups under 25 (3% higher decline rate vs. baseline), non-EU nationals (2.5% gap), and self-employed applicants. Mitigation: quarterly fairness audits and bias correction layer.",
          fria3_2: "System processes extensive personal financial data including income, debts, payment history, and behavioral signals. Risk of unauthorized inference of sensitive attributes (health status from medical payment patterns, family status from spending). All data access logged and encrypted.",
          fria3_3: "Limited direct impact on freedom of expression. However, the system's behavioral signal analysis could theoretically create a chilling effect if individuals believe their communications affect credit decisions.",
          fria3_4: "Auto-declined applicants may experience harm to dignity through perceived algorithmic discrimination. Mitigation: all declined applicants receive a human-readable explanation of key factors and right to request human review.",
          fria3_5: "Declined applicants have the right to: (1) receive an explanation of the decision factors, (2) request human review within 30 days, (3) dispute data accuracy, (4) file a complaint with the supervisory authority. Average human review turnaround: 5 business days.",
          fria3_6: "Right to work (Art. 15): Small business loan decisions may indirectly affect employment for business owners and their employees. Consumer protection (Art. 38): Risk of predatory scoring that could lead to unsuitable lending.",
          fria4_1: "Human oversight operates at three levels: (1) Human-on-the-loop: All decisions in the 400-700 score range require underwriter approval. (2) Human-in-command: Compliance officer can override any auto-decision. (3) Periodic review: Monthly sampling of 5% of auto-approved and auto-declined cases.",
          fria4_2: "Fairness constraints in the model (equalized odds objective), real-time bias monitoring dashboard, explainability via SHAP values for every decision, accuracy monitoring with automated alerts for drift detection.",
          fria4_3: "Quarterly fairness audits by independent team, mandatory bias training for all underwriters, monthly compliance review meetings, annual external audit by a qualified conformity assessment body.",
          fria4_4: "All declined applicants receive: (1) Written explanation within 48 hours, (2) Clear instructions for requesting human review, (3) Data portability and rectification rights, (4) Contact details for complaints officer and supervisory authority.",
          fria5_1: "Overall impact is assessed as MODERATE. The system significantly affects access to financial services but has robust safeguards in place. Key strengths: human oversight for borderline cases, explainability, and appeal mechanisms. Key weakness: potential for indirect discrimination against thin-file applicants that requires ongoing monitoring.",
          fria5_2: "Residual risks: (1) Potential for age-related bias despite correction measures (~1% gap), (2) Imperfect explainability for complex interaction effects, (3) Delayed detection of emerging bias patterns between quarterly audits.",
          fria5_3: "Recommended: (1) Increase auto-review sampling to 10%, (2) Implement real-time fairness alerts (not just quarterly), (3) Develop a simplified scoring model for thin-file applicants, (4) Conduct external bias audit before production deployment.",
          fria5_4: "Notification to the National Data Protection Authority and AI Market Surveillance Authority planned for Q2 2026 prior to full production deployment. Draft notification prepared and under legal review.",
        },
      },
    });
    console.log("  Created FRIA for Credit Scoring (UNDER_REVIEW)");

    // FRIA for Sentiment — DRAFT (barely started)
    await prisma.aIAssessment.upsert({
      where: { id: "demo-assessment-fria-sentiment" },
      update: {},
      create: {
        id: "demo-assessment-fria-sentiment",
        organizationId: orgId,
        aiSystemId: sentimentAnalysis.id,
        templateId: friaTemplate.id,
        title: "FRIA - Employee Sentiment Analysis",
        type: "FRIA",
        status: "DRAFT",
        createdBy: userId,
        responses: {
          fria1_1: "Employee Sentiment Analysis system using NLP to analyze survey responses and internal communications.",
        },
      },
    });
    console.log("  Created FRIA for Sentiment (DRAFT)");
  }

  // AI Risk Assessment for Chatbot — APPROVED (complete)
  if (aiRiskTemplate) {
    await prisma.aIAssessment.upsert({
      where: { id: "demo-assessment-risk-chatbot" },
      update: {},
      create: {
        id: "demo-assessment-risk-chatbot",
        organizationId: orgId,
        aiSystemId: "demo-system-chatbot",
        templateId: aiRiskTemplate.id,
        title: "AI Risk Assessment - Customer Support Chatbot",
        type: "AI_RISK",
        status: "APPROVED",
        riskScore: 42,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date("2025-08-15"),
        responses: {
          air1_1: "Customer Support Chatbot powered by GPT-4o with RAG over the company knowledge base. Handles first-line customer inquiries via web and mobile channels.",
          air1_2: "Limited",
          air1_3: "Intended users: Customers seeking support. Affected stakeholders: Customer service team (workflow changes), support managers (quality oversight).",
          air2_1: "Primary risk: hallucination of incorrect product information or support procedures. False confidence in generated responses could lead to customer misinformation. Mitigation: RAG grounding + confidence scoring + fallback to human agent.",
          air2_2: "Knowledge base drift as products evolve. Model outputs may reference outdated procedures if KB not updated. Mitigation: weekly KB refresh cycle + staleness detection.",
          air2_3: "Prompt injection risk: customers could attempt to extract system prompts or make the bot behave inappropriately. Mitigation: input sanitization + output filtering + system prompt hardening.",
          air3_1: "Low bias risk as the system provides informational responses, not decisions. Minor risk of language bias (better performance in English vs. other supported languages).",
          air3_2: "Partially explainable",
          air3_3: "Low risk to autonomy. Customers can always request a human agent. No binding decisions made by the chatbot.",
          air4_1: "If the chatbot is unavailable, traffic is routed to the existing human support queue. Average wait time increases from 30s to 8min. Business continuity plan documented.",
          air4_2: "Knowledge base quality depends on manual curation. Stale or incorrect KB entries propagate to chatbot responses. Weekly QA review process in place.",
          air4_3: "Dependency on OpenAI API. Risk of price increases, rate limiting, or service disruption. Fallback: pre-cached responses for top 100 queries + human escalation.",
          air5_1: "Confidence scoring, automated response quality monitoring, weekly accuracy sampling (100 random conversations reviewed), prompt injection detection.",
          air5_2: "Customer Service team trained on AI limitations, clear escalation paths documented, weekly quality review meetings, monthly accuracy reports to management.",
          air5_3: "Human-on-the-loop: All low-confidence responses are flagged for human review. Customers informed they are interacting with AI (Art. 50 compliance). One-click handoff to human agent.",
          air6_1: "Low",
          air6_2: "Yes, residual risk is acceptable. The chatbot provides informational support only, with robust human escalation and no binding decisions. Risk-benefit analysis strongly favorable given 70% reduction in response time.",
          air6_3: "Quarterly review of hallucination rates. Annual external security audit. Expand monitoring to cover all supported languages equally.",
        },
      },
    });
    console.log("  Created AI Risk for Chatbot (APPROVED)");

    // AI Risk for Credit Scoring — IN_PROGRESS
    await prisma.aIAssessment.upsert({
      where: { id: "demo-assessment-risk-credit" },
      update: {},
      create: {
        id: "demo-assessment-risk-credit",
        organizationId: orgId,
        aiSystemId: creditScoring.id,
        templateId: aiRiskTemplate.id,
        title: "AI Risk Assessment - Credit Risk Scoring",
        type: "AI_RISK",
        status: "IN_PROGRESS",
        riskScore: 78,
        createdBy: userId,
        responses: {
          air1_1: "Credit Risk Scoring Model using XGBoost to evaluate loan applicants. Outputs a risk score (0-1000) and recommended lending decision.",
          air1_2: "High",
          air1_3: "Intended users: Loan officers and automated origination system. Affected: Loan applicants, their families, small business employees.",
          air2_1: "False negatives (approving risky loans) could lead to financial losses. False positives (declining good applicants) cause customer harm and lost business. Current test precision: 95%, recall: 88%.",
          air2_2: "Credit risk profiles shift with economic conditions. The 2024-trained model may not reflect current default patterns. Quarterly retraining planned.",
          air2_3: "Model inversion attacks could reveal training data characteristics. Adversarial inputs crafted to game the scoring algorithm. API rate limiting and input validation as primary defenses.",
          air3_1: "Identified bias: age (under 25s 3% higher decline rate), nationality (non-EU 2.5% gap), self-employment (irregular income patterns). Active debiasing applied but residual gaps remain.",
          air3_2: "Partially explainable",
        },
      },
    });
    console.log("  Created AI Risk for Credit Scoring (IN_PROGRESS)");
  }

  // Custom assessment — REJECTED
  if (customTemplate) {
    await prisma.aIAssessment.upsert({
      where: { id: "demo-assessment-custom-recommender" },
      update: {},
      create: {
        id: "demo-assessment-custom-recommender",
        organizationId: orgId,
        aiSystemId: legacyRecommender.id,
        templateId: customTemplate.id,
        title: "Retirement Review - Product Recommender v1",
        type: "CUSTOM",
        status: "REJECTED",
        createdBy: userId,
        reviewedBy: userId,
        reviewedAt: new Date("2025-10-20"),
        responses: {
          custom1_1: "Retirement assessment for the legacy Product Recommender v1 system. Evaluating whether the system can be safely decommissioned and data retention requirements.",
          custom1_2: "Product Recommender v1 collaborative filtering engine, all associated training data, model artifacts, and logging infrastructure.",
          custom2_1: "Risk 1: Loss of historical recommendation data needed for audit trail. Risk 2: Customer data in training sets requires proper deletion per GDPR. Risk 3: Downstream systems still reference v1 API endpoints.",
          custom2_2: "Medium",
          custom3_1: "Proposed: Archive model artifacts for 5 years, delete PII from training data, redirect v1 API to v2. However, data retention policy has not been finalized and downstream dependency mapping is incomplete.",
          custom3_2: "Needs further review",
        },
        mitigations: {
          reason: "Assessment rejected: downstream dependency audit not yet completed. Three internal services still reference v1 API. Must complete migration before retirement can proceed. Reassess after Q1 2026 migration sprint.",
        },
      },
    });
    console.log("  Created Custom assessment for Recommender (REJECTED)");

    // Custom assessment for predictive maintenance — APPROVED
    await prisma.aIAssessment.upsert({
      where: { id: "demo-assessment-custom-pred-maint" },
      update: {},
      create: {
        id: "demo-assessment-custom-pred-maint",
        organizationId: orgId,
        aiSystemId: predictiveMaintenance.id,
        templateId: customTemplate.id,
        title: "Operational Readiness - Predictive Maintenance",
        type: "CUSTOM",
        status: "APPROVED",
        riskScore: 25,
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date("2025-02-01"),
        responses: {
          custom1_1: "Operational readiness assessment for the Predictive Maintenance Engine prior to expanding deployment from 2 pilot factories to all 12 manufacturing sites.",
          custom1_2: "FailurePredict LSTM v2 model, IoT data pipeline, alert notification system, and maintenance scheduling integration.",
          custom2_1: "Risk 1: False alerts could lead to unnecessary maintenance shutdowns (est. $50K per incident). Risk 2: Missed predictions could result in equipment failures (est. $200K-500K per incident). Risk 3: Sensor data quality varies across factory sites.",
          custom2_2: "Low",
          custom3_1: "Mitigation: 2-week parallel run at each site before cutover. Sensor calibration protocol standardized. Human confirmation required for all predicted failures before scheduling maintenance. Monthly model performance review.",
          custom3_2: "Yes, fully acceptable",
        },
      },
    });
    console.log("  Created Custom assessment for Pred. Maintenance (APPROVED)");
  }

  // ============================================================
  // 7. COMPLIANCE MAPPINGS
  // ============================================================

  console.log("7. Creating compliance mappings...");

  // Get EU AI Act framework and its requirements
  const euFramework = await prisma.complianceFramework.findUnique({
    where: { code: "EU_AI_ACT" },
  });

  const euRequirements = euFramework
    ? await prisma.complianceRequirement.findMany({
        where: { frameworkId: euFramework.id },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  const euArtIds: Record<string, string> = {};
  for (const req of euRequirements) {
    euArtIds[req.code] = req.id;
  }

  if (!euFramework) {
    console.log("  WARNING: EU AI Act framework not found — run db:seed-frameworks first");
  }

  // Create compliance mappings for the fraud detection system (HIGH risk, DEPLOYED)
  // Each mapping has structured evidence items instead of a single text field
  const fraudComplianceMappings: Array<{
    reqCode: string;
    status: "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE" | "NOT_ASSESSED";
    notes?: string;
    assessedBy: string;
    evidenceItems: Array<{ type: "POLICY" | "DOCUMENT" | "TEST_RESULT" | "MONITORING" | "AUDIT" | "TRAINING" | "APPROVAL" | "OTHER"; title: string; description?: string; url?: string }>;
  }> = [
    {
      reqCode: "Art. 9", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "POLICY", title: "Risk Management Policy RMS-FRAUD-001", description: "Covers known risks (false positives, adversarial manipulation), foreseeable misuse, and residual risks." },
        { type: "DOCUMENT", title: "Risk Register — 23 known risks, 8 foreseeable", description: "Comprehensive risk register last updated December 2025." },
        { type: "TEST_RESULT", title: "Annual Risk Review Cycle Results 2025", description: "Annual risk review covering all identified risks and mitigations." },
      ],
    },
    {
      reqCode: "Art. 9(2)", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "DOCUMENT", title: "Risk Register v3.2", description: "Identifies 23 known risks and 8 foreseeable risks. Last updated December 2025." },
      ],
    },
    {
      reqCode: "Art. 9(3)", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "DOCUMENT", title: "Misuse Evaluation Report", description: "5 misuse scenarios documented with mitigations." },
      ],
    },
    {
      reqCode: "Art. 9(4)", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "DOCUMENT", title: "Risk Mitigation Register — 12 measures", description: "Input validation, rate limiting, and anomaly detection on the detection model itself." },
        { type: "TEST_RESULT", title: "Mitigation Effectiveness Report Q4 2025", description: "All 12 measures tested and verified effective." },
      ],
    },
    {
      reqCode: "Art. 10", status: "PARTIALLY_COMPLIANT", assessedBy: userId,
      notes: "Gap: data quality metrics not yet automated for real-time monitoring.",
      evidenceItems: [
        { type: "POLICY", title: "Data Governance Policy DGP-003", description: "Training data cataloged and versioned." },
        { type: "DOCUMENT", title: "Training Data Catalog v2", description: "Full catalog of training data sources with versioning." },
      ],
    },
    {
      reqCode: "Art. 10(2)", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "DOCUMENT", title: "Data Design Document — Collection & Preparation", description: "Covers collection (payment processor APIs), preparation (anonymization, feature engineering), and assumptions (fraud rate ~0.3% baseline)." },
      ],
    },
    {
      reqCode: "Art. 10(3)", status: "PARTIALLY_COMPLIANT", assessedBy: userId,
      notes: "International transaction coverage lower (12% of training vs. 18% of production traffic). Remediation planned for Q2 2026 retraining.",
      evidenceItems: [
        { type: "TEST_RESULT", title: "Dataset Representativeness Analysis", description: "Dataset is representative of EU transaction patterns with noted gaps in international coverage." },
      ],
    },
    {
      reqCode: "Art. 11", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "DOCUMENT", title: "Technical Documentation Package TD-FRAUD-v3", description: "Includes model cards, architecture diagrams, training methodology, performance benchmarks." },
        { type: "DOCUMENT", title: "Model Card — Fraud Detection XGBoost v2", description: "Standardized model card with intended use, performance metrics, and limitations." },
      ],
    },
    {
      reqCode: "Art. 12", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "MONITORING", title: "Prediction Logging Configuration", description: "All predictions logged with full feature vectors, model version, timestamp, confidence score, and outcome feedback." },
        { type: "POLICY", title: "Log Retention Policy — 7 Year Financial", description: "Logs retained 7 years per financial regulation requirements." },
      ],
    },
    {
      reqCode: "Art. 13", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "DOCUMENT", title: "Instructions for Use — Fraud Detection System", description: "Includes capability description, known limitations, performance metrics, and recommended human oversight procedures." },
        { type: "TRAINING", title: "Deployment Team Training Completion Records", description: "All deployment team members completed training on system usage and limitations." },
      ],
    },
    {
      reqCode: "Art. 14", status: "PARTIALLY_COMPLIANT", assessedBy: userId,
      notes: "Gap: automated override capability not yet implemented for analysts (manual escalation required to halt model in emergency).",
      evidenceItems: [
        { type: "DOCUMENT", title: "Human Oversight Procedure HOP-FRAUD-001", description: "All flagged transactions reviewed by fraud analysts." },
        { type: "APPROVAL", title: "Fraud Analyst Review Workflow Sign-off", description: "Documented approval workflow for flagged transactions." },
      ],
    },
    {
      reqCode: "Art. 14(4)", status: "NON_COMPLIANT", assessedBy: userId,
      notes: "Currently no one-click mechanism for fraud analysts to override model decisions in real-time. Fix scheduled for Sprint 23 (March 2026).",
      evidenceItems: [],
    },
    {
      reqCode: "Art. 15", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "TEST_RESULT", title: "Model Accuracy Report — 98% AUC-ROC", description: "Accuracy declared in documentation and verified in production." },
        { type: "TEST_RESULT", title: "Adversarial Robustness Test (FGSM, PGD)", description: "Robustness tested against adversarial inputs with no degradation beyond acceptable thresholds." },
        { type: "AUDIT", title: "Penetration Test Report Q4 2025", description: "Cybersecurity penetration test completed, no critical findings." },
      ],
    },
    {
      reqCode: "Art. 50(1)", status: "NOT_APPLICABLE", assessedBy: userId,
      notes: "System does not directly interact with natural persons. It processes transactions in the background.",
      evidenceItems: [],
    },
    {
      reqCode: "Art. 73", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "POLICY", title: "Incident Reporting Procedure — Art. 73 Aligned", description: "Aligned with Art. 73 timelines (15 days)." },
        { type: "TEST_RESULT", title: "Incident Reporting Drill Results 2025", description: "Two test drills completed successfully in 2025." },
      ],
    },
  ];

  let complianceCount = 0;
  for (const mapping of fraudComplianceMappings) {
    const reqId = euArtIds[mapping.reqCode];
    if (!reqId) continue;

    const upserted = await prisma.complianceMapping.upsert({
      where: {
        aiSystemId_requirementId: {
          aiSystemId: "demo-system-fraud",
          requirementId: reqId,
        },
      },
      update: {
        status: mapping.status,
        notes: mapping.notes,
        assessedBy: mapping.assessedBy,
        assessedAt: new Date("2025-12-01"),
      },
      create: {
        organizationId: orgId,
        aiSystemId: "demo-system-fraud",
        requirementId: reqId,
        status: mapping.status,
        notes: mapping.notes,
        assessedBy: mapping.assessedBy,
        assessedAt: new Date("2025-12-01"),
      },
    });

    // Delete existing evidence items for this mapping, then recreate
    await prisma.complianceEvidence.deleteMany({
      where: { complianceMappingId: upserted.id },
    });

    for (const item of mapping.evidenceItems) {
      await prisma.complianceEvidence.create({
        data: {
          complianceMappingId: upserted.id,
          organizationId: orgId,
          type: item.type,
          title: item.title,
          url: item.url,
          description: item.description,
          addedBy: userId,
          addedAt: new Date("2025-12-01"),
        },
      });
    }

    complianceCount++;
  }

  // Compliance mappings for HR Screening system (HIGH risk)
  const hrComplianceMappings: Array<{
    reqCode: string;
    status: "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE" | "NOT_ASSESSED";
    notes?: string;
    assessedBy: string | null;
    evidenceItems: Array<{ type: "POLICY" | "DOCUMENT" | "TEST_RESULT" | "MONITORING" | "AUDIT" | "TRAINING" | "APPROVAL" | "OTHER"; title: string; description?: string; url?: string }>;
  }> = [
    {
      reqCode: "Art. 9", status: "PARTIALLY_COMPLIANT", assessedBy: userId,
      notes: "Pending annual review update.",
      evidenceItems: [
        { type: "DOCUMENT", title: "Initial Risk Assessment — 15 known risks", description: "Risk management system in place covering 15 known risks." },
      ],
    },
    {
      reqCode: "Art. 10", status: "NON_COMPLIANT", assessedBy: userId,
      notes: "Training data governance needs improvement. Historical hiring data not yet fully documented for bias sources. Remediation plan in progress.",
      evidenceItems: [],
    },
    {
      reqCode: "Art. 11", status: "PARTIALLY_COMPLIANT", assessedBy: userId,
      notes: "Technical documentation exists but requires updates to reflect v2.1 model changes. Target completion: Q1 2026.",
      evidenceItems: [
        { type: "DOCUMENT", title: "Technical Documentation v2.0 (outdated)", description: "Exists but requires updates to reflect v2.1 model changes." },
      ],
    },
    {
      reqCode: "Art. 12", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "MONITORING", title: "Decision Logging System", description: "Every screening decision recorded with features, score, and model version." },
        { type: "POLICY", title: "Log Retention Policy — 5 Year", description: "5-year retention policy for all screening decisions." },
      ],
    },
    {
      reqCode: "Art. 13", status: "PARTIALLY_COMPLIANT", assessedBy: userId,
      notes: "Instructions provided but need simplification for non-technical recruiters. User guide revision in progress.",
      evidenceItems: [
        { type: "DOCUMENT", title: "HR Screening User Guide v1", description: "Instructions provided to HR team." },
      ],
    },
    {
      reqCode: "Art. 14", status: "COMPLIANT", assessedBy: userId,
      evidenceItems: [
        { type: "POLICY", title: "Human Review Policy — No Automatic Rejections", description: "All AI-screened candidates reviewed by human recruiter before any employment decision." },
        { type: "TRAINING", title: "Recruiter AI Limitations Training Records", description: "Recruiters trained on AI limitations and override procedures." },
      ],
    },
    {
      reqCode: "Art. 15", status: "NOT_ASSESSED", assessedBy: null,
      evidenceItems: [],
    },
    {
      reqCode: "Art. 26", status: "PARTIALLY_COMPLIANT", assessedBy: userId,
      notes: "Gap: FRIA for public deployment not yet completed.",
      evidenceItems: [
        { type: "DOCUMENT", title: "Provider Instructions Compliance Checklist", description: "Using system per provider instructions. Human oversight assigned." },
      ],
    },
    {
      reqCode: "Art. 27", status: "PARTIALLY_COMPLIANT", assessedBy: userId,
      notes: "Expected completion: Q1 2026.",
      evidenceItems: [
        { type: "DOCUMENT", title: "FRIA Draft — Fundamental Rights Impact", description: "FRIA started but not yet completed. Draft assessment addresses fundamental rights impact." },
      ],
    },
  ];

  for (const mapping of hrComplianceMappings) {
    const reqId = euArtIds[mapping.reqCode];
    if (!reqId) continue;

    const upserted = await prisma.complianceMapping.upsert({
      where: {
        aiSystemId_requirementId: {
          aiSystemId: "demo-system-hr-screening",
          requirementId: reqId,
        },
      },
      update: {
        status: mapping.status,
        notes: mapping.notes,
        assessedBy: mapping.assessedBy,
        assessedAt: mapping.assessedBy ? new Date("2026-01-15") : null,
      },
      create: {
        organizationId: orgId,
        aiSystemId: "demo-system-hr-screening",
        requirementId: reqId,
        status: mapping.status,
        notes: mapping.notes,
        assessedBy: mapping.assessedBy,
        assessedAt: mapping.assessedBy ? new Date("2026-01-15") : null,
      },
    });

    // Delete existing evidence items for this mapping, then recreate
    await prisma.complianceEvidence.deleteMany({
      where: { complianceMappingId: upserted.id },
    });

    for (const item of mapping.evidenceItems) {
      await prisma.complianceEvidence.create({
        data: {
          complianceMappingId: upserted.id,
          organizationId: orgId,
          type: item.type,
          title: item.title,
          url: item.url,
          description: item.description,
          addedBy: userId,
          addedAt: new Date("2026-01-15"),
        },
      });
    }

    complianceCount++;
  }

  console.log(`  Created ${complianceCount} compliance mappings across 2 systems`);

  // ============================================================
  // 8. ADDITIONAL AUDIT LOG ENTRIES
  // ============================================================

  console.log("8. Creating additional audit log entries...");

  const newAuditEntries = [
    {
      id: "demo-audit-10",
      organizationId: orgId,
      userId: userId,
      entityType: "RiskClassification",
      entityId: "demo-system-chatbot",
      action: "UPDATE",
      changes: { riskLevel: { from: "MINIMAL", to: "LIMITED" } },
      createdAt: new Date("2025-07-01"),
    },
    {
      id: "demo-audit-11",
      organizationId: orgId,
      userId: userId,
      entityType: "AIAssessment",
      entityId: "demo-assessment-risk-chatbot",
      action: "APPROVE",
      changes: { status: { from: "UNDER_REVIEW", to: "APPROVED" }, riskScore: 42 },
      createdAt: new Date("2025-08-15"),
    },
    {
      id: "demo-audit-12",
      organizationId: orgId,
      userId: userId,
      entityType: "AISystem",
      entityId: predictiveMaintenance.id,
      action: "CREATE",
      changes: { name: "Predictive Maintenance Engine", status: "DEPLOYED" },
      createdAt: new Date("2025-01-10"),
    },
    {
      id: "demo-audit-13",
      organizationId: orgId,
      userId: userId,
      entityType: "AISystem",
      entityId: legacyRecommender.id,
      action: "UPDATE",
      changes: { status: { from: "DEPLOYED", to: "RETIRED" } },
      createdAt: new Date("2025-11-30"),
    },
    {
      id: "demo-audit-14",
      organizationId: orgId,
      userId: userId,
      entityType: "RiskClassification",
      entityId: sentimentAnalysis.id,
      action: "UPDATE",
      changes: { riskLevel: { from: "LIMITED", to: "HIGH" } },
      createdAt: new Date("2025-12-15"),
    },
    {
      id: "demo-audit-15",
      organizationId: orgId,
      userId: userId,
      entityType: "AIAssessment",
      entityId: "demo-assessment-custom-recommender",
      action: "REJECT",
      changes: { status: { from: "UNDER_REVIEW", to: "REJECTED" }, reason: "Downstream dependencies not resolved" },
      createdAt: new Date("2025-10-20"),
    },
    {
      id: "demo-audit-16",
      organizationId: orgId,
      userId: userId,
      entityType: "ComplianceMapping",
      entityId: "demo-system-fraud",
      action: "BULK_UPDATE",
      changes: { framework: "EU AI Act", mappingsUpdated: 15 },
      createdAt: new Date("2025-12-01"),
    },
    {
      id: "demo-audit-17",
      organizationId: orgId,
      userId: userId,
      entityType: "AISystem",
      entityId: creditScoring.id,
      action: "CREATE",
      changes: { name: "Credit Risk Scoring Model", status: "TESTING" },
      createdAt: new Date("2025-11-01"),
    },
    {
      id: "demo-audit-18",
      organizationId: orgId,
      userId: userId,
      entityType: "AIAssessment",
      entityId: "demo-assessment-fria-credit",
      action: "SUBMIT_FOR_REVIEW",
      changes: { status: { from: "IN_PROGRESS", to: "UNDER_REVIEW" } },
      createdAt: new Date("2026-01-20"),
    },
    {
      id: "demo-audit-19",
      organizationId: orgId,
      userId: userId,
      entityType: "AISystem",
      entityId: sentimentAnalysis.id,
      action: "CREATE",
      changes: { name: "Employee Sentiment Analysis", status: "DRAFT" },
      createdAt: new Date("2025-09-15"),
    },
  ];

  for (const entry of newAuditEntries) {
    await prisma.auditLog.upsert({
      where: { id: entry.id },
      update: {},
      create: entry,
    });
  }

  console.log(`  Created ${newAuditEntries.length} additional audit log entries`);

  // ============================================================
  // 9. HUMAN OVERSIGHT GATES & DECISIONS
  // ============================================================

  console.log("9. Creating oversight gates and decisions...");

  // Pre-deployment gate for Credit Scoring — PENDING
  const creditGate = await prisma.oversightGate.upsert({
    where: { id: "demo-gate-credit-pre" },
    update: {},
    create: {
      id: "demo-gate-credit-pre",
      organizationId: orgId,
      aiSystemId: creditScoring.id,
      gateType: "PRE_DEPLOYMENT",
      description: "Pre-deployment approval gate for Credit Risk Scoring Model. Requires sign-off from Risk Committee before production deployment.",
      status: "PENDING",
      assignedTo: "Risk Committee",
    },
  });

  // Post-deployment gate for Fraud Detection — PASSED
  const fraudGate = await prisma.oversightGate.upsert({
    where: { id: "demo-gate-fraud-post" },
    update: {},
    create: {
      id: "demo-gate-fraud-post",
      organizationId: orgId,
      aiSystemId: "demo-system-fraud",
      gateType: "POST_DEPLOYMENT",
      description: "Post-deployment validation of fraud detection system performance and fairness metrics.",
      status: "PASSED",
      assignedTo: "ML Operations",
    },
  });

  // Periodic review for HR Screening — overdue
  await prisma.oversightGate.upsert({
    where: { id: "demo-gate-hr-periodic" },
    update: {},
    create: {
      id: "demo-gate-hr-periodic",
      organizationId: orgId,
      aiSystemId: "demo-system-hr-screening",
      gateType: "PERIODIC_REVIEW",
      description: "Quarterly bias audit and performance review of the HR resume screening system.",
      status: "PENDING",
      reviewCadence: "Quarterly",
      nextReviewDate: new Date("2026-01-15"), // overdue
      assignedTo: "AI Ethics Board",
    },
  });

  // Periodic review for Chatbot — PASSED (up to date)
  await prisma.oversightGate.upsert({
    where: { id: "demo-gate-chatbot-periodic" },
    update: {},
    create: {
      id: "demo-gate-chatbot-periodic",
      organizationId: orgId,
      aiSystemId: "demo-system-chatbot",
      gateType: "PERIODIC_REVIEW",
      description: "Monthly quality review of chatbot responses and hallucination rate monitoring.",
      status: "PASSED",
      reviewCadence: "Monthly",
      nextReviewDate: new Date("2026-03-15"),
      assignedTo: "Customer Support Lead",
    },
  });

  // Incident-triggered gate for Content Moderation — IN_REVIEW
  await prisma.oversightGate.upsert({
    where: { id: "demo-gate-content-incident" },
    update: {},
    create: {
      id: "demo-gate-content-incident",
      organizationId: orgId,
      aiSystemId: "demo-system-content-mod",
      gateType: "INCIDENT_TRIGGERED",
      description: "Triggered after bias incident in content moderation. Reviewing model behavior and retraining requirements.",
      status: "IN_REVIEW",
      assignedTo: "Trust & Safety",
    },
  });

  // Material change gate for Sentiment Analysis — FAILED
  await prisma.oversightGate.upsert({
    where: { id: "demo-gate-sentiment-material" },
    update: {},
    create: {
      id: "demo-gate-sentiment-material",
      organizationId: orgId,
      aiSystemId: sentimentAnalysis.id,
      gateType: "MATERIAL_CHANGE",
      description: "Review gate for proposed expansion of sentiment analysis to include Slack messages. Blocked pending legal review.",
      status: "FAILED",
      assignedTo: "Legal Team",
    },
  });

  // Decisions
  const decisions = [
    {
      id: "demo-decision-fraud-1",
      gateId: fraudGate.id,
      organizationId: orgId,
      decision: "APPROVE" as const,
      rationale: "All post-deployment metrics within acceptable thresholds. False positive rate at 0.3% (target: <0.5%). AUC-ROC stable at 0.98. No significant demographic disparities detected in 30-day monitoring window.",
      evidenceReviewed: ["Performance Dashboard Q4 2025", "Fairness Audit Report", "Customer Complaint Analysis"],
      decidedBy: userId,
      decidedAt: new Date("2025-11-15"),
    },
    {
      id: "demo-decision-fraud-2",
      gateId: fraudGate.id,
      organizationId: orgId,
      decision: "DEFER" as const,
      rationale: "Initial review identified elevated false positive rate (0.7%) for transactions originating from new merchant categories. Requested additional analysis before approval.",
      evidenceReviewed: ["Performance Dashboard Oct 2025"],
      decidedBy: userId,
      decidedAt: new Date("2025-10-20"),
    },
    {
      id: "demo-decision-chatbot-1",
      gateId: "demo-gate-chatbot-periodic",
      organizationId: orgId,
      decision: "APPROVE" as const,
      rationale: "Monthly review passed. Hallucination rate at 2.1% (target: <3%). Customer satisfaction score stable at 4.2/5. No critical escalations in the review period.",
      evidenceReviewed: ["Quality Dashboard Feb 2026", "CSAT Report", "Escalation Log"],
      decidedBy: userId,
      decidedAt: new Date("2026-02-15"),
    },
    {
      id: "demo-decision-chatbot-2",
      gateId: "demo-gate-chatbot-periodic",
      organizationId: orgId,
      decision: "APPROVE" as const,
      rationale: "January review passed. All metrics within normal ranges.",
      evidenceReviewed: ["Quality Dashboard Jan 2026"],
      decidedBy: userId,
      decidedAt: new Date("2026-01-15"),
    },
    {
      id: "demo-decision-sentiment-1",
      gateId: "demo-gate-sentiment-material",
      organizationId: orgId,
      decision: "REJECT" as const,
      rationale: "Expanding to Slack messages would constitute emotion recognition in the workplace under Art. 5(1)(f). Legal team advises this expansion cannot proceed without explicit exemption for safety/medical purposes, which does not apply here.",
      evidenceReviewed: ["Legal Analysis Memo", "EU AI Act Art. 5 Assessment", "Works Council Opinion"],
      decidedBy: userId,
      decidedAt: new Date("2026-02-01"),
    },
    {
      id: "demo-decision-credit-defer",
      gateId: creditGate.id,
      organizationId: orgId,
      decision: "DEFER" as const,
      rationale: "FRIA still under review. Cannot approve pre-deployment gate until FRIA is completed and approved. Estimated completion: Q1 2026.",
      evidenceReviewed: ["FRIA Draft Status", "Risk Committee Minutes"],
      decidedBy: userId,
      decidedAt: new Date("2026-01-25"),
    },
    {
      id: "demo-decision-content-defer",
      gateId: "demo-gate-content-incident",
      organizationId: orgId,
      decision: "DEFER" as const,
      rationale: "Bias analysis still in progress. Preliminary results show potential over-flagging of content from certain cultural contexts. Awaiting retraining results.",
      evidenceReviewed: ["Bias Analysis Preliminary Report"],
      decidedBy: userId,
      decidedAt: new Date("2026-02-10"),
    },
    {
      id: "demo-decision-hr-approve-prev",
      gateId: "demo-gate-hr-periodic",
      organizationId: orgId,
      decision: "APPROVE" as const,
      rationale: "Q3 2025 review passed. Gender bias gap narrowed from 4% to 2.5% after model retraining. Monitoring continues.",
      evidenceReviewed: ["Bias Audit Q3 2025", "Model Performance Report", "HR Feedback Summary"],
      decidedBy: userId,
      decidedAt: new Date("2025-10-01"),
    },
  ];

  for (const d of decisions) {
    await prisma.oversightDecision.upsert({
      where: { id: d.id },
      update: {},
      create: d,
    });
  }

  console.log("  Created 6 oversight gates and 8 decisions");

  // ============================================================
  // 10. AI INCIDENTS
  // ============================================================

  console.log("10. Creating AI incidents...");

  // 1. CRITICAL hallucination — MITIGATING
  const hallucinationIncident = await prisma.aIIncident.upsert({
    where: { id: "demo-incident-hallucination" },
    update: {},
    create: {
      id: "demo-incident-hallucination",
      organizationId: orgId,
      aiSystemId: "demo-system-chatbot",
      title: "Customer chatbot provided fabricated refund policy",
      description: "The customer support chatbot generated a detailed but entirely fabricated refund policy, citing non-existent 'Premium Refund Guarantee' terms. Multiple customers received incorrect information about 30-day unconditional refunds when actual policy is 14-day conditional. Estimated 47 customers affected over 3 hours before detection.",
      type: "HALLUCINATION",
      severity: "CRITICAL",
      status: "MITIGATING",
      notificationRequired: true,
      reportedBy: userId,
      reportedAt: new Date("2026-02-18T14:30:00"),
    },
  });

  // 2. HIGH bias — RESOLVED
  await prisma.aIIncident.upsert({
    where: { id: "demo-incident-bias" },
    update: {},
    create: {
      id: "demo-incident-bias",
      organizationId: orgId,
      aiSystemId: "demo-system-hr-screening",
      title: "Gender bias detected in resume screening scores",
      description: "Statistical analysis revealed that female applicants for engineering roles received systematically lower screening scores (mean: 62.3) compared to male applicants (mean: 71.8) with equivalent qualifications. The bias was traced to the training data overrepresenting male candidates in historical engineering hires.",
      type: "BIAS_DISCRIMINATION",
      severity: "HIGH",
      status: "RESOLVED",
      rootCauseCategory: "Training Data Bias",
      rootCauseDescription: "Historical hiring data from 2020-2023 contained implicit gender bias: 78% of engineering hires were male. The model learned to associate male-correlated resume features (e.g., certain university names, hobbies) with higher scores.",
      impactDescription: "Approximately 200 female applicants may have been unfairly ranked lower over a 6-month period. 15 confirmed cases where qualified female candidates were not advanced to interview stage.",
      notificationRequired: false,
      reportedBy: userId,
      reportedAt: new Date("2025-11-01"),
      resolvedAt: new Date("2025-12-20"),
    },
  });

  // 3. MEDIUM drift — INVESTIGATING
  await prisma.aIIncident.upsert({
    where: { id: "demo-incident-drift" },
    update: {},
    create: {
      id: "demo-incident-drift",
      organizationId: orgId,
      aiSystemId: "demo-system-fraud",
      title: "Fraud detection accuracy degradation in Q1 2026",
      description: "Monitoring dashboard shows a steady decline in fraud detection precision from 95.2% to 89.7% over the past 6 weeks. The model appears to be generating more false positives, particularly for international transactions. Investigation ongoing to determine if this is caused by distribution shift in transaction patterns.",
      type: "MODEL_DRIFT",
      severity: "MEDIUM",
      status: "INVESTIGATING",
      notificationRequired: false,
      reportedBy: userId,
      reportedAt: new Date("2026-02-10"),
    },
  });

  // 4. LOW performance degradation — CLOSED
  await prisma.aIIncident.upsert({
    where: { id: "demo-incident-perf" },
    update: {},
    create: {
      id: "demo-incident-perf",
      organizationId: orgId,
      aiSystemId: predictiveMaintenance.id,
      title: "Prediction latency spike in Factory B sensors",
      description: "Prediction response times increased from avg 200ms to 1.2s for Factory B sensor data. Root cause was a misconfigured batch processing pipeline that was accumulating sensor readings instead of processing in real-time.",
      type: "PERFORMANCE_DEGRADATION",
      severity: "LOW",
      status: "CLOSED",
      rootCauseCategory: "Infrastructure Configuration",
      rootCauseDescription: "Batch processing pipeline configuration was accidentally overwritten during a routine deployment, changing the processing mode from streaming to batch with a 5-second window.",
      impactDescription: "Factory B maintenance predictions were delayed by ~1 second for 4 hours. No missed predictions or equipment failures occurred.",
      notificationRequired: false,
      reportedBy: userId,
      reportedAt: new Date("2026-01-05"),
      resolvedAt: new Date("2026-01-05"),
    },
  });

  // 5. HIGH prompt injection — REPORTED
  await prisma.aIIncident.upsert({
    where: { id: "demo-incident-injection" },
    update: {},
    create: {
      id: "demo-incident-injection",
      organizationId: orgId,
      aiSystemId: "demo-system-chatbot",
      title: "Prompt injection attempt extracted system prompt",
      description: "A user exploited a prompt injection vulnerability to extract portions of the chatbot's system prompt and internal instructions. The extracted information included the list of restricted topics and the escalation rules. No customer data was exposed.",
      type: "PROMPT_INJECTION",
      severity: "HIGH",
      status: "REPORTED",
      notificationRequired: true,
      reportedBy: userId,
      reportedAt: new Date("2026-02-20"),
    },
  });

  console.log("  Created 5 incidents");

  // Timeline entries for hallucination incident
  const timelineEntries = [
    { id: "demo-timeline-h1", incidentId: hallucinationIncident.id, organizationId: orgId, action: "Incident reported", description: "Customer service manager identified pattern of incorrect refund information in chat transcripts.", performedBy: userId, performedAt: new Date("2026-02-18T14:30:00") },
    { id: "demo-timeline-h2", incidentId: hallucinationIncident.id, organizationId: orgId, action: "Investigation started", description: "ML team began reviewing chatbot logs and RAG retrieval traces.", performedBy: userId, performedAt: new Date("2026-02-18T14:45:00") },
    { id: "demo-timeline-h3", incidentId: hallucinationIncident.id, organizationId: orgId, action: "Root cause identified", description: "Knowledge base article on refund policy was deleted during routine cleanup, causing the model to hallucinate a policy from training data.", performedBy: userId, performedAt: new Date("2026-02-18T16:00:00") },
    { id: "demo-timeline-h4", incidentId: hallucinationIncident.id, organizationId: orgId, action: "Immediate mitigation applied", description: "Refund policy article restored to knowledge base. Confidence threshold raised from 0.6 to 0.8 for policy-related queries.", performedBy: userId, performedAt: new Date("2026-02-18T17:30:00") },
    { id: "demo-timeline-h5", incidentId: hallucinationIncident.id, organizationId: orgId, action: "Customer outreach initiated", description: "Customer service team contacting 47 affected customers with correct refund policy information and apology.", performedBy: userId, performedAt: new Date("2026-02-19T09:00:00") },
    { id: "demo-timeline-h6", incidentId: hallucinationIncident.id, organizationId: orgId, action: "Status changed to MITIGATING", description: "Status updated from INVESTIGATING to MITIGATING", performedBy: userId, performedAt: new Date("2026-02-19T10:00:00") },
  ];

  for (const t of timelineEntries) {
    await prisma.aIIncidentTimeline.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  // Tasks for hallucination incident
  const incidentTasks = [
    { id: "demo-task-h1", incidentId: hallucinationIncident.id, organizationId: orgId, title: "Contact all 47 affected customers", status: "IN_PROGRESS" as const, assignedTo: "Customer Service", dueDate: new Date("2026-02-21") },
    { id: "demo-task-h2", incidentId: hallucinationIncident.id, organizationId: orgId, title: "Implement KB deletion safeguards", status: "PENDING" as const, assignedTo: "ML Engineering", dueDate: new Date("2026-02-25") },
    { id: "demo-task-h3", incidentId: hallucinationIncident.id, organizationId: orgId, title: "Add hallucination detection for policy queries", status: "PENDING" as const, assignedTo: "ML Engineering", dueDate: new Date("2026-03-01") },
  ];

  for (const t of incidentTasks) {
    await prisma.aIIncidentTask.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  // Notification for hallucination incident
  await prisma.aIIncidentNotification.upsert({
    where: { id: "demo-notif-h1" },
    update: {},
    create: {
      id: "demo-notif-h1",
      incidentId: hallucinationIncident.id,
      organizationId: orgId,
      authority: "National AI Market Surveillance Authority",
      notificationType: "Art. 73 Serious Incident Report",
      dueBy: new Date("2026-03-05"),
      status: "PENDING",
    },
  });

  console.log("  Created timeline entries, tasks, and notifications");

  // ============================================================
  // 11. VENDORS
  // ============================================================

  console.log("11. Creating AI vendors...");

  const vendorOpenAI = await prisma.aIVendor.upsert({
    where: { id: "demo-vendor-openai" },
    update: {},
    create: {
      id: "demo-vendor-openai",
      organizationId: orgId,
      name: "OpenAI",
      website: "https://openai.com",
      description: "Provider of GPT-4o model used in Customer Support Chatbot and other generative AI applications.",
      contactName: "Enterprise Support",
      contactEmail: "enterprise@openai.com",
      riskLevel: "MEDIUM",
      status: "APPROVED",
      contractStartDate: new Date("2025-01-01"),
      contractExpiryDate: new Date("2026-12-31"),
      notes: "Enterprise agreement with SLA and DPA. Model outputs do not train OpenAI models per agreement.",
    },
  });

  await prisma.aIVendor.upsert({
    where: { id: "demo-vendor-internal" },
    update: {},
    create: {
      id: "demo-vendor-internal",
      organizationId: orgId,
      name: "Internal ML Platform",
      description: "Internal machine learning platform team providing model training, serving, and monitoring infrastructure.",
      riskLevel: "LOW",
      status: "ACTIVE",
      notes: "Internal team, no external contract required.",
    },
  });

  await prisma.aIVendor.upsert({
    where: { id: "demo-vendor-hr-saas" },
    update: {},
    create: {
      id: "demo-vendor-hr-saas",
      organizationId: orgId,
      name: "TalentScreen AI",
      website: "https://talentscreen.example.com",
      description: "AI-powered resume screening and candidate matching SaaS platform used by HR department.",
      contactName: "Sarah Johnson",
      contactEmail: "sarah@talentscreen.example.com",
      riskLevel: "HIGH",
      status: "UNDER_REVIEW",
      contractStartDate: new Date("2024-06-01"),
      contractExpiryDate: new Date("2026-05-31"),
      notes: "Contract expiring soon. Due diligence review in progress for renewal decision.",
    },
  });

  await prisma.aIVendor.upsert({
    where: { id: "demo-vendor-legacy" },
    update: {},
    create: {
      id: "demo-vendor-legacy",
      organizationId: orgId,
      name: "RecSys Analytics (Legacy)",
      description: "Former provider of the collaborative filtering recommendation engine. Contract terminated after migration to internal solution.",
      riskLevel: "LOW",
      status: "TERMINATED",
      contractStartDate: new Date("2023-01-01"),
      contractExpiryDate: new Date("2025-11-30"),
    },
  });

  // Link OpenAI vendor to chatbot and content mod systems
  await prisma.aISystem.updateMany({
    where: { id: { in: ["demo-system-chatbot", "demo-system-content-mod"] } },
    data: { vendorId: vendorOpenAI.id },
  });

  // Vendor assessments
  await prisma.aIVendorAssessment.upsert({
    where: { id: "demo-vassess-openai-1" },
    update: {},
    create: {
      id: "demo-vassess-openai-1",
      vendorId: vendorOpenAI.id,
      organizationId: orgId,
      title: "OpenAI Annual Due Diligence 2025",
      status: "COMPLETED",
      riskScore: 45,
      findings: "OpenAI meets data processing requirements per DPA. Model outputs not used for training. SOC 2 Type II audit report reviewed. Recommended: monitor for any changes to data retention policies.",
      completedBy: userId,
      completedAt: new Date("2025-12-01"),
      nextReviewDate: new Date("2026-12-01"),
    },
  });

  await prisma.aIVendorAssessment.upsert({
    where: { id: "demo-vassess-openai-2" },
    update: {},
    create: {
      id: "demo-vassess-openai-2",
      vendorId: vendorOpenAI.id,
      organizationId: orgId,
      title: "OpenAI EU AI Act Compliance Review",
      status: "IN_PROGRESS",
      findings: "Reviewing OpenAI's compliance with EU AI Act provider obligations for general-purpose AI models.",
    },
  });

  await prisma.aIVendorAssessment.upsert({
    where: { id: "demo-vassess-hr-1" },
    update: {},
    create: {
      id: "demo-vassess-hr-1",
      vendorId: "demo-vendor-hr-saas",
      organizationId: orgId,
      title: "TalentScreen AI Due Diligence - Renewal",
      status: "DRAFT",
      findings: "Pending: Need to review updated privacy policy, bias audit results, and Art. 14 compliance documentation.",
    },
  });

  console.log("  Created 4 vendors and 3 assessments");

  // ============================================================
  // 12. POLICIES
  // ============================================================

  console.log("12. Creating AI policies...");

  const usagePolicy = await prisma.aIPolicy.upsert({
    where: { id: "demo-policy-usage" },
    update: {},
    create: {
      id: "demo-policy-usage",
      organizationId: orgId,
      title: "AI Usage Policy",
      type: "AI_USAGE",
      description: "Organization-wide policy governing the acceptable use of AI systems by all employees and contractors.",
      content: `1. PURPOSE\nThis policy establishes guidelines for the acceptable use of AI systems within the organization, ensuring compliance with the EU AI Act and internal governance standards.\n\n2. SCOPE\nThis policy applies to all employees, contractors, and third parties who use, develop, or deploy AI systems on behalf of the organization.\n\n3. GENERAL PRINCIPLES\n3.1 All AI systems must be registered in the AI Registry before deployment.\n3.2 AI systems processing personal data must have a completed FRIA.\n3.3 Employees must not use unauthorized AI tools for work purposes (see Shadow AI policy).\n3.4 All AI-generated outputs must be reviewed by a human before being used for decisions affecting individuals.\n\n4. PROHIBITED USES\n4.1 AI systems that perform social scoring or manipulation.\n4.2 Real-time biometric identification in public spaces (unless exempt).\n4.3 Emotion recognition in the workplace (unless for safety/medical purposes).\n4.4 AI systems making fully autonomous decisions in high-risk domains without human oversight.\n\n5. RESPONSIBILITIES\n5.1 AI Officers are responsible for maintaining the AI Registry and ensuring compliance.\n5.2 Business Owners are responsible for the appropriate use of AI within their departments.\n5.3 All employees must report suspected AI incidents or unauthorized AI use.\n\n6. REVIEW\nThis policy is reviewed annually and updated as needed to reflect regulatory changes.`,
      currentVersion: 2,
      status: "PUBLISHED",
      approvedBy: userId,
      approvedAt: new Date("2025-09-01"),
      effectiveDate: new Date("2025-10-01"),
      reviewDate: new Date("2026-10-01"),
      createdBy: userId,
    },
  });

  // Version history for usage policy
  await prisma.aIPolicyVersion.upsert({
    where: { id: "demo-pversion-usage-1" },
    update: {},
    create: {
      id: "demo-pversion-usage-1",
      policyId: usagePolicy.id,
      version: 1,
      content: "Initial version of the AI Usage Policy covering basic guidelines and prohibited uses.",
      changeNotes: "Initial version",
      createdBy: userId,
      createdAt: new Date("2025-06-01"),
    },
  });

  await prisma.aIPolicyVersion.upsert({
    where: { id: "demo-pversion-usage-2" },
    update: {},
    create: {
      id: "demo-pversion-usage-2",
      policyId: usagePolicy.id,
      version: 2,
      content: `1. PURPOSE\nThis policy establishes guidelines for the acceptable use of AI systems within the organization...\n\n(Full updated content)`,
      changeNotes: "Updated to include EU AI Act Art. 5 prohibited practices, Shadow AI reference, and expanded responsibilities section.",
      createdBy: userId,
      createdAt: new Date("2025-09-15"),
    },
  });

  const riskPolicy = await prisma.aIPolicy.upsert({
    where: { id: "demo-policy-risk" },
    update: {},
    create: {
      id: "demo-policy-risk",
      organizationId: orgId,
      title: "AI Risk Management Framework",
      type: "AI_RISK_MANAGEMENT",
      description: "Framework for identifying, assessing, and mitigating risks associated with AI systems across their lifecycle.",
      content: `1. FRAMEWORK OVERVIEW\nThis framework establishes the processes for managing AI-related risks in alignment with the EU AI Act (Art. 9) and NIST AI RMF.\n\n2. RISK IDENTIFICATION\n2.1 All AI systems must undergo risk classification per the EU AI Act four-tier system.\n2.2 Risk assessments must be conducted before deployment and reviewed periodically.\n\n3. RISK ASSESSMENT\n3.1 High-risk systems require a Fundamental Rights Impact Assessment (FRIA).\n3.2 All systems require an AI Risk Assessment using the standardized template.\n3.3 Risk scores are calculated based on impact severity, likelihood, and mitigation effectiveness.\n\n4. RISK MITIGATION\n4.1 Identified risks must have documented mitigation measures.\n4.2 Residual risks must be formally accepted by the appropriate authority.\n\n5. MONITORING\n5.1 Continuous monitoring for model drift, bias, and performance degradation.\n5.2 Incident reporting procedures as defined in the AI Incident Response Procedure.`,
      currentVersion: 1,
      status: "APPROVED",
      approvedBy: userId,
      approvedAt: new Date("2025-11-15"),
      effectiveDate: new Date("2025-12-01"),
      reviewDate: new Date("2026-12-01"),
      createdBy: userId,
    },
  });

  await prisma.aIPolicyVersion.upsert({
    where: { id: "demo-pversion-risk-1" },
    update: {},
    create: {
      id: "demo-pversion-risk-1",
      policyId: riskPolicy.id,
      version: 1,
      content: "AI Risk Management Framework v1 content",
      changeNotes: "Initial version",
      createdBy: userId,
      createdAt: new Date("2025-11-01"),
    },
  });

  await prisma.aIPolicy.upsert({
    where: { id: "demo-policy-procurement" },
    update: {},
    create: {
      id: "demo-policy-procurement",
      organizationId: orgId,
      title: "AI Procurement Guidelines",
      type: "AI_PROCUREMENT",
      description: "Guidelines for evaluating and procuring AI systems and services from third-party vendors.",
      content: "Draft: AI procurement guidelines covering vendor evaluation criteria, due diligence requirements, and contractual obligations.",
      currentVersion: 1,
      status: "DRAFT",
      createdBy: userId,
    },
  });

  const irPolicy = await prisma.aIPolicy.upsert({
    where: { id: "demo-policy-ir" },
    update: {},
    create: {
      id: "demo-policy-ir",
      organizationId: orgId,
      title: "AI Incident Response Procedure",
      type: "AI_INCIDENT_RESPONSE",
      description: "Standard operating procedure for reporting, investigating, and resolving AI-related incidents.",
      content: `1. PURPOSE\nEstablish a standardized process for responding to AI incidents in compliance with Art. 73 of the EU AI Act.\n\n2. INCIDENT CLASSIFICATION\n- CRITICAL: Immediate safety risk or significant fundamental rights impact\n- HIGH: Significant performance failure or bias with broad impact\n- MEDIUM: Moderate issues requiring investigation\n- LOW: Minor issues with limited impact\n\n3. RESPONSE TIMELINE\n- CRITICAL: 1 hour response, 24 hour containment\n- HIGH: 4 hour response, 72 hour containment\n- MEDIUM: 24 hour response, 1 week resolution\n- LOW: 1 week response, 1 month resolution\n\n4. NOTIFICATION REQUIREMENTS\n- Art. 73 notifications to market surveillance authority within 15 days for serious incidents\n- Internal escalation to AI Officer within 4 hours for CRITICAL/HIGH\n\n5. POST-INCIDENT REVIEW\nAll incidents require a post-mortem within 2 weeks of resolution.`,
      currentVersion: 1,
      status: "PUBLISHED",
      approvedBy: userId,
      approvedAt: new Date("2025-08-01"),
      effectiveDate: new Date("2025-08-15"),
      reviewDate: new Date("2026-08-15"),
      createdBy: userId,
    },
  });

  await prisma.aIPolicyVersion.upsert({
    where: { id: "demo-pversion-ir-1" },
    update: {},
    create: {
      id: "demo-pversion-ir-1",
      policyId: irPolicy.id,
      version: 1,
      content: "AI Incident Response Procedure v1",
      changeNotes: "Initial version",
      createdBy: userId,
      createdAt: new Date("2025-08-01"),
    },
  });

  // Policy-system links
  const policyLinks = [
    { id: "demo-plink-usage-chatbot", policyId: usagePolicy.id, aiSystemId: "demo-system-chatbot" },
    { id: "demo-plink-usage-hr", policyId: usagePolicy.id, aiSystemId: "demo-system-hr-screening" },
    { id: "demo-plink-usage-fraud", policyId: usagePolicy.id, aiSystemId: "demo-system-fraud" },
    { id: "demo-plink-risk-hr", policyId: riskPolicy.id, aiSystemId: "demo-system-hr-screening" },
    { id: "demo-plink-risk-credit", policyId: riskPolicy.id, aiSystemId: creditScoring.id },
    { id: "demo-plink-ir-chatbot", policyId: irPolicy.id, aiSystemId: "demo-system-chatbot" },
    { id: "demo-plink-ir-fraud", policyId: irPolicy.id, aiSystemId: "demo-system-fraud" },
    { id: "demo-plink-ir-hr", policyId: irPolicy.id, aiSystemId: "demo-system-hr-screening" },
    { id: "demo-plink-ir-content", policyId: irPolicy.id, aiSystemId: "demo-system-content-mod" },
  ];

  for (const link of policyLinks) {
    await prisma.aIPolicySystemLink.upsert({
      where: { id: link.id },
      update: {},
      create: link,
    });
  }

  console.log("  Created 4 policies with version history and 9 system links");

  // ============================================================
  // 13. SHADOW AI REPORTS
  // ============================================================

  console.log("13. Creating shadow AI reports...");

  const shadowReports = [
    {
      id: "demo-shadow-chatgpt",
      organizationId: orgId,
      toolId: "shadow-tool-chatgpt",
      toolName: "ChatGPT",
      status: "APPROVED" as const,
      reportedBy: userId,
      department: "Marketing",
      usageDescription: "Marketing team using ChatGPT Team plan for campaign copy, social media content, and email drafts. Data opt-out enabled via enterprise settings.",
    },
    {
      id: "demo-shadow-midjourney",
      organizationId: orgId,
      toolId: "shadow-tool-midjourney",
      toolName: "Midjourney",
      status: "UNDER_REVIEW" as const,
      reportedBy: userId,
      department: "Design",
      usageDescription: "Design team using Midjourney for concept art and mockup generation. IP implications of AI-generated imagery need review before broader use.",
    },
    {
      id: "demo-shadow-copilot",
      organizationId: orgId,
      toolId: "shadow-tool-gh-copilot",
      toolName: "GitHub Copilot",
      status: "REGISTERED" as const,
      reportedBy: userId,
      department: "Engineering",
      usageDescription: "Engineering team using GitHub Copilot Business for code completion and generation across all repositories. Enterprise DPA in place.",
      registeredSystemId: "demo-system-chatbot",
    },
    {
      id: "demo-shadow-claude",
      organizationId: orgId,
      toolId: "shadow-tool-claude",
      toolName: "Claude",
      status: "DISCOVERED" as const,
      reportedBy: userId,
      department: "Legal",
      usageDescription: "Legal team members observed using Claude for contract review and legal research. Potentially processing privileged client data.",
    },
    {
      id: "demo-shadow-jasper",
      organizationId: orgId,
      toolId: "shadow-tool-jasper",
      toolName: "Jasper",
      status: "PROHIBITED" as const,
      reportedBy: userId,
      department: "Content",
      usageDescription: "Content team was using Jasper for blog post generation. Prohibited due to EU data residency concerns — Jasper processes data in US-only regions.",
    },
    {
      id: "demo-shadow-internal-llama",
      organizationId: orgId,
      toolId: null,
      toolName: "Internal Llama Instance",
      status: "DISCOVERED" as const,
      reportedBy: userId,
      department: "R&D",
      usageDescription: "R&D team self-hosting a Llama model on internal GPU cluster for experimental code generation and research summarization. No catalog match.",
    },
    {
      id: "demo-shadow-notion-ai",
      organizationId: orgId,
      toolId: "shadow-tool-notion-ai",
      toolName: "Notion AI",
      status: "APPROVED" as const,
      reportedBy: userId,
      department: "Product",
      usageDescription: "Product team using Notion AI within existing Notion Enterprise workspace for meeting notes summarization and document drafting. Enterprise DPA in place.",
    },
    {
      id: "demo-shadow-otter",
      organizationId: orgId,
      toolId: "shadow-tool-otter",
      toolName: "Otter AI",
      status: "UNDER_REVIEW" as const,
      reportedBy: userId,
      department: "Sales",
      usageDescription: "Sales team using Otter AI to transcribe and summarize customer calls. Concerns about recording consent and processing of customer voice data.",
    },
  ];

  for (const report of shadowReports) {
    await prisma.shadowAIReport.upsert({
      where: { id: report.id },
      update: {},
      create: report,
    });
  }

  console.log(`  Created ${shadowReports.length} shadow AI reports`);

  // ============================================================
  // SUMMARY
  // ============================================================

  console.log("\n========================================");
  console.log("Demo scenario population complete!");
  console.log("========================================");
  console.log("");
  console.log("AI Systems: 8 total");
  console.log("  - 3 DEPLOYED, 2 TESTING, 1 DEVELOPMENT, 1 DRAFT, 1 RETIRED");
  console.log("");
  console.log("AI Models: 6 total");
  console.log("");
  console.log("Data Sources: 7 total");
  console.log("");
  console.log("Risk Classifications: 8 total");
  console.log("");
  console.log("Assessments: 8 total");
  console.log("");
  console.log("Compliance Mappings: ~24 mappings");
  console.log("");
  console.log("Oversight Gates: 6 gates, 8 decisions");
  console.log("");
  console.log("AI Incidents: 5 incidents");
  console.log("  - 1 CRITICAL (MITIGATING), 1 HIGH bias (RESOLVED)");
  console.log("  - 1 MEDIUM drift (INVESTIGATING), 1 LOW perf (CLOSED)");
  console.log("  - 1 HIGH prompt injection (REPORTED)");
  console.log("");
  console.log("Vendors: 4 vendors, 3 assessments");
  console.log("");
  console.log("Policies: 4 policies (2 PUBLISHED, 1 APPROVED, 1 DRAFT)");
  console.log("");
  console.log("Shadow AI Reports: 8 reports");
  console.log("  - 2 DISCOVERED, 2 UNDER_REVIEW, 2 APPROVED");
  console.log("  - 1 PROHIBITED, 1 REGISTERED");
  console.log("");
  console.log("Audit Log: 15+ entries");
}

main()
  .catch((e) => {
    console.error("Error populating demo scenarios:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
