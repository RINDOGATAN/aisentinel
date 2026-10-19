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
  LifeBuoy,
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
  ListChecks,
  Megaphone,
  Activity,
  Rocket,
  FileCheck2,
} from "lucide-react";
import type { PathConfig, StepCheck } from "./path";
import type { ObligationScreening } from "@/config/obligation-screenings";
import type { PlanWindow } from "./plan";

/** What the rules read. Counts only: nothing here names a record. */
export interface PathCounts {
  /** The quick start has been run to the end at least once. */
  quickstartCompleted: boolean;
  /** Operating jurisdictions declared for the organisation. */
  jurisdictions: number;
  /**
   * The screenings that decide which laws apply, as shown to this
   * organisation (src/config/obligation-screenings.ts), and those of them not
   * yet answered. Ids, not records.
   */
  screeningsShown: ObligationScreening[];
  screeningsOpen: ObligationScreening[];
  /** Questions left across the open screenings ("Answer 3 questions"). */
  screeningQuestionsOpen: number;

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
  /** Risk classifications drafted (quick start, template, import) that nobody has confirmed. */
  classificationsUnconfirmed: number;
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
  /** Oversight gates drafted (quick start, template) that nobody has confirmed. */
  gatesUnconfirmed: number;
  /** High-risk or prohibited systems with at least one oversight gate. */
  highRiskWithGate: number;
  transparencyProfiles: number;
  /** Transparency profiles drafted (quick start, template) that nobody has confirmed. */
  transparencyUnconfirmed: number;
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
  // Nothing answered yet: the applicability check, shown to everyone, is open.
  screeningsShown: ["applicability"],
  screeningsOpen: ["applicability"],
  screeningQuestionsOpen: 0,
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
  classificationsUnconfirmed: 0,
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
  gatesUnconfirmed: 0,
  highRiskWithGate: 0,
  transparencyProfiles: 0,
  transparencyUnconfirmed: 0,
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

/** A check, with its "n of m" when it runs over several records. */
function check(
  id: string,
  met: boolean,
  href?: string,
  progress?: { done: number; total: number },
): StepCheck {
  return { id, met, ...(href ? { href } : {}), ...(progress ?? {}) };
}

/** Where step 1.2's questions sit on the step page itself. */
export const OBLIGATIONS_PLACES_HREF = "/governance/obligations#places";
export const OBLIGATIONS_QUESTIONS_HREF = "/governance/obligations#questions";
const REVIEW_HREF = "/governance/review";

const SCREENING_CHECK: Record<ObligationScreening, string> = {
  applicability: "screeningApplicability",
  california: "screeningCalifornia",
  regimes: "screeningRegimes",
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
          checks: (c) => [
            check(
              "quickstartRun",
              c.quickstartCompleted || (c.systems > 0 && c.vendors > 0 && c.policies > 0),
              "/governance/quickstart",
            ),
            ...(!c.quickstartCompleted && copiedPending(c) > 0
              ? [check("copiedReviewed", false)]
              : []),
          ],
        },
        // Round 3: "Frameworks and scope" was merged into this step. It led to
        // the compliance matrix, which is also the evidence step (5.3), and
        // the scope it asked for (jurisdictions) is what this step asks.
        {
          id: "obligations",
          href: "/governance/obligations",
          icon: CalendarClock,
          rule: "Done when places are declared and every screening shown to the organisation is answered (src/config/obligation-screenings.ts: the applicability check always; the California screening where California is declared; the Texas and Washington questions where those are declared), and none of it was copied from another client's template without being saved again here. Started when places are declared.",
          status: (c) =>
            c.jurisdictions > 0 && c.screeningsOpen.length === 0 && !c.copiedObligationsPending
              ? "done"
              : c.jurisdictions > 0
                ? "started"
                : "todo",
          checks: (c) => [
            check("placesDeclared", c.jurisdictions > 0, OBLIGATIONS_PLACES_HREF),
            ...c.screeningsShown.map((id) =>
              check(SCREENING_CHECK[id], !c.screeningsOpen.includes(id), OBLIGATIONS_QUESTIONS_HREF),
            ),
            ...(c.copiedObligationsPending
              ? [check("copiedObligations", false, OBLIGATIONS_QUESTIONS_HREF)]
              : []),
          ],
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
          checks: (c) => [check("acceptableUseApproved", c.acceptableUsePolicyApproved, "/governance/policies")],
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
        // AI tools in use come first: finding what people already use is how
        // the AI systems to register are found.
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
          checks: (c) => [
            check("shadowReported", c.shadowReports > 0, "/governance/shadow-ai/new"),
            check("shadowTriaged", c.shadowReports > 0 && c.shadowReportsUntriaged === 0, "/governance/shadow-ai", {
              done: c.shadowReports - c.shadowReportsUntriaged,
              total: c.shadowReports,
            }),
          ],
        },
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
          checks: (c) => [
            check("systemRegistered", c.systems > 0, "/governance/ai-registry/new"),
            check("systemsOwned", c.systems > 0 && c.systemsWithOwner >= c.systems, "/governance/ai-registry", {
              done: Math.min(c.systemsWithOwner, c.systems),
              total: c.systems,
            }),
            ...(c.copiedSystemsPending > 0 ? [check("copiedSystems", false)] : []),
          ],
        },
        {
          id: "vendors",
          href: "/governance/vendors",
          icon: Building2,
          rule: "Done when at least one vendor is recorded (the vendor catalog is the way to add one) and no vendor copied from another client's template is waiting for review. Started while copied vendors wait.",
          status: (c) =>
            c.vendors > 0 && c.copiedVendorsPending === 0
              ? "done"
              : c.vendors > 0
                ? "started"
                : "todo",
          checks: (c) => [
            check("vendorRecorded", c.vendors > 0, "/governance/vendor-catalog"),
            ...(c.copiedVendorsPending > 0 ? [check("copiedVendors", false)] : []),
          ],
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
          rule: "Done when every registered system has a risk classification and none of them is a draft waiting for a person to confirm it (to confirm while any is). Started when some have one.",
          status: (c) =>
            c.systems > 0 && c.classified >= c.systems
              ? c.classificationsUnconfirmed > 0
                ? "toConfirm"
                : "done"
              : c.classified > 0
                ? "started"
                : "todo",
          checks: (c) => [
            check("systemsClassified", c.systems > 0 && c.classified >= c.systems, "/governance/risk-classification", {
              done: Math.min(c.classified, c.systems),
              total: c.systems,
            }),
            ...(c.classificationsUnconfirmed > 0 ? [check("classificationsConfirmed", false, REVIEW_HREF)] : []),
          ],
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
          checks: (c) => [
            check("assessmentApproved", c.assessmentsApproved > 0, "/governance/assessments"),
            ...(c.highRisk > 0
              ? [
                  check("highRiskAssessed", c.highRiskAssessed >= c.highRisk, "/governance/assessments", {
                    done: Math.min(c.highRiskAssessed, c.highRisk),
                    total: c.highRisk,
                  }),
                ]
              : []),
          ],
        },
        {
          id: "threatModel",
          href: "/governance/threat-model",
          icon: Crosshair,
          rule: "Done when at least one threat model is past draft. Started when a draft exists.",
          status: (c) =>
            c.threatModelsActive > 0 ? "done" : c.threatModels > 0 ? "started" : "todo",
          checks: (c) => [check("threatModelActive", c.threatModelsActive > 0, "/governance/threat-model")],
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
          checks: (c) => [
            check("vendorsAssessed", c.vendors > 0 && c.vendorsAssessed >= c.vendors, "/governance/vendors?view=due-diligence", {
              done: Math.min(c.vendorsAssessed, c.vendors),
              total: c.vendors,
            }),
          ],
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
          checks: (c) => [
            check("agentsReady", c.agents > 0 && c.agentsReadyForAudit >= c.agents, "/governance/agent-testing", {
              done: Math.min(c.agentsReadyForAudit, c.agents),
              total: c.agents,
            }),
          ],
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
          rule: "Done when every high-risk system has an oversight gate, or, with no high-risk system, when at least one gate exists; in both cases only once no gate copied from another client's template is waiting for confirmation (started while one is) and no drafted gate is waiting for a person to confirm it (to confirm while one is). Started when any gate exists.",
          status: (c) => {
            if (c.copiedGatesPending > 0) return "started";
            const met = c.highRisk > 0 ? c.highRiskWithGate >= c.highRisk : c.oversightGates > 0;
            if (met) return c.gatesUnconfirmed > 0 ? "toConfirm" : "done";
            return c.oversightGates > 0 ? "started" : "todo";
          },
          checks: (c) => [
            c.highRisk > 0
              ? check("highRiskGated", c.highRiskWithGate >= c.highRisk, "/governance/oversight", {
                  done: Math.min(c.highRiskWithGate, c.highRisk),
                  total: c.highRisk,
                })
              : check("gateExists", c.oversightGates > 0, "/governance/oversight/new"),
            ...(c.gatesUnconfirmed > 0 ? [check("gatesConfirmed", false, REVIEW_HREF)] : []),
            ...(c.copiedGatesPending > 0 ? [check("copiedGates", false, REVIEW_HREF)] : []),
          ],
        },
        {
          id: "transparency",
          // The registry opened on its transparency view: which systems have
          // a profile, each card opening the system's Transparency tab.
          href: "/governance/ai-registry?view=transparency",
          icon: Megaphone,
          rule: "Done when every registered system has a transparency (Art. 50) profile and none of them is a draft waiting for a person to confirm it (to confirm while any is). Started when some have one. The profile is a tab on each system's page.",
          status: (c) =>
            c.systems > 0 && c.transparencyProfiles >= c.systems
              ? c.transparencyUnconfirmed > 0
                ? "toConfirm"
                : "done"
              : c.transparencyProfiles > 0
                ? "started"
                : "todo",
          checks: (c) => [
            check("systemsProfiled", c.systems > 0 && c.transparencyProfiles >= c.systems, "/governance/ai-registry?view=transparency", {
              done: Math.min(c.transparencyProfiles, c.systems),
              total: c.systems,
            }),
            ...(c.transparencyUnconfirmed > 0 ? [check("profilesConfirmed", false, REVIEW_HREF)] : []),
          ],
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
          checks: (c) => [
            check("mappingsAssessed", c.mappings > 0 && c.mappingsNotAssessed === 0, "/governance/compliance", {
              done: c.mappings - c.mappingsNotAssessed,
              total: c.mappings,
            }),
            check("evidenceAttached", c.evidence > 0, "/governance/compliance"),
          ],
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
          checks: (c) => [
            check("sensitiveAssessed", c.sensitiveAssessments > 0, "/governance/sensitive-data"),
            ...(c.systemsProcessingPersonalData > 0
              ? [
                  check(
                    "personalDataAssessed",
                    c.personalDataSystemsAssessed >= c.systemsProcessingPersonalData,
                    "/governance/sensitive-data",
                    {
                      done: Math.min(c.personalDataSystemsAssessed, c.systemsProcessingPersonalData),
                      total: c.systemsProcessingPersonalData,
                    },
                  ),
                ]
              : []),
          ],
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
          checks: (c) => [check("incidentPolicyApproved", c.incidentPolicyApproved, "/governance/policies")],
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
          checks: (c) => [
            check("nothingToConfirm", c.unconfirmed === 0 && c.confirmable > 0, REVIEW_HREF, {
              done: Math.max(0, c.confirmable - c.unconfirmed),
              total: c.confirmable,
            }),
          ],
        },
        {
          id: "board",
          href: "/governance/board",
          icon: Landmark,
          rule: "Done when at least one board report exists.",
          status: (c) => (c.boardReports > 0 ? "done" : "todo"),
          checks: (c) => [check("boardReport", c.boardReports > 0, "/governance/board")],
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
    { id: "needsAction", href: "/governance/needs-action", icon: ListChecks },
    { id: "incomplete", href: "/governance/incomplete", icon: ClipboardList },
    { id: "program", href: "/governance/program", icon: Network },
    { id: "vendorCatalog", href: "/governance/vendor-catalog", icon: Database },
    { id: "skills", href: "/governance/skills", icon: KeyRound },
    ...(stripeEnabled
      ? [{ id: "billing", href: "/governance/billing", icon: CreditCard }]
      : []),
    // Help and docs sits with the tools, alongside the footer "Docs" link: a
    // second, more findable way to the guides and the reference.
    { id: "help", href: "/docs", icon: LifeBuoy },
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
