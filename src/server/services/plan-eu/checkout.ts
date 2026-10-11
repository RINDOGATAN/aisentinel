// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Where "Move to the paid plan" sends the browser: the plan's payment link for
 * the visitor's currency (currency.ts), carrying a signed reference to the organisation and the person's e-mail.
 * Only on the hosted pilot, only when the automatic upgrade is on, only for
 * an owner or administrator, and only for an organisation not already paid.
 */

import type { PrismaClient } from "@prisma/client";
import { hostedPilotActive } from "@/config/pilot";
import { isPaidPlan } from "@/server/services/pilot/caps";
import {
  PLAN_REF_APP,
  autoUpgradeActive,
  planCloudLink,
  planSyncSecret,
  type PlanEuEnv,
} from "./config";
import type { Currency } from "./currency";
import { makePlanReference } from "./reference";

export const UPGRADE_ROLES = ["OWNER", "ADMIN"] as const;

export type CheckoutDb = Pick<PrismaClient, "organizationMember">;

export type CheckoutOutcome =
  | { status: 303; location: string }
  | { status: 401 | 403 | 404 | 409; error: string };

export async function planCheckout(
  db: CheckoutDb,
  user: { id: string; email: string } | null,
  organizationId: string | null,
  currency: Currency,
  env: PlanEuEnv = process.env,
): Promise<CheckoutOutcome> {
  const secret = planSyncSecret(env);
  const link = planCloudLink(currency, env);
  if (!autoUpgradeActive(env) || !secret || !hostedPilotActive(env) || !link) {
    return { status: 404, error: "Not found" };
  }
  if (!user) return { status: 401, error: "Sign in first" };

  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id, ...(organizationId ? { organizationId } : {}) },
    select: { organizationId: true, role: true, organization: { select: { plan: true } } },
  });
  const admin = memberships.filter((m) => (UPGRADE_ROLES as readonly string[]).includes(m.role));
  if (organizationId && memberships.length === 0) return { status: 404, error: "Not found" };
  if (admin.length === 0) {
    return { status: 403, error: "Only an owner or administrator can move the organisation to the paid plan" };
  }
  if (!organizationId && admin.length > 1) return { status: 409, error: "Choose the organisation" };
  const target = admin[0];
  if (isPaidPlan(target.organization)) return { status: 409, error: "Already on the paid plan" };

  const ref = makePlanReference(secret, PLAN_REF_APP, target.organizationId);
  const url = new URL(link);
  url.searchParams.set("client_reference_id", ref);
  url.searchParams.set("prefilled_email", user.email);
  return { status: 303, location: url.toString() };
}
