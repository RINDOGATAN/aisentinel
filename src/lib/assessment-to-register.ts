// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Turning answered assessment questions into compliance evidence.
 *
 * The unified assessment declares, on every question, which requirements its
 * answer evidences. Someone could answer all of it thoroughly and their
 * compliance register would still read NOT_ASSESSED from top to bottom, and
 * the only way to close that gap was to open each requirement and paste the
 * same text again. The product already knows the link; this computes it.
 *
 * Two deliberate limits:
 *
 *   - An answer is evidence, not a verdict. A requirement nobody has judged
 *     moves to PARTIALLY_COMPLIANT, which is what "documented but not yet
 *     assessed for sufficiency" means. It never moves to COMPLIANT: only a
 *     person decides that.
 *   - A status a person already set is never touched, in either direction.
 *     Overwriting somebody's NON_COMPLIANT finding with a cheerful automatic
 *     one would be the worst thing this could do.
 *
 * Pure: it plans, and the caller writes.
 */

import { readQuestionMeta, type TemplateQuestionLike } from "./assessment-metadata";

export interface RegisterSection {
  questions?: TemplateQuestionLike[];
}

/** A requirement as it exists in the register, keyed by framework and code. */
export interface RequirementRow {
  id: string;
  code: string;
  frameworkCode: string;
}

export interface MappingRow {
  requirementId: string;
  status: string;
  /** Evidence titles already attached, so the same answer is not added twice. */
  evidenceTitles?: string[];
}

export interface PlannedEvidence {
  requirementId: string;
  questionId: string;
  /** Stable, so re-running the action does not duplicate rows. */
  title: string;
  description: string;
  /** True when the requirement had no human verdict and can be lifted. */
  liftStatus: boolean;
}

export interface RegisterPlan {
  evidence: PlannedEvidence[];
  /** Requirements a question cites that this system has no mapping for. */
  unmapped: { questionId: string; framework: string; code: string }[];
  /** Cited requirements that are not seeded at all, usually a content typo. */
  unknown: { questionId: string; framework: string; code: string }[];
  counts: { evidenced: number; lifted: number; alreadyPresent: number };
}

/** The evidence title for one answer, stable across runs. */
export function evidenceTitle(assessmentTitle: string, questionId: string): string {
  return `${assessmentTitle} · ${questionId}`;
}

function answered(responses: Record<string, unknown>, id: string): string | null {
  const value = responses[id];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * What applying this assessment to the register would do.
 *
 * @param requirements every requirement the register knows, for resolving
 *        (framework, code) citations to ids.
 * @param mappings the system's existing mappings, for deciding what to lift.
 */
export function planRegisterUpdate(
  sections: readonly RegisterSection[],
  responses: Record<string, unknown>,
  requirements: readonly RequirementRow[],
  mappings: readonly MappingRow[],
  assessmentTitle: string,
): RegisterPlan {
  const byCode = new Map<string, RequirementRow>();
  for (const r of requirements) byCode.set(`${r.frameworkCode}|${r.code}`, r);
  const mappingByRequirement = new Map(mappings.map((m) => [m.requirementId, m]));

  const evidence: PlannedEvidence[] = [];
  const unmapped: RegisterPlan["unmapped"] = [];
  const unknown: RegisterPlan["unknown"] = [];
  let alreadyPresent = 0;
  const seen = new Set<string>();

  for (const section of sections) {
    for (const question of section.questions ?? []) {
      const answer = answered(responses, question.id);
      if (!answer) continue;
      const meta = readQuestionMeta(question);
      for (const citation of meta.satisfies) {
        const requirement = byCode.get(`${citation.framework}|${citation.code}`);
        if (!requirement) {
          unknown.push({ questionId: question.id, framework: citation.framework, code: citation.code });
          continue;
        }
        const mapping = mappingByRequirement.get(requirement.id);
        if (!mapping) {
          // The requirement exists but does not reach this system. Reporting
          // it is more useful than silently attaching evidence to nothing.
          unmapped.push({ questionId: question.id, framework: citation.framework, code: citation.code });
          continue;
        }
        const title = evidenceTitle(assessmentTitle, question.id);
        const key = `${requirement.id}|${title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if ((mapping.evidenceTitles ?? []).includes(title)) {
          alreadyPresent += 1;
          continue;
        }
        evidence.push({
          requirementId: requirement.id,
          questionId: question.id,
          title,
          description: answer,
          // Only an untouched requirement is lifted. A human verdict of any
          // kind, including NOT_APPLICABLE, stands.
          liftStatus: mapping.status === "NOT_ASSESSED",
        });
      }
    }
  }

  return {
    evidence,
    unmapped,
    unknown,
    counts: {
      evidenced: evidence.length,
      lifted: evidence.filter((e) => e.liftStatus).length,
      alreadyPresent,
    },
  };
}
