// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Setting an organisation's plan by hand (plan.ts, used by
 * scripts/set-org-plan.ts): a dry run reads and writes nothing; a real run
 * writes the plan and one PLAN_CHANGE audit entry in one transaction; nothing
 * is written when nothing changes; the dates and the note follow the rules;
 * the note never reaches the audit trail.
 */

import { describe, it, expect, vi } from "vitest";
import {
  PLAN_CHANGE,
  PlanInputError,
  resolvePlanState,
  setOrganizationPlan,
  type PlanDb,
  type PlanOrgRow,
  type PlanState,
} from "./plan";

const NOW = new Date("2026-10-11T12:00:00Z");

function row(over: Partial<PlanOrgRow> = {}): PlanOrgRow {
  return {
    id: "org-1",
    slug: "acme",
    name: "Acme",
    plan: "PILOT",
    planStartedAt: null,
    planRenewsAt: null,
    planNote: null,
    planStripeSubscriptionId: null,
    ...over,
  };
}

function makeDb(initial: PlanOrgRow | null) {
  let current = initial;
  const update = vi.fn(async ({ data }: { data: Partial<PlanOrgRow> }) => {
    current = { ...(current as PlanOrgRow), ...data };
    return current;
  });
  const auditCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => data);
  const findFirst = vi.fn(async (args: { where: { OR: { id?: string; slug?: string }[] } }) => {
    if (!current) return null;
    const hit = args.where.OR.some((c) => c.id === current!.id || c.slug === current!.slug);
    return hit ? current : null;
  });
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ organization: { update }, auditLog: { create: auditCreate } }),
  );
  const db = { organization: { findFirst }, $transaction: transaction } as unknown as PlanDb;
  return { db, update, auditCreate, transaction, current: () => current };
}

describe("setOrganizationPlan", () => {
  it("a dry run shows the change and writes nothing", async () => {
    const t = makeDb(row());
    const r = await setOrganizationPlan(
      t.db,
      { org: "acme", plan: "EU_CLOUD", note: "invoice 1", operator: "op", dryRun: true },
      NOW,
    );
    expect(r.changed).toBe(true);
    expect(r.written).toBe(false);
    expect(r.before.plan).toBe("PILOT");
    expect(r.after.plan).toBe("EU_CLOUD");
    expect(r.after.planStartedAt).toEqual(NOW);
    expect(t.transaction).not.toHaveBeenCalled();
    expect(t.update).not.toHaveBeenCalled();
    expect(t.auditCreate).not.toHaveBeenCalled();
    expect(t.current()?.plan).toBe("PILOT");
  });

  it("a real run writes the plan and one PLAN_CHANGE audit entry, without the note", async () => {
    const t = makeDb(row());
    const r = await setOrganizationPlan(
      t.db,
      {
        org: "org-1",
        plan: "EU_CLOUD",
        startedAt: new Date("2026-10-12T00:00:00Z"),
        renewsAt: new Date("2026-11-12T00:00:00Z"),
        note: "invoice 1",
        operator: "op",
        dryRun: false,
      },
      NOW,
    );
    expect(r.written).toBe(true);
    expect(t.transaction).toHaveBeenCalledTimes(1);
    expect(t.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: {
        plan: "EU_CLOUD",
        planStartedAt: new Date("2026-10-12T00:00:00Z"),
        planRenewsAt: new Date("2026-11-12T00:00:00Z"),
        planNote: "invoice 1",
        planStripeSubscriptionId: null,
      },
    });
    expect(t.auditCreate).toHaveBeenCalledTimes(1);
    const entry = t.auditCreate.mock.calls[0][0].data;
    expect(entry.action).toBe(PLAN_CHANGE);
    expect(entry.organizationId).toBe("org-1");
    expect(entry.metadata).toEqual({ source: "scripts/set-org-plan.ts", operator: "op" });
    expect(JSON.stringify(entry)).not.toContain("invoice 1");
    expect((entry.changes as { planNoteChanged: boolean }).planNoteChanged).toBe(true);
  });

  it("back to the pilot clears the dates and keeps the note", async () => {
    const t = makeDb(
      row({
        plan: "EU_CLOUD",
        planStartedAt: new Date("2026-10-12T00:00:00Z"),
        planRenewsAt: new Date("2026-11-12T00:00:00Z"),
        planNote: "invoice 1",
      }),
    );
    const r = await setOrganizationPlan(t.db, { org: "acme", plan: "PILOT", operator: "op", dryRun: false }, NOW);
    expect(r.written).toBe(true);
    expect(t.current()).toMatchObject({ plan: "PILOT", planStartedAt: null, planRenewsAt: null, planNote: "invoice 1" });
  });

  it("writes nothing when nothing changes", async () => {
    const t = makeDb(row());
    const r = await setOrganizationPlan(t.db, { org: "acme", plan: "PILOT", operator: "op", dryRun: false }, NOW);
    expect(r.changed).toBe(false);
    expect(r.written).toBe(false);
    expect(t.transaction).not.toHaveBeenCalled();
  });

  it("a null plan reads as the pilot", async () => {
    const t = makeDb(row({ plan: null }));
    const r = await setOrganizationPlan(t.db, { org: "acme", plan: "PILOT", operator: "op", dryRun: true }, NOW);
    expect(r.before.plan).toBe("PILOT");
    expect(r.changed).toBe(false);
  });

  it("refuses an unknown organisation, an empty key and an unknown plan", async () => {
    const t = makeDb(row());
    await expect(
      setOrganizationPlan(t.db, { org: "nobody", plan: "EU_CLOUD", operator: "op", dryRun: true }, NOW),
    ).rejects.toBeInstanceOf(PlanInputError);
    await expect(
      setOrganizationPlan(t.db, { org: "  ", plan: "EU_CLOUD", operator: "op", dryRun: true }, NOW),
    ).rejects.toBeInstanceOf(PlanInputError);
    await expect(
      setOrganizationPlan(
        t.db,
        { org: "acme", plan: "GOLD" as unknown as "PILOT", operator: "op", dryRun: true },
        NOW,
      ),
    ).rejects.toBeInstanceOf(PlanInputError);
  });
});

describe("resolvePlanState", () => {
  const pilot: PlanState = {
    plan: "PILOT",
    planStartedAt: null,
    planRenewsAt: null,
    planNote: null,
    planStripeSubscriptionId: null,
  };
  const paid: PlanState = {
    plan: "EU_CLOUD",
    planStartedAt: new Date("2026-09-01T00:00:00Z"),
    planRenewsAt: new Date("2026-10-01T00:00:00Z"),
    planNote: "n",
    planStripeSubscriptionId: null,
  };

  it("a new paid plan starts now unless a start is given", () => {
    expect(resolvePlanState(pilot, { plan: "EU_CLOUD" }, NOW).planStartedAt).toEqual(NOW);
  });

  it("staying paid keeps the recorded dates unless given", () => {
    const s = resolvePlanState(paid, { plan: "EU_CLOUD", renewsAt: new Date("2026-11-01T00:00:00Z") }, NOW);
    expect(s.planStartedAt).toEqual(paid.planStartedAt);
    expect(s.planRenewsAt).toEqual(new Date("2026-11-01T00:00:00Z"));
  });

  it("refuses a renewal on or before the start", () => {
    expect(() =>
      resolvePlanState(pilot, { plan: "EU_CLOUD", startedAt: NOW, renewsAt: NOW }, NOW),
    ).toThrow(PlanInputError);
  });
});
