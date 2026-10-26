// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The suite's shared pilot and plan, AI Sentinel's side (contract in
 * src/lib/suite-plan-state.ts; DPO Central runs the mirror image).
 *
 *   - localPlanStateForEmail answers the peer: the organisations this person
 *     owns here, folded: paid when any is paid (the latest renewal), the
 *     earliest pilot start (theirs, or the one the account keeps from an
 *     organisation it has left, account-trial.ts).
 *   - suiteForRequest runs on organisation requests of an owner:
 *       * a paid plan on the peer, with this organisation still on the
 *         pilot, puts it on the paid plan too, with the peer's renewal date
 *         and payment subscription, so the plan's end (relayed by
 *         subscription) ends it here as well; one PLAN_CHANGE audit entry,
 *         source "suite-peer";
 *       * the peer's pilot start is offered to ensurePilotFirstSignIn, which
 *         uses it only when this organisation has no start yet: a person who
 *         began the pilot on DPO Central does not get a second window here.
 *         A start already recorded is never moved, so no running pilot is
 *         shortened.
 *       * whether the person has the peer at all, for the pilot bar's line
 *         ("Your Cloud Plan covers DPO Central, AI Sentinel and VendorWatch").
 *
 * Fail safe: off the hosted pilot, without the shared secret, with
 * SUITE_PLAN_STATE=off, or when the peer is slow, down or answers anything
 * unexpected, nothing is read from it and everything behaves as before.
 * Nothing here ever removes a plan or ends a pilot. Answers are cached per
 * e-mail for five minutes (failures for one minute).
 */

import { logger } from "@/lib/logger";
import { hostedPilotActive, pilotFirstSignInStamp } from "@/config/pilot";
import {
  NOT_FOUND,
  SUITE_SIGNATURE_HEADER,
  normalizeEmail,
  parseSuiteState,
  signSuiteRequest,
  suitePlanStateEnabled,
  suiteSecret,
  type SuitePlanState,
} from "@/lib/suite-plan-state";

type Env = Record<string, string | undefined>;

const PAID_PLAN = "EU_CLOUD";
export const DEFAULT_PEER_URL = "https://dpocentral.todo.law";
export const PEER_TIMEOUT_MS = 2500;
const TTL_OK_MS = 5 * 60 * 1000;
const TTL_FAIL_MS = 60 * 1000;

export function peerUrl(env: Env = process.env): string {
  const raw = (env.SUITE_PEER_URL ?? "").trim() || DEFAULT_PEER_URL;
  return `${raw.replace(/\/+$/, "")}/api/suite/plan-state`;
}

// ── Answering the peer ─────────────────────────────────────────────────

type StateRow = {
  plan: string | null;
  planRenewsAt: Date | null;
  planStartedAt: Date | null;
  planStripeSubscriptionId: string | null;
  pilotFirstSignInAt: Date | null;
};

export interface LocalStateDb {
  organization: {
    findMany(args: {
      where: { members: { some: { role: "OWNER"; user: { email: { equals: string; mode: "insensitive" } } } } };
      select: {
        plan: true;
        planRenewsAt: true;
        planStartedAt: true;
        planStripeSubscriptionId: true;
        pilotFirstSignInAt: true;
      };
    }): Promise<StateRow[]>;
  };
  user: {
    findFirst(args: {
      where: { email: { equals: string; mode: "insensitive" } };
      select: { pilotTrialStartedAt: true };
    }): Promise<{ pilotTrialStartedAt: Date | null } | null>;
  };
}

const ms = (d: Date | null) => (d ? new Date(d).getTime() : null);

export async function localPlanStateForEmail(db: LocalStateDb, email: string): Promise<SuitePlanState> {
  const rows = await db.organization.findMany({
    where: { members: { some: { role: "OWNER", user: { email: { equals: email, mode: "insensitive" } } } } },
    select: {
      plan: true,
      planRenewsAt: true,
      planStartedAt: true,
      planStripeSubscriptionId: true,
      pilotFirstSignInAt: true,
    },
  });
  if (rows.length === 0) return NOT_FOUND;
  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { pilotTrialStartedAt: true },
  });
  const starts = [...rows.map((r) => r.pilotFirstSignInAt), user?.pilotTrialStartedAt ?? null]
    .filter((d): d is Date => !!d)
    .map((d) => pilotFirstSignInStamp(new Date(d)).getTime());
  const paid = rows
    .filter((r) => r.plan === PAID_PLAN)
    .sort((a, b) => {
      const ra = ms(a.planRenewsAt) ?? Number.POSITIVE_INFINITY;
      const rb = ms(b.planRenewsAt) ?? Number.POSITIVE_INFINITY;
      return rb - ra;
    })[0];
  return {
    version: 1,
    found: true,
    paid: !!paid,
    planRenewsAt: paid?.planRenewsAt ? new Date(paid.planRenewsAt).toISOString() : null,
    subscriptionId: paid?.planStripeSubscriptionId ?? null,
    pilotStartedAt: starts.length ? new Date(Math.min(...starts)).toISOString() : null,
  };
}

// ── Asking the peer ────────────────────────────────────────────────────

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface PeerDeps {
  env?: Env;
  fetch?: FetchLike;
  now?: () => number;
}

const cache = new Map<string, { at: number; value: SuitePlanState | null }>();

/** For tests. */
export function clearSuiteCache(): void {
  cache.clear();
}

/** The peer's answer for this e-mail, or null when it cannot be had (never throws). */
export async function peerPlanState(email: string, deps: PeerDeps = {}): Promise<SuitePlanState | null> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? Date.now;
  const secret = suiteSecret(env);
  const key = normalizeEmail(email);
  if (!key || !secret || !suitePlanStateEnabled(env)) return null;
  const hit = cache.get(key);
  if (hit && now() - hit.at < (hit.value ? TTL_OK_MS : TTL_FAIL_MS)) return hit.value;
  let value: SuitePlanState | null = null;
  try {
    const body = JSON.stringify({ version: 1, email: key });
    const f = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
    const res = await f(peerUrl(env), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [SUITE_SIGNATURE_HEADER]: signSuiteRequest(secret, Math.floor(now() / 1000), body),
      },
      body,
      signal: AbortSignal.timeout(PEER_TIMEOUT_MS),
    });
    value = res.ok ? parseSuiteState(await res.json()) : null;
    if (!res.ok) logger.warn("Suite plan state: peer refused", { status: res.status });
  } catch (err) {
    logger.warn("Suite plan state: peer unreachable", { error: err instanceof Error ? err.message : String(err) });
  }
  cache.set(key, { at: now(), value });
  return value;
}

// ── Applying it here ───────────────────────────────────────────────────

export interface SuiteOrg {
  id: string;
  plan?: string | null;
  pilotFirstSignInAt: Date | null;
  planStartedAt?: Date | null;
  planRenewsAt?: Date | null;
  planNote?: string | null;
  planStripeSubscriptionId?: string | null;
}

export interface SuiteUser {
  id?: string | null;
  email?: string | null;
}

export interface SuiteResult {
  /** The person also has DPO Central. */
  suite: boolean;
  /** The pilot start to use when this organisation has none yet. */
  preferredPilotStart: Date | null;
}

const NONE: SuiteResult = { suite: false, preferredPilotStart: null };

export interface ApplyDb {
  organization: {
    updateMany(args: { where: object; data: object }): Promise<{ count: number }>;
  };
  auditLog: { create(args: { data: object }): Promise<unknown> };
  $transaction<T>(fn: (tx: ApplyDb) => Promise<T>): Promise<T>;
}

/** Whether this request is one the suite looks at: hosted pilot, switched on, an owner. */
export function suiteApplies(role: string | null | undefined, user: SuiteUser | null | undefined, env: Env = process.env): boolean {
  return (
    hostedPilotActive(env) && suitePlanStateEnabled(env) && role === "OWNER" && normalizeEmail(user?.email) !== null
  );
}

/** Never throws: any failure reads as "nothing from the peer". Updates `org` in place when it adopts a plan. */
export async function suiteForRequest(
  db: ApplyDb,
  org: SuiteOrg,
  role: string | null | undefined,
  user: SuiteUser | null | undefined,
  deps: PeerDeps = {},
): Promise<SuiteResult> {
  try {
    const env = deps.env ?? process.env;
    if (!suiteApplies(role, user, env)) return NONE;
    const peer = await peerPlanState(user!.email!, deps);
    if (!peer || !peer.found) return NONE;
    if (peer.paid && org.plan !== PAID_PLAN) await adoptPeerPlan(db, org, peer, deps.now ?? Date.now);
    return { suite: true, preferredPilotStart: peer.pilotStartedAt ? new Date(peer.pilotStartedAt) : null };
  } catch (err) {
    logger.warn("Suite plan state: not applied", { error: err instanceof Error ? err.message : String(err) });
    return NONE;
  }
}

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

async function adoptPeerPlan(db: ApplyDb, org: SuiteOrg, peer: SuitePlanState, now: () => number): Promise<void> {
  const renewsAt = peer.planRenewsAt ? new Date(peer.planRenewsAt) : null;
  const startedAt = new Date(now());
  const subscription = peer.subscriptionId ?? org.planStripeSubscriptionId ?? null;
  const adopted = await db.$transaction(async (tx) => {
    const { count } = await tx.organization.updateMany({
      where: { id: org.id, NOT: { plan: PAID_PLAN } },
      data: { plan: PAID_PLAN, planStartedAt: startedAt, planRenewsAt: renewsAt, planStripeSubscriptionId: subscription },
    });
    if (count === 0) return false;
    await tx.auditLog.create({
      data: {
        organizationId: org.id,
        userId: null,
        entityType: "Organization",
        entityId: org.id,
        action: "PLAN_CHANGE",
        changes: {
          before: { plan: org.plan ?? "PILOT", planStartedAt: iso(org.planStartedAt), planRenewsAt: iso(org.planRenewsAt) },
          after: { plan: PAID_PLAN, planStartedAt: iso(startedAt), planRenewsAt: iso(renewsAt) },
          planNoteChanged: false,
          subscriptionChanged: (org.planStripeSubscriptionId ?? null) !== subscription,
        },
        metadata: { source: "suite-peer" },
      },
    });
    return true;
  });
  if (!adopted) return;
  org.plan = PAID_PLAN;
  org.planStartedAt = startedAt;
  org.planRenewsAt = renewsAt;
  org.planStripeSubscriptionId = subscription;
  logger.info("Suite plan state: paid plan adopted from the peer", { organizationId: org.id });
}
