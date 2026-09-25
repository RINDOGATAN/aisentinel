// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { AI_SENTINEL_PATH, PLAN_WINDOWS } from "./path-config";
import { planDay, planState } from "./plan";
import type { PathStatuses } from "./path";

/** Every counted step of the given stages done, the rest not started. */
function statusesDone(stageIds: string[]): PathStatuses {
  const out: PathStatuses = {};
  for (const stage of AI_SENTINEL_PATH.stages) {
    for (const step of stage.steps) {
      out[step.id] = step.coming
        ? "coming"
        : step.shownWhen
          ? "hidden"
          : stageIds.includes(stage.id)
            ? "done"
            : "todo";
    }
  }
  return out;
}

const START = new Date("2026-09-01T15:30:00Z");
const onDay = (day: number) => new Date(Date.UTC(2026, 8, day, 9)); // 1 Sep 2026 is day 1
const plan = (stages: string[], today: Date, start: Date | string | null = START) =>
  planState(AI_SENTINEL_PATH, PLAN_WINDOWS, statusesDone(stages), start, today);

describe("planDay", () => {
  it("is 1 on the start day, whatever the hour", () => {
    expect(planDay(START, new Date("2026-09-01T00:00:00Z"))).toBe(1);
    expect(planDay(START, new Date("2026-09-01T23:59:59Z"))).toBe(1);
  });
  it("counts calendar days", () => {
    expect(planDay(START, new Date("2026-09-02T00:00:01Z"))).toBe(2);
    expect(planDay(START, new Date("2026-09-12T12:00:00Z"))).toBe(12);
    expect(planDay(START, new Date("2026-11-29T12:00:00Z"))).toBe(90);
  });
  it("reads a start in the future as day 1", () => {
    expect(planDay(START, new Date("2026-08-20T00:00:00Z"))).toBe(1);
  });
});

describe("the plan windows", () => {
  it("cover each of the six stages exactly once, two per thirty days", () => {
    const ids = PLAN_WINDOWS.flatMap((w) => w.stages);
    expect(ids).toEqual(AI_SENTINEL_PATH.stages.map((s) => s.id));
    expect(PLAN_WINDOWS.map((w) => w.untilDay)).toEqual([30, 60, 90]);
    for (const w of PLAN_WINDOWS) expect(w.stages).toHaveLength(2);
  });
});

describe("planState", () => {
  it("has not started without a start date", () => {
    expect(plan([], onDay(5), null)).toEqual({ kind: "notStarted" });
    expect(plan([], onDay(5), "not a date")).toEqual({ kind: "notStarted" });
  });

  it("is on plan during the first thirty days, even with nothing done", () => {
    expect(plan([], onDay(12))).toEqual({ kind: "running", day: 12, totalDays: 90, behindBy: 0 });
    expect(plan([], onDay(30))).toMatchObject({ behindBy: 0 });
  });

  it("is behind by the days past the first window while stage 1 or 2 is open", () => {
    expect(plan(["setup"], onDay(31))).toMatchObject({ kind: "running", day: 31, behindBy: 1 });
    expect(plan([], new Date(Date.UTC(2026, 9, 10)))).toMatchObject({ day: 40, behindBy: 10 });
  });

  it("is on plan on day 45 with stages 1 and 2 done", () => {
    expect(plan(["setup", "people"], new Date(Date.UTC(2026, 9, 15)))).toMatchObject({ day: 45, behindBy: 0 });
  });

  it("counts from the earliest missed window", () => {
    // Day 70: stage 2 (due day 30) and stage 3 (due day 60) are open.
    const state = plan(["setup", "assess"], new Date(Date.UTC(2026, 10, 9)));
    expect(state).toMatchObject({ kind: "running", day: 70, behindBy: 40 });
  });

  it("is complete as soon as every stage is done, even early", () => {
    const all = AI_SENTINEL_PATH.stages.map((s) => s.id);
    expect(plan(all, onDay(20))).toEqual({ kind: "complete", day: 20, totalDays: 90 });
    expect(plan(all, new Date(Date.UTC(2027, 0, 1)))).toMatchObject({ kind: "complete" });
  });

  it("after day 90 names the stages left and says nothing about lateness", () => {
    const state = plan(["setup", "people", "inventory", "assess"], new Date(Date.UTC(2026, 11, 1)));
    expect(state).toEqual({ kind: "remaining", day: 92, totalDays: 90, stageNumbers: [5, 6] });
    expect(state).not.toHaveProperty("behindBy");
  });

  it("day 90 itself is still within the plan", () => {
    expect(plan(["setup", "people", "inventory", "assess"], new Date(Date.UTC(2026, 10, 29)))).toMatchObject({
      kind: "running",
      day: 90,
      behindBy: 0,
    });
    expect(plan(["setup", "people"], new Date(Date.UTC(2026, 10, 29)))).toMatchObject({ day: 90, behindBy: 30 });
  });
});
