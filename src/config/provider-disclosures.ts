// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A model provider's own published documents about its models, recorded on
 * an AI vendor: links to its safety framework, transparency report and model
 * card, whether it has signed the EU General-Purpose AI Code of Practice,
 * whether it describes itself as a frontier developer, and when a person last
 * checked them. Every field is optional. They record what the provider states;
 * nothing here is a legal finding.
 *
 * Pure module: the field list, the link rule and the values, shared by the
 * router, the vendor page and the exports. Labels live under
 * `vendorDetail.disclosures`.
 */

export const DISCLOSURE_LINK_FIELDS = ["safetyFrameworkUrl", "transparencyReportUrl", "modelCardUrl"] as const;
export type DisclosureLinkField = (typeof DISCLOSURE_LINK_FIELDS)[number];

export const DISCLOSURE_ANSWER_FIELDS = ["signedGpaiCode", "frontierDeveloper"] as const;
export type DisclosureAnswerField = (typeof DISCLOSURE_ANSWER_FIELDS)[number];

export const DISCLOSURE_ANSWERS = ["YES", "NO", "UNKNOWN"] as const;
export type DisclosureAnswerValue = (typeof DISCLOSURE_ANSWERS)[number];

export interface ProviderDisclosures {
  safetyFrameworkUrl: string | null;
  transparencyReportUrl: string | null;
  modelCardUrl: string | null;
  signedGpaiCode: DisclosureAnswerValue | null;
  frontierDeveloper: DisclosureAnswerValue | null;
  disclosuresCheckedAt: Date | string | null;
}

/** The longest link accepted. */
export const MAX_DISCLOSURE_URL = 2000;

/**
 * A link as typed, cleaned: trimmed, empty to null. Only http and https links
 * are accepted, so a stored link is always one a browser opens as a page.
 * Returns undefined for anything else (the router refuses it).
 */
export function cleanDisclosureUrl(value: string | null): string | null | undefined {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > MAX_DISCLOSURE_URL) return undefined;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

/** Whether anything at all has been recorded (an unknown answer counts as nothing). */
export function hasDisclosures(v: ProviderDisclosures): boolean {
  return (
    DISCLOSURE_LINK_FIELDS.some((f) => !!v[f]) ||
    DISCLOSURE_ANSWER_FIELDS.some((f) => v[f] === "YES" || v[f] === "NO") ||
    !!v.disclosuresCheckedAt
  );
}
