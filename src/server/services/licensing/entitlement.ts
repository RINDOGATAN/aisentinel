// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { AIAssessmentType, EntitlementStatus, LicenseType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { features } from "@/config/features";
import { isShowcasePremium } from "@/config/premium-showcase";
import { hostedPilotActive } from "@/config/pilot";

// On the hosted unpaywalled cloud instance (Stripe off, NEXT_PUBLIC_ALL_SKILLS_FREE
// unset) the previously-premium features are free for everyone. Deployments
// that set NEXT_PUBLIC_ALL_SKILLS_FREE=false enforce entitlements — created
// by Stripe checkout or by activating an offline licence file bought on
// TODO.LAW (see ../licensing/activation.ts), the sovereign purchase path.
const ALL_SKILLS_FREE_REASON = "All skills free on this deployment";

// The hosted pilot (src/config/pilot.ts) gates nothing by an entitlement:
// every module is open to every organisation and the pilot's caps apply
// instead. Premium modules are sold only for the kit.
const HOSTED_PILOT_REASON = "Hosted pilot: every module is open";

export const PREMIUM_ASSESSMENT_TYPES: AIAssessmentType[] = [
  "CONFORMITY",
  "BIAS_FAIRNESS",
];

export const FREE_ASSESSMENT_TYPES: AIAssessmentType[] = [
  "FRIA",
  "AI_RISK",
  "CUSTOM",
];

export interface EntitlementCheckResult {
  entitled: boolean;
  reason?: string;
  entitlement?: {
    id: string;
    licenseType: LicenseType;
    expiresAt: Date | null;
  };
}

export async function checkAssessmentEntitlement(
  organizationId: string,
  assessmentType: AIAssessmentType
): Promise<EntitlementCheckResult> {
  if (FREE_ASSESSMENT_TYPES.includes(assessmentType)) {
    return { entitled: true, reason: "Free assessment type" };
  }

  if (hostedPilotActive()) {
    return { entitled: true, reason: HOSTED_PILOT_REASON };
  }

  // Where the premium showcase is open (a Stripe-off deployment that is not
  // the hosted pilot) the two specialist assessments stay behind the licence
  // even though everything else is free. See src/config/premium-showcase.ts.
  const showcase =
    assessmentType === "CONFORMITY"
      ? isShowcasePremium("conformity-assessment")
      : assessmentType === "BIAS_FAIRNESS"
        ? isShowcasePremium("bias-fairness-assessment")
        : false;

  if (features.allSkillsFree && !showcase) {
    return { entitled: true, reason: ALL_SKILLS_FREE_REASON };
  }

  const skillPackage = await prisma.skillPackage.findFirst({
    where: { assessmentType, isActive: true },
  });

  if (!skillPackage) {
    return { entitled: false, reason: `No skill package found for ${assessmentType}` };
  }

  const customerOrg = await prisma.customerOrganization.findFirst({
    where: { organizationId },
    include: {
      customer: {
        include: {
          entitlements: {
            where: {
              status: EntitlementStatus.ACTIVE,
              skillPackageId: skillPackage.id,
            },
          },
        },
      },
    },
  });

  if (!customerOrg) {
    return { entitled: false, reason: "Organization is not linked to any customer account" };
  }

  const activeEntitlement = customerOrg.customer.entitlements.find((e) => {
    if (e.status !== EntitlementStatus.ACTIVE) return false;
    if (e.expiresAt && e.expiresAt < new Date()) return false;
    return true;
  });

  if (!activeEntitlement) {
    return { entitled: false, reason: `No active ${assessmentType} license found` };
  }

  return {
    entitled: true,
    entitlement: {
      id: activeEntitlement.id,
      licenseType: activeEntitlement.licenseType,
      expiresAt: activeEntitlement.expiresAt,
    },
  };
}

export async function getEntitledAssessmentTypes(
  organizationId: string
): Promise<AIAssessmentType[]> {
  const entitledTypes: AIAssessmentType[] = [...FREE_ASSESSMENT_TYPES];

  for (const assessmentType of PREMIUM_ASSESSMENT_TYPES) {
    const result = await checkAssessmentEntitlement(organizationId, assessmentType);
    if (result.entitled) {
      entitledTypes.push(assessmentType);
    }
  }

  return entitledTypes;
}

export async function checkSkillEntitlement(
  organizationId: string,
  skillId: string,
  /**
   * Skip the all-skills-free bypass and require a real entitlement. Used by
   * the hosted shop-window gate (src/config/premium-showcase.ts), where a few
   * finished deliverables stay paid even though everything else is free.
   */
  options: { requireRealEntitlement?: boolean } = {}
): Promise<EntitlementCheckResult> {
  if (hostedPilotActive()) {
    return { entitled: true, reason: HOSTED_PILOT_REASON };
  }

  if (features.allSkillsFree && !options.requireRealEntitlement) {
    return { entitled: true, reason: ALL_SKILLS_FREE_REASON };
  }

  const skillPackage = await prisma.skillPackage.findFirst({
    where: { skillId, isActive: true },
  });

  if (!skillPackage) {
    return { entitled: false, reason: `Skill package ${skillId} not found` };
  }

  const customerOrg = await prisma.customerOrganization.findFirst({
    where: { organizationId },
    include: {
      customer: {
        include: {
          entitlements: {
            where: { skillPackageId: skillPackage.id, status: EntitlementStatus.ACTIVE },
          },
        },
      },
    },
  });

  if (!customerOrg) {
    return { entitled: false, reason: "Organization is not linked to any customer account" };
  }

  const activeEntitlement = customerOrg.customer.entitlements.find((e) => {
    if (e.status !== EntitlementStatus.ACTIVE) return false;
    if (e.expiresAt && e.expiresAt < new Date()) return false;
    return true;
  });

  if (!activeEntitlement) {
    return { entitled: false, reason: `No active ${skillId} license found` };
  }

  return {
    entitled: true,
    entitlement: {
      id: activeEntitlement.id,
      licenseType: activeEntitlement.licenseType,
      expiresAt: activeEntitlement.expiresAt,
    },
  };
}

export async function hasShadowAiAccess(organizationId: string): Promise<boolean> {
  const result = await checkSkillEntitlement(organizationId, "com.todolaw.aisentinel.shadow-ai");
  return result.entitled;
}

export async function hasVendorCatalogAccess(organizationId: string): Promise<boolean> {
  const result = await checkSkillEntitlement(organizationId, "com.todolaw.aisentinel.vendor-catalog");
  return result.entitled;
}

export function isPremiumAssessmentType(assessmentType: AIAssessmentType): boolean {
  return PREMIUM_ASSESSMENT_TYPES.includes(assessmentType);
}
