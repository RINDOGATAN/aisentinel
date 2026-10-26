// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The program report's "Progress by stage" page: every counted step of the
 * path, grouped by its five stages, with its state on the date the report is
 * generated, and the records to date. Two reports of different dates can then
 * be laid side by side and compared line by line (owner, 24 Oct 2026: "the
 * executive report must reflect real status, comparable over time"; the same
 * shape as DPO Central's board report).
 *
 * The states come from the same rules the menu, the dashboard and the figure
 * read (AI_SENTINEL_PATH, evaluatePath), so the report cannot disagree with
 * the screens. Pure: counts in, plain data out.
 */

import type { PathCounts } from "@/components/guided/path-config";
import {
  currentPhase,
  evaluatePath,
  isCounted,
  isShown,
  programFigure,
  stageNumber,
  stageProgress,
  type PathConfig,
  type ProgramFigure,
  type StageState,
  type StepStatus,
} from "@/components/guided/path";

export interface ProgressStep {
  id: string;
  status: StepStatus;
  optional: boolean;
}

export interface ProgressStage {
  id: string;
  /** Consecutive stage number, as on the screens; null for a stage still coming. */
  number: number | null;
  state: StageState;
  steps: ProgressStep[];
}

/** The records the report counts, in a fixed order so reports compare row by row. */
export const PROGRESS_RECORD_KEYS = [
  "systems",
  "systemsWithOwner",
  "classified",
  "highRisk",
  "highRiskAssessed",
  "vendors",
  "vendorsAssessed",
  "assessmentsApproved",
  "oversightGates",
  "evidence",
  "incidents",
  "boardReports",
] as const;

export type ProgressRecordKey = (typeof PROGRESS_RECORD_KEYS)[number];

export interface ProgressReport {
  figure: ProgramFigure;
  /** The stage holding the next step not done, or null when the program is complete. */
  current: { stageId: string; number: number; total: number } | null;
  stages: ProgressStage[];
  records: { key: ProgressRecordKey; value: number }[];
}

export function buildProgressReport(config: PathConfig<PathCounts>, counts: PathCounts): ProgressReport {
  const statuses = evaluatePath(config, counts);
  const phase = currentPhase(config, statuses);
  const stages: ProgressStage[] = config.stages
    .map((stage) => ({
      id: stage.id,
      number: stageNumber(config, stage.id),
      state: stageProgress(stage, statuses).state,
      steps: stage.steps
        .filter((step) => !step.coming && (isCounted(step) || step.optional) && isShown(step, statuses))
        .map((step) => ({
          id: step.id,
          status: statuses[step.id] ?? "todo",
          optional: !!step.optional,
        })),
    }))
    .filter((stage) => stage.steps.length > 0);
  return {
    figure: programFigure(config, statuses),
    current: phase ? { stageId: phase.stage.id, number: phase.number, total: phase.total } : null,
    stages,
    records: PROGRESS_RECORD_KEYS.map((key) => ({ key, value: counts[key] })),
  };
}
