// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * POST /api/plan/stripe-sync: the storefront's signed relay of a payment event
 * on the EU cloud plan ("paid" or "ended"). See
 * src/server/services/plan-eu/sync.ts for the mapping rule.
 *
 *   503 the automatic upgrade is off (AUTO_UPGRADE_ENABLED, PLAN_SYNC_SECRET)
 *   401 missing, wrong or stale signature
 *   400 malformed body
 *   500 database failure (the relay answers the payment provider with an
 *       error, so the event is retried; the instruction is idempotent)
 *   200 { ok: true, results } (an unmatched payment is a 200 with a reason)
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handlePlanSync } from "@/server/services/plan-eu/handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const out = await handlePlanSync(prisma, raw, request.headers.get("x-plan-sync-signature"));
  return NextResponse.json(out.body, { status: out.status });
}
