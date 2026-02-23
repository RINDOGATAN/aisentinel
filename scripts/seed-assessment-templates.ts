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

  console.log("\nDone! 3 assessment templates seeded (FRIA: 22q, AI Risk: 18q, Custom: 6q).");
}

main()
  .catch((e) => {
    console.error("Error seeding assessment templates:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
