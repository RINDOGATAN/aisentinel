// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { AI_SENTINEL_PATH, EMPTY_PATH_COUNTS } from "@/components/guided/path-config";
import { evaluatePath, isCounted, isShown, programFigure } from "@/components/guided/path";
import { PROGRESS_RECORD_KEYS, buildProgressReport } from "./progress-report";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

describe("program report: progress by stage", () => {
  it("lists the five stages with every counted step, in path order", () => {
    const report = buildProgressReport(AI_SENTINEL_PATH, EMPTY_PATH_COUNTS);
    expect(report.stages.map((s) => s.id)).toEqual(["setup", "inventory", "assess", "controls", "monitor"]);
    const statuses = evaluatePath(AI_SENTINEL_PATH, EMPTY_PATH_COUNTS);
    for (const stage of AI_SENTINEL_PATH.stages) {
      const listed = report.stages.find((s) => s.id === stage.id)?.steps.map((s) => s.id) ?? [];
      for (const step of stage.steps) {
        if (isCounted(step) && isShown(step, statuses)) expect(listed).toContain(step.id);
        if (step.coming) expect(listed).not.toContain(step.id);
      }
    }
  });

  it("reads the same figure as the screens", () => {
    const counts = { ...EMPTY_PATH_COUNTS, quickstartCompleted: true, systems: 3, systemsWithOwner: 3 };
    const report = buildProgressReport(AI_SENTINEL_PATH, counts);
    expect(report.figure).toEqual(programFigure(AI_SENTINEL_PATH, evaluatePath(AI_SENTINEL_PATH, counts)));
  });

  it("names the current stage, numbered as on the screens", () => {
    const report = buildProgressReport(AI_SENTINEL_PATH, EMPTY_PATH_COUNTS);
    expect(report.current).toMatchObject({ stageId: "setup", number: 1, total: 5 });
  });

  it("counts the records in a fixed order, so reports compare row by row", () => {
    const counts = { ...EMPTY_PATH_COUNTS, systems: 4, vendors: 2, incidents: 1 };
    const report = buildProgressReport(AI_SENTINEL_PATH, counts);
    expect(report.records.map((r) => r.key)).toEqual([...PROGRESS_RECORD_KEYS]);
    expect(report.records.find((r) => r.key === "systems")?.value).toBe(4);
    expect(report.records.find((r) => r.key === "incidents")?.value).toBe(1);
  });

  it("has every label in English and Spanish, with no long dashes", () => {
    for (const messages of [en, es] as unknown as Array<{
      programReport: { progress: Record<string, unknown> & { records: Record<string, string> } };
    }>) {
      const p = messages.programReport.progress;
      for (const key of ["eyebrow", "title", "lead", "complete", "doneWhen", "recordsTitle", "recordsLead"]) {
        expect(typeof p[key]).toBe("string");
        expect(String(p[key])).not.toMatch(/[—–]/);
      }
      for (const key of PROGRESS_RECORD_KEYS) {
        expect(typeof p.records[key]).toBe("string");
        expect(p.records[key]).not.toMatch(/[—–]/);
      }
    }
  });
});
