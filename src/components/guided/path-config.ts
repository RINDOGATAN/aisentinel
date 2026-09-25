// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AI Sentinel's program path: six stages, each step linked to a page that
 * already exists, each with its "done" rule written next to it.
 *
 * The rules read `PathCounts`, which the server fills with counts only
 * (src/server/services/program/path-counts.ts). They are pure and unit-tested
 * (path-config.test.ts). To change where a step leads or when it is done,
 * change it here: the menu, the next-step card, the phone bar and the client
 * portfolio all follow.
 *
 * Quick start stays first: it and the vendor catalogue are the way in.
 */

import {
  AlertTriangle,
  Bot,
  Brain,
  Building2,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  Crosshair,
  Database,
  Eye,
  Gavel,
  GraduationCap,
  HeartPulse,
  History,
  KeyRound,
  Landmark,
  Network,
  Scale,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Users,
  ClipboardList,
  Megaphone,
  Activity,
  Rocket,
  FileCheck2,
} from "lucide-react";
import type { PathConfig } from "./path";
import type { PlanWindow } from "./plan";

/** What the rules read. Counts only: nothing here names a record. */
export interface PathCounts {
  /** The quick start has been run to the end at least once. */
  quickstartCompleted: boolean;
  /** Operating jurisdictions declared for the organisation. */
  jurisdictions: number;
  /** At least one answer in the cross-border regime screening. */
  regimeScreeningAnswered: boolean;

  policies: number;
  /** An acceptable-use (AI_USAGE) policy that is approved or published. */
  acceptableUsePolicyApproved: boolean;
  /** An incident-response policy that is approved or published. */
  incidentPolicyApproved: boolean;
  incidentPolicies: number;

  systems: number;
  systemsWithOwner: number;
  systemsProcessingPersonalData: number;
  shadowReports: number;
  /** Shadow AI reports still in DISCOVERED: nobody has looked at them. */
  shadowReportsUntriaged: number;
  vendors: number;
  /** Vendors with at least one completed due-diligence assessment. */
  vendorsAssessed: number;
  vendorAssessments: number;

  classified: number;
  highRisk: number;
  /** High-risk or prohibited systems with at least one approved assessment. */
  highRiskAssessed: number;
  assessments: number;
  assessmentsApproved: number;
  threatModels: number;
  /** Threat models past DRAFT (active or archived). */
  threatModelsActive: number;
  /** Systems that are AI agents (src/config/aiuc1-evidence.ts, isAgentSystem). */
  agents: number;
  /** Agents ready for the AIUC-1 audit (every applicable requirement passed or accepted). */
  agentsReadyForAudit: number;
  /** Agents with at least one AIUC-1 test or not-applicable decision recorded. */
  agentsStartedTesting: number;

  oversightGates: number;
  /** High-risk or prohibited systems with at least one oversight gate. */
  highRiskWithGate: number;
  transparencyProfiles: number;
  mappings: number;
  mappingsNotAssessed: number;
  evidence: number;
  sensitiveAssessments: number;
  /** Systems that process personal data and have a sensitive-data assessment. */
  personalDataSystemsAssessed: number;

  incidents: number;
  openProceedings: number;
  proceedings: number;
  /** Auto-derived items (classifications, mappings, gates, policies, profiles) nobody has confirmed. */
  unconfirmed: number;
  /** Everything the review queue could ever hold. */
  confirmable: number;
  boardReports: number;
  auditEntries: number;

  /**
   * Copied from another client's template and not yet reviewed here
   * (src/config/client-template.ts). A copy is a start, never a finish: while
   * any of these is above zero, the step it would otherwise complete shows
   * "started".
   */
  copiedSystemsPending: number;
  copiedVendorsPending: number;
  /** Copied oversight gates nobody has confirmed. */
  copiedGatesPending: number;
  /** Jurisdictions or screening answers copied and not yet saved again here. */
  copiedObligationsPending: boolean;
}

/** Everything copied from a template and not yet reviewed, in one number. */
export function copiedPending(c: PathCounts): number {
  return (
    c.copiedSystemsPending +
    c.copiedVendorsPending +
    c.copiedGatesPending +
    (c.copiedObligationsPending ? 1 : 0)
  );
}

export const EMPTY_PATH_COUNTS: PathCounts = {
  quickstartCompleted: false,
  jurisdictions: 0,
  regimeScreeningAnswered: false,
  policies: 0,
  acceptableUsePolicyApproved: false,
  incidentPolicyApproved: false,
  incidentPolicies: 0,
  systems: 0,
  systemsWithOwner: 0,
  systemsProcessingPersonalData: 0,
  shadowReports: 0,
  shadowReportsUntriaged: 0,
  vendors: 0,
  vendorsAssessed: 0,
  vendorAssessments: 0,
  classified: 0,
  highRisk: 0,
  highRiskAssessed: 0,
  assessments: 0,
  assessmentsApproved: 0,
  threatModels: 0,
  threatModelsActive: 0,
  agents: 0,
  agentsReadyForAudit: 0,
  agentsStartedTesting: 0,
  oversightGates: 0,
  highRiskWithGate: 0,
  transparencyProfiles: 0,
  mappings: 0,
  mappingsNotAssessed: 0,
  evidence: 0,
  sensitiveAssessments: 0,
  personalDataSystemsAssessed: 0,
  incidents: 0,
  openProceedings: 0,
  proceedings: 0,
  unconfirmed: 0,
  confirmable: 0,
  boardReports: 0,
  auditEntries: 0,
  copiedSystemsPending: 0,
  copiedVendorsPending: 0,
  copiedGatesPending: 0,
  copiedObligationsPending: false,
};

export const AI_SENTINEL_PATH: PathConfig<PathCounts> = {
  stages: [
    {
      id: "setup",
      icon: Rocket,
      steps: [
        {
          id: "quickstart",
          href: "/governance/quickstart",
          icon: Sparkles,
          rule: "Done when the quick start has been completed once, or when the work it would do already exists (at least one system, one vendor and one policy) and nothing copied from another client's template is waiting for review. Started when a system, a vendor or a policy exists without that.",
          status: (c) =>
            c.quickstartCompleted ||
            (c.systems > 0 && c.vendors > 0 && c.policies > 0 && copiedPending(c) === 0)
              ? "done"
              : c.systems + c.vendors + c.policies > 0
                ? "started"
                : "todo",
        },
        // Round 3: "Frameworks and scope" was merged into this step. It led to
        // the compliance matrix, which is also the evidence step (5.3), and
        // the scope it asked for (jurisdictions) is what this step asks.
        {
          id: "obligations",
          href: "/governance/obligations",
          icon: CalendarClock,
          rule: "Done when jurisdictions are declared and the regime screening in Settings has at least one answer, and neither was copied from another client's template without being saved again here. Started when jurisdictions are declared.",
          status: (c) =>
            c.jurisdictions > 0 && c.regimeScreeningAnswered && !c.copiedObligationsPending
              ? "done"
              : c.jurisdictions > 0
                ? "started"
                : "todo",
        },
      ],
    },
    {
      id: "people",
      icon: Users,
      steps: [
        {
          id: "policies",
          href: "/governance/policies",
          icon: ScrollText,
          rule: "Done when an acceptable-use policy is approved or published. Started when any policy exists.",
          status: (c) =>
            c.acceptableUsePolicyApproved ? "done" : c.policies > 0 ? "started" : "todo",
        },
        {
          id: "prohibited",
          href: null,
          icon: ShieldOff,
          coming: true,
          rule: "Coming. Today the Art. 5 check runs per system inside risk classification; there is no organisation-wide screen yet.",
        },
        {
          id: "literacy",
          href: null,
          icon: GraduationCap,
          coming: true,
          rule: "Coming. No page records AI literacy (Art. 4) yet.",
        },
      ],
    },
    {
      id: "inventory",
      icon: Brain,
      steps: [
        {
          id: "systems",
          href: "/governance/ai-registry",
          icon: Brain,
          rule: "Done when at least one system is registered, every system has a business owner, and no system copied from another client's template is waiting for review. Started when a system is registered.",
          status: (c) =>
            c.systems > 0 && c.systemsWithOwner >= c.systems && c.copiedSystemsPending === 0
              ? "done"
              : c.systems > 0
                ? "started"
                : "todo",
        },
        {
          id: "shadowAi",
          href: "/governance/shadow-ai",
          icon: Search,
          rule: "Done when at least one shadow AI report exists and none is left untriaged. Started when reports exist and some are untriaged.",
          status: (c) =>
            c.shadowReports > 0 && c.shadowReportsUntriaged === 0
              ? "done"
              : c.shadowReports > 0
                ? "started"
                : "todo",
        },
        {
          id: "vendors",
          href: "/governance/vendors",
          icon: Building2,
          rule: "Done when at least one vendor is recorded (the vendor catalogue is the way to add one) and no vendor copied from another client's template is waiting for review. Started while copied vendors wait.",
          status: (c) =>
            c.vendors > 0 && c.copiedVendorsPending === 0
              ? "done"
              : c.vendors > 0
                ? "started"
                : "todo",
        },
      ],
    },
    {
      id: "assess",
      icon: ClipboardCheck,
      steps: [
        {
          id: "classification",
          href: "/governance/risk-classification",
          icon: ShieldAlert,
          rule: "Done when every registered system has a risk classification. Started when some have one.",
          status: (c) =>
            c.systems > 0 && c.classified >= c.systems
              ? "done"
              : c.classified > 0
                ? "started"
                : "todo",
        },
        {
          id: "assessments",
          href: "/governance/assessments",
          icon: ClipboardCheck,
          rule: "Done when at least one assessment is approved and every high-risk system has an approved one. Started when any assessment exists.",
          status: (c) =>
            c.assessmentsApproved > 0 && c.highRiskAssessed >= c.highRisk
              ? "done"
              : c.assessments > 0
                ? "started"
                : "todo",
        },
        {
          id: "threatModel",
          href: "/governance/threat-model",
          icon: Crosshair,
          rule: "Done when at least one threat model is past draft. Started when a draft exists.",
          status: (c) =>
            c.threatModelsActive > 0 ? "done" : c.threatModels > 0 ? "started" : "todo",
        },
        {
          id: "vendorDueDiligence",
          // The vendor list opened on its due-diligence view: each vendor's
          // review state, each card opening the vendor's assessments tab.
          href: "/governance/vendors?view=due-diligence",
          icon: FileCheck2,
          rule: "Done when every vendor has a completed due-diligence assessment. Started when any vendor assessment exists.",
          status: (c) =>
            c.vendors > 0 && c.vendorsAssessed >= c.vendors
              ? "done"
              : c.vendorAssessments > 0
                ? "started"
                : "todo",
        },
        // Last in the stage on purpose: it is hidden for most organisations,
        // and the numbers of the steps before it must not move.
        {
          id: "agentTesting",
          href: "/governance/agent-testing",
          icon: Bot,
          rule: "Shown only when the inventory holds an AI agent (technique Agentic AI, or an agent profile that acts). Done when every agent is ready for the AIUC-1 audit: each applicable requirement has a current pass or an accepted partial. Started when any agent has a test or a not-applicable decision recorded.",
          shownWhen: (c) => c.agents > 0,
          status: (c) =>
            c.agents > 0 && c.agentsReadyForAudit >= c.agents
              ? "done"
              : c.agentsStartedTesting > 0
                ? "started"
                : "todo",
        },
      ],
    },
    {
      id: "controls",
      icon: ShieldCheck,
      steps: [
        {
          id: "oversight",
          href: "/governance/oversight",
          icon: Eye,
          rule: "Done when every high-risk system has an oversight gate, or, with no high-risk system, when at least one gate exists; in both cases only once no gate copied from another client's template is waiting for confirmation. Started when any gate exists.",
          status: (c) => {
            if (c.copiedGatesPending > 0) return "started";
            if (c.highRisk > 0) {
              return c.highRiskWithGate >= c.highRisk
                ? "done"
                : c.oversightGates > 0
                  ? "started"
                  : "todo";
            }
            return c.oversightGates > 0 ? "done" : "todo";
          },
        },
        {
          id: "transparency",
          // The registry opened on its transparency view: which systems have
          // a profile, each card opening the system's Transparency tab.
          href: "/governance/ai-registry?view=transparency",
          icon: Megaphone,
          rule: "Done when every registered system has a transparency (Art. 50) profile. Started when some have one. The profile is a tab on each system's page.",
          status: (c) =>
            c.systems > 0 && c.transparencyProfiles >= c.systems
              ? "done"
              : c.transparencyProfiles > 0
                ? "started"
                : "todo",
        },
        {
          id: "evidence",
          href: "/governance/compliance",
          icon: Scale,
          rule: "Done when every mapped requirement has a status and at least one piece of evidence is attached. Started when some requirement has a status or evidence exists.",
          status: (c) =>
            c.mappings > 0 && c.mappingsNotAssessed === 0 && c.evidence > 0
              ? "done"
              : c.evidence > 0 || (c.mappings > 0 && c.mappingsNotAssessed < c.mappings)
                ? "started"
                : "todo",
        },
        {
          id: "sensitiveData",
          href: "/governance/sensitive-data",
          icon: HeartPulse,
          rule: "Done when at least one sensitive-data assessment exists and every system that processes personal data has one. Started when any assessment exists.",
          status: (c) =>
            c.sensitiveAssessments > 0 &&
            c.personalDataSystemsAssessed >= c.systemsProcessingPersonalData
              ? "done"
              : c.sensitiveAssessments > 0
                ? "started"
                : "todo",
        },
      ],
    },
    {
      id: "monitor",
      icon: Activity,
      steps: [
        {
          id: "incidents",
          href: "/governance/incidents",
          icon: AlertTriangle,
          rule: "Done when an incident-response policy is approved or published. Started when such a policy exists in draft or an incident has been recorded.",
          status: (c) =>
            c.incidentPolicyApproved
              ? "done"
              : c.incidentPolicies > 0 || c.incidents > 0
                ? "started"
                : "todo",
        },
        {
          id: "proceedings",
          href: "/governance/proceedings",
          icon: Gavel,
          optional: true,
          rule: "Only when there is one: started while a proceeding is open, done when all are closed. Not counted in progress.",
          status: (c) =>
            c.openProceedings > 0 ? "started" : c.proceedings > 0 ? "done" : "todo",
        },
        {
          id: "review",
          href: "/governance/review",
          icon: ClipboardList,
          rule: "Done when nothing auto-derived is waiting for a person to confirm it. Started while items wait. Not started while the program holds nothing to confirm.",
          status: (c) =>
            c.unconfirmed > 0 ? "started" : c.confirmable > 0 ? "done" : "todo",
        },
        {
          id: "board",
          href: "/governance/board",
          icon: Landmark,
          rule: "Done when at least one board report exists.",
          status: (c) => (c.boardReports > 0 ? "done" : "todo"),
        },
        {
          id: "audit",
          href: "/governance/audit",
          icon: History,
          optional: true,
          rule: "Kept by the product on its own: done once anything has been recorded. Not counted in progress.",
          status: (c) => (c.auditEntries > 0 ? "done" : "todo"),
        },
      ],
    },
  ],
  // "All clients" (the portfolio, at the top of the menu) is the one client
  // view in Guided; the older client cards are reachable only by address.
  library: ({ stripeEnabled }) => [
    { id: "program", href: "/governance/program", icon: Network },
    { id: "vendorCatalog", href: "/governance/vendor-catalog", icon: Database },
    { id: "skills", href: "/governance/skills", icon: KeyRound },
    ...(stripeEnabled
      ? [{ id: "billing", href: "/governance/billing", icon: CreditCard }]
      : []),
    { id: "settings", href: "/governance/settings", icon: Settings },
  ],
};

/**
 * The 30/60/90-day plan over the six stages (src/components/guided/plan.ts):
 * set up and people in the first thirty days, inventory and assessment in the
 * next thirty, controls and monitoring in the last thirty. Day 1 is the day the
 * quick start was first completed (src/server/services/program/plan-start.ts).
 */
export const PLAN_WINDOWS: readonly PlanWindow[] = [
  { untilDay: 30, stages: ["setup", "people"] },
  { untilDay: 60, stages: ["inventory", "assess"] },
  { untilDay: 90, stages: ["controls", "monitor"] },
];
