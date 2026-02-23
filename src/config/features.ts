export interface FeatureFlags {
  stripeEnabled: boolean;
  selfServiceUpgrade: boolean;
  googleAuthEnabled: boolean;
  emailAuthEnabled: boolean;
  devAuthEnabled: boolean;
  conformityEnabled: boolean;
  biasFairnessEnabled: boolean;
  shadowAiEnabled: boolean;
}

const defaultFeatures: FeatureFlags = {
  stripeEnabled: false,
  selfServiceUpgrade: false,
  googleAuthEnabled: true,
  emailAuthEnabled: true,
  devAuthEnabled: process.env.NODE_ENV === "development",
  conformityEnabled: true,
  biasFairnessEnabled: true,
  shadowAiEnabled: true,
};

export function getFeatureFlags(): FeatureFlags {
  return {
    stripeEnabled:
      process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true" || defaultFeatures.stripeEnabled,
    selfServiceUpgrade:
      process.env.NEXT_PUBLIC_SELF_SERVICE_UPGRADE === "true" || defaultFeatures.selfServiceUpgrade,
    googleAuthEnabled:
      process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "false" && defaultFeatures.googleAuthEnabled,
    emailAuthEnabled:
      process.env.NEXT_PUBLIC_EMAIL_AUTH_ENABLED !== "false" && defaultFeatures.emailAuthEnabled,
    devAuthEnabled: defaultFeatures.devAuthEnabled,
    conformityEnabled: defaultFeatures.conformityEnabled,
    biasFairnessEnabled: defaultFeatures.biasFairnessEnabled,
    shadowAiEnabled: defaultFeatures.shadowAiEnabled,
  };
}

export const features = getFeatureFlags();

export function isFeatureEnabled(
  feature: keyof FeatureFlags
): boolean {
  return features[feature] as boolean;
}
