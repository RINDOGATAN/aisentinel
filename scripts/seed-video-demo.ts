// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🎬 Enriching demo data for video recordings...\n");

  const org = await prisma.organization.findUnique({ where: { slug: "acme-ai" } });
  if (!org) throw new Error("Demo org not found — run full seed chain first");
  const user = await prisma.user.findUnique({ where: { email: "demo@aisentinel.example" } });
  if (!user) throw new Error("Demo user not found");
  const orgId = org.id;
  const userId = user.id;

  // Load frameworks and build code→ID maps
  const [euFw, nistFw, isoFw] = await Promise.all([
    prisma.complianceFramework.findUnique({ where: { code: "EU_AI_ACT" } }),
    prisma.complianceFramework.findUnique({ where: { code: "NIST_AI_RMF" } }),
    prisma.complianceFramework.findUnique({ where: { code: "ISO_42001" } }),
  ]);

  // Build requirement code→ID maps for each framework
  const buildReqMap = async (frameworkId: string) => {
    const reqs = await prisma.complianceRequirement.findMany({ where: { frameworkId } });
    const map: Record<string, string> = {};
    for (const r of reqs) map[r.code] = r.id;
    return map;
  };

  const euReqs = euFw ? await buildReqMap(euFw.id) : {};
  const nistReqs = nistFw ? await buildReqMap(nistFw.id) : {};
  const isoReqs = isoFw ? await buildReqMap(isoFw.id) : {};

  // Helper: create compliance mapping with evidence
  type MappingInput = {
    aiSystemId: string;
    reqCode: string;
    reqMap: Record<string, string>;
    status: "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE" | "NOT_ASSESSED";
    notes?: string;
    assessedBy?: string;
    assessedAt?: Date;
    evidence?: Array<{ type: "POLICY" | "DOCUMENT" | "TEST_RESULT" | "MONITORING" | "AUDIT" | "TRAINING" | "APPROVAL" | "OTHER"; title: string; description?: string; url?: string }>;
  };

  async function upsertMapping(m: MappingInput) {
    const reqId = m.reqMap[m.reqCode];
    if (!reqId) { console.log(`  WARN: requirement ${m.reqCode} not found`); return; }

    const mapping = await prisma.complianceMapping.upsert({
      where: { aiSystemId_requirementId: { aiSystemId: m.aiSystemId, requirementId: reqId } },
      update: { status: m.status, notes: m.notes, assessedBy: m.assessedBy ?? null, assessedAt: m.assessedAt ?? null },
      create: { organizationId: orgId, aiSystemId: m.aiSystemId, requirementId: reqId, status: m.status, notes: m.notes, assessedBy: m.assessedBy ?? null, assessedAt: m.assessedAt ?? null },
    });

    if (m.evidence && m.evidence.length > 0) {
      await prisma.complianceEvidence.deleteMany({ where: { complianceMappingId: mapping.id } });
      for (const e of m.evidence) {
        await prisma.complianceEvidence.create({
          data: { complianceMappingId: mapping.id, organizationId: orgId, type: e.type, title: e.title, description: e.description, url: e.url, addedBy: userId, addedAt: m.assessedAt ?? new Date("2026-03-01") },
        });
      }
    }
  }

  // ============================================================
  // 1. NIST AI RMF mappings for Credit Scoring (demo-system-credit)
  // ============================================================

  console.log("1. Creating NIST AI RMF mappings for Credit Scoring...");

  const nistCreditMappings: MappingInput[] = [
    {
      aiSystemId: "demo-system-credit", reqCode: "GOVERN", reqMap: nistReqs, status: "COMPLIANT",
      notes: "AI governance framework established with dedicated Risk Committee overseeing all AI systems.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "POLICY", title: "AI Governance Framework v2.0" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "GOVERN 1", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Risk management policies and procedures documented and reviewed quarterly.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "POLICY", title: "AI Risk Management Policy v2.1" }, { type: "DOCUMENT", title: "Credit Scoring Risk Register — 28 risks tracked" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "GOVERN 2", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Accountability structures defined with RACI matrix. Risk Committee meets monthly.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "AI Governance RACI Matrix" }, { type: "APPROVAL", title: "Risk Committee Charter — Board Approved" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "GOVERN 3", reqMap: nistReqs, status: "NON_COMPLIANT",
      notes: "Workforce diversity review for AI team not yet conducted. DEI assessment scheduled for Q2 2026.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "GOVERN 4", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Risk tolerance levels defined per system category. Credit scoring classified as low tolerance.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "AI Risk Appetite Statement 2026" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "GOVERN 5", reqMap: nistReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Stakeholder engagement plan exists but consumer advisory panel not yet convened for credit scoring.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "AI Stakeholder Engagement Plan" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "GOVERN 6", reqMap: nistReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Third-party risk policy covers vendors but credit bureau API audit not completed.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "POLICY", title: "Third-Party AI Risk Policy v1.0" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MAP", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Context established for credit scoring: regulatory requirements (EU AI Act, EBA Guidelines), intended use, and deployment boundaries documented.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "Credit Scoring System Context Document" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MAP 1", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Intended purposes, beneficial uses, and applicable regulations documented.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "Credit Scoring System Design Document v3" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MAP 2", reqMap: nistReqs, status: "NOT_ASSESSED",
      notes: "Interdisciplinary categorization pending — AI ethics board review scheduled.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MAP 3", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Cost-benefit analysis completed. 4x ROI over manual underwriting.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "Credit Scoring ROI Analysis" }, { type: "TEST_RESULT", title: "Pilot Performance Report — 500 applications" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MAP 4", reqMap: nistReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Model risks mapped but operational and infrastructure risks incomplete.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "Model Risk Assessment v1.2" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MAP 5", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Impact likelihood matrix completed for all identified risks.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "Risk Impact & Likelihood Matrix — Credit Scoring" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MEASURE", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Measurement framework established with defined metrics, tools, and review cadence.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "AI Measurement Framework — Credit Scoring" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MEASURE 1", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Key metrics: AUC-ROC (0.92), Gini (0.84), demographic parity ratio, equal opportunity difference.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "TEST_RESULT", title: "Model Validation Report Q4 2025" }, { type: "MONITORING", title: "Fairness Metrics Dashboard — Live" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MEASURE 2", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Trustworthiness evaluation covers accuracy, fairness, transparency, and security.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "AUDIT", title: "Trustworthiness Evaluation Report 2025" }, { type: "TEST_RESULT", title: "Bias Audit Results Q4 2025" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MEASURE 3", reqMap: nistReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Drift detection in place but alerting thresholds not finalized for all metrics.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "MONITORING", title: "Model Drift Monitoring Configuration" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MEASURE 4", reqMap: nistReqs, status: "NOT_ASSESSED",
      notes: "Feedback integration process not yet formalized.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MANAGE", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Risk management processes active with regular monitoring and response procedures.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "POLICY", title: "AI Risk Management Procedures" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MANAGE 1", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Risk treatments prioritized: 28 risks, 12 high-priority mitigations implemented.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "Risk Treatment Register — Credit Scoring" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MANAGE 2", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Human-in-the-loop design maximizes benefits while controlling risk for borderline cases.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "Human Oversight Procedures — Credit Scoring" }, { type: "POLICY", title: "Automated Decision Policy" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MANAGE 3", reqMap: nistReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Credit bureau dependency monitored but no automated risk controls for API failures.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "MONITORING", title: "Third-Party Service Monitoring Dashboard" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "MANAGE 4", reqMap: nistReqs, status: "COMPLIANT",
      notes: "Recovery plan documented and tested. Failover to manual underwriting within 4 hours.",
      assessedBy: userId, assessedAt: new Date("2026-02-15"),
      evidence: [{ type: "DOCUMENT", title: "Incident Response & Recovery Plan" }, { type: "TEST_RESULT", title: "Disaster Recovery Test Feb 2026" }],
    },
  ];

  for (const m of nistCreditMappings) {
    await upsertMapping(m);
  }

  console.log(`  Created ${nistCreditMappings.length} NIST AI RMF mappings for Credit Scoring`);

  // ============================================================
  // 2. ISO 42001 mappings for Fraud Detection (demo-system-fraud)
  // ============================================================

  console.log("2. Creating ISO 42001 mappings for Fraud Detection...");

  const isoFraudMappings: MappingInput[] = [
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 4", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Organizational context for AI operations fully documented.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 4.1", reqMap: isoReqs, status: "COMPLIANT",
      notes: "External factors (EU AI Act, financial regulation) and internal factors (risk appetite, technology stack) analyzed.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "Organizational Context Analysis — AI Operations" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 4.2", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Interested parties identified: customers, regulators, data subjects, auditors.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "Interested Parties Register — Fraud Detection" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 4.3", reqMap: isoReqs, status: "COMPLIANT",
      notes: "AIMS scope covers all deployed AI systems including fraud detection.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AIMS Scope Statement v2.0" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 4.4", reqMap: isoReqs, status: "COMPLIANT",
      notes: "AI management system established and maintained.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 5", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Leadership commitment demonstrated through board resolution and resource allocation.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 5.1", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Board-level AI governance resolution in place.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "APPROVAL", title: "Board AI Governance Resolution 2025-04" }, { type: "POLICY", title: "AI Governance Charter" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 5.2", reqMap: isoReqs, status: "PARTIALLY_COMPLIANT",
      notes: "AI policy exists but needs update to cover fraud-specific operational objectives.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "POLICY", title: "AI Policy v2.0 — General (update pending)" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 5.3", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Roles and responsibilities assigned: AI Officer, Risk Committee, ML Operations.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AI RACI Matrix and Role Descriptions" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 6", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Planning processes for risks, opportunities, and objectives established.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 6.1", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Risk and opportunity assessment process defined for all AI systems.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AI Risk & Opportunity Assessment Process" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 6.1.2", reqMap: isoReqs, status: "COMPLIANT",
      notes: "AI risk assessment process covers model risk, data risk, and operational risk.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "Fraud Detection Risk Assessment v3.2" }, { type: "AUDIT", title: "External Risk Audit 2025" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 6.1.3", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Risk treatment plan implemented with 12 active controls.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "Risk Treatment Plan — Fraud Detection" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 6.1.4", reqMap: isoReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Impact assessment conducted but societal impact section needs expansion.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AI System Impact Assessment — Fraud Detection (draft)" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 6.2", reqMap: isoReqs, status: "COMPLIANT",
      notes: "AI objectives aligned with business objectives and measured quarterly.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AI Objectives & KPIs — 2026" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 7", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Support resources allocated for AI management system operations.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 7.1", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Dedicated ML team (8 engineers), compute infrastructure, and monitoring tools.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AI Resource Allocation Plan 2026" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 7.2", reqMap: isoReqs, status: "COMPLIANT",
      notes: "ML team competencies assessed and training plan in place.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "TRAINING", title: "ML Team Competency Matrix & Training Records" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 7.3", reqMap: isoReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Awareness program exists but completion rate at 78% (target: 95%).",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "TRAINING", title: "AI Awareness Training Completion Report" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 7.4", reqMap: isoReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Internal communication channels defined but external stakeholder communication plan incomplete.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 7.5", reqMap: isoReqs, status: "COMPLIANT",
      notes: "All AI documentation version-controlled and accessible.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AI Documentation Management Procedure" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 8", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Operational controls for AI system lifecycle established.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 8.1", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Operational procedures cover development, testing, deployment, and monitoring.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AI System Operations Manual — Fraud Detection" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 8.2", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Quarterly risk assessments performed with documented results.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "TEST_RESULT", title: "Quarterly Risk Assessment Q4 2025" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 8.3", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Risk treatment measures implemented and verified.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "Risk Treatment Implementation Evidence" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 8.4", reqMap: isoReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Impact assessments conducted for significant changes but process needs formalization.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 9", reqMap: isoReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Performance evaluation processes partially in place.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 9.1", reqMap: isoReqs, status: "NOT_ASSESSED",
      notes: "Monitoring and measurement framework update pending.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 9.2", reqMap: isoReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Internal audit conducted but scope did not cover all ISO 42001 controls.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "AUDIT", title: "Internal Audit Report 2025 — Partial Scope" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 9.3", reqMap: isoReqs, status: "NOT_ASSESSED",
      notes: "Management review scheduled for Q2 2026.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 10", reqMap: isoReqs, status: "NOT_ASSESSED",
      notes: "Improvement processes under development.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 10.1", reqMap: isoReqs, status: "COMPLIANT",
      notes: "Continuous improvement process established for AI models.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "AI Continuous Improvement Process" }, { type: "MONITORING", title: "Real-time Performance Dashboard — Fraud Detection" }],
    },
    {
      aiSystemId: "demo-system-fraud", reqCode: "Clause 10.2", reqMap: isoReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Nonconformity register exists with 3 items closed and 1 open.",
      assessedBy: userId, assessedAt: new Date("2026-03-01"),
      evidence: [{ type: "DOCUMENT", title: "Nonconformity Register — 1 open item" }],
    },
  ];

  for (const m of isoFraudMappings) {
    await upsertMapping(m);
  }

  console.log(`  Created ${isoFraudMappings.length} ISO 42001 mappings for Fraud Detection`);

  // ============================================================
  // 3. Expanded EU AI Act mappings
  // ============================================================

  console.log("3. Creating expanded EU AI Act mappings...");

  // 3a. Chatbot (LIMITED risk, 8 mappings)
  const euChatbotMappings: MappingInput[] = [
    {
      aiSystemId: "demo-system-chatbot", reqCode: "Art. 13", reqMap: euReqs, status: "COMPLIANT",
      notes: "Transparency information provided to all deployers.",
      assessedBy: userId, assessedAt: new Date("2026-01-15"),
      evidence: [{ type: "DOCUMENT", title: "Chatbot Transparency Documentation" }],
    },
    {
      aiSystemId: "demo-system-chatbot", reqCode: "Art. 13(1)", reqMap: euReqs, status: "COMPLIANT",
      notes: "Operation sufficiently transparent for deployers to interpret outputs.",
      assessedBy: userId, assessedAt: new Date("2026-01-15"),
    },
    {
      aiSystemId: "demo-system-chatbot", reqCode: "Art. 50", reqMap: euReqs, status: "COMPLIANT",
      notes: "Transparency obligations met for AI interaction.",
      assessedBy: userId, assessedAt: new Date("2026-01-15"),
    },
    {
      aiSystemId: "demo-system-chatbot", reqCode: "Art. 50(1)", reqMap: euReqs, status: "COMPLIANT",
      notes: "Users clearly informed they are interacting with an AI system via persistent banner.",
      assessedBy: userId, assessedAt: new Date("2026-01-15"),
      evidence: [{ type: "POLICY", title: "AI Interaction Disclosure Policy" }, { type: "MONITORING", title: "Chatbot Disclosure Verification Test Results" }],
    },
    {
      aiSystemId: "demo-system-chatbot", reqCode: "Art. 50(2)", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "AI-generated responses not yet machine-tagged per technical standard. Implementation planned for Q2 2026.",
      assessedBy: userId, assessedAt: new Date("2026-01-15"),
    },
    {
      aiSystemId: "demo-system-chatbot", reqCode: "Art. 53", reqMap: euReqs, status: "NOT_APPLICABLE",
      notes: "Organization is deployer, not provider of the underlying GPAI model.",
      assessedBy: userId, assessedAt: new Date("2026-01-15"),
    },
    {
      aiSystemId: "demo-system-chatbot", reqCode: "Art. 73", reqMap: euReqs, status: "COMPLIANT",
      notes: "Incident reporting procedure covers chatbot incidents.",
      assessedBy: userId, assessedAt: new Date("2026-01-15"),
      evidence: [{ type: "POLICY", title: "AI Incident Reporting Procedure — All Systems" }],
    },
    {
      aiSystemId: "demo-system-chatbot", reqCode: "Art. 99", reqMap: euReqs, status: "COMPLIANT",
      notes: "Penalties framework understood and documented.",
      assessedBy: userId, assessedAt: new Date("2026-01-15"),
    },
  ];

  for (const m of euChatbotMappings) {
    await upsertMapping(m);
  }

  console.log(`  3a. Created ${euChatbotMappings.length} EU AI Act mappings for Chatbot`);

  // 3b. Credit Scoring (HIGH risk, 15 mappings)
  const euCreditMappings: MappingInput[] = [
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 9", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Risk management system established but FRIA still under review.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
      evidence: [{ type: "DOCUMENT", title: "Risk Management System — Credit Scoring" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 9(2)", reqMap: euReqs, status: "COMPLIANT",
      notes: "23 known and 8 foreseeable risks identified and analyzed.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
      evidence: [{ type: "DOCUMENT", title: "Risk Register — Credit Scoring v1.0" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 9(5)", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Testing underway but not all risk scenarios covered.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 10", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Data governance practices in place but documentation needs update.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
      evidence: [{ type: "POLICY", title: "Data Governance Policy — Credit Data" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 11", reqMap: euReqs, status: "COMPLIANT",
      notes: "Technical documentation package complete.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
      evidence: [{ type: "DOCUMENT", title: "Technical Documentation — CreditScore XGBoost v3" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 12", reqMap: euReqs, status: "COMPLIANT",
      notes: "All predictions logged with features, model version, and outcome.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
      evidence: [{ type: "MONITORING", title: "Prediction Logging System — Active" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 13", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Instructions for use drafted but pending final review.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 14", reqMap: euReqs, status: "COMPLIANT",
      notes: "Three-tier human oversight: in-the-loop, on-the-loop, in-command.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
      evidence: [{ type: "DOCUMENT", title: "Human Oversight Procedures — Credit Scoring" }, { type: "TRAINING", title: "Underwriter AI Training Completion Records" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 15", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Accuracy tested (AUC-ROC 0.92) but adversarial robustness testing pending.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 15(1)", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Accuracy appropriate but robustness under evaluation.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 26", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "Deployer obligations documented but not all implemented pre-deployment.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 27", reqMap: euReqs, status: "PARTIALLY_COMPLIANT",
      notes: "FRIA submitted for review but not yet approved.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
      evidence: [{ type: "DOCUMENT", title: "FRIA Draft — Credit Risk Scoring (Under Review)" }],
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 72", reqMap: euReqs, status: "NOT_ASSESSED",
      notes: "Post-market monitoring not applicable until deployment.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
    },
    {
      aiSystemId: "demo-system-credit", reqCode: "Art. 73", reqMap: euReqs, status: "COMPLIANT",
      notes: "Incident reporting procedure established.",
      assessedBy: userId, assessedAt: new Date("2026-02-20"),
      evidence: [{ type: "POLICY", title: "AI Incident Reporting Procedure" }],
    },
  ];

  for (const m of euCreditMappings) {
    await upsertMapping(m);
  }

  console.log(`  3b. Created ${euCreditMappings.length} EU AI Act mappings for Credit Scoring`);

  // 3c. Predictive Maintenance (MINIMAL risk, 5 mappings)
  const euPredMaintMappings: MappingInput[] = [
    {
      aiSystemId: "demo-system-pred-maint", reqCode: "Art. 1", reqMap: euReqs, status: "NOT_APPLICABLE",
      notes: "General provision — awareness documented.",
      assessedBy: userId, assessedAt: new Date("2026-01-10"),
    },
    {
      aiSystemId: "demo-system-pred-maint", reqCode: "Art. 50", reqMap: euReqs, status: "NOT_APPLICABLE",
      notes: "System does not interact with natural persons directly.",
      assessedBy: userId, assessedAt: new Date("2026-01-10"),
    },
    {
      aiSystemId: "demo-system-pred-maint", reqCode: "Art. 53", reqMap: euReqs, status: "NOT_APPLICABLE",
      notes: "Organization is provider of custom model, not GPAI.",
      assessedBy: userId, assessedAt: new Date("2026-01-10"),
    },
    {
      aiSystemId: "demo-system-pred-maint", reqCode: "Art. 73", reqMap: euReqs, status: "COMPLIANT",
      notes: "Incident reporting procedure covers all deployed systems.",
      assessedBy: userId, assessedAt: new Date("2026-01-10"),
      evidence: [{ type: "POLICY", title: "AI Incident Reporting Procedure — All Systems" }],
    },
    {
      aiSystemId: "demo-system-pred-maint", reqCode: "Art. 99", reqMap: euReqs, status: "COMPLIANT",
      notes: "Penalty framework understood. Minimal risk = limited obligations.",
      assessedBy: userId, assessedAt: new Date("2026-01-10"),
    },
  ];

  for (const m of euPredMaintMappings) {
    await upsertMapping(m);
  }

  const totalEuMappings = euChatbotMappings.length + euCreditMappings.length + euPredMaintMappings.length;
  console.log(`  3c. Created ${euPredMaintMappings.length} EU AI Act mappings for Predictive Maintenance`);
  console.log(`  Total EU AI Act mappings: ${totalEuMappings}`);

  // ============================================================
  // 4. Enrich incidents with timelines / tasks / notifications
  // ============================================================

  console.log("4. Enriching incidents with timelines, tasks, and notifications...");

  // 4a. Gender Bias Incident (demo-incident-bias, RESOLVED)
  const biasTimeline = [
    { id: "demo-video-tl-bias-1", incidentId: "demo-incident-bias", organizationId: orgId, action: "Investigation initiated", description: "HR analytics team began statistical analysis after internal complaint about screening disparities.", performedBy: userId, performedAt: new Date("2025-11-01") },
    { id: "demo-video-tl-bias-2", incidentId: "demo-incident-bias", organizationId: orgId, action: "Root cause confirmed", description: "Training data analysis revealed 78% male representation in historical engineering hires. Model learned to associate male-correlated resume features with higher scores.", performedBy: userId, performedAt: new Date("2025-11-10") },
    { id: "demo-video-tl-bias-3", incidentId: "demo-incident-bias", organizationId: orgId, action: "Model retraining initiated", description: "Retraining with balanced dataset and equalized odds fairness constraints. Validation dataset expanded with diverse candidates.", performedBy: userId, performedAt: new Date("2025-11-25") },
    { id: "demo-video-tl-bias-4", incidentId: "demo-incident-bias", organizationId: orgId, action: "Validation completed", description: "Gender parity confirmed in retrained model: male/female mean score gap reduced from 9.5 to 1.2 points. Passed fairness thresholds across all demographic groups.", performedBy: userId, performedAt: new Date("2025-12-10") },
    { id: "demo-video-tl-bias-5", incidentId: "demo-incident-bias", organizationId: orgId, action: "Incident resolved — corrective actions complete", description: "Retrained model deployed. 15 affected applicants contacted and offered re-screening. Quarterly bias audit established as ongoing control.", performedBy: userId, performedAt: new Date("2025-12-20") },
  ];

  for (const t of biasTimeline) {
    await prisma.aIIncidentTimeline.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  console.log("  4a. Created 5 timeline entries for Gender Bias incident");

  // 4b. Model Drift Incident (demo-incident-drift, INVESTIGATING)
  const driftTimeline = [
    { id: "demo-video-tl-drift-1", incidentId: "demo-incident-drift", organizationId: orgId, action: "Monitoring alert triggered", description: "Automated drift detection flagged fraud detection precision drop below 90% threshold (89.7%).", performedBy: userId, performedAt: new Date("2026-02-10") },
    { id: "demo-video-tl-drift-2", incidentId: "demo-incident-drift", organizationId: orgId, action: "Investigation started", description: "ML team analyzing transaction pattern shifts and feature distribution changes.", performedBy: userId, performedAt: new Date("2026-02-11") },
    { id: "demo-video-tl-drift-3", incidentId: "demo-incident-drift", organizationId: orgId, action: "Preliminary findings", description: "International transaction volume increased 40% due to new merchant partnerships. Training data does not reflect this distribution shift.", performedBy: userId, performedAt: new Date("2026-02-15") },
  ];

  for (const t of driftTimeline) {
    await prisma.aIIncidentTimeline.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  const driftTasks = [
    { id: "demo-video-task-drift-1", incidentId: "demo-incident-drift", organizationId: orgId, title: "Analyze transaction distribution shift in detail", status: "IN_PROGRESS" as const, assignedTo: "ML Engineering", dueDate: new Date("2026-02-20") },
    { id: "demo-video-task-drift-2", incidentId: "demo-incident-drift", organizationId: orgId, title: "Prepare emergency retraining dataset with new merchant data", status: "PENDING" as const, assignedTo: "Data Engineering", dueDate: new Date("2026-02-25") },
  ];

  for (const t of driftTasks) {
    await prisma.aIIncidentTask.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  console.log("  4b. Created 3 timeline entries + 2 tasks for Model Drift incident");

  // 4c. Prompt Injection Incident (demo-incident-injection, REPORTED)
  const injectionTimeline = [
    { id: "demo-video-tl-inject-1", incidentId: "demo-incident-injection", organizationId: orgId, action: "Incident reported", description: "Security team notified after user posted extracted chatbot system prompt fragments on social media.", performedBy: userId, performedAt: new Date("2026-02-20T10:00:00") },
    { id: "demo-video-tl-inject-2", incidentId: "demo-incident-injection", organizationId: orgId, action: "Initial triage completed", description: "Confirmed partial system prompt extraction via recursive instruction technique. No customer PII exposed. Attack vector documented for remediation.", performedBy: userId, performedAt: new Date("2026-02-20T16:00:00") },
  ];

  for (const t of injectionTimeline) {
    await prisma.aIIncidentTimeline.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  const injectionTasks = [
    { id: "demo-video-task-inject-1", incidentId: "demo-incident-injection", organizationId: orgId, title: "Implement prompt injection detection layer", status: "PENDING" as const, assignedTo: "ML Security", dueDate: new Date("2026-03-10") },
    { id: "demo-video-task-inject-2", incidentId: "demo-incident-injection", organizationId: orgId, title: "Rotate and harden all system prompts", status: "IN_PROGRESS" as const, assignedTo: "ML Engineering", dueDate: new Date("2026-03-05") },
    { id: "demo-video-task-inject-3", incidentId: "demo-incident-injection", organizationId: orgId, title: "Conduct comprehensive adversarial red-team testing", status: "PENDING" as const, assignedTo: "Security Team", dueDate: new Date("2026-03-15") },
  ];

  for (const t of injectionTasks) {
    await prisma.aIIncidentTask.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  // Notification
  await prisma.aIIncidentNotification.upsert({
    where: { id: "demo-video-notif-inject-1" },
    update: {},
    create: {
      id: "demo-video-notif-inject-1",
      incidentId: "demo-incident-injection",
      organizationId: orgId,
      authority: "National AI Market Surveillance Authority",
      notificationType: "Art. 73 Serious Incident Report",
      dueBy: new Date("2026-03-07"),
      status: "PENDING",
    },
  });

  console.log("  4c. Created 2 timeline entries + 3 tasks + 1 notification for Prompt Injection incident");

  // 4d. Performance Degradation (demo-incident-perf, CLOSED)
  const perfTimeline = [
    { id: "demo-video-tl-perf-1", incidentId: "demo-incident-perf", organizationId: orgId, action: "Latency spike detected", description: "Monitoring alert: Factory B prediction p95 latency exceeded 1s threshold (1.2s avg).", performedBy: userId, performedAt: new Date("2026-01-05T08:00:00") },
    { id: "demo-video-tl-perf-2", incidentId: "demo-incident-perf", organizationId: orgId, action: "Root cause identified", description: "Batch processing pipeline configuration was accidentally overwritten during routine deployment, switching from streaming to 5-second batch window.", performedBy: userId, performedAt: new Date("2026-01-05T09:30:00") },
    { id: "demo-video-tl-perf-3", incidentId: "demo-incident-perf", organizationId: orgId, action: "Fix deployed — incident closed", description: "Configuration restored to streaming mode. Latency returned to normal (200ms avg) within 15 minutes. Post-mortem completed same day. Deployment checklist updated to prevent recurrence.", performedBy: userId, performedAt: new Date("2026-01-05T10:00:00") },
  ];

  for (const t of perfTimeline) {
    await prisma.aIIncidentTimeline.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  console.log("  4d. Created 3 timeline entries for Performance Degradation incident");

  // ============================================================
  // 5. Complete in-progress assessments
  // ============================================================

  console.log("5. Completing in-progress assessments...");

  // 5a. AI Risk for Credit Scoring (demo-assessment-risk-credit)
  const creditAssessment = await prisma.aIAssessment.findUnique({ where: { id: "demo-assessment-risk-credit" } });
  const creditResponses = (creditAssessment?.responses as Record<string, string>) ?? {};
  await prisma.aIAssessment.update({
    where: { id: "demo-assessment-risk-credit" },
    data: {
      responses: {
        ...creditResponses,
        air3_3: "Significant autonomy risk. Auto-declined applicants lose access to financial services without full understanding of why. Mitigation: SHAP-based explanations for every decision and right to human review within 30 days. Concern: automation bias may cause underwriters to rubber-stamp model recommendations in 400-700 score range.",
        air4_1: "If scoring system is unavailable, applications queue for manual underwriting. Maximum delay: 4 hours. Business continuity plan tested quarterly. Manual capacity: 200 applications/day vs. 1000/day with AI.",
        air4_2: "Credit bureau data quality varies by market. German data (Schufa) highly structured; Spanish data (ASNEF) has more gaps. Feature engineering normalizes across sources but residual quality differences persist. Data validation pipeline rejects ~2% of applications for incomplete data.",
        air4_3: "Dependencies: Schufa/Experian credit bureau APIs, internal data warehouse, AWS SageMaker hosting. Vendor lock-in risk mitigated by containerized model serving. Credit bureau contract renewal managed through dual-vendor strategy.",
        air5_1: "SHAP explainability for every prediction, demographic parity monitoring dashboard, automated A/B testing for model updates, monthly fairness audits, adversarial robustness testing before each release.",
        air5_2: "Lending Operations team trained on AI limitations and override procedures. Quarterly bias awareness training for underwriters. Risk Committee reviews all model changes. Annual external audit by conformity assessment body.",
        air5_3: "Three-tier oversight: (1) Human-in-the-loop for scores 400-700 (mandatory underwriter review), (2) Human-on-the-loop for auto-approved/declined (5% monthly sampling), (3) Human-in-command (compliance officer can halt all automated decisions).",
        air6_1: "High",
        air6_2: "Residual risk is conditionally acceptable. System improves processing speed and consistency but carries residual fairness risks for thin-file applicants. Acceptable only with: quarterly fairness audits, real-time bias monitoring, and mandatory human review for borderline cases.",
        air6_3: "Before production: (1) Complete FRIA and obtain approval, (2) External bias audit, (3) Implement real-time fairness alerting. Post-deployment: quarterly model reviews, annual conformity assessment, continuous stakeholder feedback.",
      },
    },
  });

  console.log("  5a. Enriched AI Risk Assessment for Credit Scoring");

  // 5b. FRIA for Sentiment (demo-assessment-fria-sentiment)
  const sentimentAssessment = await prisma.aIAssessment.findUnique({ where: { id: "demo-assessment-fria-sentiment" } });
  const sentimentResponses = (sentimentAssessment?.responses as Record<string, string>) ?? {};
  await prisma.aIAssessment.update({
    where: { id: "demo-assessment-fria-sentiment" },
    data: {
      status: "IN_PROGRESS",
      responses: {
        ...sentimentResponses,
        fria1_2: "Analyzes aggregated survey responses and anonymized internal communication patterns to generate department-level sentiment scores and trend reports. HR leadership uses these to identify teams needing support.",
        fria1_3: "Monthly analysis cycles aligned with pulse survey schedule. Continuous background processing of anonymized communication metadata. 12-month pilot planned for Q2 2026.",
        fria1_4: "Corporate headquarters and 5 EU offices. Covers ~2,500 employees across Germany, France, and the Netherlands.",
        fria2_1: "Direct: All employees whose survey responses and communications are analyzed (~2,500). Indirect: Team managers whose leadership effectiveness may be inferred from team sentiment scores.",
        fria2_2: "Yes — junior employees, contractors, and employees on performance improvement plans may feel surveilled. Employees with mental health conditions could be identified through sentiment patterns.",
        fria2_3: "Approximately 2,500 employees directly affected. All organizational levels from individual contributors to department heads.",
        fria3_1: "Risk of bias against non-native language speakers. NLP models perform better in English/German than French or Dutch. Cultural differences in communication styles may be misinterpreted as negative sentiment.",
        fria3_2: "Processes employee communications which may contain private opinions, health references, and personal matters. Risk of re-identification even from aggregated data in small teams (<10 people).",
        fria3_3: "Employees may self-censor knowing communications are analyzed, chilling effect on freedom of expression and authentic workplace communication.",
        fria3_4: "Employees flagged as having negative sentiment could face stigmatization. Team-level scores could unfairly reflect on individual managers regardless of context.",
        fria3_5: "Employees have the right to: (1) opt out of communication analysis, (2) access their individual data, (3) challenge conclusions drawn from sentiment analysis, (4) escalate concerns to works council.",
        fria3_6: "Right to work (Art. 15 ECHR): Sentiment scores could influence performance reviews or restructuring decisions. Right to collective bargaining (Art. 28 EU Charter): Works council must be consulted on surveillance tools.",
        fria4_1: "Human oversight through: (1) HR analysts review all automated insights before distribution, (2) No automated actions triggered by sentiment scores alone, (3) Monthly review committee with works council representation.",
        fria4_2: "Minimum team size threshold of 10 for reporting to prevent re-identification. NLP confidence thresholds. Multi-language model validation. Anonymization layer between raw data and analysis engine.",
        fria4_4: "Employees can submit concerns via anonymous channel. Works council serves as employee advocate. Quarterly transparency reports published to all staff showing what data is collected and how it is used.",
        fria5_1: "Impact assessed as HIGH. While organizational insights are valuable, risks to employee privacy, freedom of expression, and potential misuse in employment decisions are significant. Art. 5(1)(f) considerations regarding emotion recognition in workplaces create legal uncertainty.",
        fria5_2: "Critical residual risks: (1) Legal uncertainty under Art. 5(1)(f) prohibition on emotion recognition in workplaces, (2) Re-identification risk for small teams despite aggregation, (3) Chilling effect on employee communications that cannot be fully mitigated.",
      },
    },
  });

  console.log("  5b. Enriched FRIA for Employee Sentiment Analysis");

  // ============================================================
  // 6. Shadow AI lifecycle examples
  // ============================================================

  console.log("6. Creating Shadow AI lifecycle examples...");

  // 6a. PROHIBITED example
  await prisma.shadowAIReport.upsert({
    where: { id: "demo-video-shadow-deepseek" },
    update: {},
    create: {
      id: "demo-video-shadow-deepseek",
      organizationId: orgId,
      toolName: "DeepSeek",
      status: "PROHIBITED",
      reportedBy: userId,
      department: "Customer Success",
      usageDescription: "Customer Success team found using DeepSeek to summarize support tickets containing customer PII (names, emails, account numbers). PROHIBITED: unvetted vendor with data processed on non-EU servers, no Data Processing Agreement in place, customer data exposure risk, and no SOC 2 certification. All team members instructed to cease use immediately.",
    },
  });

  // 6b. APPROVED with conditions
  await prisma.shadowAIReport.upsert({
    where: { id: "demo-video-shadow-notion-ai" },
    update: {},
    create: {
      id: "demo-video-shadow-notion-ai",
      organizationId: orgId,
      toolName: "Notion AI",
      status: "APPROVED",
      reportedBy: userId,
      department: "Product Management",
      usageDescription: "APPROVED WITH CONDITIONS: Notion AI approved for internal product documentation and meeting notes only. Conditions: (1) Must NOT be used for documents containing customer PII or financial data, (2) Enterprise plan with EU data residency enabled, (3) AI features must be disabled for HR and legal workspaces, (4) Quarterly access review required. Approved by AI Officer on 2026-02-01.",
    },
  });

  console.log("  Created 2 Shadow AI lifecycle examples");

  // ============================================================
  // 7. Vendor assessment findings
  // ============================================================

  console.log("7. Updating vendor assessment findings...");

  // 7a. OpenAI EU AI Act review
  await prisma.aIVendorAssessment.update({
    where: { id: "demo-vassess-openai-2" },
    data: {
      status: "COMPLETED",
      riskScore: 52,
      completedBy: userId,
      completedAt: new Date("2026-03-15"),
      nextReviewDate: new Date("2027-03-15"),
      findings: `EU AI Act Compliance Review — OpenAI (GPT-4o Provider)

PROVIDER OBLIGATIONS (Art. 53 - GPAI Models):
- [COMPLIANT] Art. 53(1)(a): Technical documentation available via model card and system card.
- [COMPLIANT] Art. 53(1)(b): Downstream provider documentation provided in enterprise agreement.
- [PARTIAL] Art. 53(1)(c): Copyright policy exists but enforcement mechanism unclear for EU-specific works.
- [PARTIAL] Art. 53(1)(d): Training data summary published but lacks granularity required by AI Office template.

DATA PROCESSING:
- [COMPLIANT] Enterprise API: customer data not used for training (confirmed in DPA v3.2).
- [COMPLIANT] EU data residency via Azure EU regions configured.
- [GAP] Sub-processor list updated quarterly but no proactive notification mechanism.

RISK ASSESSMENT:
Overall vendor risk: MEDIUM (52/100). Meets core provider obligations with gaps in training data transparency and copyright documentation. Annual review recommended with focus on AI Office Code of Practice.`,
    },
  });

  console.log("  7a. Updated OpenAI EU AI Act compliance review");

  // 7b. TalentScreen due diligence
  await prisma.aIVendorAssessment.update({
    where: { id: "demo-vassess-hr-1" },
    data: {
      status: "IN_PROGRESS",
      riskScore: 71,
      findings: `TalentScreen AI — Due Diligence for Contract Renewal

DATA PROCESSING:
- [CONCERN] Data processed in US and EU regions. EU data residency NOT guaranteed for all processing stages.
- [CONCERN] Sub-processor list includes 4 entities not previously disclosed. DPA update required.
- [OK] Current GDPR DPA in place (expires with contract May 2026).

BIAS & FAIRNESS:
- [CRITICAL] No independent bias audit report available. Vendor claims internal testing but refuses to share methodology or results.
- [CONCERN] No demographic parity metrics published. Cannot verify Art. 10 training data representativeness.
- [OK] Feature importance scores available for model explainability.

EU AI ACT COMPLIANCE:
- [GAP] No Art. 11 technical documentation package available for deployers.
- [GAP] Art. 13: Instructions for use lack detail on known limitations and failure modes.
- [OK] Art. 14: System supports human-in-the-loop (no automatic rejections).
- [CONCERN] Art. 9: Vendor risk assessment not shared with deployers.

RECOMMENDATION: Do NOT renew contract until: (1) independent bias audit completed and shared, (2) Art. 11 technical documentation provided, (3) updated DPA with EU data residency guarantee, (4) full sub-processor disclosure.`,
    },
  });

  console.log("  7b. Updated TalentScreen AI due diligence findings");

  // ============================================================
  // 8. Summary
  // ============================================================

  console.log(`
========================================
Video demo enrichment complete!
========================================

NIST AI RMF:  ${nistCreditMappings.length} mappings (Credit Risk Scoring)
ISO 42001:    ${isoFraudMappings.length} mappings (Fraud Detection)
EU AI Act:    ${totalEuMappings} additional mappings (Chatbot + Credit + Pred. Maintenance)
Incidents:    4 enriched with timelines, tasks, notifications
Assessments:  2 completed (AI Risk Credit + FRIA Sentiment)
Shadow AI:    2 new lifecycle examples
Vendors:      2 assessment findings updated
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
