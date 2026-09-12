// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The gate in front of the hosted instance's paid deliverables.
 *
 * One function, used by every export route that produces a finished document,
 * so the answer cannot differ between them. It asks two questions in order:
 * is this deliverable behind the licence on this deployment, and does this
 * organisation hold an entitlement for it.
 *
 * A real entitlement (a Stripe subscription, or an offline licence file bought
 * on TODO.LAW and activated in Settings) opens it. Nothing else does.
 */

import { checkSkillEntitlement } from "@/server/services/licensing/entitlement";
import {
  SHOWCASE_PURCHASE_URL,
  isShowcasePremium,
  type ShowcaseFeature,
} from "@/config/premium-showcase";

/** The skill package that unlocks each showcase deliverable. */
const SKILL_BY_FEATURE: Record<ShowcaseFeature, string> = {
  "impact-assessment-document": "com.todolaw.aisentinel.impact-assessment",
  "program-report": "com.todolaw.aisentinel.program-report",
  "program-pack": "com.todolaw.aisentinel.program-report",
  "conformity-assessment": "com.todolaw.aisentinel.conformity",
  "bias-fairness-assessment": "com.todolaw.aisentinel.bias-fairness",
};

export interface ShowcaseAccess {
  allowed: boolean;
  /** Set when the deliverable is locked: what to tell the person. */
  locked?: {
    feature: ShowcaseFeature;
    skillId: string;
    purchaseUrl: string;
  };
}

export async function checkShowcaseAccess(
  organizationId: string,
  feature: ShowcaseFeature,
): Promise<ShowcaseAccess> {
  if (!isShowcasePremium(feature)) return { allowed: true };

  const skillId = SKILL_BY_FEATURE[feature];

  // The same lookup every other gate uses, with the free-for-all bypass
  // switched off: on this deployment, this deliverable is genuinely paid.
  const result = await checkSkillEntitlement(organizationId, skillId, {
    requireRealEntitlement: true,
  });

  if (result.entitled) return { allowed: true };

  return {
    allowed: false,
    locked: { feature, skillId, purchaseUrl: SHOWCASE_PURCHASE_URL },
  };
}

/** The response an export route returns when the deliverable is locked. */
export function lockedResponse(access: ShowcaseAccess): Response {
  return Response.json(
    {
      error: "Premium deliverable",
      feature: access.locked?.feature,
      skillId: access.locked?.skillId,
      purchaseUrl: access.locked?.purchaseUrl,
      message:
        "This document is part of a paid module on the hosted instance. Activate your licence in Settings, or self-host, where every module is included.",
    },
    { status: 402 },
  );
}
