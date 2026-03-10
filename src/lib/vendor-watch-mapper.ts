/**
 * Shared mapper for converting Vendor.Watch API responses to Prisma upsert data.
 * Used by both the CLI sync script and the cron sync route.
 */

import type { VendorWatchVendor } from "./vendor-watch-types";

export function mapVendorToUpsert(v: VendorWatchVendor) {
  return {
    name: v.name,
    category: v.category,
    subcategory: v.subcategory,
    description: v.description,
    tags: v.tags || [],
    website: v.website,
    privacyPolicyUrl: v.privacyPolicyUrl,
    trustCenterUrl: v.trustCenterUrl,
    dpaUrl: v.dpaUrl,
    securityPageUrl: v.securityPageUrl,
    certifications: v.certifications || [],
    frameworks: v.frameworks || [],
    gdprCompliant: v.gdprCompliant,
    ccpaCompliant: v.ccpaCompliant,
    euAiActCompliant: v.euAiActCompliant,
    hipaaCompliant: v.hipaaCompliant,
    dpaComplianceScore: v.dpaComplianceScore,
    dpaGdprScore: v.dpaGdprScore,
    dpaCcpaScore: v.dpaCcpaScore,
    dataLocations: v.dataLocations || [],
    hasEuDataCenter: v.hasEuDataCenter,
    subprocessors: v.subprocessors ?? undefined,
    aiCapabilities: v.aiCapabilities || [],
    modelHosting: v.modelHosting,
    logoUrl: v.logoUrl,
    isVerified: v.isVerified,
    verifiedAt: v.verifiedAt ? new Date(v.verifiedAt) : null,
    verifiedBy: v.verifiedBy,
    source: "vendor-watch",
    // New fields
    aiModels: v.aiModels ? JSON.parse(JSON.stringify(v.aiModels)) : undefined,
    aiTechniques: v.aiTechniques || [],
    euAiActRole: v.euAiActRole,
    euAiActAnnexIIIDomains: v.euAiActAnnexIIIDomains || [],
    iso42001Certified: v.iso42001Certified,
    supportsAuditLogs: v.supportsAuditLogs,
    supportsExplainability: v.supportsExplainability,
    hasBiasMonitoring: v.hasBiasMonitoring,
    hasModelCard: v.hasModelCard,
    aiIncidentNotificationSLA: v.aiIncidentNotificationSLA,
    dataProcessingTransparency: v.dataProcessingTransparency,
    transferSafeguards: v.transferSafeguards,
    supportsDsars: v.supportsDsars,
    hasDesignatedDpo: v.hasDesignatedDpo,
    hasRecentBreach: v.hasRecentBreach,
  };
}
