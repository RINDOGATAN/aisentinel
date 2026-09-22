// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AIUC-1, the certification standard for AI agents, as a choosable compliance
 * framework. Seeded by scripts/seed-frameworks.ts; the crosswalk rows become
 * cross-framework mappings in scripts/seed-cross-framework-mappings.ts.
 *
 * Source: the standard's public pages at https://standard.aiuc-1.com/, read on
 * 2026-09-22 (requirement list: https://standard.aiuc-1.com/llms.txt; one page
 * per domain, e.g. https://standard.aiuc-1.com/data-and-privacy). The site says
 * "all rights reserved", so this module carries only the identifiers, the
 * standard's own short titles, and a one-line paraphrase of each requirement,
 * never the requirement text.
 *
 * Count: the Q3 2026 list shows 53 identifiers; E007 and E014 are marked
 * retired (merged into E004 and E017 in the Q1 2026 update), so 51 are in force
 * and 51 are seeded. The scoping page (https://standard.aiuc-1.com/scoping,
 * Part 2) still says "50 requirements"; the list is the more specific source.
 *
 * Rows seed with `applicableTo: []` and no applicability tags: AIUC-1 is a
 * voluntary certification an organisation chooses for its agents, so the EU
 * risk-tier auto-mapping must never attach it to a system on its own.
 *
 * Pure module: no Prisma, no React, no Next.
 */

export const AIUC1_FRAMEWORK = {
  code: "AIUC_1",
  idPrefix: "aiuc1",
  name: "AIUC-1",
  version: "2026-Q3",
  description:
    "AIUC-1, the certification standard for AI agent security, safety and reliability, maintained by the Artificial Intelligence Underwriting Company with the AIUC-1 Consortium. Six domains; certification needs an accredited audit plus technical testing repeated at least every three months. Q3 2026 release (2026-07-15), read 2026-09-22 at https://standard.aiuc-1.com/.",
  abbreviation: "AIUC-1",
  releasedOn: "2026-07-15",
  siteUpdatedOn: "2026-09-17",
  readOn: "2026-09-22",
  sourceUrl: "https://standard.aiuc-1.com/",
  requirementListUrl: "https://standard.aiuc-1.com/llms.txt",
} as const;

/** Mandatory, or supplemental (optional: an organisation opts in). */
export type Aiuc1Application = "mandatory" | "supplemental";

export interface Aiuc1Requirement {
  code: string;
  /** The standard's own short title. */
  title: string;
  /** Our one-line paraphrase; never the standard's text. */
  paraphrase: string;
  application: Aiuc1Application;
  /** The standard's capability tags: which agents the requirement is for. */
  capabilities: readonly string[];
  /** Page path under https://standard.aiuc-1.com/ */
  path: string;
}

export interface Aiuc1Domain {
  code: "A" | "B" | "C" | "D" | "E" | "F";
  title: string;
  paraphrase: string;
  path: string;
  requirements: readonly Aiuc1Requirement[];
}

const U = ["Universal"] as const;
const GEN = ["Text-generation", "Voice-generation", "Image-generation"] as const;

export const AIUC1_DOMAINS: readonly Aiuc1Domain[] = [
  {
    code: "A",
    title: "Data & Privacy",
    paraphrase: "Keeps customer and company data from leaking, from being exposed across customers and from being used for training without clear policy, through data policies, access limits and technical safeguards.",
    path: "data-and-privacy",
    requirements: [
      { code: "A001", title: "Establish input data policy", paraphrase: "Tell customers how their input data is used for training and inference, how long it is kept, and what rights they have over it.", application: "mandatory", capabilities: U, path: "data-and-privacy/establish-data-use-policy" },
      { code: "A002", title: "Establish output data policy", paraphrase: "Set and tell customers who owns AI outputs, how outputs may be used, the opt-in or opt-out choices and how outputs are deleted.", application: "mandatory", capabilities: U, path: "data-and-privacy/define-output-rights" },
      { code: "A003", title: "Limit AI agent data access", paraphrase: "Restrict the data an agent can reach according to the task, the user's role, the agent's role and the context.", application: "mandatory", capabilities: U, path: "data-and-privacy/implement-contextual-data-safeguards" },
      { code: "A004", title: "Protect IP & trade secrets", paraphrase: "Stop the AI system from disclosing the company's intellectual property or confidential information.", application: "mandatory", capabilities: U, path: "data-and-privacy/protect-ip-trade-secrets" },
      { code: "A005", title: "Prevent cross-customer data exposure", paraphrase: "Keep one customer's data from reaching another customer.", application: "mandatory", capabilities: U, path: "data-and-privacy/prevent-cross-customer-data-exposure" },
      { code: "A006", title: "Prevent PII leakage", paraphrase: "Keep personal data from leaking through AI outputs and logs.", application: "mandatory", capabilities: U, path: "data-and-privacy/prevent-pii-leakage" },
      { code: "A007", title: "Prevent IP violations", paraphrase: "For externally facing agents, stop outputs that infringe copyright, trade marks or other third-party intellectual property.", application: "mandatory", capabilities: ["External-facing"], path: "data-and-privacy/prevent-ip-violations" },
      { code: "A008", title: "Prevent leakage of credentials and secrets", paraphrase: "For code-generating agents, detect and stop secrets leaking through inputs, outputs, logs or credential storage.", application: "mandatory", capabilities: ["Code-generation"], path: "data-and-privacy/prevent-secrets-leakage" },
    ],
  },
  {
    code: "B",
    title: "Security",
    paraphrase: "Defends agents against manipulation (adversarial input, prompt injection, endpoint scraping, unauthorised actions) through input filtering, access enforcement and a protected deployment environment.",
    path: "security",
    requirements: [
      { code: "B001", title: "Third-party testing of adversarial robustness", paraphrase: "Run an adversarial testing programme, with third-party testing, against prompt injection, jailbreaks and other adversarial inputs.", application: "mandatory", capabilities: U, path: "security/test-adversarial-robustness" },
      { code: "B002", title: "Detect adversarial input", paraphrase: "Monitor for adversarial inputs and prompt injection attempts so they can be detected and answered.", application: "supplemental", capabilities: U, path: "security/detect-adversarial-input" },
      { code: "B003", title: "Manage public release of technical details", paraphrase: "Avoid publishing technical or organisational details about AI systems that would help an attacker target them.", application: "supplemental", capabilities: U, path: "security/limit-technical-over-disclosure" },
      { code: "B004", title: "Prevent AI endpoint scraping", paraphrase: "Protect external AI endpoints against probing and scraping, for example with rate limits and query quotas.", application: "mandatory", capabilities: U, path: "security/prevent-ai-endpoint-scraping" },
      { code: "B005", title: "Implement real-time input filtering", paraphrase: "Filter inputs in real time with automated moderation tools.", application: "supplemental", capabilities: GEN, path: "security/implement-real-time-input-filtering" },
      { code: "B006", title: "Prevent unauthorized AI agent actions", paraphrase: "For agents that act, stop actions beyond the intended scope and the privileges granted.", application: "mandatory", capabilities: ["Automation"], path: "security/enforce-contextual-access-controls" },
      { code: "B007", title: "Enforce user access privileges to AI systems", paraphrase: "Keep user access rights and administrator privileges to AI systems in line with policy.", application: "mandatory", capabilities: U, path: "security/enforce-ai-access-privileges" },
      { code: "B008", title: "Protect AI system deployment environment", paraphrase: "Secure the environment the AI system runs in, including encryption, access control and authorisation.", application: "mandatory", capabilities: U, path: "security/protect-model-deployment-environment" },
      { code: "B009", title: "Limit output over-exposure", paraphrase: "Limit and obscure outputs so they do not leak information an attacker could use.", application: "mandatory", capabilities: GEN, path: "security/limit-output-over-exposure" },
      { code: "B010", title: "Promote secure patterns in generated code", paraphrase: "For code-generating agents, favour secure patterns and avoid known vulnerabilities in the code produced.", application: "mandatory", capabilities: ["Code-generation"], path: "security/promote-secure-code-patterns" },
    ],
  },
  {
    code: "C",
    title: "Safety",
    paraphrase: "Prevents harmful, out-of-scope and high-risk outputs through testing before deployment, red-teaming, monitoring and human review where it is needed.",
    path: "safety",
    requirements: [
      { code: "C001", title: "Define AI risk taxonomy", paraphrase: "Build a risk taxonomy for the agent, with severity ratings, from its capabilities and deployment context.", application: "mandatory", capabilities: U, path: "safety/define-ai-risk-taxonomy" },
      { code: "C002", title: "Conduct pre-deployment testing", paraphrase: "Test internally across the risk categories before deploying a change that needs formal review or approval.", application: "mandatory", capabilities: U, path: "safety/conduct-pre-deployment-testing" },
      { code: "C003", title: "Prevent harmful outputs", paraphrase: "Stop harmful outputs such as distressed or angry replies, high-risk advice, and offensive, biased or deceptive content.", application: "mandatory", capabilities: GEN, path: "safety/prevent-harmful-outputs" },
      { code: "C004", title: "Prevent out-of-scope outputs", paraphrase: "Stop outputs outside the agent's intended purpose, for example political discussion or medical advice.", application: "mandatory", capabilities: ["Text-generation", "Voice-generation"], path: "safety/prevent-out-of-scope-outputs" },
      { code: "C005", title: "Prevent agent-specific high risk outputs", paraphrase: "Stop the high-risk outputs specific to the agent, as defined in its risk taxonomy.", application: "mandatory", capabilities: U, path: "safety/prevent-other-high-risk-outputs" },
      { code: "C006", title: "Prevent output vulnerabilities", paraphrase: "Stop security flaws in outputs, such as code injection or data exfiltration, from reaching users.", application: "mandatory", capabilities: ["Code-generation", "Text-generation", "Voice-generation"], path: "safety/prevent-output-vulnerabilities" },
      { code: "C007", title: "Flag high risk outputs for human review", paraphrase: "Alert a person to review outputs flagged as high risk.", application: "supplemental", capabilities: U, path: "safety/flag-high-risk-recommendations" },
      { code: "C008", title: "Monitor AI risk categories", paraphrase: "Monitor the AI system in use across its risk categories.", application: "supplemental", capabilities: U, path: "safety/monitor-ai-risk-categories" },
      { code: "C009", title: "Enable real-time feedback and intervention", paraphrase: "Let users give feedback and intervene in real time, and act on what they report.", application: "supplemental", capabilities: U, path: "safety/collect-real-time-feedback" },
      { code: "C010", title: "Third-party testing for harmful outputs", paraphrase: "Have expert third parties test the system for harmful outputs at least every three months.", application: "mandatory", capabilities: GEN, path: "safety/3rd-party-testing-for-harmful-outputs" },
      { code: "C011", title: "Third-party testing for out-of-scope outputs", paraphrase: "Have expert third parties test the system for out-of-scope outputs at least every three months.", application: "mandatory", capabilities: ["Text-generation", "Voice-generation"], path: "safety/3rd-party-testing-for-out-of-scope-outputs" },
      { code: "C012", title: "Third-party testing for customer-defined risk", paraphrase: "Have expert third parties test the system for the further high-risk outputs named in its taxonomy at least every three months.", application: "mandatory", capabilities: U, path: "safety/3rd-party-testing-for-other-risk" },
    ],
  },
  {
    code: "D",
    title: "Reliability",
    paraphrase: "Prevents hallucinations and unsafe tool calls through testing, checks on sources and control of the tools an agent may call.",
    path: "reliability",
    requirements: [
      { code: "D001", title: "Prevent hallucinated outputs", paraphrase: "Put safeguards in place against hallucinated outputs.", application: "mandatory", capabilities: ["Text-generation", "Voice-generation", "Code-generation"], path: "reliability/prevent-hallucinated-outputs" },
      { code: "D002", title: "Third-party testing for hallucinations", paraphrase: "Have expert third parties test for hallucinations at least every three months.", application: "mandatory", capabilities: ["Text-generation", "Voice-generation", "Code-generation"], path: "reliability/3rd-party-testing-for-hallucinations" },
      { code: "D003", title: "Restrict unsafe tool calls", paraphrase: "For agents that act, stop tool calls that take unauthorised actions, reach restricted information or decide beyond their scope.", application: "mandatory", capabilities: ["Automation"], path: "reliability/restrict-unsafe-tool-calls" },
      { code: "D004", title: "Third-party testing of tool calls", paraphrase: "Have expert third parties test tool calls for those failures at least every three months.", application: "mandatory", capabilities: ["Automation"], path: "reliability/3rd-party-testing-of-tool-calls" },
    ],
  },
  {
    code: "E",
    title: "Accountability",
    paraphrase: "Sets who answers when something goes wrong, how changes are approved, what is logged, and how third-party vendors are assessed.",
    path: "accountability",
    requirements: [
      { code: "E001", title: "AI failure plan for security breaches", paraphrase: "Keep a documented plan for AI privacy and security breaches, with accountable owners, notification and remediation.", application: "mandatory", capabilities: U, path: "accountability/ai-failure-plan-for-security-breaches" },
      { code: "E002", title: "AI failure plan for harmful outputs", paraphrase: "For externally facing agents, keep a documented plan for harmful outputs that cause significant customer harm.", application: "mandatory", capabilities: ["External-facing"], path: "accountability/ai-failure-plan-for-harmful-outputs" },
      { code: "E003", title: "AI failure plan for hallucinations", paraphrase: "For externally facing agents, keep a documented plan for hallucinated outputs that cause substantial customer financial loss.", application: "mandatory", capabilities: ["External-facing"], path: "accountability/ai-failure-plan-for-hallucinations" },
      { code: "E004", title: "Assign accountability", paraphrase: "Decide which changes to the system need formal approval, name an accountable lead for each, and record the approval with evidence.", application: "mandatory", capabilities: U, path: "accountability/assign-accountability" },
      { code: "E005", title: "Document data storage security", paraphrase: "Document how stored data is secured, given its sensitivity, legal requirements, security controls and operational needs.", application: "mandatory", capabilities: U, path: "accountability/assess-cloud-vs-on-prem-processing" },
      { code: "E006", title: "Conduct vendor due diligence", paraphrase: "Run due diligence on foundation and upstream model vendors, covering data handling, personal data controls, security and legal obligations.", application: "mandatory", capabilities: U, path: "accountability/conduct-vendor-due-diligence" },
      { code: "E008", title: "Review internal processes", paraphrase: "Review key internal processes regularly and keep records of the reviews and approvals.", application: "mandatory", capabilities: U, path: "accountability/review-internal-processes" },
      { code: "E009", title: "Monitor third-party access", paraphrase: "Monitor and log third-party API connections, sessions and data access.", application: "mandatory", capabilities: U, path: "accountability/monitor-3rd-party-access" },
      { code: "E010", title: "Establish AI acceptable use policy", paraphrase: "Adopt and apply an acceptable use policy for AI.", application: "mandatory", capabilities: U, path: "accountability/establish-ai-acceptable-use-policy" },
      { code: "E011", title: "Record processing locations", paraphrase: "Record where AI data is processed.", application: "mandatory", capabilities: U, path: "accountability/record-processing-locations" },
      { code: "E012", title: "Document regulatory compliance", paraphrase: "Record which AI laws and standards apply, the data protections they require and the plan for meeting them.", application: "mandatory", capabilities: U, path: "accountability/document-regulatory-compliance" },
      { code: "E013", title: "Implement quality management system", paraphrase: "Run a quality management system for AI systems, proportionate to the size of the organisation.", application: "supplemental", capabilities: U, path: "accountability/implement-quality-management-system" },
      { code: "E015", title: "Log AI system activity", paraphrase: "Keep logs of AI system processes, actions and outputs, where permitted, for investigation, audit and explanation.", application: "mandatory", capabilities: U, path: "accountability/log-model-activity" },
      { code: "E016", title: "Implement AI disclosure mechanisms", paraphrase: "Tell users clearly when they are dealing with an AI system rather than a person.", application: "mandatory", capabilities: U, path: "accountability/implement-ai-disclosure-mechanisms" },
      { code: "E017", title: "Document system transparency policy", paraphrase: "Adopt a transparency policy and keep model cards, datasheets and interpretability reports for major systems.", application: "supplemental", capabilities: U, path: "accountability/document-system-transparency-policy" },
    ],
  },
  {
    code: "F",
    title: "Society",
    paraphrase: "Prevents agents from being misused for cyber attacks, manipulation or catastrophic harm.",
    path: "society",
    requirements: [
      { code: "F001", title: "Prevent AI cyber misuse", paraphrase: "Put in place, or document, guardrails against AI-enabled cyber attacks and exploitation.", application: "mandatory", capabilities: ["Text-generation", "Automation", "Voice-generation", "Code-generation"], path: "society/prevent-ai-cyber-misuse" },
      { code: "F002", title: "Prevent catastrophic misuse", paraphrase: "Put in place, or document, guardrails against catastrophic misuse (chemical, biological, radiological or nuclear).", application: "mandatory", capabilities: GEN, path: "society/prevent-catastrophic-misuse" },
    ],
  },
];

/** Listed in the Q3 2026 release as retired; never seeded. */
export const AIUC1_RETIRED = { E007: "E004", E014: "E017" } as const;

export function allAiuc1Requirements(): Aiuc1Requirement[] {
  return AIUC1_DOMAINS.flatMap((d) => d.requirements);
}

export const aiuc1DomainId = (code: string) => `${AIUC1_FRAMEWORK.idPrefix}-${code.toLowerCase()}`;
export const aiuc1RequirementId = (code: string) => `${AIUC1_FRAMEWORK.idPrefix}-${code.toLowerCase()}`;

/** The database description of a requirement: the paraphrase, then how the standard applies it. */
export function aiuc1RequirementDescription(r: Aiuc1Requirement): string {
  const application =
    r.application === "mandatory" ? "Mandatory for certification" : "Supplemental (optional; an organisation opts in)";
  return `${r.paraphrase} ${application}; capability tags: ${r.capabilities.join(", ")}. Source: ${AIUC1_FRAMEWORK.sourceUrl}${r.path}`;
}

// ---------------------------------------------------------------------------
// Crosswalks
// ---------------------------------------------------------------------------

/**
 * The crosswalks AIUC publishes, per requirement, as the pages list them
 * (read 2026-09-22; the crosswalk index says "Last updated May 27, 2026"):
 *   ISO/IEC 42001  https://standard.aiuc-1.com/crosswalks/iso-42001  (clauses 4 to 10 and Annex A)
 *   NIST AI RMF    https://standard.aiuc-1.com/crosswalks/nist-ai-rmf (subcategories)
 *   EU AI Act      https://standard.aiuc-1.com/crosswalks/eu-ai-act   (articles)
 *   MITRE ATLAS    https://standard.aiuc-1.com/crosswalks/mitre-atlas (mitigations)
 *   OWASP Top 10 for LLM Applications 2025
 *                  https://standard.aiuc-1.com/crosswalks/owasp-top-10
 * The pages still cite the retired E007 and E014 in places; those citations
 * are left out rather than moved to the successor, which the pages do not say.
 * One ISO row (A.6.1.2 to C007) is graded "Full Gap" by AIUC itself and is
 * left out too.
 */
export interface Aiuc1Crosswalk {
  iso: readonly string[];
  nist: readonly string[];
  euAiAct: readonly string[];
  atlas: readonly string[];
  owasp: readonly string[];
}

export const AIUC1_CROSSWALK_URLS = {
  iso: "https://standard.aiuc-1.com/crosswalks/iso-42001",
  nist: "https://standard.aiuc-1.com/crosswalks/nist-ai-rmf",
  euAiAct: "https://standard.aiuc-1.com/crosswalks/eu-ai-act",
  atlas: "https://standard.aiuc-1.com/crosswalks/mitre-atlas",
  owasp: "https://standard.aiuc-1.com/crosswalks/owasp-top-10",
} as const;

export const AIUC1_CROSSWALK: Readonly<Record<string, Aiuc1Crosswalk>> = {
  A001: { iso: ["A.7.2", "A.7.3"], nist: ["MEASURE 2.10"], euAiAct: ["Art. 11"], atlas: [], owasp: [] },
  A003: { iso: [], nist: ["MAP 2.1"], euAiAct: [], atlas: [], owasp: ["LLM06:25", "LLM08:25", "LLM10:25"] },
  A004: { iso: [], nist: [], euAiAct: ["Art. 72"], atlas: ["AML-M0020"], owasp: ["LLM03:25", "LLM05:25", "LLM08:25"] },
  A005: { iso: [], nist: ["MEASURE 2.10"], euAiAct: [], atlas: [], owasp: ["LLM02:25", "LLM05:25", "LLM08:25"] },
  A006: { iso: [], nist: ["MEASURE 2.10"], euAiAct: ["Art. 72"], atlas: ["AML-M0020"], owasp: ["LLM02:25", "LLM05:25", "LLM08:25"] },
  A007: { iso: ["A.7.5"], nist: ["GOVERN 6.1", "MAP 4.1"], euAiAct: [], atlas: ["AML-M0020"], owasp: ["LLM03:25", "LLM05:25"] },
  B001: { iso: [], nist: ["GOVERN 4.3", "MEASURE 2.1", "MEASURE 2.6", "MEASURE 2.7"], euAiAct: [], atlas: ["AML-M0003", "AML-M0004"], owasp: ["LLM01:25", "LLM04:25", "LLM05:25", "LLM08:25"] },
  B002: { iso: [], nist: ["GOVERN 1.5", "MEASURE 2.4", "MEASURE 2.7", "MEASURE 3.1"], euAiAct: ["Art. 15", "Art. 72"], atlas: ["AML-M0003", "AML-M0015", "AML-M0021", "AML-M0024"], owasp: ["LLM01:25", "LLM08:25", "LLM10:25"] },
  B003: { iso: [], nist: [], euAiAct: [], atlas: ["AML-M0000", "AML-M0001"], owasp: ["LLM02:25", "LLM07:25"] },
  B004: { iso: [], nist: ["MEASURE 2.7"], euAiAct: ["Art. 15"], atlas: ["AML-M0003", "AML-M0004"], owasp: ["LLM02:25", "LLM05:25", "LLM08:25", "LLM10:25"] },
  B005: { iso: [], nist: ["MEASURE 2.7"], euAiAct: [], atlas: ["AML-M0015", "AML-M0021"], owasp: ["LLM01:25", "LLM04:25", "LLM10:25"] },
  B006: { iso: [], nist: ["MAP 2.1"], euAiAct: [], atlas: [], owasp: ["LLM08:25", "LLM10:25"] },
  B007: { iso: [], nist: [], euAiAct: [], atlas: ["AML-M0005", "AML-M0019"], owasp: ["LLM02:25", "LLM06:25", "LLM10:25"] },
  B008: { iso: [], nist: [], euAiAct: ["Art. 15"], atlas: ["AML-M0005", "AML-M0012", "AML-M0019"], owasp: ["LLM07:25"] },
  B009: { iso: [], nist: ["MEASURE 2.10"], euAiAct: [], atlas: ["AML-M0002"], owasp: ["LLM02:25", "LLM05:25", "LLM08:25", "LLM09:25"] },
  C001: { iso: ["4.1", "6.1.1", "6.1.2", "6.1.3", "6.1.4", "8.2", "8.3", "8.4", "A.5.2", "A.5.3", "A.5.4", "A.5.5"], nist: ["GOVERN 1.3", "GOVERN 1.4", "GOVERN 4.2", "GOVERN 6.1", "MANAGE 1.2", "MANAGE 1.3", "MANAGE 1.4", "MAP 1.5", "MAP 5.1", "MEASURE 1.1", "MEASURE 2.10", "MEASURE 2.11", "MEASURE 3.1"], euAiAct: ["Art. 9"], atlas: [], owasp: [] },
  C002: { iso: ["A.6.2.4", "A.6.2.5"], nist: ["GOVERN 4.3", "MANAGE 1.1", "MAP 4.2", "MEASURE 2.1", "MEASURE 2.3", "MEASURE 2.5", "MEASURE 4.3"], euAiAct: ["Art. 9", "Art. 27"], atlas: ["AML-M0016"], owasp: [] },
  C003: { iso: [], nist: ["MEASURE 2.11"], euAiAct: ["Art. 9"], atlas: [], owasp: ["LLM05:25", "LLM09:25"] },
  C004: { iso: [], nist: ["MAP 2.2", "MAP 3.4"], euAiAct: ["Art. 72"], atlas: [], owasp: ["LLM05:25"] },
  C005: { iso: [], nist: ["MANAGE 1.4"], euAiAct: ["Art. 9"], atlas: [], owasp: ["LLM05:25"] },
  C006: { iso: [], nist: [], euAiAct: ["Art. 72"], atlas: ["AML-M0020"], owasp: ["LLM05:25"] },
  C007: { iso: ["A.9.2", "A.9.3"], nist: ["GOVERN 3.2", "MAP 3.5"], euAiAct: [], atlas: ["AML-M0020"], owasp: [] },
  C008: { iso: ["6.1.1", "6.1.2", "6.1.3", "8.2", "8.3", "9.1", "A.5.4", "A.6.2.6", "A.9.2", "A.9.4"], nist: ["GOVERN 1.5", "MANAGE 3.1", "MANAGE 4.1", "MEASURE 2.4", "MEASURE 4.3"], euAiAct: ["Art. 72"], atlas: [], owasp: [] },
  C009: { iso: ["A.8.3"], nist: ["GOVERN 3.2", "MAP 3.5", "MEASURE 3.3"], euAiAct: ["Art. 14"], atlas: [], owasp: [] },
  C010: { iso: ["A.6.2.4"], nist: ["GOVERN 4.3", "MANAGE 2.2", "MEASURE 1.3", "MEASURE 2.1", "MEASURE 2.6", "MEASURE 2.11", "MEASURE 4.1", "MEASURE 4.2"], euAiAct: ["Art. 9"], atlas: [], owasp: [] },
  C011: { iso: ["A.6.2.4"], nist: ["GOVERN 4.3", "MANAGE 2.2", "MAP 2.2", "MEASURE 1.3", "MEASURE 2.1", "MEASURE 2.6", "MEASURE 4.1", "MEASURE 4.2"], euAiAct: [], atlas: [], owasp: [] },
  C012: { iso: ["A.6.2.4"], nist: ["GOVERN 4.3", "MANAGE 2.2", "MEASURE 1.3", "MEASURE 2.1", "MEASURE 2.6", "MEASURE 4.1", "MEASURE 4.2"], euAiAct: [], atlas: [], owasp: [] },
  D001: { iso: [], nist: ["MEASURE 2.5"], euAiAct: [], atlas: [], owasp: ["LLM05:25", "LLM09:25"] },
  D002: { iso: ["A.6.2.4"], nist: ["GOVERN 4.3", "MANAGE 2.2", "MEASURE 1.3", "MEASURE 2.1", "MEASURE 2.5", "MEASURE 4.1", "MEASURE 4.2"], euAiAct: [], atlas: [], owasp: ["LLM09:25"] },
  D003: { iso: [], nist: ["GOVERN 6.1"], euAiAct: ["Art. 72"], atlas: ["AML-M0004", "AML-M0024"], owasp: ["LLM06:25", "LLM08:25", "LLM10:25"] },
  D004: { iso: ["A.6.2.4"], nist: ["GOVERN 4.3", "GOVERN 6.1", "MANAGE 2.2", "MEASURE 1.3", "MEASURE 2.1", "MEASURE 2.6", "MEASURE 4.1", "MEASURE 4.2"], euAiAct: [], atlas: [], owasp: ["LLM06:25"] },
  E001: { iso: ["A.8.4", "A.8.5"], nist: ["GOVERN 4.3", "MANAGE 1.3", "MANAGE 4.3"], euAiAct: ["Art. 20", "Art. 73"], atlas: [], owasp: [] },
  E002: { iso: ["A.8.4"], nist: ["GOVERN 4.3", "MANAGE 1.3", "MANAGE 4.3"], euAiAct: ["Art. 20", "Art. 73"], atlas: [], owasp: [] },
  E003: { iso: ["A.8.4"], nist: ["GOVERN 4.3", "MANAGE 1.3", "MANAGE 4.3"], euAiAct: ["Art. 20", "Art. 73"], atlas: [], owasp: [] },
  E004: { iso: ["5.1", "5.3", "7.2", "A.3.2", "A.4.6", "A.6.2.2", "A.10.2"], nist: ["GOVERN 2.1", "GOVERN 2.3", "MAP 3.5", "MEASURE 2.8"], euAiAct: ["Art. 17", "Art. 18"], atlas: ["AML-M0013"], owasp: [] },
  E005: { iso: [], nist: ["MAP 4.2"], euAiAct: [], atlas: ["AML-M0017"], owasp: ["LLM03:25"] },
  E006: { iso: ["A.10.3"], nist: ["MAP 4.2"], euAiAct: ["Art. 23", "Art. 24"], atlas: [], owasp: ["LLM03:25"] },
  E008: { iso: ["6.3", "7.5.2", "9.2.1", "9.2.2", "9.3.1", "9.3.2", "9.3.3", "A.2.3", "A.2.4", "A.3.3"], nist: ["GOVERN 1.7", "GOVERN 5.1", "GOVERN 5.2", "MANAGE 4.2", "MEASURE 1.2", "MEASURE 2.13"], euAiAct: ["Art. 43"], atlas: [], owasp: [] },
  E009: { iso: [], nist: ["GOVERN 1.5", "MANAGE 4.1"], euAiAct: ["Art. 72"], atlas: ["AML-M0024"], owasp: ["LLM03:25", "LLM05:25", "LLM06:25", "LLM10:25"] },
  E010: { iso: ["4.1", "4.3", "5.2", "A.2.2", "A.2.4", "A.9.2", "A.9.3", "A.9.4"], nist: ["GOVERN 1.2", "MAP 1.6", "MAP 3.3", "MAP 3.4", "MEASURE 2.4"], euAiAct: [], atlas: [], owasp: ["LLM10:25"] },
  E011: { iso: ["A.7.5"], nist: ["GOVERN 1.6"], euAiAct: ["Art. 11"], atlas: [], owasp: [] },
  E012: { iso: ["10.2", "A.2.3", "A.8.5"], nist: ["GOVERN 1.1", "GOVERN 1.7", "MAP 1.1", "MAP 4.1"], euAiAct: ["Art. 16", "Art. 18", "Art. 21", "Art. 22", "Art. 25", "Art. 26", "Art. 43", "Art. 44", "Art. 47", "Art. 48", "Art. 49"], atlas: [], owasp: [] },
  E013: { iso: ["4.4", "6.1.4", "7.1", "7.5.1", "8.1", "8.4", "9.1", "10.1", "10.2", "A.4.2", "A.5.2", "A.5.3", "A.5.4", "A.6.2.3", "A.6.2.7"], nist: ["GOVERN 1.3", "GOVERN 1.4"], euAiAct: ["Art. 9", "Art. 10", "Art. 11", "Art. 12", "Art. 16", "Art. 17", "Art. 18", "Art. 19", "Art. 26", "Art. 43", "Art. 72", "Art. 73"], atlas: [], owasp: [] },
  E015: { iso: ["A.6.2.8"], nist: ["MEASURE 2.4", "MEASURE 2.8"], euAiAct: ["Art. 12", "Art. 19"], atlas: ["AML-M0024"], owasp: ["LLM10:25"] },
  E016: { iso: ["A.8.2"], nist: ["MAP 2.2", "MAP 3.4", "MEASURE 2.8"], euAiAct: ["Art. 13", "Art. 50"], atlas: [], owasp: [] },
  E017: { iso: ["4.3", "5.2", "A.2.2", "A.2.4", "A.4.2", "A.4.3", "A.4.4", "A.4.5", "A.6.2.3"], nist: ["GOVERN 1.2", "GOVERN 1.6", "MAP 1.6", "MEASURE 2.8", "MEASURE 2.9", "MEASURE 4.3"], euAiAct: ["Art. 11"], atlas: ["AML-M0023", "AML-M0025"], owasp: [] },
  F001: { iso: ["A.5.5"], nist: ["MEASURE 2.7"], euAiAct: [], atlas: [], owasp: [] },
  F002: { iso: ["A.5.5"], nist: [], euAiAct: [], atlas: [], owasp: [] },
};

// Requirement rows the other seeded frameworks carry, so a crosswalk reference
// can be resolved to a row that exists. Kept in step with scripts/seed-frameworks.ts
// by aiuc1-requirements.test.ts, which reads that file.
const SEEDED_ISO_CLAUSES = new Set([
  "4.1", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3", "6.1", "6.1.2", "6.1.3", "6.1.4", "6.2",
  "7.1", "7.2", "7.3", "7.4", "7.5", "8.1", "8.2", "8.3", "8.4", "9.1", "9.2", "9.3", "10.1", "10.2",
]);
const SEEDED_EU_ARTICLES = new Set([
  "Art. 9", "Art. 10", "Art. 11", "Art. 12", "Art. 13", "Art. 14", "Art. 15", "Art. 16", "Art. 17",
  "Art. 26", "Art. 27", "Art. 49", "Art. 50", "Art. 72", "Art. 73",
]);

/**
 * An ISO clause as the crosswalk cites it, resolved to the seeded clause that
 * contains it: 9.2.1 is part of 9.2, 6.1.1 of 6.1. Annex A controls and
 * clauses not seeded (6.3) resolve to nothing.
 */
export function resolveIsoClause(ref: string): string | null {
  if (ref.startsWith("A.")) return null;
  const parts = ref.split(".");
  for (let n = parts.length; n >= 1; n--) {
    const candidate = parts.slice(0, n).join(".");
    if (SEEDED_ISO_CLAUSES.has(candidate)) return `iso-${candidate.replace(/[^0-9]/g, "-")}`;
    if (n <= 2) break;
  }
  return null;
}

/** A NIST subcategory ("GOVERN 1.3") resolved to its seeded category row ("nist-govern-1"). */
export function resolveNistSubcategory(ref: string): string | null {
  const m = ref.match(/^(GOVERN|MAP|MEASURE|MANAGE) (\d+)\.\d+$/);
  return m ? `nist-${m[1].toLowerCase()}-${m[2]}` : null;
}

/** An EU AI Act article resolved to its seeded row, when the article is seeded. */
export function resolveEuArticle(ref: string): string | null {
  return SEEDED_EU_ARTICLES.has(ref) ? `eu-${ref.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : null;
}

export interface Aiuc1CrossMapping {
  a: string;
  b: string;
  relationship: "related";
  notes: string;
}

const CROSSWALK_LABEL = { iso: "ISO/IEC 42001", nist: "NIST AI RMF", euAiAct: "EU AI Act" } as const;

/**
 * The published crosswalk as cross-framework mapping rows, one per distinct
 * pair of seeded rows. Every row is "related": AIUC names these requirements
 * as relevant to the clause, subcategory or article, which is not a claim that
 * one satisfies the other. MITRE ATLAS and OWASP are not frameworks in this
 * product, so their references stay in AIUC1_CROSSWALK only.
 */
export function aiuc1CrossMappings(): Aiuc1CrossMapping[] {
  const byPair = new Map<string, { a: string; b: string; kind: keyof typeof CROSSWALK_LABEL; refs: string[] }>();
  for (const r of allAiuc1Requirements()) {
    const cw = AIUC1_CROSSWALK[r.code];
    if (!cw) continue;
    const a = aiuc1RequirementId(r.code);
    const add = (kind: keyof typeof CROSSWALK_LABEL, ref: string, b: string | null) => {
      if (!b) return;
      const key = `${a}|${b}`;
      const row = byPair.get(key) ?? { a, b, kind, refs: [] };
      if (!row.refs.includes(ref)) row.refs.push(ref);
      byPair.set(key, row);
    };
    for (const ref of cw.iso) add("iso", ref, resolveIsoClause(ref));
    for (const ref of cw.nist) add("nist", ref, resolveNistSubcategory(ref));
    for (const ref of cw.euAiAct) add("euAiAct", ref, resolveEuArticle(ref));
  }
  return [...byPair.values()].map(({ a, b, kind, refs }) => ({
    a,
    b,
    relationship: "related" as const,
    notes: `The AIUC-1 crosswalk to the ${CROSSWALK_LABEL[kind]} lists ${a.slice(AIUC1_FRAMEWORK.idPrefix.length + 1).toUpperCase()} as relevant to ${refs.join(", ")} (${AIUC1_CROSSWALK_URLS[kind]}, read ${AIUC1_FRAMEWORK.readOn}).`,
  }));
}
