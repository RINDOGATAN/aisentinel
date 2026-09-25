// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The shape of a program path and the pure functions that read it.
 *
 * Product-neutral on purpose: nothing here knows about AI systems or
 * assessments. A product supplies a `PathConfig` over its own counts type
 * (AI Sentinel's is in ./path-config.ts); the Guided menu, the next-step
 * card, the phone progress bar and the portfolio all read it through the
 * functions below, so they can never disagree about where an organisation
 * stands.
 *
 * Progress is computed, never ticked by hand: each step carries a rule over
 * counts the product already holds, and the rule is the only thing that can
 * mark a step done.
 *
 * Pure: no React, no Prisma, no Next.
 */

import type { LucideIcon } from "lucide-react";

/**
 * - `done`     the rule is met
 * - `started`  there is something, but not yet enough
 * - `todo`     nothing yet
 * - `coming`   the product has no page for it yet
 */
export type StepStatus = "done" | "started" | "todo" | "coming";

/** A stage as a whole: not started, in progress, or done. */
export type StageState = "todo" | "started" | "done";

export interface PathStep<C> {
  /** Stable id; also the i18n key under `steps.<id>`. */
  id: string;
  /** The existing page the step opens. Null only for a step that is coming. */
  href: string | null;
  icon: LucideIcon;
  /** The "done" rule in plain words, for the next person to change it. */
  rule: string;
  /** The rule itself. Never called for a step that is coming. */
  status?: (counts: C) => Exclude<StepStatus, "coming">;
  /** No page carries it yet: shown, labelled "coming", never counted. */
  coming?: boolean;
  /**
   * Needed only when something happens (a proceeding) or kept by the product
   * on its own (the audit trail): shown with its state, never counted in a
   * stage's progress and never offered as the next step.
   */
  optional?: boolean;
}

export interface PathStage<C> {
  /** Stable id; also the i18n key under `stages.<id>`. */
  id: string;
  icon: LucideIcon;
  steps: PathStep<C>[];
}

export interface LibraryItem {
  /** i18n key under `library.<id>`. */
  id: string;
  href: string;
  icon: LucideIcon;
}

export interface PathConfig<C> {
  stages: PathStage<C>[];
  /** "Library and tools": everything that is not a step but must stay reachable. */
  library: (options: { stripeEnabled: boolean }) => LibraryItem[];
}

export type PathStatuses = Record<string, StepStatus>;

/** Every step's status for one organisation's counts. */
export function evaluatePath<C>(config: PathConfig<C>, counts: C): PathStatuses {
  const out: PathStatuses = {};
  for (const stage of config.stages) {
    for (const step of stage.steps) {
      out[step.id] = step.coming || !step.status ? "coming" : step.status(counts);
    }
  }
  return out;
}

/** A step that counts towards progress: it has a page and is not situational. */
export function isCounted<C>(step: PathStep<C>): boolean {
  return !step.coming && !step.optional;
}

export interface StageProgress {
  done: number;
  total: number;
  state: StageState;
}

/**
 * "2 of 3" for a stage: done steps over counted steps. The stage is done when
 * every counted step is; in progress when any counted step is done or started.
 */
export function stageProgress<C>(stage: PathStage<C>, statuses: PathStatuses): StageProgress {
  const counted = stage.steps.filter(isCounted);
  const done = counted.filter((s) => statuses[s.id] === "done").length;
  const moving = counted.some((s) => statuses[s.id] === "done" || statuses[s.id] === "started");
  const state: StageState =
    counted.length > 0 && done === counted.length ? "done" : moving ? "started" : "todo";
  return { done, total: counted.length, state };
}

/** Done over counted, across the whole path. */
export function overallProgress<C>(config: PathConfig<C>, statuses: PathStatuses) {
  let done = 0;
  let total = 0;
  for (const stage of config.stages) {
    const p = stageProgress(stage, statuses);
    done += p.done;
    total += p.total;
  }
  return { done, total };
}

export interface NextStep<C> {
  stage: PathStage<C>;
  stageIndex: number;
  step: PathStep<C>;
}

/** The first counted step, in path order, that is not done. Null when all are. */
export function nextStep<C>(config: PathConfig<C>, statuses: PathStatuses): NextStep<C> | null {
  for (const [stageIndex, stage] of config.stages.entries()) {
    for (const step of stage.steps) {
      if (isCounted(step) && statuses[step.id] !== "done") return { stage, stageIndex, step };
    }
  }
  return null;
}

/** The path part of an href, without a query or a fragment. */
function hrefPath(href: string): string {
  return href.split(/[?#]/)[0];
}

function matches(pathname: string, href: string): boolean {
  const path = hrefPath(href);
  return pathname === path || pathname.startsWith(path + "/");
}

/**
 * The step the current page belongs to. Some pages serve two steps (the
 * vendor list is both where vendors are added and where their due diligence
 * lives); the first step in path order wins, so exactly one entry is ever
 * marked as the current page.
 */
export function currentStepId<C>(config: PathConfig<C>, pathname: string): string | null {
  // Longest match first, so /governance/ai-registry/new is not claimed by a
  // shorter prefix of another step; ties go to path order.
  let best: { id: string; length: number } | null = null;
  for (const stage of config.stages) {
    for (const step of stage.steps) {
      if (!step.href || !matches(pathname, step.href)) continue;
      const length = hrefPath(step.href).length;
      if (!best || length > best.length) best = { id: step.id, length };
    }
  }
  return best?.id ?? null;
}

/** The stage holding a step, by id. */
export function stageOfStep<C>(config: PathConfig<C>, stepId: string | null): PathStage<C> | null {
  if (!stepId) return null;
  return config.stages.find((s) => s.steps.some((step) => step.id === stepId)) ?? null;
}

/** The library entry the current page belongs to, if it is not a step. */
export function currentLibraryId(items: LibraryItem[], pathname: string): string | null {
  const found = items.find((item) => matches(pathname, item.href));
  return found?.id ?? null;
}
