// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Rule-pack version registry.
 *
 * Every deterministic rule pack that contributes to a generated artifact
 * declares a version and the date its legal content was last reviewed. A
 * snapshot records the versions in force when it was captured, so a diff can
 * distinguish "your program improved" from "the law moved underneath you" —
 * the first question anyone asks about a number that changed.
 *
 * Pure leaf module: no Prisma, no Next, no React. Imported by the snapshot
 * service, the diff module and the PDF methodology annex.
 *
 * Version format is `YYYY.MM.N` (calendar-ish, bumped per content change);
 * the scoring model uses semver because a formula change is a breaking change
 * for comparability.
 */

import {
  ANNEX_III_RULES_VERSION,
  ANNEX_III_RULES_LAW_REVIEWED_AS_OF,
} from "./annex-iii-rules";
import {
  TRANSPARENCY_RULES_VERSION,
  TRANSPARENCY_RULES_LAW_REVIEWED_AS_OF,
} from "./transparency-rules";
import {
  QUICKSTART_BASELINE_VERSION,
  QUICKSTART_BASELINE_LAW_REVIEWED_AS_OF,
} from "./quickstart-compliance-baseline";
import {
  PROGRAM_GUIDANCE_VERSION,
  PROGRAM_GUIDANCE_LAW_REVIEWED_AS_OF,
} from "./program-guidance";
import {
  LAWFIRM_TOOLKIT_VERSION,
  LAWFIRM_LAW_REVIEWED_AS_OF,
} from "./lawfirm-ai-toolkit";
import { MATURITY_MODEL_VERSION } from "@/server/services/program/maturity";

export interface RulePackDescriptor {
  /** Content version — bumped on any change to the pack's rules or prose */
  version: string;
  /** ISO date the pack's legal content was last reviewed */
  lawReviewedAsOf: string;
  /** Whether that review has been signed off, or is still pending */
  signOff: "signed-off" | "pending";
}

export const RULE_PACKS = {
  "annex-iii-rules": {
    version: ANNEX_III_RULES_VERSION,
    lawReviewedAsOf: ANNEX_III_RULES_LAW_REVIEWED_AS_OF,
    signOff: "signed-off",
  },
  "transparency-rules": {
    version: TRANSPARENCY_RULES_VERSION,
    lawReviewedAsOf: TRANSPARENCY_RULES_LAW_REVIEWED_AS_OF,
    signOff: "signed-off",
  },
  "quickstart-compliance-baseline": {
    version: QUICKSTART_BASELINE_VERSION,
    lawReviewedAsOf: QUICKSTART_BASELINE_LAW_REVIEWED_AS_OF,
    signOff: "pending",
  },
  "program-guidance": {
    version: PROGRAM_GUIDANCE_VERSION,
    lawReviewedAsOf: PROGRAM_GUIDANCE_LAW_REVIEWED_AS_OF,
    signOff: "pending",
  },
  "lawfirm-ai-toolkit": {
    version: LAWFIRM_TOOLKIT_VERSION,
    lawReviewedAsOf: LAWFIRM_LAW_REVIEWED_AS_OF,
    signOff: "signed-off",
  },
  "maturity-model": {
    version: MATURITY_MODEL_VERSION,
    // The scoring model is methodology, not law; it carries the date its
    // formulas were last reviewed so the annex can state it alongside the rest.
    lawReviewedAsOf: "2026-08-18",
    signOff: "signed-off",
  },
} as const satisfies Record<string, RulePackDescriptor>;

export type RulePackId = keyof typeof RULE_PACKS;

/** Flat id → version map, as stored on a snapshot. */
export function rulePackVersions(): Record<RulePackId, string> {
  return Object.fromEntries(
    Object.entries(RULE_PACKS).map(([id, pack]) => [id, pack.version]),
  ) as Record<RulePackId, string>;
}

/** Ordered descriptors for the PDF annex table. */
export function rulePackList(): Array<{ id: RulePackId } & RulePackDescriptor> {
  return (Object.keys(RULE_PACKS) as RulePackId[])
    .sort()
    .map((id) => ({ id, ...RULE_PACKS[id] }));
}
