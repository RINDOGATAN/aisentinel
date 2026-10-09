// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * THE DOCUMENT REGISTER (owner's decision d10, 9 October 2026: the clarity
 * work of DPO Central carried to AI Sentinel): every document AI Sentinel can
 * produce, and the ones it does not produce yet, in one list. The dashboard's
 * "Documents you can produce today" panel, the quiet line under each step of
 * the Guided menu and the program pack all read this file (through
 * src/lib/programme-overview.ts and src/lib/document-pack.ts), so they can
 * never disagree.
 *
 * Each entry says where the document is produced, which step of the path it
 * belongs to, what it needs, and the rule that gives it one of four states:
 *
 * - `ready`       it can be produced and its content is real and confirmed
 * - `draft`       it can be produced, but it still has gaps; the gaps are named
 * - `needsInput`  it cannot be produced until one input exists; the input is
 *                 named and linked to the place where it is added
 * - `notYet`      AI Sentinel does not produce it yet
 *
 * The rules read `DocumentFacts`: counts only, filled by the server
 * (src/server/services/program/document-facts.ts). Drafts count once a person
 * confirms them: an item the quick start or a template drafted and nobody
 * confirmed is a gap, never content.
 *
 * Pure: no React, no Prisma, no Next. Tested in document-register.test.ts.
 */

import type { PathCounts } from "@/components/guided/path-config";

export type DocumentState = "ready" | "draft" | "needsInput" | "notYet";

/** What the rules read: the path's counts plus a few the documents need. */
export interface DocumentFacts extends PathCounts {
  /** Policies approved or published. */
  policiesApproved: number;
  /** Policies drafted by the quick start or a template that nobody has confirmed. */
  policiesUnconfirmed: number;
  /** Systems with at least one approved assessment. */
  systemsWithApprovedAssessment: number;
  /** AI models recorded on the organisation's systems. */
  models: number;
  /** Sensitive-data analyses not yet completed. */
  sensitiveOpen: number;
  /** AI assistance is switched on for the organisation and an engine is configured. */
  aiAssistOn: boolean;
  /**
   * Finished deliverables behind the licence on this deployment and not held
   * by this organisation (src/config/premium-showcase.ts). Never on the
   * self-hosted kit or the hosted pilot.
   */
  impactAssessmentLocked: boolean;
  programReportLocked: boolean;
}

/** A gap a draft still has, in words under `documentRegister.gaps.<key>`. */
export interface DocumentGap {
  key:
    | "toConfirm"
    | "notApproved"
    | "noOwner"
    | "unclassified"
    | "screeningUnanswered"
    | "inDraft"
    | "notReviewed"
    | "agentsNotReady"
    | "noGate"
    | "noProfile"
    | "notAssessed"
    | "noEvidence"
    | "notCompleted"
    | "personalDataUnassessed"
    | "withoutApprovedAssessment"
    | "aiDraft"
    | "noRecords";
  count: number;
}

/**
 * The input a document waits for. Each has its words under
 * `documentRegister.inputs.<key>` and the place where it is added in `INPUTS`.
 */
export type DocumentInput =
  | "quickstart"
  | "jurisdiction"
  | "policy"
  | "system"
  | "model"
  | "aiAssist"
  | "assessment"
  | "licence"
  | "threatModel"
  | "vendor"
  | "transparencyProfile"
  | "mapping"
  | "sensitiveAnalysis";

export type DocumentStatus =
  | { state: "ready" }
  | { state: "draft"; gaps: DocumentGap[] }
  | { state: "needsInput"; input: DocumentInput }
  | { state: "notYet" };

/** `md` and `ics` are produced inside the program pack; `screen` is shown on a page. */
export type DocumentFormat = "pdf" | "csv" | "md" | "ics" | "screen";

export interface DocumentEntry {
  /** Stable id; also the i18n key under `documentRegister.items.<id>`. */
  id: string;
  /**
   * The path step (src/components/guided/path-config.ts) whose menu line names
   * this document. Null for the program report, which belongs to no single
   * step and is shown on the dashboard only.
   */
  stepId: string | null;
  /** The page where the document is produced. Null for a document not in AI Sentinel yet. */
  href: string | null;
  /**
   * The organisation-wide downloads, by format, when there are any (the
   * organisation id is added where they are used). Documents produced per
   * record (one system, one agent, one framework) have none: the panel opens
   * their page.
   */
  downloads?: Partial<Record<"pdf" | "csv", string>>;
  formats: DocumentFormat[];
  /** Whether the program pack carries it (src/server/services/export/program-pack.ts). */
  packed: boolean;
  /** What it needs, in plain words, for the next person to change it. */
  needs: string;
  /** The state rule in plain words. */
  rule: string;
  /** Only for some organisations: left out of the register while this is false. */
  appliesWhen?: (facts: DocumentFacts) => boolean;
  /** The rule itself. Absent for a document not in AI Sentinel yet. */
  evaluate?: (facts: DocumentFacts) => DocumentStatus;
}

const ready = (): DocumentStatus => ({ state: "ready" });
const needs = (input: DocumentInput): DocumentStatus => ({ state: "needsInput", input });
const atLeast0 = (n: number) => Math.max(0, n);
/** A draft with the gaps that are not zero; ready when there are none. */
function draftOrReady(gaps: DocumentGap[]): DocumentStatus {
  const open = gaps.filter((g) => g.count > 0);
  return open.length > 0 ? { state: "draft", gaps: open } : ready();
}

/** Where each input is added. */
export const INPUTS: Record<DocumentInput, { href: string }> = {
  quickstart: { href: "/governance/quickstart" },
  jurisdiction: { href: "/governance/settings" },
  policy: { href: "/governance/policies/new" },
  system: { href: "/governance/ai-registry/new" },
  model: { href: "/governance/ai-registry" },
  aiAssist: { href: "/governance/settings" },
  assessment: { href: "/governance/assessments/new" },
  // The licences page: activate a licence, with the way to the marketplace.
  // The app states no price here.
  licence: { href: "/governance/skills" },
  threatModel: { href: "/governance/threat-model" },
  vendor: { href: "/governance/vendor-catalog" },
  transparencyProfile: { href: "/governance/ai-registry?view=transparency" },
  mapping: { href: "/governance/risk-classification" },
  sensitiveAnalysis: { href: "/governance/sensitive-data" },
};

/**
 * The per-system documents built from the unified assessment
 * (src/server/services/artifacts/build-artifacts.ts) cite only the regimes of
 * the places declared, so they need a declared place and a system first.
 */
function perSystemInputs(f: DocumentFacts): DocumentStatus | null {
  if (f.jurisdictions === 0) return needs("jurisdiction");
  if (f.systems === 0) return needs("system");
  return null;
}

export const DOCUMENT_REGISTER: readonly DocumentEntry[] = [
  // ---- Produced today --------------------------------------------------------
  {
    id: "plan",
    stepId: "quickstart",
    href: "/governance/program",
    formats: ["screen"],
    packed: false,
    needs: "The quick start: day 1 of the plan is the day it is first completed.",
    rule: "Needs the quick start until it has been completed once; ready after. Shown on the program page and inside the program report.",
    evaluate: (f) => (f.quickstartCompleted ? ready() : needs("quickstart")),
  },
  {
    id: "obligationsCalendar",
    stepId: "obligations",
    href: "/governance/obligations",
    formats: ["md", "ics"],
    packed: true,
    needs: "At least one declared jurisdiction (where the organisation operates).",
    rule: "Needs a jurisdiction when none is declared. Draft while the regime screening has no answer or the places were copied from another client and not saved again here; ready otherwise.",
    evaluate: (f) =>
      f.jurisdictions === 0
        ? needs("jurisdiction")
        : draftOrReady([
            { key: "screeningUnanswered", count: f.regimeScreeningAnswered ? 0 : 1 },
            { key: "toConfirm", count: f.copiedObligationsPending ? 1 : 0 },
          ]),
  },
  {
    id: "policies",
    stepId: "policies",
    href: "/governance/policies",
    formats: ["md"],
    packed: true,
    needs: "At least one policy.",
    rule: "Needs a policy when there is none. Draft while any policy is a draft to confirm or is not approved or published; ready otherwise.",
    evaluate: (f) =>
      f.policies === 0
        ? needs("policy")
        : draftOrReady([
            { key: "toConfirm", count: f.policiesUnconfirmed },
            { key: "notApproved", count: atLeast0(f.policies - f.policiesApproved) },
          ]),
  },
  {
    id: "systemRegister",
    stepId: "systems",
    href: "/governance/ai-registry",
    downloads: { pdf: "/api/export/ai-system-register" },
    formats: ["pdf", "csv"],
    packed: true,
    needs: "At least one AI system. The spreadsheet (in the import format) and each system's data flow come with it in the program pack.",
    rule: "Needs a system when there is none. Draft while any system has no business owner or a copied system waits for review; ready otherwise.",
    evaluate: (f) =>
      f.systems === 0
        ? needs("system")
        : draftOrReady([
            { key: "noOwner", count: atLeast0(f.systems - f.systemsWithOwner) },
            { key: "toConfirm", count: f.copiedSystemsPending },
          ]),
  },
  {
    id: "modelInventory",
    stepId: "systems",
    href: "/governance/ai-registry",
    downloads: { pdf: "/api/export/model-inventory" },
    formats: ["pdf"],
    packed: true,
    needs: "A system, then a model recorded on it.",
    rule: "Needs a system, then a model. Ready once a model is recorded.",
    evaluate: (f) => (f.systems === 0 ? needs("system") : f.models === 0 ? needs("model") : ready()),
  },
  {
    id: "annexIv",
    stepId: "systems",
    href: "/governance/ai-registry",
    formats: ["screen"],
    packed: false,
    needs: "AI assistance switched on (off by default) and a system. Drafted on the system's page, to copy into your own documentation.",
    rule: "Needs AI assistance while it is off, then a system. Always a draft: a skeleton built from the registry, to complete and review before use.",
    evaluate: (f) =>
      !f.aiAssistOn
        ? needs("aiAssist")
        : f.systems === 0
          ? needs("system")
          : draftOrReady([{ key: "aiDraft", count: 1 }]),
  },
  {
    id: "riskClassification",
    stepId: "classification",
    href: "/governance/risk-classification",
    formats: ["screen"],
    packed: false,
    needs: "A system. The levels are also printed in the AI system register.",
    rule: "Needs a system when there is none. Draft while any system is unclassified or a classification is a draft to confirm; ready otherwise.",
    evaluate: (f) =>
      f.systems === 0
        ? needs("system")
        : draftOrReady([
            { key: "unclassified", count: atLeast0(f.systems - f.classified) },
            { key: "toConfirm", count: f.classificationsUnconfirmed },
          ]),
  },
  {
    id: "assessmentPortfolio",
    stepId: "assessments",
    href: "/governance/assessments",
    downloads: { pdf: "/api/export/assessment-portfolio" },
    formats: ["pdf"],
    packed: true,
    needs: "At least one assessment.",
    rule: "Needs an assessment when there is none. Draft while any assessment is not approved; ready when all are.",
    evaluate: (f) =>
      f.assessments === 0
        ? needs("assessment")
        : draftOrReady([{ key: "notApproved", count: atLeast0(f.assessments - f.assessmentsApproved) }]),
  },
  {
    id: "impactAssessment",
    stepId: "assessments",
    href: "/governance/ai-registry",
    formats: ["md"],
    packed: true,
    needs: "A declared jurisdiction and a system; behind the licence where the deployment keeps it there. With the agentic addendum where a system acts as an agent.",
    rule: "Needs a jurisdiction, then a system, then the licence where it is locked. Draft while any system has no approved assessment; ready otherwise.",
    evaluate: (f) =>
      perSystemInputs(f) ??
      (f.impactAssessmentLocked
        ? needs("licence")
        : draftOrReady([
            {
              key: "withoutApprovedAssessment",
              count: atLeast0(f.systems - f.systemsWithApprovedAssessment),
            },
          ])),
  },
  {
    id: "threatModel",
    stepId: "threatModel",
    href: "/governance/threat-model",
    formats: ["md"],
    packed: true,
    needs: "At least one threat model.",
    rule: "Needs a threat model when there is none. Draft while any model is still in draft; ready otherwise.",
    evaluate: (f) =>
      f.threatModels === 0
        ? needs("threatModel")
        : draftOrReady([{ key: "inDraft", count: atLeast0(f.threatModels - f.threatModelsActive) }]),
  },
  {
    id: "vendorDueDiligence",
    stepId: "vendorDueDiligence",
    href: "/governance/vendors?view=due-diligence",
    formats: ["md"],
    packed: true,
    needs: "At least one vendor.",
    rule: "Needs a vendor when there is none. Draft while any vendor has no completed review or a copied vendor waits for review; ready otherwise.",
    evaluate: (f) =>
      f.vendors === 0
        ? needs("vendor")
        : draftOrReady([
            { key: "notReviewed", count: atLeast0(f.vendors - f.vendorsAssessed) },
            { key: "toConfirm", count: f.copiedVendorsPending },
          ]),
  },
  {
    id: "aiuc1Evidence",
    stepId: "agentTesting",
    href: "/governance/agent-testing",
    formats: ["md"],
    packed: true,
    needs: "An AI agent in the inventory (the document is shown only then).",
    rule: "Only when the inventory holds an agent. Draft while any agent is not ready for the AIUC-1 audit; ready when all are.",
    appliesWhen: (f) => f.agents > 0,
    evaluate: (f) =>
      draftOrReady([{ key: "agentsNotReady", count: atLeast0(f.agents - f.agentsReadyForAudit) }]),
  },
  {
    id: "humanReviewProtocol",
    stepId: "oversight",
    href: "/governance/oversight",
    formats: ["md"],
    packed: true,
    needs: "A declared jurisdiction and a system.",
    rule: "Needs a jurisdiction, then a system. Draft while a high-risk system has no oversight gate or a drafted gate waits to be confirmed; ready otherwise.",
    evaluate: (f) =>
      perSystemInputs(f) ??
      draftOrReady([
        { key: "noGate", count: atLeast0(f.highRisk - f.highRiskWithGate) },
        { key: "toConfirm", count: f.gatesUnconfirmed },
      ]),
  },
  {
    id: "notice",
    stepId: "transparency",
    href: "/governance/ai-registry?view=transparency",
    formats: ["md"],
    packed: true,
    needs: "A declared jurisdiction and a system.",
    rule: "Needs a jurisdiction, then a system. Draft while a system has no transparency profile or a drafted profile waits to be confirmed; ready otherwise.",
    evaluate: (f) =>
      perSystemInputs(f) ??
      draftOrReady([
        { key: "noProfile", count: atLeast0(f.systems - f.transparencyProfiles) },
        { key: "toConfirm", count: f.transparencyUnconfirmed },
      ]),
  },
  {
    id: "transparencyStatement",
    stepId: "transparency",
    href: "/governance/ai-registry?view=transparency",
    formats: ["screen"],
    packed: false,
    needs: "AI assistance switched on (off by default) and a transparency profile. Drafted on the system's Transparency tab.",
    rule: "Needs AI assistance while it is off, then a transparency profile. Always a draft: drafted by AI on request, to review before use.",
    evaluate: (f) =>
      !f.aiAssistOn
        ? needs("aiAssist")
        : f.transparencyProfiles === 0
          ? needs("transparencyProfile")
          : draftOrReady([{ key: "aiDraft", count: 1 }]),
  },
  {
    id: "complianceSummary",
    stepId: "evidence",
    href: "/governance/compliance",
    formats: ["pdf"],
    packed: false,
    needs: "Requirements mapped to a system (classifying a system maps them). Chosen per system and framework on the compliance page.",
    rule: "Needs a mapped requirement when there is none. Draft while any requirement has no status or no evidence is attached; ready otherwise.",
    evaluate: (f) =>
      f.mappings === 0
        ? needs("mapping")
        : draftOrReady([
            { key: "notAssessed", count: f.mappingsNotAssessed },
            { key: "noEvidence", count: f.evidence === 0 ? 1 : 0 },
          ]),
  },
  {
    id: "sensitiveData",
    stepId: "sensitiveData",
    href: "/governance/sensitive-data",
    formats: ["md"],
    packed: true,
    needs: "At least one sensitive-data analysis.",
    rule: "Needs an analysis when there is none. Draft while any analysis is not completed or a system that processes personal data has none; ready otherwise.",
    evaluate: (f) =>
      f.sensitiveAssessments === 0
        ? needs("sensitiveAnalysis")
        : draftOrReady([
            { key: "notCompleted", count: f.sensitiveOpen },
            {
              key: "personalDataUnassessed",
              count: atLeast0(f.systemsProcessingPersonalData - f.personalDataSystemsAssessed),
            },
          ]),
  },
  {
    id: "boardReport",
    stepId: "board",
    href: "/governance/board",
    formats: ["screen"],
    packed: false,
    needs: "Nothing; useful once there is confirmed content. Created on the board page, with the snapshot it was made from.",
    rule: "Draft while there is no system or any drafted item waits to be confirmed; ready otherwise.",
    evaluate: (f) =>
      draftOrReady([
        { key: "noRecords", count: f.systems === 0 ? 1 : 0 },
        { key: "toConfirm", count: f.unconfirmed },
      ]),
  },
  {
    id: "auditTrail",
    stepId: "audit",
    href: "/governance/audit",
    downloads: { csv: "/api/export/audit-log" },
    formats: ["csv"],
    packed: false,
    needs: "Nothing: the product keeps it. Exported on its own page, by period.",
    rule: "Draft while nothing has been recorded; ready once anything has.",
    evaluate: (f) => draftOrReady([{ key: "noRecords", count: f.auditEntries > 0 ? 0 : 1 }]),
  },
  {
    id: "programReport",
    stepId: null,
    href: "/governance/program",
    downloads: { pdf: "/api/export/governance-program" },
    formats: ["pdf"],
    packed: true,
    needs: "Nothing; useful once there is confirmed content. Behind the licence where the deployment keeps it there.",
    rule: "Needs the licence where it is locked. Draft while there is no system or any drafted item waits to be confirmed; ready otherwise.",
    evaluate: (f) =>
      f.programReportLocked
        ? needs("licence")
        : draftOrReady([
            { key: "noRecords", count: f.systems === 0 ? 1 : 0 },
            { key: "toConfirm", count: f.unconfirmed },
          ]),
  },

  // ---- Not in AI Sentinel yet ------------------------------------------------
  // Each sits under the step that would produce it, so every "coming" step on
  // the path is named here once (document-register.test.ts).
  {
    id: "prohibitedScreen",
    stepId: "prohibited",
    href: null,
    formats: [],
    packed: false,
    needs: "An organisation-wide screen of prohibited practices (Art. 5); today the check runs per system inside risk classification.",
    rule: "Not in AI Sentinel yet.",
  },
  {
    id: "literacyRecord",
    stepId: "literacy",
    href: null,
    formats: [],
    packed: false,
    needs: "A record of AI literacy measures (Art. 4).",
    rule: "Not in AI Sentinel yet.",
  },
  {
    id: "seriousIncidentReport",
    stepId: "incidents",
    href: null,
    formats: [],
    packed: false,
    needs: "A serious incident report (Art. 73). Today the incident page computes the statutory clocks and logs the notifications.",
    rule: "Not in AI Sentinel yet.",
  },
];

/** The register for this organisation: a document that does not concern it is left out. */
export function registerFor(facts: DocumentFacts): DocumentEntry[] {
  return DOCUMENT_REGISTER.filter((d) => !d.appliesWhen || d.appliesWhen(facts));
}

/** One document's state for these facts. */
export function documentStatus(entry: DocumentEntry, facts: DocumentFacts): DocumentStatus {
  return entry.evaluate ? entry.evaluate(facts) : { state: "notYet" };
}

/** What the server sends: one row per document, state and gaps, no record named. */
export interface EvaluatedDocument {
  id: string;
  status: DocumentStatus;
}

/** Every document that concerns this organisation, with its state, in register order. */
export function evaluateRegister(facts: DocumentFacts): EvaluatedDocument[] {
  return registerFor(facts).map((entry) => ({ id: entry.id, status: documentStatus(entry, facts) }));
}

export function documentEntry(id: string): DocumentEntry | undefined {
  return DOCUMENT_REGISTER.find((d) => d.id === id);
}

/** The documents not in AI Sentinel yet: by the register alone, as the menu reads them. */
export function notYetEntries(): DocumentEntry[] {
  return DOCUMENT_REGISTER.filter((entry) => !entry.evaluate);
}
