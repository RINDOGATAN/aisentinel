// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { planDayText, planPaceText, planSummaryText } from "./plan-text";
import type { PlanState } from "./plan";

type Translate = (key: string, values?: Record<string, string | number>) => string;

function translator(locale: "en" | "es"): Translate {
  return createTranslator({
    locale,
    messages: locale === "en" ? en : es,
    namespace: "guided",
  } as unknown as Parameters<typeof createTranslator>[0]) as unknown as Translate;
}

const running = (day: number, behindBy: number) =>
  ({ kind: "running", day, totalDays: 90, behindBy }) as const;

describe("plan wording", () => {
  const t = translator("en");
  const tes = translator("es");

  it("says the day, and on plan or behind", () => {
    expect(planDayText(running(12, 0), t)).toBe("Day 12 of 90");
    expect(planPaceText(running(12, 0), t)).toBe("On plan");
    expect(planPaceText(running(31, 1), t)).toBe("Behind plan by 1 day");
    expect(planPaceText(running(40, 10), t)).toBe("Behind plan by 10 days");
    expect(planSummaryText(running(40, 10), t)).toBe("Day 40 of 90 · Behind plan by 10 days");
  });

  it("after day 90 says complete or the stages left, never behind", () => {
    const remaining: PlanState = { kind: "remaining", day: 120, totalDays: 90, stageNumbers: [5, 6] };
    expect(planDayText(remaining, t)).toBe("Stages left: 5, 6");
    expect(planPaceText(remaining, t)).toBe("Stages left: 5, 6");
    expect(
      planSummaryText({ kind: "remaining", day: 120, totalDays: 90, stageNumbers: [6] }, t),
    ).toBe("Stage left: 6");
    expect(planPaceText({ kind: "complete", day: 95, totalDays: 90 }, t)).toBe("Plan complete");
  });

  it("says nothing in the menu or the card before the plan starts", () => {
    expect(planDayText({ kind: "notStarted" }, t)).toBeNull();
    expect(planPaceText(null, t)).toBeNull();
    expect(planSummaryText({ kind: "notStarted" }, t)).toBe("Starts with the quick start");
  });

  it("has the same states in Castilian Spanish", () => {
    expect(planDayText(running(12, 0), tes)).toBe("Día 12 de 90");
    expect(planPaceText(running(12, 0), tes)).toBe("Al día con el plan");
    expect(planPaceText(running(40, 10), tes)).toBe("Retraso de 10 días sobre el plan");
    expect(planPaceText(running(31, 1), tes)).toBe("Retraso de 1 día sobre el plan");
    expect(
      planDayText({ kind: "remaining", day: 120, totalDays: 90, stageNumbers: [5, 6] }, tes),
    ).toBe("Quedan las etapas 5, 6");
    expect(planPaceText({ kind: "complete", day: 20, totalDays: 90 }, tes)).toBe("Plan completado");
  });
});
