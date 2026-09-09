// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Reading the unified template's metadata off a stored assessment.
 *
 * The unified assessment writes three things onto every question when the
 * template is created: why it is being asked, the requirement codes its answer
 * will evidence, and which of the generated documents that answer feeds. All
 * of it was being carried through the database and then dropped on the floor
 * at the answering screen, which is where it is worth the most: it is the
 * difference between a long questionnaire and one where each answer visibly
 * closes several obligations at once.
 *
 * Everything here is tolerant of its absence. The four seeded system templates
 * (FRIA, conformity, AI risk, bias and fairness) carry none of it and must
 * keep rendering exactly as they did. Pure.
 */

export interface QuestionCitation {
  framework: string;
  code: string;
}

export interface QuestionMeta {
  /** "core", an overlay tag, or null when the template predates this. */
  reason: string | null;
  satisfies: QuestionCitation[];
  /** "assessment" | "notice" | "protocol". */
  feeds: string[];
}

export interface TemplateQuestionLike {
  id: string;
  reason?: unknown;
  satisfies?: unknown;
  feeds?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Tolerant reader: anything malformed reads as "no metadata". */
export function readQuestionMeta(question: TemplateQuestionLike): QuestionMeta {
  const satisfies: QuestionCitation[] = [];
  if (Array.isArray(question.satisfies)) {
    for (const entry of question.satisfies) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const framework = asString(e.framework);
      const code = asString(e.code);
      if (framework && code) satisfies.push({ framework, code });
    }
  }
  const feeds = Array.isArray(question.feeds)
    ? question.feeds.filter((f): f is string => typeof f === "string" && f.trim() !== "")
    : [];
  return { reason: asString(question.reason), satisfies, feeds };
}

/** One obligation, identified across every question that cites it. */
function citationKey(citation: QuestionCitation): string {
  return `${citation.framework}|${citation.code}`;
}

export interface FrameworkCoverage {
  framework: string;
  total: number;
  evidenced: number;
}

export interface AssessmentCoverage {
  /** False for the templates that predate this, so the UI can show nothing. */
  hasMetadata: boolean;
  totalObligations: number;
  evidencedObligations: number;
  byFramework: FrameworkCoverage[];
  /** Distinct reasons, core first, then the overlays in first-seen order. */
  reasons: string[];
}

export interface SectionLike {
  questions?: TemplateQuestionLike[];
}

/**
 * What this assessment evidences, and how much of it is answered.
 *
 * An obligation counts as evidenced when any one question citing it has an
 * answer: that is the whole point of the shared core, and counting it per
 * question instead would understate the work done.
 */
export function assessmentCoverage(
  sections: readonly SectionLike[],
  responses: Record<string, unknown>,
): AssessmentCoverage {
  const answered = (id: string) => {
    const value = responses[id];
    return typeof value === "string" ? value.trim() !== "" : value != null;
  };

  const obligations = new Map<string, { framework: string; evidenced: boolean }>();
  const reasons: string[] = [];
  let sawMetadata = false;

  for (const section of sections) {
    for (const question of section.questions ?? []) {
      const meta = readQuestionMeta(question);
      if (meta.reason || meta.satisfies.length > 0) sawMetadata = true;
      if (meta.reason && !reasons.includes(meta.reason)) reasons.push(meta.reason);
      for (const citation of meta.satisfies) {
        const key = citationKey(citation);
        const existing = obligations.get(key);
        const evidenced = answered(question.id);
        if (existing) {
          existing.evidenced = existing.evidenced || evidenced;
        } else {
          obligations.set(key, { framework: citation.framework, evidenced });
        }
      }
    }
  }

  const byFramework = new Map<string, FrameworkCoverage>();
  for (const { framework, evidenced } of obligations.values()) {
    const row = byFramework.get(framework) ?? { framework, total: 0, evidenced: 0 };
    row.total += 1;
    if (evidenced) row.evidenced += 1;
    byFramework.set(framework, row);
  }

  // Core first: it is what everyone answers, and it reads oddly below an
  // overlay that only some organisations see.
  reasons.sort((a, b) => (a === "core" ? -1 : b === "core" ? 1 : 0));

  return {
    hasMetadata: sawMetadata,
    totalObligations: obligations.size,
    evidencedObligations: [...obligations.values()].filter((o) => o.evidenced).length,
    byFramework: [...byFramework.values()].sort((a, b) => b.total - a.total || a.framework.localeCompare(b.framework)),
    reasons,
  };
}

/** A framework code as it should read in a citation, e.g. "EU GDPR Art. 22". */
export function citationText(citation: QuestionCitation): string {
  return `${citation.framework.replace(/_/g, " ")} ${citation.code}`;
}
