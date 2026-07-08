// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

export interface ExpertProfile {
  id: string;
  name: string | null;
  email: string;
  title: string | null;
  firm: string | null;
  bio: string | null;
  expertTypes: ("technical" | "deployment")[];
  specializations: string[];
  certifications: string[];
  languages: string[]; // ISO 639-1
  location: { city: string | null; country: string | null }; // country = ISO 3166-1 alpha-2
  jurisdictions: string[];
  contactUrl: string | null;
  imageUrl?: string | null;
  acceptingClients: boolean;
  profileCompleteness: number; // 0-100
}

/** ISO 3166-1 alpha-2 -> display name */
export const countryNames: Record<string, string> = {
  AT: "Austria",
  BE: "Belgium",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  GR: "Greece",
  IE: "Ireland",
  IT: "Italy",
  NL: "Netherlands",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  SE: "Sweden",
  CH: "Switzerland",
  US: "United States",
};

/** ISO 639-1 -> display name */
export const languageNames: Record<string, string> = {
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  fi: "Finnish",
  fr: "French",
  ga: "Irish",
  it: "Italian",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  sk: "Slovak",
  sv: "Swedish",
};

// Placeholder directory shown when no Dealroom API keys are configured.
// Deliberately contains no personal identities — only a generic team profile.
export const mockExperts: ExpertProfile[] = [
  {
    id: "exp-002",
    name: "AI Sentinel Deployment Team",
    email: "deploy@todo.law",
    title: "Deployment Specialist",
    firm: "TODO.LAW",
    bio: "Helps organizations deploy and maintain self-hosted instances of AI Sentinel on their own infrastructure — Docker, Kubernetes, bare metal, or private cloud.",
    expertTypes: ["technical", "deployment"],
    specializations: ["Self-Hosting / Deployment", "AI Safety"],
    certifications: [],
    languages: ["en", "es"],
    location: { city: "Stockholm", country: "SE" },
    jurisdictions: ["EU"],
    contactUrl: "https://todo.law/contact",
    acceptingClients: true,
    profileCompleteness: 80,
  },
];

export const specializations = [
  "Self-Hosting / Deployment",
  "EU AI Act",
  "AI Risk Management",
  "Bias & Fairness Auditing",
  "AI Ethics & Responsible AI",
  "ISO 42001",
  "NIST AI RMF",
  "AI Procurement & Vendor Risk",
  "AI Incident Response",
  "Conformity Assessment",
  "AI Transparency & Explainability",
  "Automated Decision-Making",
  "AI & Data Protection (GDPR)",
  "AI Safety",
  "Foundation Model Governance",
  "Sector-Specific AI Regulation",
  "AI Auditing",
  "Multi-Jurisdictional AI Compliance",
];

export const expertTypes = [
  { value: "technical", label: "Technical" },
  { value: "deployment", label: "Deployment" },
] as const;
