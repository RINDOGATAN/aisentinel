// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The instruction the storefront relays after a payment event on the plan,
 * and how this app applies it. See config.ts for the whole flow.
 *
 * The relay is signed: header x-plan-sync-signature: t=<unix seconds>,v1=<hex
 * HMAC-SHA256(PLAN_SYNC_SECRET, "<t>.<raw body>")>, accepted within five
 * minutes.
 *
 * "paid" (a first payment or a renewal):
 *   1. organisations already holding this subscription: keep the paid plan
 *      and move the renewal date (nothing written when it is the same);
 *   2. otherwise, a valid reference made by this app: that organisation
 *      (rule "reference"). If it is already paid under a different
 *      subscription, nothing changes ("already-paid-other-subscription": the
 *      operator looks at a double payment). If it was set paid by hand,
 *      without a subscription, the subscription and renewal are attached and
 *      the start date kept;
 *   3. otherwise the e-mail rule: the payer's e-mail belongs to a user who is
 *      OWNER or ADMIN of exactly one organisation here: that organisation
 *      (rule "email"). None: "no-account"; several: "several-organisations".
 *      A reference made by this app that fails its signature is logged and
 *      falls through to this rule.
 * "ended" (the subscription has ended, at the end of the paid period, or the
 * payment provider gave up after its retries): every paid organisation holding
 * this subscription returns to the pilot. An organisation set paid by hand
 * (no subscription) is never returned automatically. Nothing is deleted: the
 * pilot's limits come back, and the editing window is where it was (so a
 * long-paid organisation is read-only at once, with export).
 *
 * Idempotent: a repeat of the same instruction finds the state already right
 * and writes nothing.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  PLAN_SELECT,
  planStateOf,
  samePlanState,
  writePlanChange,
  type PlanOrgRow,
  type PlanState,
} from "@/server/services/pilot/plan";
import { parsePlanReference } from "./reference";

export const SYNC_SIGNATURE_HEADER = "x-plan-sync-signature";
export const SYNC_TOLERANCE_SECONDS = 300;

export function signSyncBody(secret: string, rawBody: string, t: number): string {
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

export function verifySyncSignature(
  secret: string,
  rawBody: string,
  header: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return i < 0 ? [p.trim(), ""] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isInteger(t) || !v1 || !/^[0-9a-f]{64}$/.test(v1)) return false;
  if (Math.abs(nowSeconds - t) > SYNC_TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"));
  const given = Buffer.from(v1);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export interface SyncInstruction {
  version: 1;
  eventId: string;
  eventType: string;
  kind: "paid" | "ended";
  subscriptionId: string;
  customerEmail: string | null;
  clientReferenceId: string | null;
  periodEnd: Date | null;
  livemode: boolean;
}

const str = (v: unknown) => typeof v === "string" && v.length > 0 && v.length <= 500;

/** The body as sent by the storefront, or null when it is malformed. */
export function parseSyncBody(raw: string): SyncInstruction | null {
  let b: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    b = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  if (b.version !== 1) return null;
  if (!str(b.eventId) || !str(b.eventType) || !str(b.subscriptionId)) return null;
  if (b.kind !== "paid" && b.kind !== "ended") return null;
  if (b.customerEmail !== null && b.customerEmail !== undefined && !str(b.customerEmail)) return null;
  if (b.clientReferenceId !== null && b.clientReferenceId !== undefined && !str(b.clientReferenceId)) return null;
  if (typeof b.livemode !== "boolean") return null;
  let periodEnd: Date | null = null;
  if (b.periodEnd !== null && b.periodEnd !== undefined) {
    if (typeof b.periodEnd !== "string") return null;
    periodEnd = new Date(b.periodEnd);
    if (Number.isNaN(periodEnd.getTime())) return null;
  }
  return {
    version: 1,
    eventId: b.eventId as string,
    eventType: b.eventType as string,
    kind: b.kind,
    subscriptionId: b.subscriptionId as string,
    customerEmail: (b.customerEmail as string | null | undefined)?.trim().toLowerCase() || null,
    clientReferenceId: (b.clientReferenceId as string | null | undefined) || null,
    periodEnd,
    livemode: b.livemode,
  };
}

export type SyncRule = "subscription" | "reference" | "email" | "none";

export interface SyncResult {
  organizationId: string | null;
  rule: SyncRule;
  changed: boolean;
  reason?: string;
}

export type SyncDb = Pick<PrismaClient, "organization" | "organizationMember" | "$transaction">;

type Log = (line: Record<string, unknown>) => void;
const defaultLog: Log = (line) => console.info(JSON.stringify({ at: "plan-eu-sync", ...line }));

export interface ApplyOptions {
  secret: string;
  app: string;
  now?: Date;
  log?: Log;
}

async function change(
  db: SyncDb,
  row: PlanOrgRow,
  after: PlanState,
  rule: SyncRule,
  ins: SyncInstruction,
  log: Log,
): Promise<SyncResult> {
  const before = planStateOf(row);
  if (samePlanState(before, after)) {
    log({ eventId: ins.eventId, organizationId: row.id, rule, changed: false });
    return { organizationId: row.id, rule, changed: false };
  }
  await writePlanChange(db, row.id, before, after, {
    source: "stripe-auto-upgrade",
    eventId: ins.eventId,
    eventType: ins.eventType,
    subscriptionId: ins.subscriptionId,
    rule,
    livemode: ins.livemode,
  });
  log({
    eventId: ins.eventId,
    organizationId: row.id,
    rule,
    changed: true,
    from: before.plan,
    to: after.plan,
    renewsAt: after.planRenewsAt?.toISOString() ?? null,
  });
  return { organizationId: row.id, rule, changed: true };
}

function paidState(before: PlanState, ins: SyncInstruction, now: Date): PlanState {
  return {
    plan: "EU_CLOUD",
    planStartedAt: before.plan === "EU_CLOUD" && before.planStartedAt ? before.planStartedAt : now,
    planRenewsAt: ins.periodEnd ?? before.planRenewsAt,
    planNote: before.planNote,
    planStripeSubscriptionId: ins.subscriptionId,
  };
}

/** Applies one instruction. Throws only on a database failure (the route answers 500 and the relay retries). */
export async function applySyncInstruction(
  db: SyncDb,
  ins: SyncInstruction,
  opts: ApplyOptions,
): Promise<SyncResult[]> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? defaultLog;

  const holding = (await db.organization.findMany({
    where: { planStripeSubscriptionId: ins.subscriptionId },
    select: PLAN_SELECT,
  })) as PlanOrgRow[];

  if (ins.kind === "ended") {
    if (holding.length === 0) {
      log({ eventId: ins.eventId, kind: "ended", rule: "none", reason: "no-organisation-on-subscription" });
      return [{ organizationId: null, rule: "none", changed: false, reason: "no-organisation-on-subscription" }];
    }
    const results: SyncResult[] = [];
    for (const row of holding) {
      const before = planStateOf(row);
      if (before.plan !== "EU_CLOUD") {
        results.push({ organizationId: row.id, rule: "subscription", changed: false, reason: "already-pilot" });
        continue;
      }
      results.push(
        await change(
          db,
          row,
          { ...before, plan: "PILOT", planRenewsAt: null, planStripeSubscriptionId: null },
          "subscription",
          ins,
          log,
        ),
      );
    }
    return results;
  }

  // "paid": 1. organisations already on this subscription.
  if (holding.length > 0) {
    const results: SyncResult[] = [];
    for (const row of holding) {
      results.push(await change(db, row, paidState(planStateOf(row), ins, now), "subscription", ins, log));
    }
    return results;
  }

  // 2. a reference made by this app.
  const ref = parsePlanReference(opts.secret, opts.app, ins.clientReferenceId);
  if (ref.kind === "invalid") {
    log({ eventId: ins.eventId, warning: "invalid-reference-signature", fallback: "email" });
  }
  if (ref.kind === "valid") {
    const row = (await db.organization.findUnique({
      where: { id: ref.organizationId },
      select: PLAN_SELECT,
    })) as PlanOrgRow | null;
    if (row) {
      const before = planStateOf(row);
      if (
        before.plan === "EU_CLOUD" &&
        before.planStripeSubscriptionId &&
        before.planStripeSubscriptionId !== ins.subscriptionId
      ) {
        log({ eventId: ins.eventId, organizationId: row.id, rule: "reference", reason: "already-paid-other-subscription" });
        return [{ organizationId: row.id, rule: "reference", changed: false, reason: "already-paid-other-subscription" }];
      }
      return [await change(db, row, paidState(before, ins, now), "reference", ins, log)];
    }
    log({ eventId: ins.eventId, warning: "reference-organisation-not-found", fallback: "email" });
  }

  // 3. the e-mail rule.
  if (!ins.customerEmail) {
    log({ eventId: ins.eventId, rule: "none", reason: "no-account" });
    return [{ organizationId: null, rule: "none", changed: false, reason: "no-account" }];
  }
  const memberships = await db.organizationMember.findMany({
    where: {
      role: { in: ["OWNER", "ADMIN"] },
      user: { email: { equals: ins.customerEmail, mode: "insensitive" } },
    },
    select: { organizationId: true },
  });
  const ids = [...new Set(memberships.map((m) => m.organizationId))];
  if (ids.length !== 1) {
    const reason = ids.length === 0 ? "no-account" : "several-organisations";
    log({ eventId: ins.eventId, rule: "none", reason, candidates: ids.length });
    return [{ organizationId: null, rule: "none", changed: false, reason }];
  }
  const row = (await db.organization.findUnique({ where: { id: ids[0] }, select: PLAN_SELECT })) as PlanOrgRow | null;
  if (!row) {
    log({ eventId: ins.eventId, rule: "none", reason: "no-account" });
    return [{ organizationId: null, rule: "none", changed: false, reason: "no-account" }];
  }
  const before = planStateOf(row);
  if (before.plan === "EU_CLOUD" && before.planStripeSubscriptionId && before.planStripeSubscriptionId !== ins.subscriptionId) {
    log({ eventId: ins.eventId, organizationId: row.id, rule: "email", reason: "already-paid-other-subscription" });
    return [{ organizationId: row.id, rule: "email", changed: false, reason: "already-paid-other-subscription" }];
  }
  return [await change(db, row, paidState(before, ins, now), "email", ins, log)];
}
