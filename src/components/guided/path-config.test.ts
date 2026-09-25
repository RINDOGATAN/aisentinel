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
  overallProgress,
  stageOfStep,
  stageProgress,
  type PathStatuses,
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
      ...PATH.library({ stripeEnabled: true }).map((i) => i.href),
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

  it("has every label in English and Spanish", () => {
    for (const messages of [en, es]) {
      const g = messages.guided as unknown as {
        stages: Record<string, string>;
        steps: Record<string, { label: string; why: string }>;
        library: Record<string, string>;
      };
      for (const stage of PATH.stages) expect(g.stages[stage.id], stage.id).toBeTruthy();
      for (const s of steps) {
        expect(g.steps[s.id]?.label, s.id).toBeTruthy();
        expect(g.steps[s.id]?.why, s.id).toBeTruthy();
      }
      for (const item of PATH.library({ stripeEnabled: true })) {
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
      expect(s[st.id], st.id).toBe(st.coming ? "coming" : "todo");
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
    expect(statusOf("quickstart", {})).toBe("todo");
  });

  it("frameworks: jurisdictions and mappings both needed", () => {
    expect(statusOf("frameworks", { jurisdictions: 1, mappings: 3 })).toBe("done");
    expect(statusOf("frameworks", { jurisdictions: 1 })).toBe("started");
    expect(statusOf("frameworks", { mappings: 3 })).toBe("started");
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
    expect(stageProgress(PATH.stages[0], s)).toEqual({ done: 1, total: 3, state: "started" });
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
});

describe("the current page", () => {
  it("marks exactly one step, the first in path order where a page serves two", () => {
    expect(currentStepId(PATH, "/governance/quickstart")).toBe("quickstart");
    expect(currentStepId(PATH, "/governance/vendors")).toBe("vendors");
    expect(currentStepId(PATH, "/governance/vendors/abc")).toBe("vendors");
    expect(currentStepId(PATH, "/governance/ai-registry/new")).toBe("systems");
    expect(currentStepId(PATH, "/governance/compliance")).toBe("frameworks");
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
});
