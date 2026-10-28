// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * POST /api/suite/firm-team
 *
 * DPO Central pushes the full firm team of one account (the contract in
 * src/lib/suite-firm-team.ts); it is applied here by
 * src/server/services/suite/firm-team.ts. Signed with the shared
 * PLAN_SYNC_SECRET in the x-suite-signature header under its own
 * "suite-firm-team.v1" prefix, five minutes' tolerance.
 *
 *   404  switched off (SUITE_FIRM_TEAM is not "on", or no secret);
 *   401  missing, wrong or stale signature (nothing is read);
 *   400  malformed push;
 *   409  a push for this account with the same or a later time was already applied;
 *   200  applied.
 */

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { SUITE_SIGNATURE_HEADER, suiteSecret } from "@/lib/suite-plan-state";
import { parseFirmTeamPush, suiteFirmTeamEnabled, verifyFirmTeamSignature } from "@/lib/suite-firm-team";
import { applyFirmTeamPush } from "@/server/services/suite/firm-team";

export async function POST(request: Request) {
  const secret = suiteSecret();
  if (!suiteFirmTeamEnabled() || !secret) {
    return Response.json({ error: "Not available" }, { status: 404 });
  }
  const body = await request.text();
  if (!verifyFirmTeamSignature(request.headers.get(SUITE_SIGNATURE_HEADER), body, secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return Response.json({ error: "Malformed request" }, { status: 400 });
  }
  const push = parseFirmTeamPush(raw);
  if (!push) return Response.json({ error: "Malformed request" }, { status: 400 });
  try {
    const outcome = await applyFirmTeamPush(prisma, push);
    if (outcome.stale) return Response.json({ error: "A later push was already applied" }, { status: 409 });
    const { stale: _stale, ...counts } = outcome;
    void _stale;
    return Response.json({ version: 1, applied: true, ...counts });
  } catch (err) {
    logger.error("Applying a firm team push failed", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
