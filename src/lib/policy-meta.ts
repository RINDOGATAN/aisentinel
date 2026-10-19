// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Small rules about a policy that the list, the policy page, the exports and
 * the router share. Pure: no database, no network.
 *
 *  - Origin: a policy created from a template (provenance AUTO_TEMPLATE) is
 *    counted apart from the ones the organization wrote.
 *  - "Draft from template: review": a template policy still in draft that no
 *    person has edited or confirmed. Only these may be removed in one step.
 *  - The policy reference ("POL-007") and the review date an interval sets.
 */

export const POLICY_TYPES = [
  "AI_USAGE",
  "AI_GOVERNANCE",
  "AI_ETHICS",
  "AI_RISK_MANAGEMENT",
  "AI_DATA_GOVERNANCE",
  "AI_PROCUREMENT",
  "AI_INCIDENT_RESPONSE",
  "AI_TRANSPARENCY",
  "CUSTOM",
] as const;
export type PolicyTypeValue = (typeof POLICY_TYPES)[number];

/** Review intervals the forms offer, in months. 12 is the suggested default. */
export const REVIEW_INTERVALS = [6, 12, 24, 36] as const;
export const DEFAULT_REVIEW_INTERVAL = 12;

/** The lifecycle, in order: the statuses a policy passes through, then its review. */
export const POLICY_LIFECYCLE = ["DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "REVIEW"] as const;

export interface PolicyOriginFacts {
  provenance: string;
  status: string;
  confirmedAt: Date | string | null;
  editedAt: Date | string | null;
  sourceRef?: string | null;
}

export function isFromTemplate(p: Pick<PolicyOriginFacts, "provenance">): boolean {
  return p.provenance === "AUTO_TEMPLATE";
}

/** A template draft nobody has edited or confirmed yet. */
export function isUnreviewedTemplateDraft(p: PolicyOriginFacts): boolean {
  return isFromTemplate(p) && p.status === "DRAFT" && p.confirmedAt == null && p.editedAt == null;
}

/**
 * Removable in one step from the policy list. The sample data's policy is
 * excluded: the sample has its own removal, which tracks what it created.
 */
export function isRemovableTemplateDraft(p: PolicyOriginFacts): boolean {
  return isUnreviewedTemplateDraft(p) && !(p.sourceRef ?? "").startsWith("worked-example");
}

/** The Prisma filter that matches isRemovableTemplateDraft. */
export const REMOVABLE_TEMPLATE_DRAFT_WHERE = {
  provenance: "AUTO_TEMPLATE" as const,
  status: "DRAFT" as const,
  confirmedAt: null,
  editedAt: null,
  // A null sourceRef must match too, and NOT(LIKE) on NULL is not true in SQL.
  OR: [{ sourceRef: null }, { NOT: { sourceRef: { startsWith: "worked-example" } } }],
};

export interface PolicyOriginCounts {
  total: number;
  writtenHere: number;
  fromTemplates: number;
  toReview: number;
}

export function countPolicyOrigins(policies: PolicyOriginFacts[]): PolicyOriginCounts {
  let fromTemplates = 0;
  let toReview = 0;
  for (const p of policies) {
    if (isFromTemplate(p)) fromTemplates++;
    if (isUnreviewedTemplateDraft(p)) toReview++;
  }
  return { total: policies.length, writtenHere: policies.length - fromTemplates, fromTemplates, toReview };
}

/** "POL-007". Null when the policy has no number yet. */
export function policyReference(number: number | null | undefined): string | null {
  if (number == null || number < 1) return null;
  return `POL-${String(number).padStart(3, "0")}`;
}

/** The date `months` after `from`, as YYYY-MM-DD (end-of-month safe). */
export function reviewDateAfter(from: Date, months: number): string {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth() + months;
  const target = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(from.getUTCDate(), lastDay));
  return target.toISOString().slice(0, 10);
}

/** Whether an edit changes what the policy says or covers (sets editedAt once). */
export function isSubstantiveEdit(fields: {
  title?: unknown;
  description?: unknown;
  content?: unknown;
}): boolean {
  return fields.title !== undefined || fields.description !== undefined || fields.content !== undefined;
}
