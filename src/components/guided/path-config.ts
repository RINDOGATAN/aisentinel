// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AI Sentinel's program path: five stages, each step linked to a page that
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
  ClipboardList,
  ListChecks,
  Megaphone,
  Activity,
  Rocket,
  FileCheck2,
} from "lucide-react";
import type { PathConfig, StepCheck } from "./path";
import type { ObligationScreening } from "@/config/obligation-screenings";
import type { DisclosureLawId } from "@/config/disclosure-laws";

/**
 * What the rules read. Counts only: nothing here names a record.
 *
 * What is counted (src/server/services/program/path-counts.ts): the worked
 * example's records never count; "systems" are the systems not retired and
 * "vendors" the vendors not terminated, so the "every system" and "every
 * vendor" rules leave those out.
 */
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
  /**
   * AI tool reports still to review: reported or under review, with no
   * decision yet (src/lib/ai-tool-triage.ts, STILL_TO_REVIEW).
   */
  shadowReportsUntriaged: number;
  vendors: number;
  /** Vendors with at least one completed due-diligence assessment. */
  vendorsAssessed: number;
  vendorAssessments: number;
  /** Systems the organisation provides (role PROVIDER): it builds AI. */
  providerSystems: number;

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
  /** Frameworks chosen to shape the program (src/config/applicability.ts, CHOOSABLE_FRAMEWORKS). */
  frameworksChosen: boolean;
  /** AIUC-1 is among the chosen frameworks. */
  aiuc1Followed: boolean;
  /**
   * The laws on telling people it is AI for the declared places
   * (src/config/disclosure-laws.ts): the transparency step names them.
   */
  disclosureLaws: DisclosureLawId[];

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
  /** Requirements mapped to a high-risk system: the evidence step's scope. */
  highRiskMappings: number;
  highRiskMappingsNotAssessed: number;
  evidence: number;
  /** Evidence attached to a requirement mapped to a high-risk system. */
  highRiskEvidence: number;
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
  providerSystems: 0,
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
  frameworksChosen: false,
  aiuc1Followed: true,
  disclosureLaws: [],
  oversightGates: 0,
  gatesUnconfirmed: 0,
  highRiskWithGate: 0,
  transparencyProfiles: 0,
  transparencyUnconfirmed: 0,
  mappings: 0,
  mappingsNotAssessed: 0,
  highRiskMappings: 0,
  highRiskMappingsNotAssessed: 0,
  evidence: 0,
  highRiskEvidence: 0,
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

/**
 * Every system has a risk level, so whether any is high-risk is known. "No
 * high-risk system" means nothing is in scope only once this holds; before
 * it, the steps that run over high-risk systems cannot say so.
 */
export function riskKnown(c: PathCounts): boolean {
  return c.systems > 0 && c.classified >= c.systems;
}

/** Nothing for the high-risk steps (3.2, 4.3) to cover: every system classified, none high-risk. */
export function noHighRiskInScope(c: PathCounts): boolean {
  return c.highRisk === 0 && riskKnown(c);
}

/** Nothing for the sensitive-data step (4.4) to cover: systems registered, none processes personal data. */
export function noPersonalDataInScope(c: PathCounts): boolean {
  return c.systems > 0 && c.systemsProcessingPersonalData === 0;
}

/** "Give every system a risk level", as the classification step shows it. */
function riskLevelsCheck(c: PathCounts): StepCheck {
  return check("systemsClassified", riskKnown(c), "/governance/risk-classification", {
    done: Math.min(c.classified, c.systems),
    total: c.systems,
  });
}

/** Where step 1.2's questions sit on the step page itself. */
export const OBLIGATIONS_PLACES_HREF = "/governance/obligations#places";
export const OBLIGATIONS_QUESTIONS_HREF = "/governance/obligations#questions";
const REVIEW_HREF = "/governance/review";
/** Where the frameworks question sits on step 1.2's page. */
export const FRAMEWORKS_HREF = "/governance/frameworks";

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
        // First, and only while no framework is chosen: the program is built
        // from the chosen frameworks, so nothing else can start before it.
        {
          id: "frameworks",
          href: FRAMEWORKS_HREF,
          unnumbered: true,
          icon: ListChecks,
          rule: "Shown only while the organisation has chosen no framework to shape its program (the frameworks question in the quick start, on step 1.2's page and in Settings). It is then the first step, and it is hidden once at least one framework is chosen.",
          shownWhen: (c) => !c.frameworksChosen,
          status: () => "todo",
          checks: () => [check("frameworksChosen", false, FRAMEWORKS_HREF)],
        },
        {
          id: "quickstart",
          href: "/governance/quickstart",
          icon: Sparkles,
          rule: "Done when the quick start has been completed once, or when the work it would do already exists (at least one system, one vendor and one policy) and nothing copied from another client's template is waiting for review. Started when a system, a vendor or a policy exists without that. The worked example's records never count, here or in any other step.",
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
        // The acceptable-use policy and the people steps (Art. 4 and Art. 5)
        // are foundations of the programme, so they sit in the first phase:
        // five phases, the same shape as DPO Central's path.
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
          rule: "Done when at least one AI tool is recorded and none is still to review (reported or under review, with no decision to approve or prohibit it). Started while some are still to review.",
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
          rule: "Done when at least one system is registered, every system has a business owner, and no system copied from another client's template is waiting for review. Started when a system is registered. Retired systems are left out.",
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
          rule: "Done when at least one vendor is recorded (the vendor catalog is the way to add one) and no vendor copied from another client's template is waiting for review. Started while copied vendors wait. Terminated vendors are left out.",
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
          rule: "Done when every registered system has a risk classification and none of them is a draft waiting for a person to confirm it (to confirm while any is). Started when some have one. Retired systems are left out.",
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
          rule: "With a high-risk system: done when every high-risk system has an approved assessment. With none: nothing is in scope, so done once every system has a risk level (riskKnown). Started when any assessment exists.",
          status: (c) =>
            c.highRisk > 0
              ? c.highRiskAssessed >= c.highRisk
                ? "done"
                : c.assessments > 0
                  ? "started"
                  : "todo"
              : noHighRiskInScope(c)
                ? "done"
                : c.assessments > 0
                  ? "started"
                  : "todo",
          checks: (c) =>
            c.highRisk > 0
              ? [
                  check("highRiskAssessed", c.highRiskAssessed >= c.highRisk, "/governance/assessments", {
                    done: Math.min(c.highRiskAssessed, c.highRisk),
                    total: c.highRisk,
                  }),
                ]
              : riskKnown(c)
                ? [check("noHighRiskAssessment", true)]
                : [riskLevelsCheck(c)],
        },
        {
          id: "vendorDueDiligence",
          // The vendor list opened on its due-diligence view: each vendor's
          // review state, each card opening the vendor's assessments tab.
          href: "/governance/vendors?view=due-diligence",
          icon: FileCheck2,
          rule: "Done when every vendor has a completed due-diligence assessment. Started when any vendor assessment exists. Terminated vendors are left out.",
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
        // Shown only to organisations that build AI, so it sits after the
        // steps every organisation has: hiding it moves no other number.
        {
          id: "threatModel",
          href: "/governance/threat-model",
          icon: Crosshair,
          rule: "Shown to organisations that build AI (a system with the provider role) and to any organisation that already has a threat model. Done when at least one threat model is past draft (marking a draft model as reviewed on its page takes it out of draft, threatModel.update). Started when a draft exists.",
          shownWhen: (c) => c.providerSystems > 0 || c.threatModels > 0,
          status: (c) =>
            c.threatModelsActive > 0 ? "done" : c.threatModels > 0 ? "started" : "todo",
          checks: (c) => [check("threatModelActive", c.threatModelsActive > 0, "/governance/threat-model")],
        },
        // Last in the stage on purpose: it is hidden for most organisations,
        // and the numbers of the steps before it must not move.
        {
          id: "agentTesting",
          href: "/governance/agent-testing",
          icon: Bot,
          rule: "Shown only when the inventory holds an AI agent (technique Agentic AI, or an agent profile that acts) and AIUC-1 is among the organisation's chosen frameworks. Done when every agent is ready for the AIUC-1 audit: each applicable requirement has a current pass or an accepted partial. Started when any agent has a test or a not-applicable decision recorded.",
          shownWhen: (c) => c.agents > 0 && c.aiuc1Followed,
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
          rule: "Shown to every organisation; its explanation names the disclosure laws of the declared places (src/config/disclosure-laws.ts), and none with no place declared. Done when every registered system has a transparency profile and none of them is a draft waiting for a person to confirm it (to confirm while any is). Started when some have one. The profile is a tab on each system's page. Retired systems are left out.",
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
          rule: "Runs over the requirements mapped to high-risk systems. With a high-risk system: done when every such requirement has a status and at least one piece of evidence is attached to one of them. With none: nothing is in scope, so done once every system has a risk level (riskKnown). Started when any requirement has a status or evidence exists.",
          status: (c) => {
            const met =
              c.highRisk > 0
                ? c.highRiskMappings > 0 && c.highRiskMappingsNotAssessed === 0 && c.highRiskEvidence > 0
                : noHighRiskInScope(c);
            if (met) return "done";
            return c.evidence > 0 || (c.mappings > 0 && c.mappingsNotAssessed < c.mappings)
              ? "started"
              : "todo";
          },
          checks: (c) =>
            c.highRisk > 0
              ? [
                  check(
                    "mappingsAssessed",
                    c.highRiskMappings > 0 && c.highRiskMappingsNotAssessed === 0,
                    "/governance/compliance",
                    {
                      done: c.highRiskMappings - c.highRiskMappingsNotAssessed,
                      total: c.highRiskMappings,
                    },
                  ),
                  check("evidenceAttached", c.highRiskEvidence > 0, "/governance/compliance"),
                ]
              : riskKnown(c)
                ? [check("noHighRiskEvidence", true)]
                : [riskLevelsCheck(c)],
        },
        {
          id: "sensitiveData",
          href: "/governance/sensitive-data",
          icon: HeartPulse,
          rule: "With a system that processes personal data: done when every such system has a sensitive-data assessment. With none (and at least one system registered): nothing is in scope, so done. Started when any assessment exists.",
          status: (c) => {
            const met =
              c.systemsProcessingPersonalData > 0
                ? c.personalDataSystemsAssessed >= c.systemsProcessingPersonalData
                : noPersonalDataInScope(c);
            if (met) return "done";
            return c.sensitiveAssessments > 0 ? "started" : "todo";
          },
          checks: (c) =>
            c.systemsProcessingPersonalData > 0
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
              : c.systems > 0
                ? [check("noPersonalData", true)]
                : [check("systemRegistered", false, "/governance/ai-registry/new")],
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
