// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Assessment versions: the dated record of what an assessment said.
 *
 * The live assessment row answers "what does it say now". A regulator, and
 * opposing counsel, ask "what did it say on the day the decision was taken",
 * and an assessment that can only answer the first question is worth much less
 * than one that can answer both.
 *
 * A version is appended when the answers change, when the assessment is
 * submitted, and when it is approved or rejected. Each carries a content hash
 * over the canonical form of the answers, so a version that changed nothing of
 * substance is recognisable as such and is not written at all.
 *
 * There is deliberately no update and no delete path.
 */

import { createHash } from "crypto";
import type { AssessmentStatus, Prisma, PrismaClient } from "@prisma/client";

export const VERSION_REASONS = ["EDIT", "SUBMIT", "APPROVE", "REJECT"] as const;
export type VersionReason = (typeof VERSION_REASONS)[number];

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Canonical JSON: object keys sorted at every depth, so a re-save that only
 * reorders keys does not read as a change of substance.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([k, v]) => [k, canonical(v)]));
  }
  return value;
}

export function assessmentContentHash(input: {
  title: string;
  responses: unknown;
  mitigations: unknown;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonical({
          title: input.title,
          responses: input.responses ?? null,
          mitigations: input.mitigations ?? null,
        }),
      ),
    )
    .digest("hex");
}

export interface RecordVersionResult {
  /** Null when nothing of substance changed and no version was written. */
  version: number | null;
  contentHash: string;
}

/**
 * Append a version of an assessment as it stands right now.
 *
 * `force` is for the transitions (submit, approve, reject): those are recorded
 * even when the answers are byte-identical to the previous version, because
 * the event itself is the fact worth keeping.
 */
export async function recordAssessmentVersion(
  db: Db,
  args: {
    organizationId: string;
    assessmentId: string;
    reason: VersionReason;
    userId: string;
    force?: boolean;
  },
): Promise<RecordVersionResult> {
  const assessment = await db.aIAssessment.findFirst({
    where: { id: args.assessmentId, organizationId: args.organizationId },
    select: {
      id: true,
      title: true,
      status: true,
      riskScore: true,
      responses: true,
      mitigations: true,
    },
  });
  if (!assessment) return { version: null, contentHash: "" };

  const contentHash = assessmentContentHash({
    title: assessment.title,
    responses: assessment.responses,
    mitigations: assessment.mitigations,
  });

  const last = await db.aIAssessmentVersion.findFirst({
    where: { assessmentId: args.assessmentId },
    orderBy: { version: "desc" },
    select: { version: true, contentHash: true },
  });

  if (!args.force && last?.contentHash === contentHash) {
    return { version: null, contentHash };
  }

  const next = (last?.version ?? 0) + 1;

  await db.aIAssessmentVersion.create({
    data: {
      organizationId: args.organizationId,
      assessmentId: args.assessmentId,
      version: next,
      reason: args.reason,
      status: assessment.status as AssessmentStatus,
      title: assessment.title,
      riskScore: assessment.riskScore,
      responses: assessment.responses ?? undefined,
      mitigations: assessment.mitigations ?? undefined,
      contentHash,
      createdBy: args.userId,
    },
  });

  return { version: next, contentHash };
}

/** How many answers a version holds, for a list row that has to stay small. */
export function answeredCount(responses: unknown): number {
  if (!responses || typeof responses !== "object") return 0;
  return Object.values(responses as Record<string, unknown>).filter(
    (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  ).length;
}
