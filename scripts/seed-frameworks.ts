// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { PrismaClient, AIRiskLevel } from "@prisma/client";

// EU AI Act content verified against the FINAL text of Regulation (EU)
// 2024/1689 (OJ L, 2024/1689, 12.7.2024) — not the 2021 Commission proposal.
// Key final-text anchors: Art. 4 (AI literacy), Art. 5(1)(a)-(h) prohibitions,
// Art. 50 (transparency), Art. 72 (post-market monitoring), Art. 73 (serious
// incidents), Art. 113 (applicability timeline as amended by the Digital
// Omnibus on AI — adopted 8 Jul 2026, OJ publication pending; re-verify the
// final OJ text once the Regulation (EU) 2026/XXXX number exists).
// lawReviewedAsOf: 2026-07-17

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding compliance frameworks...");

  // ============================================================
  // EU AI ACT
  // ============================================================

  console.log("  Creating EU AI Act framework...");

  const euAiAct = await prisma.complianceFramework.upsert({
    where: { code: "EU_AI_ACT" },
    update: { name: "EU AI Act", version: "2024/1689" },
    create: {
      code: "EU_AI_ACT",
      name: "EU AI Act",
      version: "2024/1689",
      description: "Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence. The world's first comprehensive AI regulation.",
    },
  });

  const euRequirements = [
    // TITLE I - General Provisions
    { code: "Art. 1", title: "Subject matter", description: "Purpose of the regulation: improve the functioning of the internal market by laying down harmonised rules for AI systems.", applicableTo: ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"], sortOrder: 1, children: [] },
    { code: "Art. 2", title: "Scope", description: "Applies to providers, deployers, importers, distributors, and users of AI systems within the Union.", applicableTo: ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"], sortOrder: 2, children: [] },
    { code: "Art. 3", title: "Definitions", description: "Key definitions including AI system, provider, deployer, high-risk AI system, etc.", applicableTo: ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"], sortOrder: 3, children: [] },
    { code: "Art. 4", title: "AI literacy", description: "Providers and deployers of AI systems shall take measures to ensure, to their best extent, a sufficient level of AI literacy of their staff and other persons dealing with the operation and use of AI systems on their behalf. Applicable since 2 February 2025.", applicableTo: ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"], sortOrder: 4, children: [] },

    // CHAPTER II - Prohibited AI Practices
    // Subparagraph lettering follows the FINAL Act (Reg. 2024/1689), which
    // differs from the 2021 proposal.
    { code: "Art. 5", title: "Prohibited AI practices", description: "AI practices that are prohibited due to unacceptable risk.", applicableTo: ["UNACCEPTABLE"], sortOrder: 5, children: [
      { code: "Art. 5(1)(a)", title: "Subliminal manipulation", description: "AI systems deploying subliminal techniques beyond a person's consciousness, or purposefully manipulative or deceptive techniques, to materially distort behaviour.", sortOrder: 1 },
      { code: "Art. 5(1)(b)", title: "Exploitation of vulnerabilities", description: "AI systems exploiting vulnerabilities of persons due to age, disability, or a specific social or economic situation.", sortOrder: 2 },
      { code: "Art. 5(1)(c)", title: "Social scoring", description: "AI systems for evaluation or classification of natural persons based on social behaviour or personal characteristics, leading to detrimental or unfavourable treatment.", sortOrder: 3 },
      { code: "Art. 5(1)(d)", title: "Predictive policing (individual)", description: "AI systems making risk assessments of natural persons in order to assess or predict the risk of committing a criminal offence, based solely on profiling or on assessing personality traits and characteristics.", sortOrder: 4 },
      { code: "Art. 5(1)(e)", title: "Untargeted scraping for facial recognition", description: "AI systems that create or expand facial recognition databases through the untargeted scraping of facial images from the internet or CCTV footage.", sortOrder: 5 },
      { code: "Art. 5(1)(f)", title: "Emotion recognition in workplace/education", description: "AI systems to infer emotions of a natural person in the areas of workplace and education institutions, except for medical or safety reasons.", sortOrder: 6 },
      { code: "Art. 5(1)(g)", title: "Biometric categorisation (sensitive)", description: "Biometric categorisation systems that categorise natural persons based on biometric data to deduce or infer race, political opinions, trade union membership, religious or philosophical beliefs, sex life or sexual orientation.", sortOrder: 7 },
      { code: "Art. 5(1)(h)", title: "Real-time remote biometric identification", description: "The use of 'real-time' remote biometric identification systems in publicly accessible spaces for the purposes of law enforcement, subject to narrow exceptions.", sortOrder: 8 },
    ]},

    // CHAPTER III - High-Risk AI Systems
    { code: "Art. 6", title: "Classification rules for high-risk AI systems", description: "Rules for determining which AI systems are high-risk, including Annex III listing.", applicableTo: ["HIGH"], sortOrder: 6, children: [
      { code: "Art. 6(1)", title: "Product safety high-risk", description: "AI systems that are safety components of products or are themselves products covered by Union harmonisation legislation.", sortOrder: 1 },
      { code: "Art. 6(2)", title: "Annex III high-risk", description: "AI systems referred to in Annex III areas (biometrics, infrastructure, education, employment, services, law enforcement, migration, justice).", sortOrder: 2 },
    ]},
    { code: "Art. 8", title: "Compliance with requirements", description: "High-risk AI systems shall comply with requirements laid down in Chapter III, Section 2.", applicableTo: ["HIGH"], sortOrder: 8, children: [] },
    { code: "Art. 9", title: "Risk management system", description: "Establish, implement, document and maintain a risk management system throughout the AI system lifecycle.", applicableTo: ["HIGH"], sortOrder: 9, children: [
      { code: "Art. 9(2)", title: "Identify and analyse known/foreseeable risks", description: "Identification and analysis of known and reasonably foreseeable risks.", sortOrder: 1 },
      { code: "Art. 9(3)", title: "Evaluate risks from misuse", description: "Evaluation of risks from reasonably foreseeable misuse.", sortOrder: 2 },
      { code: "Art. 9(4)", title: "Adopt risk management measures", description: "Adoption of appropriate and targeted risk management measures.", sortOrder: 3 },
      { code: "Art. 9(5)", title: "Testing to ensure appropriate risk levels", description: "Testing to ensure AI system performs consistently and risk levels are appropriate.", sortOrder: 4 },
    ]},
    { code: "Art. 10", title: "Data and data governance", description: "Training, validation and testing data sets shall be subject to appropriate data governance and management practices.", applicableTo: ["HIGH"], sortOrder: 10, children: [
      { code: "Art. 10(2)", title: "Data governance practices", description: "Relevant design choices, data collection processes, data preparation, formulation of assumptions.", sortOrder: 1 },
      { code: "Art. 10(3)", title: "Training data representativeness", description: "Training, validation and testing datasets shall be relevant, sufficiently representative, and to the best extent possible free of errors.", sortOrder: 2 },
      { code: "Art. 10(4)", title: "Account for specific settings", description: "Datasets shall take into account characteristics specific to the geographic, contextual, behavioural or functional setting.", sortOrder: 3 },
      { code: "Art. 10(5)", title: "Special category data for bias monitoring", description: "Processing of special categories of personal data for bias detection and correction, subject to appropriate safeguards.", sortOrder: 4 },
    ]},
    { code: "Art. 11", title: "Technical documentation", description: "Technical documentation shall be drawn up before the system is placed on the market and kept up to date.", applicableTo: ["HIGH"], sortOrder: 11, children: [
      { code: "Art. 11(1)", title: "Documentation before market placement", description: "Draw up technical documentation before the system is placed on the market or put into service.", sortOrder: 1 },
    ]},
    { code: "Art. 12", title: "Record-keeping", description: "High-risk AI systems shall allow for automatic recording of events (logs) throughout lifetime.", applicableTo: ["HIGH"], sortOrder: 12, children: [
      { code: "Art. 12(1)", title: "Automatic logging capability", description: "High-risk AI systems shall technically allow for the automatic recording of events.", sortOrder: 1 },
      { code: "Art. 12(2)", title: "Traceability of AI functioning", description: "Logging shall ensure traceability of the AI system's functioning throughout its lifecycle.", sortOrder: 2 },
    ]},
    { code: "Art. 13", title: "Transparency and information to deployers", description: "High-risk AI systems shall be designed and developed to ensure their operation is sufficiently transparent.", applicableTo: ["HIGH"], sortOrder: 13, children: [
      { code: "Art. 13(1)", title: "Sufficient transparency for interpretation", description: "Design and development to ensure operation is sufficiently transparent to enable deployers to interpret and use output appropriately.", sortOrder: 1 },
      { code: "Art. 13(2)", title: "Instructions for use", description: "Accompanied by instructions for use in appropriate digital format with concise, complete, correct and clear information.", sortOrder: 2 },
    ]},
    { code: "Art. 14", title: "Human oversight", description: "High-risk AI systems shall be designed to be effectively overseen by natural persons during use.", applicableTo: ["HIGH"], sortOrder: 14, children: [
      { code: "Art. 14(1)", title: "Design for effective human oversight", description: "Designed and developed to be effectively overseen by natural persons during the period of use.", sortOrder: 1 },
      { code: "Art. 14(2)", title: "Oversight measures in instructions", description: "Oversight measures shall be identified and built into the system by the provider, or identified as appropriate by the deployer.", sortOrder: 2 },
      { code: "Art. 14(3)", title: "Understand capabilities and limitations", description: "Persons responsible for oversight shall be able to properly understand the relevant capacities and limitations.", sortOrder: 3 },
      { code: "Art. 14(4)", title: "Override or interrupt capability", description: "Ability to decide not to use, override, or reverse the output of the high-risk AI system.", sortOrder: 4 },
    ]},
    { code: "Art. 15", title: "Accuracy, robustness and cybersecurity", description: "High-risk AI systems shall be designed and developed to achieve appropriate levels of accuracy, robustness and cybersecurity.", applicableTo: ["HIGH"], sortOrder: 15, children: [
      { code: "Art. 15(1)", title: "Appropriate accuracy levels", description: "Achieve an appropriate level of accuracy for their intended purpose.", sortOrder: 1 },
      { code: "Art. 15(2)", title: "Accuracy metrics in instructions", description: "Levels of accuracy and relevant accuracy metrics shall be declared in instructions for use.", sortOrder: 2 },
      { code: "Art. 15(3)", title: "Resilience to errors", description: "Designed to be resilient to errors, faults or inconsistencies within the system or its environment.", sortOrder: 3 },
      { code: "Art. 15(4)", title: "Robustness and technical redundancy", description: "Robustness achieved through appropriate technical redundancy solutions, which may include backup or fail-safe plans; systems that continue learning must address the risk of biased feedback loops.", sortOrder: 4 },
      { code: "Art. 15(5)", title: "Cybersecurity measures", description: "Resilience against attempts by unauthorised third parties to alter use, outputs or performance, including measures against data poisoning, model poisoning, adversarial examples and confidentiality attacks.", sortOrder: 5 },
    ]},

    // CHAPTER III - Provider & Deployer Obligations
    { code: "Art. 16", title: "Obligations of providers of high-risk AI systems", description: "Providers shall ensure compliance with requirements, establish quality management system, and maintain documentation.", applicableTo: ["HIGH"], sortOrder: 16, children: [] },
    { code: "Art. 17", title: "Quality management system", description: "Providers shall put a quality management system in place ensuring compliance.", applicableTo: ["HIGH"], sortOrder: 17, children: [] },
    { code: "Art. 26", title: "Obligations of deployers of high-risk AI systems", description: "Deployers shall use systems in accordance with instructions, ensure human oversight, monitor operation.", applicableTo: ["HIGH"], sortOrder: 26, children: [
      { code: "Art. 26(1)", title: "Use in accordance with instructions", description: "Take appropriate technical and organisational measures to ensure use in accordance with instructions for use.", sortOrder: 1 },
      { code: "Art. 26(2)", title: "Assign human oversight", description: "Assign human oversight to natural persons who have the necessary competence, training and authority.", sortOrder: 2 },
      { code: "Art. 26(5)", title: "Monitor operation and report risks", description: "Deployers shall monitor the operation of the high-risk AI system on the basis of the instructions for use and, where relevant, inform the provider (Art. 72), and inform the provider/distributor and market surveillance authority of risks (Art. 79(1)) and serious incidents.", sortOrder: 3 },
    ]},
    { code: "Art. 27", title: "Fundamental rights impact assessment", description: "Deployers of high-risk AI systems shall perform an assessment of impact on fundamental rights before use.", applicableTo: ["HIGH"], sortOrder: 27, children: [
      { code: "Art. 27(1)", title: "FRIA before putting into use", description: "Perform assessment of impact on fundamental rights before putting the high-risk AI system into use.", sortOrder: 1 },
      { code: "Art. 27(2)", title: "FRIA content requirements", description: "Description of deployer's processes, timeframe, categories of persons, specific risks, human oversight, and redress measures.", sortOrder: 2 },
      { code: "Art. 27(3)", title: "Notify market surveillance authority", description: "Notify the relevant market surveillance authority of the result of the assessment.", sortOrder: 3 },
    ]},

    // CHAPTER IV - Transparency
    { code: "Art. 50", title: "Transparency obligations for certain AI systems", description: "Providers and deployers of certain AI systems shall ensure transparency.", applicableTo: ["LIMITED", "HIGH"], sortOrder: 50, children: [
      { code: "Art. 50(1)", title: "AI interaction disclosure", description: "Providers shall ensure that AI systems intended to interact with persons are designed so persons are informed they are interacting with AI.", sortOrder: 1 },
      { code: "Art. 50(2)", title: "Synthetic content marking", description: "Providers of AI systems generating synthetic audio, image, video or text content shall ensure outputs are marked in a machine-readable format.", sortOrder: 2 },
      { code: "Art. 50(3)", title: "Emotion recognition disclosure", description: "Deployers of emotion recognition or biometric categorisation systems shall inform persons exposed to the operation of the system.", sortOrder: 3 },
      { code: "Art. 50(4)", title: "Deep fake disclosure", description: "Deployers of AI systems generating deep fakes shall disclose that the content has been artificially generated or manipulated.", sortOrder: 4 },
    ]},

    // CHAPTER V - General-Purpose AI
    { code: "Art. 53", title: "Obligations for providers of GPAI models", description: "Providers of general-purpose AI models shall comply with obligations related to documentation and transparency.", applicableTo: ["HIGH", "LIMITED", "MINIMAL"], sortOrder: 53, children: [
      { code: "Art. 53(1)(a)", title: "Technical documentation", description: "Draw up and keep up to date the technical documentation of the model.", sortOrder: 1 },
      { code: "Art. 53(1)(b)", title: "Information for downstream providers", description: "Make available information and documentation to providers of AI systems who intend to integrate the model.", sortOrder: 2 },
      { code: "Art. 53(1)(c)", title: "Copyright compliance policy", description: "Put in place a policy to comply with Union copyright law.", sortOrder: 3 },
      { code: "Art. 53(1)(d)", title: "Training data summary", description: "Draw up and make publicly available a sufficiently detailed summary of training data content.", sortOrder: 4 },
    ]},

    // CHAPTER IX - Post-market monitoring & serious incidents
    // Final-Act numbering: Art. 72 (post-market monitoring) and Art. 73
    // (serious incidents) — Arts. 61/62 were the 2021-proposal numbers.
    { code: "Art. 72", title: "Post-market monitoring by providers", description: "Providers shall establish and document a post-market monitoring system proportionate to the nature of the AI technologies and the risks of the high-risk AI system.", applicableTo: ["HIGH"], sortOrder: 72, children: [] },
    { code: "Art. 73", title: "Reporting of serious incidents", description: "Providers of high-risk AI systems placed on the Union market shall report any serious incident to the market surveillance authorities.", applicableTo: ["HIGH"], sortOrder: 73, children: [
      { code: "Art. 73(1)", title: "Report serious incidents", description: "Report any serious incident to the market surveillance authorities of the Member States where that incident occurred.", sortOrder: 1 },
      { code: "Art. 73(2)-(4)", title: "Reporting timelines", description: "Report immediately after establishing a causal link (or reasonable likelihood of one), and no later than 15 days after awareness; no later than 2 days for widespread infringements or serious incidents involving critical-infrastructure disruption; no later than 10 days in the event of death.", sortOrder: 2 },
    ]},

    // CHAPTER XIII - Final provisions: applicability timeline (Art. 113)
    // As amended by the Digital Omnibus on AI (adopted: EP 16 Jun 2026,
    // Council 29 Jun 2026, signed 8 Jul 2026 as PE-CONS 30/26; awaiting
    // Official Journal publication as of 17 Jul 2026 — re-verify the final
    // OJ number/text once published). The omnibus DEFERS Annex III high-risk
    // to 2 Dec 2027 and Annex I embedded high-risk to 2 Aug 2028, keeps
    // Art. 50 transparency at 2 Aug 2026, and adds two Art. 5 prohibitions
    // from 2 Dec 2026.
    { code: "Art. 113", title: "Entry into force and application", description: "The AI Act entered into force on 1 August 2024 and applies in stages (see sub-entries), as amended by the Digital Omnibus on AI (adopted 8 July 2026; Official Journal publication pending as of 17 July 2026).", applicableTo: ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"], sortOrder: 113, children: [
      { code: "Art. 113(a) — 2 Feb 2025", title: "Prohibitions and AI literacy apply", description: "Chapters I and II apply from 2 February 2025: general provisions, AI literacy (Art. 4), and prohibited AI practices (Art. 5).", sortOrder: 1 },
      { code: "Art. 113(b) — 2 Aug 2025", title: "GPAI, governance and penalties apply", description: "From 2 August 2025: notified-body rules (Chapter III, Section 4), GPAI model obligations (Chapter V), governance (Chapter VII), penalties (Chapter XII except Art. 101), and confidentiality (Art. 78).", sortOrder: 2 },
      { code: "Art. 113 — 2 Aug 2026", title: "Art. 50 transparency applies; GPAI enforcement begins", description: "From 2 August 2026: Art. 50 transparency obligations (chatbot disclosure, synthetic-content marking, deepfake labelling) apply — with a grace period to 2 December 2026 for machine-readable marking, only for systems placed on the market before 2 August 2026 — and the Commission's GPAI enforcement powers (Arts. 91-93, Art. 101 fines) begin. Annex III high-risk obligations do NOT apply on this date (deferred by the Digital Omnibus — see the 2 Dec 2027 entry).", sortOrder: 3 },
      { code: "Art. 5 — 2 Dec 2026", title: "New prohibitions: AI-generated CSAM and non-consensual intimate imagery", description: "From 2 December 2026 (Digital Omnibus): prohibitions on AI systems for generating child sexual abuse material and non-consensual intimate imagery. Providers are in scope where such generation is intended or reasonably foreseeable absent safeguards; deployers on deliberate misuse.", sortOrder: 4 },
      { code: "Art. 113 — 2 Dec 2027", title: "Annex III standalone high-risk obligations apply", description: "From 2 December 2027 (deferred from 2 August 2026 by the Digital Omnibus): the high-risk obligations for standalone Annex III systems apply, including conformity assessment, FRIA (Art. 27), registration, and Art. 72/73 post-market monitoring and serious-incident reporting.", sortOrder: 5 },
      { code: "Art. 113(c) — 2 Aug 2028", title: "Annex I product-embedded high-risk AI", description: "From 2 August 2028 (deferred from 2 August 2027 by the Digital Omnibus): Art. 6(1) classification and corresponding obligations for high-risk AI that is a safety component of (or is itself) a product under Annex I Union harmonisation legislation (e.g. medical devices under the MDR).", sortOrder: 6 },
    ]},

    // CHAPTER XII - Penalties
    { code: "Art. 99", title: "Penalties", description: "Member States shall lay down rules on penalties applicable to infringements.", applicableTo: ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"], sortOrder: 99, children: [
      { code: "Art. 99(3)", title: "Prohibited practices penalties", description: "Non-compliance with prohibited practices: up to EUR 35 million or 7% of total worldwide annual turnover.", sortOrder: 1 },
      { code: "Art. 99(4)", title: "High-risk non-compliance penalties", description: "Non-compliance with high-risk requirements: up to EUR 15 million or 3% of total worldwide annual turnover.", sortOrder: 2 },
      { code: "Art. 99(5)", title: "Incorrect information penalties", description: "Supply of incorrect information: up to EUR 7.5 million or 1% of total worldwide annual turnover.", sortOrder: 3 },
    ]},
  ];

  for (const req of euRequirements) {
    const parent = await prisma.complianceRequirement.upsert({
      where: { id: `eu-${req.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}` },
      update: { title: req.title, description: req.description, applicableTo: req.applicableTo as AIRiskLevel[], sortOrder: req.sortOrder },
      create: {
        id: `eu-${req.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        frameworkId: euAiAct.id,
        code: req.code,
        title: req.title,
        description: req.description,
        applicableTo: req.applicableTo as AIRiskLevel[],
        sortOrder: req.sortOrder,
      },
    });

    for (const child of req.children) {
      await prisma.complianceRequirement.upsert({
        where: { id: `eu-${child.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}` },
        update: { title: child.title, description: child.description, sortOrder: child.sortOrder },
        create: {
          id: `eu-${child.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          frameworkId: euAiAct.id,
          code: child.code,
          title: child.title,
          description: child.description,
          applicableTo: req.applicableTo as AIRiskLevel[],
          parentId: parent.id,
          sortOrder: child.sortOrder,
        },
      });
    }
  }

  const euTotal = euRequirements.reduce((sum, r) => sum + 1 + r.children.length, 0);
  console.log(`  Created EU AI Act: ${euTotal} requirements`);

  // ============================================================
  // NIST AI RMF
  // ============================================================

  console.log("  Creating NIST AI RMF framework...");

  const nistRmf = await prisma.complianceFramework.upsert({
    where: { code: "NIST_AI_RMF" },
    update: { name: "NIST AI Risk Management Framework", version: "1.0" },
    create: {
      code: "NIST_AI_RMF",
      name: "NIST AI Risk Management Framework",
      version: "1.0",
      description: "NIST AI 100-1: A framework for managing risks associated with AI systems across their lifecycle.",
    },
  });

  const nistFunctions = [
    { code: "GOVERN", title: "Govern", description: "Cultivate and implement a culture of risk management within organizations designing, developing, deploying, or using AI systems.", sortOrder: 1, children: [
      { code: "GOVERN 1", title: "Policies for AI risk management", description: "Policies, processes, procedures, and practices are in place and used to map, measure, and manage AI risks.", sortOrder: 1 },
      { code: "GOVERN 2", title: "Accountability structures", description: "Accountability structures are in place so that the appropriate teams and individuals are empowered, responsible, and trained.", sortOrder: 2 },
      { code: "GOVERN 3", title: "Workforce diversity and AI expertise", description: "Workforce diversity, equity, inclusion, and accessibility processes are prioritized in the mapping, measuring, and managing of AI risks.", sortOrder: 3 },
      { code: "GOVERN 4", title: "Organizational risk tolerance", description: "Organizational teams are committed to a culture that considers and communicates AI risk.", sortOrder: 4 },
      { code: "GOVERN 5", title: "Processes for engagement", description: "Processes are in place for robust engagement with relevant AI actors.", sortOrder: 5 },
      { code: "GOVERN 6", title: "Policies for 3rd-party entities", description: "Policies and procedures are in place to address AI risks and benefits arising from third-party software and data.", sortOrder: 6 },
    ]},
    { code: "MAP", title: "Map", description: "Establish context to frame risks related to an AI system.", sortOrder: 2, children: [
      { code: "MAP 1", title: "Intended context of use", description: "Context is established and understood: intended purposes, potentially beneficial uses, context-specific laws and norms.", sortOrder: 1 },
      { code: "MAP 2", title: "Categorize AI system", description: "Categorization of the AI system is performed, including task, methods, and knowledge limits.", sortOrder: 2 },
      { code: "MAP 3", title: "Benefits and costs", description: "AI capabilities, targeted usage, goals, and expected benefits and costs compared with appropriate benchmarks are understood.", sortOrder: 3 },
      { code: "MAP 4", title: "Risks and impacts", description: "Risks and benefits are mapped for all components of the AI system including third-party software and data.", sortOrder: 4 },
      { code: "MAP 5", title: "Likelihood and impact", description: "Likelihood and magnitude of each identified impact based on expected use, past uses, and foreseeable misuse/abuse.", sortOrder: 5 },
    ]},
    { code: "MEASURE", title: "Measure", description: "Employ quantitative, qualitative, or mixed-method tools, techniques, and methodologies to analyze, assess, benchmark, and monitor AI risk.", sortOrder: 3, children: [
      { code: "MEASURE 1", title: "Appropriate methods and metrics", description: "Appropriate methods and metrics are identified and applied.", sortOrder: 1 },
      { code: "MEASURE 2", title: "AI systems evaluated", description: "AI systems are evaluated for trustworthy characteristics.", sortOrder: 2 },
      { code: "MEASURE 3", title: "Mechanisms for tracking", description: "Mechanisms for tracking identified AI risks over time are in place.", sortOrder: 3 },
      { code: "MEASURE 4", title: "Feedback for model improvement", description: "Feedback about efficacy of measurement is collected and integrated into AI system updates.", sortOrder: 4 },
    ]},
    { code: "MANAGE", title: "Manage", description: "Allocate risk resources to mapped and measured risks on a regular basis.", sortOrder: 4, children: [
      { code: "MANAGE 1", title: "AI risks prioritized", description: "AI risks based on assessments and other analytical output are prioritized, responded to, and managed.", sortOrder: 1 },
      { code: "MANAGE 2", title: "Strategies to maximize benefits", description: "Strategies to maximize AI benefits and minimize negative impacts are planned, prepared, implemented, documented, and monitored.", sortOrder: 2 },
      { code: "MANAGE 3", title: "AI risks and benefits from 3rd parties", description: "AI risks and benefits from third-party resources are regularly monitored, and risk controls are applied.", sortOrder: 3 },
      { code: "MANAGE 4", title: "Risk treatments documented", description: "Risk treatments including response and recovery and communication plans are documented and monitored regularly.", sortOrder: 4 },
    ]},
  ];

  const allRiskLevels: ("UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL")[] = ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"];

  for (const func of nistFunctions) {
    const parent = await prisma.complianceRequirement.upsert({
      where: { id: `nist-${func.code.toLowerCase().replace(/\s+/g, "-")}` },
      update: { title: func.title, description: func.description, sortOrder: func.sortOrder },
      create: {
        id: `nist-${func.code.toLowerCase().replace(/\s+/g, "-")}`,
        frameworkId: nistRmf.id,
        code: func.code,
        title: func.title,
        description: func.description,
        applicableTo: allRiskLevels,
        sortOrder: func.sortOrder,
      },
    });

    for (const child of func.children) {
      await prisma.complianceRequirement.upsert({
        where: { id: `nist-${child.code.toLowerCase().replace(/\s+/g, "-")}` },
        update: { title: child.title, description: child.description, sortOrder: child.sortOrder },
        create: {
          id: `nist-${child.code.toLowerCase().replace(/\s+/g, "-")}`,
          frameworkId: nistRmf.id,
          code: child.code,
          title: child.title,
          description: child.description,
          applicableTo: allRiskLevels,
          parentId: parent.id,
          sortOrder: child.sortOrder,
        },
      });
    }
  }

  const nistTotal = nistFunctions.reduce((sum, f) => sum + 1 + f.children.length, 0);
  console.log(`  Created NIST AI RMF: ${nistTotal} requirements`);

  // ============================================================
  // ISO 42001
  // ============================================================

  console.log("  Creating ISO 42001 framework...");

  const iso42001 = await prisma.complianceFramework.upsert({
    where: { code: "ISO_42001" },
    update: { name: "ISO/IEC 42001", version: "2023" },
    create: {
      code: "ISO_42001",
      name: "ISO/IEC 42001",
      version: "2023",
      description: "ISO/IEC 42001:2023 — Artificial Intelligence Management System (AIMS). Specifies requirements for establishing, implementing, maintaining, and continually improving an AI management system.",
    },
  });

  const isoClauses = [
    { code: "4", title: "Context of the organization", description: "Understanding the organization, needs and expectations of interested parties, scope, and AIMS.", sortOrder: 4, children: [
      { code: "4.1", title: "Understanding the organization and its context", description: "Determine external and internal issues relevant to AI management system purpose and strategic direction.", sortOrder: 1 },
      { code: "4.2", title: "Understanding needs and expectations of interested parties", description: "Determine interested parties relevant to the AIMS and their requirements.", sortOrder: 2 },
      { code: "4.3", title: "Determining the scope of the AIMS", description: "Determine boundaries and applicability of the AI management system.", sortOrder: 3 },
      { code: "4.4", title: "AI management system", description: "Establish, implement, maintain and continually improve an AI management system.", sortOrder: 4 },
    ]},
    { code: "5", title: "Leadership", description: "Top management commitment, AI policy, and organizational roles.", sortOrder: 5, children: [
      { code: "5.1", title: "Leadership and commitment", description: "Top management shall demonstrate leadership and commitment with respect to the AIMS.", sortOrder: 1 },
      { code: "5.2", title: "AI policy", description: "Establish an AI policy appropriate to the purpose of the organization.", sortOrder: 2 },
      { code: "5.3", title: "Organizational roles, responsibilities and authorities", description: "Ensure responsibilities and authorities for relevant roles are assigned and communicated.", sortOrder: 3 },
    ]},
    { code: "6", title: "Planning", description: "Actions to address risks and opportunities, AI objectives, and planning of changes.", sortOrder: 6, children: [
      { code: "6.1", title: "Actions to address risks and opportunities", description: "Determine risks and opportunities that need to be addressed for the AIMS.", sortOrder: 1 },
      { code: "6.1.2", title: "AI risk assessment", description: "Define and apply an AI risk assessment process considering AI-specific risks.", sortOrder: 2 },
      { code: "6.1.3", title: "AI risk treatment", description: "Define and apply an AI risk treatment process.", sortOrder: 3 },
      { code: "6.1.4", title: "AI system impact assessment", description: "Assess potential impacts of AI systems on individuals, groups, and societies.", sortOrder: 4 },
      { code: "6.2", title: "AI objectives and planning to achieve them", description: "Establish AI objectives at relevant functions, levels and processes.", sortOrder: 5 },
    ]},
    { code: "7", title: "Support", description: "Resources, competence, awareness, communication, and documented information.", sortOrder: 7, children: [
      { code: "7.1", title: "Resources", description: "Determine and provide the resources needed for the AIMS.", sortOrder: 1 },
      { code: "7.2", title: "Competence", description: "Determine necessary competence of persons doing work affecting AI performance.", sortOrder: 2 },
      { code: "7.3", title: "Awareness", description: "Persons doing work shall be aware of the AI policy and their contribution to the AIMS.", sortOrder: 3 },
      { code: "7.4", title: "Communication", description: "Determine internal and external communications relevant to the AIMS.", sortOrder: 4 },
      { code: "7.5", title: "Documented information", description: "The AIMS shall include documented information required by this standard.", sortOrder: 5 },
    ]},
    { code: "8", title: "Operation", description: "Operational planning and control, AI risk assessment, and AI risk treatment.", sortOrder: 8, children: [
      { code: "8.1", title: "Operational planning and control", description: "Plan, implement and control the processes needed to meet requirements.", sortOrder: 1 },
      { code: "8.2", title: "AI risk assessment", description: "Perform AI risk assessments at planned intervals or when significant changes are proposed.", sortOrder: 2 },
      { code: "8.3", title: "AI risk treatment", description: "Implement the AI risk treatment plan.", sortOrder: 3 },
      { code: "8.4", title: "AI system impact assessment", description: "Conduct impact assessments for AI systems.", sortOrder: 4 },
    ]},
    { code: "9", title: "Performance evaluation", description: "Monitoring, measurement, analysis, evaluation, internal audit, and management review.", sortOrder: 9, children: [
      { code: "9.1", title: "Monitoring, measurement, analysis and evaluation", description: "Determine what needs to be monitored and measured for AI systems.", sortOrder: 1 },
      { code: "9.2", title: "Internal audit", description: "Conduct internal audits at planned intervals to provide information on the AIMS.", sortOrder: 2 },
      { code: "9.3", title: "Management review", description: "Top management shall review the organization's AIMS at planned intervals.", sortOrder: 3 },
    ]},
    { code: "10", title: "Improvement", description: "Nonconformity, corrective action, and continual improvement.", sortOrder: 10, children: [
      { code: "10.1", title: "Continual improvement", description: "Continually improve the suitability, adequacy and effectiveness of the AIMS.", sortOrder: 1 },
      { code: "10.2", title: "Nonconformity and corrective action", description: "When a nonconformity occurs, react, evaluate, implement corrective action, and review effectiveness.", sortOrder: 2 },
    ]},
  ];

  for (const clause of isoClauses) {
    const parent = await prisma.complianceRequirement.upsert({
      where: { id: `iso-${clause.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}` },
      update: { title: clause.title, description: clause.description, sortOrder: clause.sortOrder },
      create: {
        id: `iso-${clause.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        frameworkId: iso42001.id,
        code: `Clause ${clause.code}`,
        title: clause.title,
        description: clause.description,
        applicableTo: allRiskLevels,
        sortOrder: clause.sortOrder,
      },
    });

    for (const child of clause.children) {
      await prisma.complianceRequirement.upsert({
        where: { id: `iso-${child.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}` },
        update: { title: child.title, description: child.description, sortOrder: child.sortOrder },
        create: {
          id: `iso-${child.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          frameworkId: iso42001.id,
          code: `Clause ${child.code}`,
          title: child.title,
          description: child.description,
          applicableTo: allRiskLevels,
          parentId: parent.id,
          sortOrder: child.sortOrder,
        },
      });
    }
  }

  const isoTotal = isoClauses.reduce((sum, c) => sum + 1 + c.children.length, 0);
  console.log(`  Created ISO 42001: ${isoTotal} requirements`);

  console.log(`\nDone! Total: ${euTotal + nistTotal + isoTotal} compliance requirements across 3 frameworks.`);
}

main()
  .catch((e) => {
    console.error("Error seeding frameworks:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
