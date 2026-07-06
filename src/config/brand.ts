export interface BrandConfig {
  name: string;
  tagline: string;
  description: string;
  companyName: string;
  companyWebsite: string;
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
  supportEmail: string;
  /** Security contact rendered on the public security page. */
  securityEmail: string;
  /** Canonical origin of this deployment (metadata, email footers). */
  siteUrl: string;
  /** From-address for transactional email (magic links, billing notices).
   *  Server-side only; EMAIL_FROM keeps working as the canonical override. */
  emailFrom: string;
  /** Base URL for DPO Central deep links on vendor/AI-system detail pages.
   *  Empty string hides those links entirely (white-label / sovereign). */
  dpoCentralUrl: string;
  /** AGPL section 13 source offer: where users of the network service can
   *  obtain the Corresponding Source. White-label deployers running a
   *  modified version MUST point this at their own fork. */
  sourceUrl: string;
  licenseUrl: string;
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
  securityEmail: "security@todo.law",
  siteUrl: "https://aisentinel.todo.law",
  emailFrom: "noreply@todo.law",
  dpoCentralUrl: "https://dpocentral.todo.law",
  sourceUrl: "https://github.com/RINDOGATAN/aisentinel",
  licenseUrl: "https://www.gnu.org/licenses/agpl-3.0.html",
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
  // Convenience aliases for white-label deployments (deploy/sovereign):
  // NEXT_PUBLIC_BRAND_ACCENT sets primary + accent in one variable and
  // NEXT_PUBLIC_BRAND_LOGO_URL overrides the logo. The fine-grained
  // NEXT_PUBLIC_COLOR_* / NEXT_PUBLIC_LOGO_PATH vars still win if set.
  const brandAccent = process.env.NEXT_PUBLIC_BRAND_ACCENT;

  return {
    name: process.env.NEXT_PUBLIC_BRAND_NAME || defaultBrand.name,
    tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || defaultBrand.tagline,
    description: process.env.NEXT_PUBLIC_BRAND_DESCRIPTION || defaultBrand.description,
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || defaultBrand.companyName,
    companyWebsite: process.env.NEXT_PUBLIC_COMPANY_WEBSITE || defaultBrand.companyWebsite,
    termsOfUseUrl: process.env.NEXT_PUBLIC_TERMS_URL || defaultBrand.termsOfUseUrl,
    privacyPolicyUrl: process.env.NEXT_PUBLIC_PRIVACY_URL || defaultBrand.privacyPolicyUrl,
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || defaultBrand.supportEmail,
    securityEmail: process.env.NEXT_PUBLIC_SECURITY_EMAIL || defaultBrand.securityEmail,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || defaultBrand.siteUrl,
    emailFrom: process.env.EMAIL_FROM || defaultBrand.emailFrom,
    // ?? (not ||): an explicit empty string hides the DPO Central links.
    dpoCentralUrl: process.env.NEXT_PUBLIC_DPO_CENTRAL_URL ?? defaultBrand.dpoCentralUrl,
    sourceUrl: process.env.NEXT_PUBLIC_SOURCE_URL || defaultBrand.sourceUrl,
    licenseUrl: process.env.NEXT_PUBLIC_LICENSE_URL || defaultBrand.licenseUrl,
    logoPath:
      process.env.NEXT_PUBLIC_LOGO_PATH ||
      process.env.NEXT_PUBLIC_BRAND_LOGO_URL ||
      defaultBrand.logoPath,
    faviconPath: process.env.NEXT_PUBLIC_FAVICON_PATH || defaultBrand.faviconPath,
    colors: {
      primary:
        process.env.NEXT_PUBLIC_COLOR_PRIMARY ||
        brandAccent ||
        defaultBrand.colors.primary,
      primaryForeground: process.env.NEXT_PUBLIC_COLOR_PRIMARY_FG || defaultBrand.colors.primaryForeground,
      background: process.env.NEXT_PUBLIC_COLOR_BACKGROUND || defaultBrand.colors.background,
      card: process.env.NEXT_PUBLIC_COLOR_CARD || defaultBrand.colors.card,
      accent:
        process.env.NEXT_PUBLIC_COLOR_ACCENT ||
        brandAccent ||
        defaultBrand.colors.accent,
    },
  };
}

export const brand = getBrandConfig();
