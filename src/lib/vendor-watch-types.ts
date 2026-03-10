/**
 * Shared types for Vendor.Watch API integration.
 * Used by both the CLI sync script and the cron sync route.
 */

export interface CatalogAIModel {
  name: string;
  type: string;
  source: string;
}

export interface VendorWatchVendor {
  id?: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  tags: string[];
  website: string | null;
  privacyPolicyUrl: string | null;
  trustCenterUrl: string | null;
  dpaUrl: string | null;
  securityPageUrl: string | null;
  certifications: string[];
  frameworks: string[];
  gdprCompliant: boolean | null;
  ccpaCompliant: boolean | null;
  euAiActCompliant: boolean | null;
  hipaaCompliant: boolean | null;
  dpaComplianceScore: number | null;
  dpaGdprScore: number | null;
  dpaCcpaScore: number | null;
  dataLocations: string[];
  hasEuDataCenter: boolean | null;
  subprocessors: unknown;
  aiCapabilities: string[];
  modelHosting: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // New fields
  aiModels: CatalogAIModel[] | null;
  aiTechniques: string[];
  euAiActRole: string | null;
  euAiActAnnexIIIDomains: string[];
  iso42001Certified: boolean | null;
  supportsAuditLogs: boolean | null;
  supportsExplainability: boolean | null;
  hasBiasMonitoring: boolean | null;
  hasModelCard: boolean | null;
  aiIncidentNotificationSLA: string | null;
  dataProcessingTransparency: string | null;
  transferSafeguards: string | null;
  supportsDsars: boolean | null;
  hasDesignatedDpo: boolean | null;
  hasRecentBreach: boolean | null;
}

export interface VendorWatchSyncResponse {
  vendors: VendorWatchVendor[];
  nextCursor: string | undefined;
  count: number;
}
