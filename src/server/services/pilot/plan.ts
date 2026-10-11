// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Setting an organisation's hosted plan (Organization.plan). Two callers:
 *
 *  - the operator's script scripts/set-org-plan.ts (payment collected by an
 *    invoice, or a correction by hand);
 *  - the automatic upgrade after a confirmed payment
 *    (src/server/services/plan-eu/sync.ts), behind AUTO_UPGRADE_ENABLED.
 *
 * Both write through writePlanChange: the new plan and one audit-trail entry
 * on the organisation (action PLAN_CHANGE) in a single transaction, with the
 * plan and the dates before and after. The operator's note (planNote) and the
 * payment subscription id stay on the organisation for the operator; the
 * audit entry says only whether the note changed, because the organisation's
 * owners can read its audit trail.
 *
 * Only the plan and its dates change here. No record the organisation holds is
 * ever touched: returning to the pilot brings back the limits, not a deletion.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

export const PLANS = ["PILOT", "EU_CLOUD"] as const;
export type Plan = (typeof PLANS)[number];

/** The audit action of a plan change. */
export const PLAN_CHANGE = "PLAN_CHANGE";

export type PlanState = {
  plan: Plan;
  planStartedAt: Date | null;
  planRenewsAt: Date | null;
  planNote: string | null;
  planStripeSubscriptionId: string | null;
};

export const PLAN_SELECT = {
  id: true,
  slug: true,
  name: true,
  plan: true,
  planStartedAt: true,
  planRenewsAt: true,
  planNote: true,
  planStripeSubscriptionId: true,
} as const;

/** An organisation row as read with PLAN_SELECT (the plan column is nullable). */
export type PlanOrgRow = Omit<PlanState, "plan"> & {
  id: string;
  slug: string;
  name: string;
  plan: Plan | null;
};

export interface SetPlanInput {
  /** Organisation id or slug. */
  org: string;
  plan: Plan;
  /** undefined: keep or default (see resolvePlanState); null: clear. */
  startedAt?: Date | null;
  renewsAt?: Date | null;
  note?: string | null;
  /** Who made the change, recorded in the audit entry. */
  operator: string;
  dryRun: boolean;
}

export interface SetPlanResult {
  organization: { id: string; slug: string; name: string };
  before: PlanState;
  after: PlanState;
  changed: boolean;
  written: boolean;
}

/** The Prisma client (tests pass a stand-in). */
export type PlanDb = Pick<PrismaClient, "organization" | "$transaction">;

export class PlanInputError extends Error {}

export function isPlan(value: string): value is Plan {
  return (PLANS as readonly string[]).includes(value);
}

/** The state of a row; a null plan counts as the pilot. */
export function planStateOf(row: PlanOrgRow): PlanState {
  return {
    plan: row.plan ?? "PILOT",
    planStartedAt: row.planStartedAt,
    planRenewsAt: row.planRenewsAt,
    planNote: row.planNote,
    planStripeSubscriptionId: row.planStripeSubscriptionId,
  };
}

/**
 * The plan state the operator's script writes:
 *  - EU_CLOUD: the start date given, else the one already recorded for a
 *    paid organisation, else now; the renewal date given, else the one
 *    already recorded; the payment subscription kept;
 *  - PILOT: both dates cleared unless given, the payment subscription cleared;
 *  - the note: the one given, else the one already recorded.
 * The renewal date must fall after the start date.
 */
export function resolvePlanState(
  before: PlanState,
  input: Pick<SetPlanInput, "plan" | "startedAt" | "renewsAt" | "note">,
  now: Date = new Date(),
): PlanState {
  const stayingPaid = before.plan === "EU_CLOUD" && input.plan === "EU_CLOUD";
  let planStartedAt: Date | null;
  let planRenewsAt: Date | null;
  if (input.plan === "EU_CLOUD") {
    planStartedAt =
      input.startedAt !== undefined
        ? input.startedAt
        : stayingPaid && before.planStartedAt
          ? before.planStartedAt
          : now;
    planRenewsAt =
      input.renewsAt !== undefined ? input.renewsAt : stayingPaid ? before.planRenewsAt : null;
  } else {
    planStartedAt = input.startedAt ?? null;
    planRenewsAt = input.renewsAt ?? null;
  }
  if (planStartedAt && planRenewsAt && planRenewsAt.getTime() <= planStartedAt.getTime()) {
    throw new PlanInputError("The renewal date must fall after the start date.");
  }
  const planNote = input.note !== undefined ? input.note : before.planNote;
  const planStripeSubscriptionId = input.plan === "EU_CLOUD" ? before.planStripeSubscriptionId : null;
  return { plan: input.plan, planStartedAt, planRenewsAt, planNote, planStripeSubscriptionId };
}

const time = (d: Date | null) => (d ? d.getTime() : null);

export function samePlanState(a: PlanState, b: PlanState): boolean {
  return (
    a.plan === b.plan &&
    time(a.planStartedAt) === time(b.planStartedAt) &&
    time(a.planRenewsAt) === time(b.planRenewsAt) &&
    a.planNote === b.planNote &&
    a.planStripeSubscriptionId === b.planStripeSubscriptionId
  );
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * Writes the new state and its audit entry in one transaction. The caller has
 * already checked that something changes.
 */
export async function writePlanChange(
  db: Pick<PrismaClient, "$transaction">,
  organizationId: string,
  before: PlanState,
  after: PlanState,
  metadata: Prisma.InputJsonObject,
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: organizationId }, data: after });
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: null,
        entityType: "Organization",
        entityId: organizationId,
        action: PLAN_CHANGE,
        changes: {
          before: {
            plan: before.plan,
            planStartedAt: iso(before.planStartedAt),
            planRenewsAt: iso(before.planRenewsAt),
          },
          after: {
            plan: after.plan,
            planStartedAt: iso(after.planStartedAt),
            planRenewsAt: iso(after.planRenewsAt),
          },
          planNoteChanged: before.planNote !== after.planNote,
          subscriptionChanged: before.planStripeSubscriptionId !== after.planStripeSubscriptionId,
        },
        metadata,
      },
    });
  });
}

export async function setOrganizationPlan(
  db: PlanDb,
  input: SetPlanInput,
  now: Date = new Date(),
): Promise<SetPlanResult> {
  const key = input.org.trim();
  if (!key) throw new PlanInputError("Give the organisation's id or slug.");
  if (!isPlan(input.plan)) throw new PlanInputError(`Unknown plan: ${String(input.plan)}.`);

  const row = (await db.organization.findFirst({
    where: { OR: [{ id: key }, { slug: key }] },
    select: PLAN_SELECT,
  })) as PlanOrgRow | null;
  if (!row) throw new PlanInputError(`No organisation with the id or slug "${key}".`);

  const before = planStateOf(row);
  const after = resolvePlanState(before, input, now);
  const changed = !samePlanState(before, after);
  const organization = { id: row.id, slug: row.slug, name: row.name };

  if (input.dryRun || !changed) {
    return { organization, before, after, changed, written: false };
  }

  await writePlanChange(db, row.id, before, after, {
    source: "scripts/set-org-plan.ts",
    operator: input.operator,
  });

  return { organization, before, after, changed, written: true };
}
