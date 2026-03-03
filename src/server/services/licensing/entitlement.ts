import { AIAssessmentType, EntitlementStatus, LicenseType } from "@prisma/client";
import prisma from "@/lib/prisma";

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
  skillId: string
): Promise<EntitlementCheckResult> {
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
