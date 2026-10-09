// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The readings the Guided dashboard, the menu and All clients share
 * (src/lib/programme-overview.ts), and the program figure (path.ts).
 */

import { describe, expect, it } from "vitest";
import {
  AI_SENTINEL_PATH,
  EMPTY_PATH_COUNTS,
  PLAN_WINDOWS,
  type PathCounts,
} from "@/components/guided/path-config";
import { evaluatePath, programFigure } from "@/components/guided/path";
import { evaluateRegister, type DocumentFacts } from "@/config/document-register";
import type { NeedsActionItem } from "@/lib/needs-action";
import {
  documentsReady,
  nearestDeadline,
  nextActions,
  notYetEntries,
  panelRows,
  planMilestone,
  programmeAreas,
  sortByNearestDeadline,
  stepDocumentRows,
} from "./programme-overview";

const facts = (over: Partial<DocumentFacts> = {}): DocumentFacts => ({
  ...EMPTY_PATH_COUNTS,
  policiesApproved: 0,
  policiesUnconfirmed: 0,
  systemsWithApprovedAssessment: 0,
  models: 0,
  sensitiveOpen: 0,
  aiAssistOn: false,
  impactAssessmentLocked: false,
  programReportLocked: false,
  ...over,
});

/** Roughly what the quick start leaves: drafts everywhere, nothing confirmed. */
const AFTER_QUICKSTART: Partial<PathCounts> = {
  quickstartCompleted: true,
  jurisdictions: 1,
  regimeScreeningAnswered: true,
  policies: 6,
  systems: 3,
  systemsWithOwner: 3,
  vendors: 2,
  classified: 3,
  classificationsUnconfirmed: 3,
  oversightGates: 1,
  gatesUnconfirmed: 1,
  transparencyProfiles: 3,
  transparencyUnconfirmed: 3,
  unconfirmed: 13,
  confirmable: 13,
};

describe("the program figure", () => {
  it("adds up its four parts to the counted steps", () => {
    const statuses = evaluatePath(AI_SENTINEL_PATH, { ...EMPTY_PATH_COUNTS, ...AFTER_QUICKSTART });
    const f = programFigure(AI_SENTINEL_PATH, statuses);
    expect(f.confirmed + f.toConfirm + f.started + f.notStarted).toBe(f.total);
    // The quick start's drafts are "to confirm", never confirmed.
    expect(f.toConfirm).toBe(3);
    expect(statuses.classification).toBe("toConfirm");
  });

  it("counts a step met with drafts once they are confirmed", () => {
    const before = programFigure(
      AI_SENTINEL_PATH,
      evaluatePath(AI_SENTINEL_PATH, { ...EMPTY_PATH_COUNTS, ...AFTER_QUICKSTART }),
    );
    const after = programFigure(
      AI_SENTINEL_PATH,
      evaluatePath(AI_SENTINEL_PATH, {
        ...EMPTY_PATH_COUNTS,
        ...AFTER_QUICKSTART,
        classificationsUnconfirmed: 0,
        gatesUnconfirmed: 0,
        transparencyUnconfirmed: 0,
        unconfirmed: 6,
      }),
    );
    expect(after.confirmed).toBe(before.confirmed + 3);
    expect(after.total).toBe(before.total);
  });
});

describe("menu lines and the panel read the same register", () => {
  it("puts each produced document under its step, and the rest in one group", () => {
    const f = facts({ ...AFTER_QUICKSTART });
    const statuses = evaluatePath(AI_SENTINEL_PATH, f);
    const documents = evaluateRegister(f);
    const lines = stepDocumentRows(AI_SENTINEL_PATH, statuses, documents);
    expect(lines.systems.map((r) => r.entry.id)).toEqual(["systemRegister", "modelInventory", "annexIv"]);
    expect(lines.prohibited).toBeUndefined();
    const { notYet } = panelRows(documents);
    expect(notYet.map((r) => r.entry.id)).toEqual(notYetEntries().map((e) => e.id));
  });

  it("orders the panel ready, then drafts, then those waiting for an input", () => {
    const documents = evaluateRegister(facts({ ...AFTER_QUICKSTART, auditEntries: 3 }));
    const order = panelRows(documents).produced.map((r) => r.doc.status.state);
    const rank = { ready: 0, draft: 1, needsInput: 2, notYet: 3 } as const;
    expect(order).toEqual([...order].sort((a, b) => rank[a] - rank[b]));
  });

  it("counts the documents ready out of those AI SENTINEL produces", () => {
    const documents = evaluateRegister(facts({ ...AFTER_QUICKSTART, auditEntries: 3 }));
    const { ready, total } = documentsReady(documents);
    expect(total).toBe(documents.filter((d) => d.status.state !== "notYet").length);
    expect(ready).toBeGreaterThan(0);
  });
});

describe("areas and next actions", () => {
  const incident: NeedsActionItem = { kind: "incident-open", count: 1, href: "/governance/incidents" };
  const queue: NeedsActionItem = { kind: "review-queue", count: 13, href: "/governance/review" };

  it("gives six areas, the stage with waiting work reading 'action'", () => {
    const statuses = evaluatePath(AI_SENTINEL_PATH, { ...EMPTY_PATH_COUNTS, ...AFTER_QUICKSTART });
    const areas = programmeAreas(AI_SENTINEL_PATH, statuses, [incident]);
    expect(areas).toHaveLength(6);
    expect(areas.find((a) => a.stage.id === "monitor")?.word).toBe("action");
    expect(areas.find((a) => a.stage.id === "assess")?.word).toBe("toConfirm");
  });

  it("puts waiting work first, then the path, and drops a to-confirm step when the queue is listed", () => {
    const statuses = evaluatePath(AI_SENTINEL_PATH, { ...EMPTY_PATH_COUNTS, ...AFTER_QUICKSTART });
    const actions = nextActions(AI_SENTINEL_PATH, statuses, [queue, incident]);
    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatchObject({ kind: "needsAction", item: { kind: "incident-open" } });
    expect(actions[1]).toMatchObject({ kind: "needsAction", item: { kind: "review-queue" } });
    expect(actions.every((a) => a.kind === "needsAction" || !a.toConfirm)).toBe(true);
  });
});

describe("deadlines and the All clients order", () => {
  it("finds the plan's next milestone while the plan runs", () => {
    const start = "2026-10-01T00:00:00.000Z";
    const m = planMilestone(PLAN_WINDOWS, start, { kind: "running", day: 12, totalDays: 90, behindBy: 0 });
    expect(m?.day).toBe(30);
    expect(m?.at.toISOString().slice(0, 10)).toBe("2026-10-30");
    expect(planMilestone(PLAN_WINDOWS, null, { kind: "notStarted" })).toBeNull();
  });

  it("takes the earliest deadline, overdue first", () => {
    const d = nearestDeadline(
      [
        { kind: "retest", at: "2026-10-20T00:00:00.000Z", label: "Model", href: "/x" },
        { kind: "incidentReport", at: "2026-10-05T00:00:00.000Z", label: "Outage", href: "/y" },
      ],
      { day: 30, at: new Date("2026-10-30T00:00:00.000Z") },
    );
    expect(d?.kind).toBe("incidentReport");
  });

  it("sorts clients by the nearest deadline, those with none after, by name", () => {
    const rows = sortByNearestDeadline([
      { name: "Bravo", deadline: null },
      { name: "Charlie", deadline: { at: "2026-11-01T00:00:00.000Z" } },
      { name: "Alpha", deadline: null },
      { name: "Delta", deadline: { at: "2026-10-01T00:00:00.000Z" } },
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Delta", "Charlie", "Alpha", "Bravo"]);
  });
});
