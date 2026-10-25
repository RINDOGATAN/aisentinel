// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * GET /api/plan/checkout?org=<organisation id>[&interval=month|year]: sends an owner or
 * administrator to the plan's payment link with a signed reference to the
 * organisation (src/server/services/plan-eu/checkout.ts), in the visitor's
 * currency, yearly unless interval=month. 404 while the automatic upgrade is
 * off or that currency's link for the interval is not set; 400 for an unknown
 * interval.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { planCheckout } from "@/server/services/plan-eu/checkout";
import { inAppPlanOffer } from "@/server/services/plan-eu/offer";
import { parsePlanInterval } from "@/server/services/plan-eu/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user =
    session?.user?.id && session.user.email ? { id: session.user.id, email: session.user.email } : null;
  const org = request.nextUrl.searchParams.get("org");
  const interval = parsePlanInterval(request.nextUrl.searchParams.get("interval"));
  if (!interval) return NextResponse.json({ error: "interval must be month or year" }, { status: 400 });
  const outcome = await planCheckout(
    prisma,
    user,
    org && org.length <= 100 ? org : null,
    // The same decision as the bar's price and button (inAppPlanOffer).
    inAppPlanOffer(request.headers).currency,
    process.env,
    interval,
  );
  if (outcome.status === 303) {
    return NextResponse.redirect(outcome.location, 303);
  }
  return NextResponse.json({ error: outcome.error }, { status: outcome.status });
}
