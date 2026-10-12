// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** The sync route's logic, apart from Next so it can be tested with a fake database. */

import { PLAN_REF_APP, autoUpgradeActive, planSyncSecret, type PlanEuEnv } from "./config";
import { applySyncInstruction, parseSyncBody, verifySyncSignature, type SyncDb } from "./sync";

export interface HandlerOutcome {
  status: number;
  body: Record<string, unknown>;
}

export async function handlePlanSync(
  db: SyncDb,
  rawBody: string,
  signatureHeader: string | null,
  env: PlanEuEnv = process.env,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<HandlerOutcome> {
  const secret = planSyncSecret(env);
  if (!autoUpgradeActive(env) || !secret) {
    return { status: 503, body: { error: "automatic upgrade is off" } };
  }
  if (!verifySyncSignature(secret, rawBody, signatureHeader, nowSeconds)) {
    console.warn(JSON.stringify({ at: "plan-eu-sync", error: "bad-signature" }));
    return { status: 401, body: { error: "invalid signature" } };
  }
  const ins = parseSyncBody(rawBody);
  if (!ins) return { status: 400, body: { error: "malformed body" } };
  try {
    const results = await applySyncInstruction(db, ins, { secret, app: PLAN_REF_APP });
    return { status: 200, body: { ok: true, results } };
  } catch (err) {
    console.error(
      JSON.stringify({ at: "plan-eu-sync", eventId: ins.eventId, error: err instanceof Error ? err.message : "failed" }),
    );
    return { status: 500, body: { error: "plan change not recorded" } };
  }
}
