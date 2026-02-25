export interface BrandConfig {
  name: string;
  tagline: string;
  description: string;
  companyName: string;
  companyWebsite: string;
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
  supportEmail: string;
  logoPath: string;
  faviconPath: string;
  colors: {
    primary: string;
    primaryForeground: string;
    background: string;
    card: string;
    accent: string;
  };
}

const defaultBrand: BrandConfig = {
  name: "AI SENTINEL",
  tagline: "Cross-border AI Governance",
  description: "A purpose-built tool for managing AI systems, EU AI Act compliance, risk classification, and AI governance.",
  companyName: "TODO.LAW",
  companyWebsite: "https://todo.law",
  termsOfUseUrl: "https://todo.law/terms",
  privacyPolicyUrl: "https://todo.law/privacy",
  supportEmail: "hello@todo.law",
  logoPath: "/favicon.png",
  faviconPath: "/favicon.png",
  colors: {
    primary: "#f5a623",
    primaryForeground: "#1a1a1a",
    background: "#1a1a1a",
    card: "#242424",
    accent: "#f5a623",
  },
};

export function getBrandConfig(): BrandConfig {
  return {
    name: process.env.NEXT_PUBLIC_BRAND_NAME || defaultBrand.name,
    tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || defaultBrand.tagline,
    description: process.env.NEXT_PUBLIC_BRAND_DESCRIPTION || defaultBrand.description,
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || defaultBrand.companyName,
    companyWebsite: process.env.NEXT_PUBLIC_COMPANY_WEBSITE || defaultBrand.companyWebsite,
    termsOfUseUrl: process.env.NEXT_PUBLIC_TERMS_URL || defaultBrand.termsOfUseUrl,
    privacyPolicyUrl: process.env.NEXT_PUBLIC_PRIVACY_URL || defaultBrand.privacyPolicyUrl,
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || defaultBrand.supportEmail,
    logoPath: process.env.NEXT_PUBLIC_LOGO_PATH || defaultBrand.logoPath,
    faviconPath: process.env.NEXT_PUBLIC_FAVICON_PATH || defaultBrand.faviconPath,
    colors: {
      primary: process.env.NEXT_PUBLIC_COLOR_PRIMARY || defaultBrand.colors.primary,
      primaryForeground: process.env.NEXT_PUBLIC_COLOR_PRIMARY_FG || defaultBrand.colors.primaryForeground,
      background: process.env.NEXT_PUBLIC_COLOR_BACKGROUND || defaultBrand.colors.background,
      card: process.env.NEXT_PUBLIC_COLOR_CARD || defaultBrand.colors.card,
      accent: process.env.NEXT_PUBLIC_COLOR_ACCENT || defaultBrand.colors.accent,
    },
  };
}

export const brand = getBrandConfig();
