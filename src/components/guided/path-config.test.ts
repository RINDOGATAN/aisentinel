// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The program path: its shape, where each step leads, and each "done" rule
 * as a pure function over counts.
 */

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { buildNavGroups } from "@/components/nav-groups";
import { AI_SENTINEL_PATH, EMPTY_PATH_COUNTS, type PathCounts } from "./path-config";
import {
  currentLibraryId,
  currentStepId,
  evaluatePath,
  isCounted,
  nextStep,
  overallPercent,
  overallProgress,
  stageOfStep,
  stageOpenByDefault,
  stageProgress,
  stageToCelebrate,
  stepAndFollowing,
  stepSequence,
  type PathStatuses,
  type SequenceEntry,
} from "./path";

const PATH = AI_SENTINEL_PATH;
const steps = PATH.stages.flatMap((s) => s.steps);
const step = (id: string) => {
  const found = steps.find((s) => s.id === id);
  if (!found) throw new Error(`no step ${id}`);
  return found;
};
const statusOf = (id: string, over: Partial<PathCounts>) =>
  evaluatePath(PATH, { ...EMPTY_PATH_COUNTS, ...over })[id];

/** An organisation that has done everything the rules ask. */
const COMPLETE: PathCounts = {
  quickstartCompleted: true,
  jurisdictions: 2,
  regimeScreeningAnswered: true,
  policies: 6,
  acceptableUsePolicyApproved: true,
  incidentPolicyApproved: true,
  incidentPolicies: 1,
  systems: 4,
  systemsWithOwner: 4,
  systemsProcessingPersonalData: 2,
  shadowReports: 3,
  shadowReportsUntriaged: 0,
  vendors: 2,
  vendorsAssessed: 2,
  vendorAssessments: 2,
  classified: 4,
  highRisk: 1,
  highRiskAssessed: 1,
  assessments: 2,
  assessmentsApproved: 1,
  threatModels: 1,
  threatModelsActive: 1,
  agents: 2,
  agentsReadyForAudit: 2,
  agentsStartedTesting: 2,
  oversightGates: 3,
  highRiskWithGate: 1,
  transparencyProfiles: 4,
  mappings: 40,
  mappingsNotAssessed: 0,
  evidence: 5,
  sensitiveAssessments: 2,
  personalDataSystemsAssessed: 2,
  incidents: 0,
  openProceedings: 0,
  proceedings: 0,
  unconfirmed: 0,
  confirmable: 57,
  boardReports: 1,
  auditEntries: 1,
};

describe("the shape of the path", () => {
  it("has six stages, with the quick start first", () => {
    expect(PATH.stages.map((s) => s.id)).toEqual([
      "setup",
      "people",
      "inventory",
      "assess",
      "controls",
      "monitor",
    ]);
    expect(PATH.stages[0].steps[0].id).toBe("quickstart");
    expect(PATH.stages[0].steps[0].href).toBe("/governance/quickstart");
  });

  it("gives every step a unique id, a written rule, and either a page or the coming label", () => {
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of steps) {
      expect(s.rule.length, s.id).toBeGreaterThan(20);
      if (s.coming) {
        expect(s.href, s.id).toBeNull();
        expect(s.status, s.id).toBeUndefined();
      } else {
        expect(s.href, s.id).toMatch(/^\/governance\//);
        expect(typeof s.status, s.id).toBe("function");
      }
    }
  });

  it("leads only to pages that exist", () => {
    const hrefs = [
      ...steps.flatMap((s) => (s.href ? [s.href] : [])),
      ...PATH.library({ stripeEnabled: true, clientMode: true }).map((i) => i.href),
    ];
    for (const href of hrefs) {
      const dir = join("src/app/(dashboard)", href.split(/[?#]/)[0]);
      expect(existsSync(join(dir, "page.tsx")), href).toBe(true);
    }
  });

  it("keeps every entry of the Classic menus reachable", () => {
    const guided = new Set([
      ...steps.flatMap((s) => (s.href ? [s.href] : [])),
      ...PATH.library({ stripeEnabled: true }).map((i) => i.href),
    ]);
    const classic = buildNavGroups((k) => k, { stripeEnabled: true }).flatMap((g) =>
      g.items.map((i) => i.href),
    );
    for (const href of [...classic, "/governance/settings"]) {
      expect(guided.has(href), href).toBe(true);
    }
  });

  it("shows Billing only when the store is on", () => {
    expect(PATH.library({ stripeEnabled: false }).some((i) => i.id === "billing")).toBe(false);
    expect(PATH.library({ stripeEnabled: true }).some((i) => i.id === "billing")).toBe(true);
  });

  it("never offers the older client cards: 'All clients' is the one client view", () => {
    for (const clientMode of [false, true]) {
      const hrefs = PATH.library({ stripeEnabled: true, clientMode }).map((i) => i.href);
      expect(hrefs).not.toContain("/governance/clients");
    }
  });

  it("gives every step its own destination, and each destination marks its own step", () => {
    const withPage = steps.filter((s) => s.href);
    const hrefs = withPage.map((s) => s.href);
    expect(new Set(hrefs).size, hrefs.join(", ")).toBe(hrefs.length);
    // A click on a step lands on a place that the menu marks as that step,
    // never as another one: two steps can never share a screen.
    for (const s of withPage) {
      const [path, query = ""] = s.href!.split("?");
      expect(currentStepId(PATH, path, query), s.id).toBe(s.id);
    }
  });

  it("keeps the library free of any step's destination", () => {
    const stepPaths = new Set(steps.flatMap((s) => (s.href ? [s.href.split("?")[0]] : [])));
    for (const item of PATH.library({ stripeEnabled: true, clientMode: true })) {
      expect(stepPaths.has(item.href), item.id).toBe(false);
    }
  });

  it("has every label in English and Spanish", () => {
    for (const messages of [en, es]) {
      const g = messages.guided as unknown as {
        stages: Record<string, string>;
        steps: Record<string, { label: string; why: string; do: string }>;
        library: Record<string, string>;
      };
      for (const stage of PATH.stages) expect(g.stages[stage.id], stage.id).toBeTruthy();
      for (const s of steps) {
        expect(g.steps[s.id]?.label, s.id).toBeTruthy();
        expect(g.steps[s.id]?.why, s.id).toBeTruthy();
        // The band's "what to do here": one sentence, short enough for a slim band.
        expect(g.steps[s.id]?.do, s.id).toBeTruthy();
        expect(g.steps[s.id].do.length, s.id).toBeLessThanOrEqual(140);
      }
      // Keys for steps that no longer exist are not left behind.
      expect(Object.keys(g.steps).sort()).toEqual(steps.map((s) => s.id).sort());
      for (const item of PATH.library({ stripeEnabled: true, clientMode: true })) {
        expect(g.library[item.id], item.id).toBeTruthy();
      }
    }
  });

  it("uses no long dash in its copy", () => {
    const text = JSON.stringify([en.guided, es.guided]);
    expect(text).not.toMatch(/[–—]/);
  });
});

describe("the done rules", () => {
  it("marks a new organisation not started everywhere, and the unbuilt steps coming", () => {
    const s = evaluatePath(PATH, EMPTY_PATH_COUNTS);
    for (const st of steps) {
      expect(s[st.id], st.id).toBe(st.coming ? "coming" : st.shownWhen ? "hidden" : "todo");
    }
    expect(s.prohibited).toBe("coming");
    expect(s.literacy).toBe("coming");
  });

  it("marks a complete organisation done on every counted step", () => {
    const s = evaluatePath(PATH, COMPLETE);
    for (const st of steps.filter(isCounted)) expect(s[st.id], st.id).toBe("done");
    expect(nextStep(PATH, s)).toBeNull();
  });

  it("quick start: done once completed, started when records exist without it", () => {
    expect(statusOf("quickstart", { quickstartCompleted: true })).toBe("done");
    expect(statusOf("quickstart", { systems: 1 })).toBe("started");
    expect(statusOf("quickstart", { vendors: 1 })).toBe("started");
    expect(statusOf("quickstart", { systems: 1, vendors: 1 })).toBe("started");
    expect(statusOf("quickstart", { systems: 1, policies: 1 })).toBe("started");
    expect(statusOf("quickstart", {})).toBe("todo");
  });

  it("quick start: done without the wizard when a system, a vendor and a policy all exist", () => {
    // The seeded demo organisation: 8 systems, vendors and policies, never ran the wizard.
    expect(statusOf("quickstart", { systems: 8, vendors: 5, policies: 4 })).toBe("done");
    expect(statusOf("quickstart", { systems: 1, vendors: 1, policies: 1 })).toBe("done");
    const s = evaluatePath(PATH, { ...EMPTY_PATH_COUNTS, systems: 8, vendors: 5, policies: 4 });
    expect(nextStep(PATH, s)?.step.id).not.toBe("quickstart");
  });

  it("obligations: a declared jurisdiction starts it, a screening answer finishes it", () => {
    expect(statusOf("obligations", { jurisdictions: 1 })).toBe("started");
    expect(statusOf("obligations", { jurisdictions: 1, regimeScreeningAnswered: true })).toBe("done");
    // An answer with no jurisdiction declared proves nothing about scope.
    expect(statusOf("obligations", { regimeScreeningAnswered: true })).toBe("todo");
  });

  it("policies: an approved acceptable-use policy, not just any policy", () => {
    expect(statusOf("policies", { policies: 5 })).toBe("started");
    expect(statusOf("policies", { policies: 1, acceptableUsePolicyApproved: true })).toBe("done");
  });

  it("systems: every system needs an owner", () => {
    expect(statusOf("systems", { systems: 3, systemsWithOwner: 2 })).toBe("started");
    expect(statusOf("systems", { systems: 3, systemsWithOwner: 3 })).toBe("done");
  });

  it("shadow AI: untriaged reports keep it open", () => {
    expect(statusOf("shadowAi", { shadowReports: 2, shadowReportsUntriaged: 1 })).toBe("started");
    expect(statusOf("shadowAi", { shadowReports: 2 })).toBe("done");
  });

  it("vendors: one recorded vendor", () => {
    expect(statusOf("vendors", { vendors: 1 })).toBe("done");
  });

  it("classification: every system classified", () => {
    expect(statusOf("classification", { systems: 3, classified: 2 })).toBe("started");
    expect(statusOf("classification", { systems: 3, classified: 3 })).toBe("done");
  });

  it("assessments: every high-risk system needs an approved one", () => {
    expect(
      statusOf("assessments", { assessments: 2, assessmentsApproved: 1, highRisk: 2, highRiskAssessed: 1 }),
    ).toBe("started");
    expect(
      statusOf("assessments", { assessments: 2, assessmentsApproved: 2, highRisk: 2, highRiskAssessed: 2 }),
    ).toBe("done");
    // With no high-risk system, one approved assessment is enough.
    expect(statusOf("assessments", { assessments: 1, assessmentsApproved: 1 })).toBe("done");
    // A draft alone is not done.
    expect(statusOf("assessments", { assessments: 1 })).toBe("started");
  });

  it("threat model: past draft", () => {
    expect(statusOf("threatModel", { threatModels: 1 })).toBe("started");
    expect(statusOf("threatModel", { threatModels: 1, threatModelsActive: 1 })).toBe("done");
  });

  it("vendor due diligence: every vendor assessed", () => {
    expect(statusOf("vendorDueDiligence", { vendors: 2, vendorsAssessed: 1, vendorAssessments: 1 })).toBe(
      "started",
    );
    expect(statusOf("vendorDueDiligence", { vendors: 2, vendorsAssessed: 2, vendorAssessments: 2 })).toBe(
      "done",
    );
  });

  it("agent testing (AIUC-1): shown only with an agent, done when every agent is ready for audit", () => {
    // No agent: the step does not concern the organisation.
    expect(statusOf("agentTesting", {})).toBe("hidden");
    expect(statusOf("agentTesting", { agentsStartedTesting: 1 })).toBe("hidden");
    // An agent: shown, and not started until something is recorded.
    expect(statusOf("agentTesting", { agents: 1 })).toBe("todo");
    expect(statusOf("agentTesting", { agents: 2, agentsStartedTesting: 1 })).toBe("started");
    expect(statusOf("agentTesting", { agents: 2, agentsStartedTesting: 2, agentsReadyForAudit: 1 })).toBe(
      "started",
    );
    expect(statusOf("agentTesting", { agents: 2, agentsStartedTesting: 2, agentsReadyForAudit: 2 })).toBe(
      "done",
    );
  });

  it("agent testing sits in stage 4, last, so no other step's number moves when it is hidden", () => {
    const assess = PATH.stages.find((s) => s.id === "assess")!;
    expect(assess.steps.at(-1)?.id).toBe("agentTesting");
    expect(step("agentTesting").shownWhen).toBeTypeOf("function");
    // Only this step is conditional: every other step shows for everyone.
    expect(steps.filter((s) => s.shownWhen).map((s) => s.id)).toEqual(["agentTesting"]);
  });

  it("a hidden step is not counted, not offered next, and not in the 'Next step' walk", () => {
    const noAgent = evaluatePath(PATH, { ...COMPLETE, agents: 0, agentsReadyForAudit: 0, agentsStartedTesting: 0 });
    const assess = PATH.stages.find((s) => s.id === "assess")!;
    expect(noAgent.agentTesting).toBe("hidden");
    expect(stageProgress(assess, noAgent)).toEqual({ done: 4, total: 4, state: "done" });
    expect(nextStep(PATH, noAgent)).toBeNull();
    // With an agent not yet ready, the stage waits for it and it is the next step.
    const agentWaiting = evaluatePath(PATH, { ...COMPLETE, agentsReadyForAudit: 1 });
    expect(stageProgress(assess, agentWaiting)).toEqual({ done: 4, total: 5, state: "started" });
    expect(nextStep(PATH, agentWaiting)?.step.id).toBe("agentTesting");
    // The walk: from vendor checks straight to oversight when hidden, through it when shown.
    expect(stepAndFollowing(PATH, "vendorDueDiligence", noAgent)?.following?.step.id).toBe("oversight");
    expect(stepAndFollowing(PATH, "vendorDueDiligence", agentWaiting)?.following?.step.id).toBe(
      "agentTesting",
    );
    // Reached by its address with no agent, the page still has its band.
    expect(stepAndFollowing(PATH, "agentTesting", noAgent)?.current.number).toBe("4.5");
    // While the statuses load, a conditional step is not shown.
    expect(stepSequence(PATH, null).some((e) => e.step.id === "agentTesting")).toBe(false);
  });

  it("oversight: every high-risk system gated", () => {
    expect(statusOf("oversight", { highRisk: 2, highRiskWithGate: 1, oversightGates: 1 })).toBe("started");
    expect(statusOf("oversight", { highRisk: 2, highRiskWithGate: 2, oversightGates: 2 })).toBe("done");
    expect(statusOf("oversight", { oversightGates: 1 })).toBe("done");
    expect(statusOf("oversight", { highRisk: 1 })).toBe("todo");
  });

  it("transparency: a profile for every system", () => {
    expect(statusOf("transparency", { systems: 2, transparencyProfiles: 1 })).toBe("started");
    expect(statusOf("transparency", { systems: 2, transparencyProfiles: 2 })).toBe("done");
  });

  it("evidence: nothing left unassessed, and some evidence attached", () => {
    expect(statusOf("evidence", { mappings: 10, mappingsNotAssessed: 10 })).toBe("todo");
    expect(statusOf("evidence", { mappings: 10, mappingsNotAssessed: 4 })).toBe("started");
    expect(statusOf("evidence", { mappings: 10, mappingsNotAssessed: 0 })).toBe("started");
    expect(statusOf("evidence", { mappings: 10, mappingsNotAssessed: 0, evidence: 1 })).toBe("done");
  });

  it("sensitive data: every system processing personal data assessed", () => {
    expect(
      statusOf("sensitiveData", {
        sensitiveAssessments: 1,
        systemsProcessingPersonalData: 2,
        personalDataSystemsAssessed: 1,
      }),
    ).toBe("started");
    expect(statusOf("sensitiveData", { sensitiveAssessments: 1 })).toBe("done");
  });

  it("incidents: an approved incident-response policy", () => {
    expect(statusOf("incidents", { incidents: 1 })).toBe("started");
    expect(statusOf("incidents", { incidentPolicies: 1 })).toBe("started");
    expect(statusOf("incidents", { incidentPolicyApproved: true, incidentPolicies: 1 })).toBe("done");
  });

  it("review queue: done only when something exists and nothing waits", () => {
    expect(statusOf("review", {})).toBe("todo");
    expect(statusOf("review", { confirmable: 5, unconfirmed: 2 })).toBe("started");
    expect(statusOf("review", { confirmable: 5 })).toBe("done");
  });

  it("board: one report", () => {
    expect(statusOf("board", { boardReports: 1 })).toBe("done");
  });

  it("proceedings and the audit trail are shown but never counted", () => {
    expect(step("proceedings").optional).toBe(true);
    expect(step("audit").optional).toBe(true);
    expect(statusOf("proceedings", { proceedings: 1, openProceedings: 1 })).toBe("started");
    expect(statusOf("proceedings", { proceedings: 1 })).toBe("done");
    const monitor = PATH.stages[5];
    const s = evaluatePath(PATH, { ...COMPLETE, openProceedings: 1, proceedings: 1 });
    expect(stageProgress(monitor, s)).toEqual({ done: 3, total: 3, state: "done" });
  });
});

describe("progress and the next step", () => {
  it("counts a stage as done steps over counted steps", () => {
    const s = evaluatePath(PATH, { ...EMPTY_PATH_COUNTS, quickstartCompleted: true, jurisdictions: 1 });
    expect(stageProgress(PATH.stages[0], s)).toEqual({ done: 1, total: 2, state: "started" });
    // Two of the three people steps are coming: one counted step.
    expect(stageProgress(PATH.stages[1], s)).toEqual({ done: 0, total: 1, state: "todo" });
    expect(stageProgress(PATH.stages[2], s)).toEqual({ done: 0, total: 3, state: "todo" });
  });

  it("offers the first counted step not done, never a coming or optional one", () => {
    const s = evaluatePath(PATH, EMPTY_PATH_COUNTS);
    expect(nextStep(PATH, s)?.step.id).toBe("quickstart");

    const afterSetup = evaluatePath(PATH, {
      ...EMPTY_PATH_COUNTS,
      quickstartCompleted: true,
      jurisdictions: 1,
      mappings: 1,
      regimeScreeningAnswered: true,
      policies: 1,
      acceptableUsePolicyApproved: true,
    });
    const next = nextStep(PATH, afterSetup);
    expect(next?.step.id).toBe("systems");
    expect(next?.stageIndex).toBe(2);

    const onlyMonitorLeft: PathStatuses = { ...evaluatePath(PATH, COMPLETE), board: "todo" };
    expect(nextStep(PATH, onlyMonitorLeft)?.step.id).toBe("board");
  });

  it("totals progress across the path", () => {
    const counted = steps.filter(isCounted).length;
    expect(overallProgress(PATH, evaluatePath(PATH, COMPLETE))).toEqual({ done: counted, total: counted });
    expect(overallProgress(PATH, evaluatePath(PATH, EMPTY_PATH_COUNTS)).done).toBe(0);
  });

  it("gives the overall percentage as done over counted steps, rounded", () => {
    const counted = steps.filter(isCounted);
    expect(overallPercent(PATH, evaluatePath(PATH, EMPTY_PATH_COUNTS))).toBe(0);
    expect(overallPercent(PATH, evaluatePath(PATH, COMPLETE))).toBe(100);
    // Coming and optional steps never count: marking them does not move it.
    const onlyUncounted: PathStatuses = { ...evaluatePath(PATH, EMPTY_PATH_COUNTS), audit: "done", proceedings: "done" };
    expect(overallPercent(PATH, onlyUncounted)).toBe(0);
    // Each counted step done moves it by the same share, rounded to a whole number.
    // With an agent in the inventory, so that every counted step is shown.
    for (let n = 1; n <= counted.length; n++) {
      const statuses: PathStatuses = evaluatePath(PATH, { ...EMPTY_PATH_COUNTS, agents: 1 });
      for (const s of counted.slice(0, n)) statuses[s.id] = "done";
      expect(overallPercent(PATH, statuses), `${n} done`).toBe(Math.round((n / counted.length) * 100));
    }
    // A step started but not done counts nothing.
    expect(overallPercent(PATH, { ...evaluatePath(PATH, EMPTY_PATH_COUNTS), systems: "started" })).toBe(0);
  });
});

describe("the 'Next step' band", () => {
  const walk = stepSequence(PATH);

  it("walks every step that has a page, in path order, skipping only the coming ones", () => {
    const expected = PATH.stages.flatMap((stage) =>
      stage.steps.filter((s) => s.href && !s.coming).map((s) => s.id),
    );
    expect(walk.map((e) => e.step.id)).toEqual(expected);
    expect(walk.some((e) => e.step.coming)).toBe(false);
  });

  it("numbers each step by its stage and its place in the stage", () => {
    const number = (id: string) => walk.find((e) => e.step.id === id)?.number;
    expect(number("quickstart")).toBe("1.1");
    expect(number("systems")).toBe("3.1");
    expect(number("vendorDueDiligence")).toBe("4.4");
    expect(number("board")).toBe("6.4");
  });

  it("leads from each step to the next one, so one button walks the whole path", () => {
    // Follow "Next step" from the first page to the end, as a person would.
    const visited: string[] = [];
    let id: string | null = walk[0].step.id;
    while (id) {
      visited.push(id);
      const place: ReturnType<typeof stepAndFollowing<PathCounts>> = stepAndFollowing(PATH, id);
      expect(place, id).not.toBeNull();
      const following: SequenceEntry<PathCounts> | null = place!.following;
      if (following) {
        // The link lands on a page the menu marks as that very step.
        const [path, query = ""] = following.step.href!.split("?");
        expect(currentStepId(PATH, path, query)).toBe(following.step.id);
      }
      id = following?.step.id ?? null;
    }
    expect(visited).toEqual(walk.map((e) => e.step.id));
    expect(stepAndFollowing(PATH, walk[walk.length - 1].step.id)?.following).toBeNull();
  });

  it("shows no band off the path", () => {
    expect(stepAndFollowing(PATH, null)).toBeNull();
    expect(stepAndFollowing(PATH, currentStepId(PATH, "/governance/settings"))).toBeNull();
    expect(stepAndFollowing(PATH, "prohibited")).toBeNull();
  });
});

describe("the stage-complete message", () => {
  const withStages = (ids: string[]): PathStatuses => {
    const statuses = evaluatePath(PATH, EMPTY_PATH_COUNTS);
    for (const stage of PATH.stages) {
      if (!ids.includes(stage.id)) continue;
      for (const s of stage.steps.filter(isCounted)) statuses[s.id] = "done";
    }
    return statuses;
  };

  it("announces nothing the first time, and remembers what is already done", () => {
    const r = stageToCelebrate(PATH, withStages(["setup", "people"]), null);
    expect(r.celebrate).toBeNull();
    expect(r.remember).toEqual(["setup", "people"]);
  });

  it("announces a stage once, when it is first seen done", () => {
    const first = stageToCelebrate(PATH, withStages(["setup", "inventory"]), ["setup"]);
    expect(first.celebrate).toBe(2);
    const again = stageToCelebrate(PATH, withStages(["setup", "inventory"]), first.remember);
    expect(again.celebrate).toBeNull();
  });

  it("keeps a stage announced even if it later goes back to in progress", () => {
    const r = stageToCelebrate(PATH, withStages([]), ["setup"]);
    expect(r.remember).toContain("setup");
    expect(r.celebrate).toBeNull();
  });
});

describe("the current page", () => {
  it("marks exactly one step, telling a page's views apart by their query", () => {
    expect(currentStepId(PATH, "/governance/quickstart")).toBe("quickstart");
    expect(currentStepId(PATH, "/governance/vendors")).toBe("vendors");
    expect(currentStepId(PATH, "/governance/vendors", "view=due-diligence")).toBe("vendorDueDiligence");
    expect(currentStepId(PATH, "/governance/vendors", "view=due-diligence&x=1")).toBe("vendorDueDiligence");
    expect(currentStepId(PATH, "/governance/vendors", "view=other")).toBe("vendors");
    expect(currentStepId(PATH, "/governance/vendors/abc")).toBe("vendors");
    expect(currentStepId(PATH, "/governance/ai-registry")).toBe("systems");
    expect(currentStepId(PATH, "/governance/ai-registry", "view=transparency")).toBe("transparency");
    expect(currentStepId(PATH, "/governance/ai-registry/new")).toBe("systems");
    expect(currentStepId(PATH, "/governance/compliance")).toBe("evidence");
    expect(currentStepId(PATH, "/governance/audit")).toBe("audit");
  });

  it("does not claim the dashboard or a library page as a step", () => {
    expect(currentStepId(PATH, "/governance")).toBeNull();
    expect(currentStepId(PATH, "/governance/settings")).toBeNull();
    expect(currentLibraryId(PATH.library({ stripeEnabled: false }), "/governance/settings")).toBe("settings");
    expect(currentLibraryId(PATH.library({ stripeEnabled: false }), "/governance/vendor-catalog/x")).toBe(
      "vendorCatalog",
    );
  });

  it("does not confuse a page with another whose address starts the same", () => {
    expect(currentStepId(PATH, "/governance/vendor-catalog")).toBeNull();
  });

  it("opens the stage that holds the current page", () => {
    expect(stageOfStep(PATH, currentStepId(PATH, "/governance/threat-model/x"))?.id).toBe("assess");
    expect(stageOfStep(PATH, null)).toBeNull();
  });

  it("lands a new person on the dashboard with stage 1 open", () => {
    const fresh = evaluatePath(PATH, EMPTY_PATH_COUNTS);
    // While the progress is loading, and once it has loaded, stage 1.
    expect(stageOpenByDefault(PATH, null, null, true)?.id).toBe("setup");
    expect(stageOpenByDefault(PATH, null, fresh, true)?.id).toBe("setup");
    // Sign-up ends on the quick start, the first step of stage 1.
    expect(stageOpenByDefault(PATH, currentStepId(PATH, "/governance/quickstart"), fresh, false)?.id).toBe(
      "setup",
    );
  });

  it("opens the stage of the next step on the dashboard, and none on a library page", () => {
    const setUp = evaluatePath(PATH, { ...EMPTY_PATH_COUNTS, quickstartCompleted: true, jurisdictions: 1, regimeScreeningAnswered: true });
    expect(stageOpenByDefault(PATH, null, setUp, true)?.id).toBe(nextStep(PATH, setUp)?.stage.id);
    expect(stageOpenByDefault(PATH, null, evaluatePath(PATH, COMPLETE), true)).toBeNull();
    expect(stageOpenByDefault(PATH, null, null, false)).toBeNull();
  });
});
