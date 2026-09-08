// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Shared shapes for the "regime" frameworks: GDPR, Colorado SB 26-189, Texas
 * TRAIGA and the Washington domain instruments. They follow the California
 * ADMT pack exactly: every row seeds with `applicableTo: []` so the EU
 * risk-tier auto-mapping can never reach it, scope lives in
 * `applicabilityTags`, the database holds English and the Spanish lives here.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";

export type RegimeFrameworkCode =
  | "EU_GDPR"
  | "CO_SB_26_189"
  | "TX_TRAIGA"
  | "WA_AI_RULES";

export interface RegimeFramework {
  code: RegimeFrameworkCode;
  /** Short id prefix for requirement rows, e.g. "gdpr" → "gdpr-art-22-1". */
  idPrefix: string;
  name: string;
  version: string;
  description: string;
  /** Chip label on the compliance page. */
  abbreviation: string;
  contentVersion: string;
  lawReviewedAsOf: string;
  reviewMarker: Localized;
}

export interface RegimeRequirementSeed {
  slug: string;
  code: string;
  title: Localized;
  description: Localized;
  applicabilityTags: readonly string[];
  sortOrder: number;
  children?: RegimeRequirementSeed[];
}

export interface RegimePack {
  framework: RegimeFramework;
  requirements: RegimeRequirementSeed[];
}

export function flattenRegimeRequirements(
  rows: readonly RegimeRequirementSeed[],
  out: RegimeRequirementSeed[] = [],
): RegimeRequirementSeed[] {
  for (const row of rows) {
    out.push(row);
    if (row.children) flattenRegimeRequirements(row.children, out);
  }
  return out;
}

export function regimeRequirementId(pack: RegimeFramework, slug: string): string {
  return `${pack.idPrefix}-${slug}`;
}

export function findLocalizedRequirement(
  pack: RegimePack,
  code: string,
  locale: "en" | "es",
): { title: string; description: string } | null {
  const row = flattenRegimeRequirements(pack.requirements).find((r) => r.code === code);
  if (!row) return null;
  return { title: row.title[locale], description: row.description[locale] };
}
