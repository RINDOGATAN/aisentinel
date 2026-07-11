// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export interface FeatureFlags {
  stripeEnabled: boolean;
  allSkillsFree: boolean;
  selfServiceUpgrade: boolean;
  googleAuthEnabled: boolean;
  emailAuthEnabled: boolean;
  devAuthEnabled: boolean;
  conformityEnabled: boolean;
  biasFairnessEnabled: boolean;
  shadowAiEnabled: boolean;
  vendorCatalogEnabled: boolean;
  expertDirectoryEnabled: boolean;
}

const defaultFeatures: FeatureFlags = {
  stripeEnabled: true,
  allSkillsFree: false,
  selfServiceUpgrade: true,
  googleAuthEnabled: true,
  emailAuthEnabled: true,
  // Local (passwordless credentials) login: dev mode, or sovereign/self-hosted
  // builds with NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true (behind the firm's own
  // network — see deploy/sovereign/README.md).
  devAuthEnabled:
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_LOCAL_AUTH_ENABLED === "true",
  conformityEnabled: true,
  biasFairnessEnabled: true,
  shadowAiEnabled: true,
  vendorCatalogEnabled: true,
  expertDirectoryEnabled: true,
};

export function getFeatureFlags(): FeatureFlags {
  return {
    // Default ON (cloud posture); NEXT_PUBLIC_STRIPE_ENABLED=false turns the
    // billing/self-service surface off for sovereign/self-hosted deployments.
    stripeEnabled:
      process.env.NEXT_PUBLIC_STRIPE_ENABLED !== "false" && defaultFeatures.stripeEnabled,
    // Bypass every premium entitlement gate (same concept as Dealroom's
    // allSkillsFree). Defaults to free whenever Stripe is off — the hosted
    // unpaywalled-demo posture — unless explicitly set to "false", which is
    // the sovereign posture where offline licence files are the purchase path.
    allSkillsFree:
      process.env.NEXT_PUBLIC_ALL_SKILLS_FREE === "true" ||
      (process.env.NEXT_PUBLIC_STRIPE_ENABLED === "false" &&
        process.env.NEXT_PUBLIC_ALL_SKILLS_FREE !== "false"),
    selfServiceUpgrade:
      process.env.NEXT_PUBLIC_SELF_SERVICE_UPGRADE !== "false" &&
      process.env.NEXT_PUBLIC_STRIPE_ENABLED !== "false" &&
      defaultFeatures.selfServiceUpgrade,
    googleAuthEnabled:
      process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "false" && defaultFeatures.googleAuthEnabled,
    emailAuthEnabled:
      process.env.NEXT_PUBLIC_EMAIL_AUTH_ENABLED !== "false" && defaultFeatures.emailAuthEnabled,
    devAuthEnabled: defaultFeatures.devAuthEnabled,
    conformityEnabled: defaultFeatures.conformityEnabled,
    biasFairnessEnabled: defaultFeatures.biasFairnessEnabled,
    shadowAiEnabled: defaultFeatures.shadowAiEnabled,
    vendorCatalogEnabled: defaultFeatures.vendorCatalogEnabled,
    expertDirectoryEnabled:
      process.env.NEXT_PUBLIC_EXPERT_DIRECTORY_ENABLED !== "false" &&
      defaultFeatures.expertDirectoryEnabled,
  };
}

export const features = getFeatureFlags();

export function isFeatureEnabled(
  feature: keyof FeatureFlags
): boolean {
  return features[feature] as boolean;
}
