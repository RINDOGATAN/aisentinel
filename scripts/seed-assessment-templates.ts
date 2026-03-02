import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding AI SENTINEL assessment templates...");

  // ============================================================
  // FRIA TEMPLATE (Free — EU AI Act Art. 27)
  // ============================================================

  const friaTemplate = {
    type: "FRIA" as const,
    name: "Fundamental Rights Impact Assessment",
    description: "EU AI Act Article 27 compliant assessment of impact on fundamental rights for high-risk AI systems deployed by public bodies and private entities.",
    frameworkRef: "EU AI Act Art. 27",
    isSystem: true,
    sections: [
      {
        id: "fria1",
        title: "AI System Description",
        questions: [
          {
            id: "fria1_1",
            text: "Describe the AI system, including its name, version, and intended purpose.",
            type: "textarea",
            required: true,
            helpText: "Include the system's technical description, main functionality, and the specific tasks it performs.",
          },
          {
            id: "fria1_2",
            text: "Describe the deployer's processes in which the high-risk AI system will be used.",
            type: "textarea",
            required: true,
            helpText: "Explain how the AI system integrates into existing workflows and decision-making processes.",
          },
          {
            id: "fria1_3",
            text: "What is the intended period of use and frequency of operation?",
            type: "textarea",
            required: true,
            helpText: "Specify whether the system will be used continuously, periodically, or on-demand, and the expected duration.",
          },
          {
            id: "fria1_4",
            text: "What is the geographic and institutional scope of deployment?",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        id: "fria2",
        title: "Categories of Affected Persons",
        questions: [
          {
            id: "fria2_1",
            text: "Identify the categories of natural persons and groups likely to be affected by the AI system.",
            type: "textarea",
            required: true,
            helpText: "Consider direct users, persons subject to decisions, and indirectly affected communities.",
          },
          {
            id: "fria2_2",
            text: "Are any of the affected persons or groups particularly vulnerable?",
            type: "textarea",
            required: true,
            helpText: "Consider children, elderly, persons with disabilities, ethnic minorities, low-income groups, etc.",
          },
          {
            id: "fria2_3",
            text: "Estimate the number of natural persons likely to be affected.",
            type: "textarea",
            required: true,
          },
          {
            id: "fria2_4",
            text: "How were affected persons or their representatives consulted in this assessment?",
            type: "textarea",
            required: false,
            helpText: "Describe any stakeholder engagement, public consultation, or representative involvement.",
          },
        ],
      },
      {
        id: "fria3",
        title: "Risks to Fundamental Rights",
        questions: [
          {
            id: "fria3_1",
            text: "What are the specific risks to the right to non-discrimination (Art. 21 EU Charter)?",
            type: "textarea",
            required: true,
            helpText: "Consider risks of bias, unfair treatment based on protected characteristics (gender, race, age, disability, etc.).",
          },
          {
            id: "fria3_2",
            text: "What are the specific risks to the right to privacy and data protection (Art. 7-8 EU Charter)?",
            type: "textarea",
            required: true,
            helpText: "Consider personal data processing, surveillance capabilities, and inference of sensitive information.",
          },
          {
            id: "fria3_3",
            text: "What are the specific risks to freedom of expression and information (Art. 11 EU Charter)?",
            type: "textarea",
            required: true,
          },
          {
            id: "fria3_4",
            text: "What are the specific risks to human dignity (Art. 1 EU Charter)?",
            type: "textarea",
            required: true,
          },
          {
            id: "fria3_5",
            text: "What are the specific risks to the right to an effective remedy and fair trial (Art. 47 EU Charter)?",
            type: "textarea",
            required: true,
            helpText: "Consider the ability of affected persons to challenge AI-driven decisions and access redress.",
          },
          {
            id: "fria3_6",
            text: "Are there risks to any other fundamental rights? If so, describe them.",
            type: "textarea",
            required: false,
            helpText: "Consider rights to education (Art. 14), right to work (Art. 15), rights of the child (Art. 24), consumer protection (Art. 38), etc.",
          },
        ],
      },
      {
        id: "fria4",
        title: "Human Oversight & Safeguards",
        questions: [
          {
            id: "fria4_1",
            text: "Describe the human oversight measures in place during the use of the AI system.",
            type: "textarea",
            required: true,
            helpText: "Include who performs oversight, their competence level, and how they can intervene in the system's operation.",
          },
          {
            id: "fria4_2",
            text: "What technical safeguards are implemented to protect fundamental rights?",
            type: "textarea",
            required: true,
            helpText: "E.g., fairness constraints, bias detection, explainability features, accuracy monitoring.",
          },
          {
            id: "fria4_3",
            text: "What organizational measures are in place to mitigate identified risks?",
            type: "textarea",
            required: true,
            helpText: "E.g., training programs, oversight committees, regular audits, escalation procedures.",
          },
          {
            id: "fria4_4",
            text: "Are there mechanisms for affected persons to contest decisions or seek redress?",
            type: "textarea",
            required: true,
            helpText: "Describe complaint mechanisms, appeal processes, and human review options.",
          },
        ],
      },
      {
        id: "fria5",
        title: "Assessment Outcome & Notification",
        questions: [
          {
            id: "fria5_1",
            text: "What is the overall assessment of impact on fundamental rights?",
            type: "textarea",
            required: true,
            helpText: "Summarize whether the identified risks are acceptable given the safeguards in place.",
          },
          {
            id: "fria5_2",
            text: "What residual risks remain after mitigation measures?",
            type: "textarea",
            required: true,
          },
          {
            id: "fria5_3",
            text: "What additional measures are recommended to further mitigate risks?",
            type: "textarea",
            required: false,
          },
          {
            id: "fria5_4",
            text: "Has the market surveillance authority been notified of the assessment results (Art. 27(3))?",
            type: "textarea",
            required: true,
            helpText: "If applicable, provide the date and method of notification.",
          },
        ],
      },
    ],
  };

  await prisma.aIAssessmentTemplate.upsert({
    where: { id: "system-fria-template" },
    update: friaTemplate,
    create: { id: "system-fria-template", ...friaTemplate },
  });
  console.log("  Created FRIA template (system-fria-template) — 5 sections, 22 questions");

  // ============================================================
  // AI RISK ASSESSMENT TEMPLATE (Free)
  // ============================================================

  const aiRiskTemplate = {
    type: "AI_RISK" as const,
    name: "AI Risk Assessment",
    description: "Comprehensive AI risk assessment covering technical risks, ethical risks, operational risks, and mitigation strategies for AI systems at any risk level.",
    frameworkRef: "NIST AI RMF / ISO 42001",
    isSystem: true,
    sections: [
      {
        id: "air1",
        title: "System Overview & Context",
        questions: [
          {
            id: "air1_1",
            text: "Describe the AI system being assessed, including its purpose and key capabilities.",
            type: "textarea",
            required: true,
          },
          {
            id: "air1_2",
            text: "What is the risk classification of this AI system?",
            type: "select",
            required: true,
            options: ["Minimal", "Limited", "High", "Unacceptable"],
          },
          {
            id: "air1_3",
            text: "Who are the intended users and affected stakeholders?",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        id: "air2",
        title: "Technical Risks",
        questions: [
          {
            id: "air2_1",
            text: "What risks arise from model accuracy limitations or errors?",
            type: "textarea",
            required: true,
            helpText: "Consider false positives, false negatives, hallucinations, and confidence calibration issues.",
          },
          {
            id: "air2_2",
            text: "What risks arise from model drift or performance degradation over time?",
            type: "textarea",
            required: true,
            helpText: "Consider data distribution shifts, concept drift, and environmental changes.",
          },
          {
            id: "air2_3",
            text: "What are the cybersecurity risks associated with this AI system?",
            type: "textarea",
            required: true,
            helpText: "Consider adversarial attacks, prompt injection, data poisoning, model theft, and inference attacks.",
          },
        ],
      },
      {
        id: "air3",
        title: "Ethical & Fairness Risks",
        questions: [
          {
            id: "air3_1",
            text: "What bias or discrimination risks have been identified?",
            type: "textarea",
            required: true,
            helpText: "Consider demographic bias, representation bias, measurement bias, and aggregation bias.",
          },
          {
            id: "air3_2",
            text: "How transparent and explainable are the system's decisions?",
            type: "select",
            required: true,
            options: ["Fully explainable", "Partially explainable", "Limited explainability", "Black box"],
          },
          {
            id: "air3_3",
            text: "Are there risks to individual autonomy or human agency?",
            type: "textarea",
            required: true,
            helpText: "Consider over-reliance on AI, automation bias, reduced human skills, and manipulation risks.",
          },
        ],
      },
      {
        id: "air4",
        title: "Operational Risks",
        questions: [
          {
            id: "air4_1",
            text: "What happens if the AI system becomes unavailable or fails?",
            type: "textarea",
            required: true,
            helpText: "Describe fallback procedures, business continuity plans, and human backup processes.",
          },
          {
            id: "air4_2",
            text: "What are the data quality and data governance risks?",
            type: "textarea",
            required: true,
          },
          {
            id: "air4_3",
            text: "What are the risks related to third-party dependencies?",
            type: "textarea",
            required: false,
            helpText: "Consider vendor lock-in, API changes, model deprecation, and supply chain risks.",
          },
        ],
      },
      {
        id: "air5",
        title: "Mitigation Measures",
        questions: [
          {
            id: "air5_1",
            text: "What technical safeguards are in place or planned?",
            type: "textarea",
            required: true,
            helpText: "E.g., monitoring, alerting, testing pipelines, bias detection, adversarial testing.",
          },
          {
            id: "air5_2",
            text: "What organizational safeguards are in place or planned?",
            type: "textarea",
            required: true,
            helpText: "E.g., training, oversight committees, incident response plans, regular audits.",
          },
          {
            id: "air5_3",
            text: "What human oversight mechanisms are in place?",
            type: "textarea",
            required: true,
            helpText: "Describe human-in-the-loop, human-on-the-loop, or human-in-command arrangements.",
          },
        ],
      },
      {
        id: "air6",
        title: "Risk Summary & Recommendations",
        questions: [
          {
            id: "air6_1",
            text: "What is the overall residual risk level after mitigation?",
            type: "select",
            required: true,
            options: ["Low", "Medium", "High", "Critical"],
          },
          {
            id: "air6_2",
            text: "Is the residual risk acceptable? Provide justification.",
            type: "textarea",
            required: true,
          },
          {
            id: "air6_3",
            text: "What additional actions or follow-up reviews are recommended?",
            type: "textarea",
            required: false,
          },
        ],
      },
    ],
  };

  await prisma.aIAssessmentTemplate.upsert({
    where: { id: "system-ai-risk-template" },
    update: aiRiskTemplate,
    create: { id: "system-ai-risk-template", ...aiRiskTemplate },
  });
  console.log("  Created AI Risk Assessment template (system-ai-risk-template) — 6 sections, 18 questions");

  // ============================================================
  // CUSTOM TEMPLATE (Free)
  // ============================================================

  const customTemplate = {
    type: "CUSTOM" as const,
    name: "Custom Assessment",
    description: "A flexible assessment template for custom AI governance reviews and evaluations tailored to your organization's needs.",
    isSystem: true,
    sections: [
      {
        id: "custom1",
        title: "Overview",
        questions: [
          {
            id: "custom1_1",
            text: "What is the purpose of this assessment?",
            type: "textarea",
            required: true,
            helpText: "Describe what you are evaluating and why.",
          },
          {
            id: "custom1_2",
            text: "What is the scope of this assessment?",
            type: "textarea",
            required: true,
            helpText: "Define the AI systems, processes, or functions being assessed.",
          },
        ],
      },
      {
        id: "custom2",
        title: "Risk Evaluation",
        questions: [
          {
            id: "custom2_1",
            text: "What are the key risks identified?",
            type: "textarea",
            required: true,
          },
          {
            id: "custom2_2",
            text: "What is the overall risk level?",
            type: "select",
            required: true,
            options: ["Low", "Medium", "High", "Critical"],
          },
        ],
      },
      {
        id: "custom3",
        title: "Mitigations & Recommendations",
        questions: [
          {
            id: "custom3_1",
            text: "What mitigations are in place or recommended?",
            type: "textarea",
            required: true,
          },
          {
            id: "custom3_2",
            text: "Is the residual risk acceptable?",
            type: "select",
            required: true,
            options: ["Yes, fully acceptable", "Acceptable with conditions", "Needs further review", "Not acceptable"],
          },
        ],
      },
    ],
  };

  await prisma.aIAssessmentTemplate.upsert({
    where: { id: "system-custom-template" },
    update: customTemplate,
    create: { id: "system-custom-template", ...customTemplate },
  });
  console.log("  Created Custom Assessment template (system-custom-template) — 3 sections, 6 questions");

  // ============================================================
  // CONFORMITY ASSESSMENT TEMPLATE (Premium — €9/mo)
  // EU AI Act Art. 43, Annex VI / Annex VII
  // ============================================================

  const conformityTemplate = {
    type: "CONFORMITY" as const,
    name: "Conformity Assessment",
    description: "EU AI Act Article 43 conformity assessment for high-risk AI systems. Covers internal control (Annex VI) and notified body (Annex VII) pathways including QMS, technical documentation, risk management, and CE marking readiness.",
    frameworkRef: "EU AI Act Art. 43, Annex VI, Annex VII",
    isSystem: true,
    sections: [
      {
        id: "conf1",
        title: "System Identification",
        questions: [
          {
            id: "conf1_1",
            text: "What is the name, version, and unique identifier of the AI system?",
            type: "textarea",
            required: true,
            helpText: "Include trade name, version number, and any internal reference codes.",
          },
          {
            id: "conf1_2",
            text: "Who is the provider and what are their contact details?",
            type: "textarea",
            required: true,
            helpText: "Full legal name, registered address, and authorised representative (if applicable).",
          },
          {
            id: "conf1_3",
            text: "What is the intended purpose of the AI system?",
            type: "textarea",
            required: true,
            helpText: "Describe the specific use cases and deployment contexts as stated in the instructions for use.",
          },
          {
            id: "conf1_4",
            text: "What is the risk classification of this AI system under the EU AI Act?",
            type: "select",
            required: true,
            options: ["High-risk (Annex III)", "High-risk (Union harmonisation legislation)", "Limited risk", "Minimal risk"],
          },
          {
            id: "conf1_5",
            text: "Which Annex III category does this system fall under (if applicable)?",
            type: "select",
            required: false,
            options: [
              "Biometric identification",
              "Critical infrastructure",
              "Education and vocational training",
              "Employment and worker management",
              "Access to essential services",
              "Law enforcement",
              "Migration and border control",
              "Administration of justice",
              "Not applicable",
            ],
          },
        ],
      },
      {
        id: "conf2",
        title: "Quality Management System",
        questions: [
          {
            id: "conf2_1",
            text: "Does the provider have a documented Quality Management System (QMS) covering the AI system?",
            type: "select",
            required: true,
            options: ["Yes, fully documented", "Partially documented", "Under development", "No"],
          },
          {
            id: "conf2_2",
            text: "Describe the design and development procedures within the QMS.",
            type: "textarea",
            required: true,
            helpText: "Include design control, version management, change management, and configuration management processes.",
          },
          {
            id: "conf2_3",
            text: "Describe the testing and validation methodology.",
            type: "textarea",
            required: true,
            helpText: "Include test plans, validation datasets, acceptance criteria, and verification procedures.",
          },
          {
            id: "conf2_4",
            text: "Describe the post-market monitoring plan.",
            type: "textarea",
            required: true,
            helpText: "How will the system be monitored after deployment? Include performance tracking, incident reporting, and update procedures.",
          },
        ],
      },
      {
        id: "conf3",
        title: "Technical Documentation",
        questions: [
          {
            id: "conf3_1",
            text: "Describe the system architecture and key components.",
            type: "textarea",
            required: true,
            helpText: "Include model type, computational resources, software dependencies, and integration points.",
          },
          {
            id: "conf3_2",
            text: "Describe the training data, including its source, scope, and characteristics.",
            type: "textarea",
            required: true,
            helpText: "Cover data collection methodology, dataset size, labelling approach, and any data gaps or limitations.",
          },
          {
            id: "conf3_3",
            text: "What data governance measures are in place?",
            type: "textarea",
            required: true,
            helpText: "Describe data quality controls, bias examination, relevance assessment, and GDPR compliance measures (Art. 10).",
          },
          {
            id: "conf3_4",
            text: "What are the documented performance metrics and benchmarks?",
            type: "textarea",
            required: true,
            helpText: "Include accuracy, precision, recall, F1 score, and any domain-specific metrics with benchmark results.",
          },
        ],
      },
      {
        id: "conf4",
        title: "Risk Management",
        questions: [
          {
            id: "conf4_1",
            text: "Describe the risk identification and analysis methodology.",
            type: "textarea",
            required: true,
            helpText: "How are risks identified, categorised, and prioritised throughout the AI system lifecycle? (Art. 9)",
          },
          {
            id: "conf4_2",
            text: "List the known and foreseeable risks and their mitigations.",
            type: "textarea",
            required: true,
            helpText: "For each risk, describe the mitigation measure and its effectiveness.",
          },
          {
            id: "conf4_3",
            text: "Is the residual risk acceptable after all mitigations are applied?",
            type: "select",
            required: true,
            options: ["Yes, fully acceptable", "Acceptable with conditions", "Requires further mitigation", "Not acceptable"],
          },
          {
            id: "conf4_4",
            text: "Has the system been tested against relevant harmonised standards?",
            type: "select",
            required: true,
            options: ["Yes, fully tested", "Partially tested", "Planned", "No applicable standards identified"],
          },
        ],
      },
      {
        id: "conf5",
        title: "Transparency & Human Oversight",
        questions: [
          {
            id: "conf5_1",
            text: "Describe the instructions for use provided to deployers.",
            type: "textarea",
            required: true,
            helpText: "Include information about capabilities, limitations, intended purpose, and prohibited uses (Art. 13).",
          },
          {
            id: "conf5_2",
            text: "How are transparency obligations met?",
            type: "textarea",
            required: true,
            helpText: "Describe how users are informed they are interacting with an AI system, and how outputs are interpretable (Art. 13).",
          },
          {
            id: "conf5_3",
            text: "What human oversight mechanisms are implemented?",
            type: "select",
            required: true,
            options: ["Human-in-the-loop", "Human-on-the-loop", "Human-in-command", "Multiple mechanisms", "None"],
          },
          {
            id: "conf5_4",
            text: "Describe the logging capabilities of the system.",
            type: "textarea",
            required: true,
            helpText: "What events are logged, retention period, traceability of decisions, and audit trail capabilities (Art. 12).",
          },
        ],
      },
      {
        id: "conf6",
        title: "Conformity Declaration",
        questions: [
          {
            id: "conf6_1",
            text: "What is the overall conformity conclusion?",
            type: "select",
            required: true,
            options: ["Conforms to all applicable requirements", "Conforms with minor observations", "Does not conform — corrective actions required"],
          },
          {
            id: "conf6_2",
            text: "Which conformity assessment pathway is being followed?",
            type: "select",
            required: true,
            options: [
              "Annex VI — Internal control (self-assessment)",
              "Annex VII — Assessment by notified body",
            ],
          },
          {
            id: "conf6_3",
            text: "If Annex VII applies, provide details of the notified body involvement.",
            type: "textarea",
            required: false,
            helpText: "Name and identification number of the notified body, scope of assessment, and any certificates issued.",
          },
          {
            id: "conf6_4",
            text: "Has the EU Declaration of Conformity been drafted and is CE marking readiness confirmed?",
            type: "select",
            required: true,
            options: ["Yes, declaration drafted and CE marking ready", "Declaration in progress", "Not yet started"],
          },
        ],
      },
    ],
  };

  await prisma.aIAssessmentTemplate.upsert({
    where: { id: "system-conformity-template" },
    update: conformityTemplate,
    create: { id: "system-conformity-template", ...conformityTemplate },
  });
  console.log("  Created Conformity Assessment template (system-conformity-template) — 6 sections, 25 questions");

  // ============================================================
  // BIAS & FAIRNESS ASSESSMENT TEMPLATE (Premium — €9/mo)
  // EU AI Act Art. 10 (Data Governance) + NIST AI RMF
  // ============================================================

  const biasFairnessTemplate = {
    type: "BIAS_FAIRNESS" as const,
    name: "Bias & Fairness Assessment",
    description: "Comprehensive bias and fairness assessment covering data composition, fairness metrics, disaggregated testing, and mitigation strategies. Aligned with EU AI Act Article 10 (Data Governance) and NIST AI RMF.",
    frameworkRef: "EU AI Act Art. 10 / NIST AI RMF",
    isSystem: true,
    sections: [
      {
        id: "bf1",
        title: "Assessment Scope",
        questions: [
          {
            id: "bf1_1",
            text: "What AI system is being assessed and what is its version or iteration?",
            type: "textarea",
            required: true,
            helpText: "Include system name, version, and the specific model or algorithm under evaluation.",
          },
          {
            id: "bf1_2",
            text: "What is the decision domain of this AI system?",
            type: "select",
            required: true,
            options: [
              "Hiring and recruitment",
              "Credit and lending",
              "Healthcare",
              "Criminal justice",
              "Education",
              "Insurance",
              "Social services",
              "Content moderation",
              "Other",
            ],
          },
          {
            id: "bf1_3",
            text: "Describe the affected populations and stakeholders.",
            type: "textarea",
            required: true,
            helpText: "Who are the individuals or groups whose outcomes are influenced by this system?",
          },
          {
            id: "bf1_4",
            text: "Which protected characteristics are being considered in this assessment?",
            type: "textarea",
            required: true,
            helpText: "E.g., race/ethnicity, gender, age, disability, religion, sexual orientation, nationality, socioeconomic status.",
          },
        ],
      },
      {
        id: "bf2",
        title: "Data Analysis",
        questions: [
          {
            id: "bf2_1",
            text: "Describe the composition of the training data.",
            type: "textarea",
            required: true,
            helpText: "Include data sources, total size, time period covered, and data types (structured, text, image, etc.).",
          },
          {
            id: "bf2_2",
            text: "What is the demographic representation in the training data?",
            type: "textarea",
            required: true,
            helpText: "Provide breakdowns by the protected characteristics identified above. Note any underrepresented groups.",
          },
          {
            id: "bf2_3",
            text: "Describe the data labelling methodology and quality controls.",
            type: "textarea",
            required: true,
            helpText: "Who labelled the data? What guidelines were used? How was inter-annotator agreement measured?",
          },
          {
            id: "bf2_4",
            text: "Have you identified historical or societal biases embedded in the source data?",
            type: "select",
            required: true,
            options: ["Yes, biases identified and documented", "Partially investigated", "Not yet investigated", "No biases identified"],
          },
        ],
      },
      {
        id: "bf3",
        title: "Fairness Metrics",
        questions: [
          {
            id: "bf3_1",
            text: "Which fairness metrics have been selected for evaluation?",
            type: "textarea",
            required: true,
            helpText: "E.g., demographic parity, equalized odds, predictive parity, calibration, individual fairness.",
          },
          {
            id: "bf3_2",
            text: "What is the rationale for selecting these specific fairness metrics?",
            type: "textarea",
            required: true,
            helpText: "Explain why these metrics are appropriate for the use case and any trade-offs between competing definitions of fairness.",
          },
          {
            id: "bf3_3",
            text: "What is the disparate impact ratio across key demographic groups?",
            type: "textarea",
            required: true,
            helpText: "Provide the ratio of positive outcome rates between protected and reference groups. A ratio below 0.8 typically indicates disparate impact.",
          },
          {
            id: "bf3_4",
            text: "Are fairness metric thresholds meeting acceptable standards?",
            type: "select",
            required: true,
            options: ["All metrics within acceptable range", "Most metrics acceptable, minor gaps", "Significant gaps identified", "Metrics not yet computed"],
          },
        ],
      },
      {
        id: "bf4",
        title: "Bias Testing Results",
        questions: [
          {
            id: "bf4_1",
            text: "Describe the bias testing methodology used.",
            type: "textarea",
            required: true,
            helpText: "Include test dataset composition, statistical tests applied, and confidence levels.",
          },
          {
            id: "bf4_2",
            text: "Report the disaggregated performance metrics across demographic groups.",
            type: "textarea",
            required: true,
            helpText: "Provide accuracy, precision, recall, false positive rate, and false negative rate broken down by each protected characteristic.",
          },
          {
            id: "bf4_3",
            text: "What disparities were identified between groups?",
            type: "textarea",
            required: true,
            helpText: "Describe any statistically significant differences in outcomes, error rates, or performance across groups.",
          },
          {
            id: "bf4_4",
            text: "Has intersectional analysis been performed?",
            type: "select",
            required: true,
            options: ["Yes, full intersectional analysis completed", "Partial intersectional analysis", "Planned but not yet completed", "No"],
            helpText: "Intersectional analysis examines combinations of protected characteristics (e.g., race + gender).",
          },
        ],
      },
      {
        id: "bf5",
        title: "Mitigation Measures",
        questions: [
          {
            id: "bf5_1",
            text: "What pre-processing mitigations have been applied to the training data?",
            type: "textarea",
            required: true,
            helpText: "E.g., resampling, reweighting, data augmentation, removal of proxy variables, synthetic data generation.",
          },
          {
            id: "bf5_2",
            text: "What in-processing fairness constraints or techniques are used?",
            type: "textarea",
            required: true,
            helpText: "E.g., adversarial debiasing, fairness-aware regularisation, constrained optimisation.",
          },
          {
            id: "bf5_3",
            text: "What post-processing adjustments have been applied?",
            type: "textarea",
            required: true,
            helpText: "E.g., threshold adjustment per group, calibration, reject option classification.",
          },
          {
            id: "bf5_4",
            text: "Describe the ongoing monitoring plan for bias detection.",
            type: "textarea",
            required: true,
            helpText: "How frequently will fairness metrics be re-evaluated? What triggers a re-assessment?",
          },
        ],
      },
      {
        id: "bf6",
        title: "Assessment Outcome",
        questions: [
          {
            id: "bf6_1",
            text: "What is the overall fairness determination?",
            type: "select",
            required: true,
            options: [
              "Fair — meets all fairness criteria",
              "Conditionally fair — acceptable with ongoing monitoring",
              "Unfair — significant bias requiring remediation",
              "Inconclusive — insufficient data for determination",
            ],
          },
          {
            id: "bf6_2",
            text: "What residual bias risks remain after mitigation?",
            type: "textarea",
            required: true,
            helpText: "Describe any biases that could not be fully mitigated and the associated risks.",
          },
          {
            id: "bf6_3",
            text: "What specific actions are recommended to further reduce bias?",
            type: "textarea",
            required: true,
            helpText: "Include prioritised recommendations with owners and timelines.",
          },
          {
            id: "bf6_4",
            text: "When is the next re-assessment scheduled?",
            type: "select",
            required: true,
            options: ["Within 3 months", "Within 6 months", "Within 12 months", "Upon material change only"],
          },
        ],
      },
    ],
  };

  await prisma.aIAssessmentTemplate.upsert({
    where: { id: "system-bias-fairness-template" },
    update: biasFairnessTemplate,
    create: { id: "system-bias-fairness-template", ...biasFairnessTemplate },
  });
  console.log("  Created Bias & Fairness Assessment template (system-bias-fairness-template) — 6 sections, 24 questions");

  console.log("\nDone! 5 assessment templates seeded (FRIA: 22q, AI Risk: 18q, Custom: 6q, Conformity: 25q, Bias & Fairness: 24q).");
}

main()
  .catch((e) => {
    console.error("Error seeding assessment templates:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
