"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Settings is not a step, but it holds an editable copy of step 1.2's
 * questions. So a person who arrives here from the step does not lose the
 * thread:
 * - `SettingsStepBand`, at the top: "Step 1.2: answer the questions marked
 *   below" (or that the step is complete), and the way back to the step;
 * - `StepMarked`, around each card that counts: a small line naming the step,
 *   ticked once that card's part of the rule is met (path.ts, StepCheck).
 *
 * Both read the step's checks from the program path query; a card whose
 * check is not in the list (the California screening for an organisation
 * that did not declare California) carries no mark.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Circle } from "lucide-react";
import { AI_SENTINEL_PATH } from "./path-config";
import { stepAndFollowing } from "./path";
import { useProgramPathQuery } from "./use-program-path";

const STEP_ID = "obligations";

function stepNumber(): string | null {
  return stepAndFollowing(AI_SENTINEL_PATH, STEP_ID)?.current.number ?? null;
}

export function SettingsStepBand() {
  const t = useTranslations("guided");
  const { steps } = useProgramPathQuery();
  const number = stepNumber();
  if (!steps || !number) return null;
  const done = steps[STEP_ID] === "done";
  const href = AI_SENTINEL_PATH.stages.flatMap((s) => s.steps).find((s) => s.id === STEP_ID)?.href;

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm sm:flex-row sm:items-center"
      role="status"
      data-testid="settings-step-band"
    >
      <p className="min-w-0 flex-1">
        {done ? t("settingsBand.done", { number }) : t("settingsBand.todo", { number })}
      </p>
      {href && (
        <Link
          href={href}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start rounded-md px-2 font-medium text-primary hover:bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("settingsBand.back", { number })}
        </Link>
      )}
    </div>
  );
}

/** A card that counts for step 1.2, marked with the step and whether its part is met. */
export function StepMarked({ check, children }: { check: string; children: React.ReactNode }) {
  const t = useTranslations("guided");
  const { checks } = useProgramPathQuery();
  const number = stepNumber();
  const found = checks?.[STEP_ID]?.find((c) => c.id === check);
  if (!found || !number) return <>{children}</>;
  return (
    <div className="space-y-1.5" data-step-marked={check}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
        {found.met ? (
          <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />
        ) : (
          <Circle className="size-3.5 shrink-0" aria-hidden="true" />
        )}
        {found.met ? t("settingsBand.markerDone", { number }) : t("settingsBand.marker", { number })}
      </p>
      {children}
    </div>
  );
}
