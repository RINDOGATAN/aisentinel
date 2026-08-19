// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Operating jurisdictions — vocabulary and effective-scope resolution.
 *
 * Pure module, same doctrine as transparency-rules.ts and annex-iii-rules.ts:
 * no Prisma, no React, no Next. It is imported by client components (the
 * pickers), by tRPC routers, and by the PDF pipeline, so it must stay free of
 * server-only dependencies. Display strings live in the i18n message files and
 * are referenced here only by key.
 *
 * The one rule that matters: an empty declaration is UNDECLARED, not "operates
 * nowhere". Every organization that predates this feature, and every fresh
 * self-host install, starts with an empty array. A consumer that collapses
 * undeclared into "no regime applies" would quietly tell a Californian company
 * that California does not apply to it.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

/**
 * Rule-pack version. Bump on any content change (added jurisdictions, changed
 * grouping) so exported artifacts can state which revision produced them.
 * See src/config/rule-pack-versions.ts.
 */
export const JURISDICTIONS_VERSION = "2026.08.1";

/**
 * Mirrors the Prisma `Jurisdiction` enum member-for-member. Declared as a
 * string-literal union rather than imported from @prisma/client so this module
 * stays usable client-side — the same approach as src/lib/program-map/types.ts.
 * jurisdictions.test.ts asserts the two never drift apart.
 */
export type JurisdictionId =
  | "EU"
  | "EEA"
  | "UK"
  | "US_FEDERAL"
  | "US_CA"
  | "US_CO"
  | "US_CT"
  | "US_IL"
  | "US_NY"
  | "US_TX"
  | "US_UT"
  | "US_VA"
  | "US_WA"
  | "CANADA"
  | "BRAZIL"
  | "CHINA"
  | "JAPAN"
  | "SOUTH_KOREA"
  | "AUSTRALIA"
  | "INDIA"
  | "SWITZERLAND"
  | "OTHER";

export type JurisdictionGroup = "eu" | "us" | "other";

export interface JurisdictionOption {
  id: JurisdictionId;
  group: JurisdictionGroup;
  /** i18n key under the `jurisdictions.option` namespace — never a display string. */
  labelKey: string;
}

/**
 * Ordered for display: Europe first (the product's original assumption), then
 * the US states that actually carry AI obligations, then everything else.
 */
export const JURISDICTIONS: readonly JurisdictionOption[] = [
  { id: "EU", group: "eu", labelKey: "EU" },
  { id: "EEA", group: "eu", labelKey: "EEA" },
  { id: "UK", group: "eu", labelKey: "UK" },
  { id: "SWITZERLAND", group: "eu", labelKey: "SWITZERLAND" },

  { id: "US_FEDERAL", group: "us", labelKey: "US_FEDERAL" },
  { id: "US_CA", group: "us", labelKey: "US_CA" },
  { id: "US_CO", group: "us", labelKey: "US_CO" },
  { id: "US_CT", group: "us", labelKey: "US_CT" },
  { id: "US_IL", group: "us", labelKey: "US_IL" },
  { id: "US_NY", group: "us", labelKey: "US_NY" },
  { id: "US_TX", group: "us", labelKey: "US_TX" },
  { id: "US_UT", group: "us", labelKey: "US_UT" },
  { id: "US_VA", group: "us", labelKey: "US_VA" },
  { id: "US_WA", group: "us", labelKey: "US_WA" },

  { id: "CANADA", group: "other", labelKey: "CANADA" },
  { id: "BRAZIL", group: "other", labelKey: "BRAZIL" },
  { id: "CHINA", group: "other", labelKey: "CHINA" },
  { id: "JAPAN", group: "other", labelKey: "JAPAN" },
  { id: "SOUTH_KOREA", group: "other", labelKey: "SOUTH_KOREA" },
  { id: "AUSTRALIA", group: "other", labelKey: "AUSTRALIA" },
  { id: "INDIA", group: "other", labelKey: "INDIA" },
  { id: "OTHER", group: "other", labelKey: "OTHER" },
] as const;

/**
 * Every id in canonical display order.
 *
 * Declared as a non-empty tuple so routers can validate with
 * `z.enum(JURISDICTION_IDS)` without depending on the generated Prisma client
 * at module-load time — a stale client would otherwise crash the router.
 */
export const JURISDICTION_IDS = JURISDICTIONS.map((j) => j.id) as [
  JurisdictionId,
  ...JurisdictionId[],
];

export const JURISDICTION_GROUPS: readonly JurisdictionGroup[] = [
  "eu",
  "us",
  "other",
];

/** Options belonging to one display group, in canonical order. */
export function jurisdictionsInGroup(
  group: JurisdictionGroup,
): JurisdictionOption[] {
  return JURISDICTIONS.filter((j) => j.group === group);
}

/**
 * Has anyone actually told us where this organization operates?
 *
 * The whole point of the distinction: `false` means we must say "we can't tell
 * yet", never "this regime does not apply to you".
 */
export function isDeclared(
  orgSet: readonly JurisdictionId[] | null | undefined,
): boolean {
  return (orgSet?.length ?? 0) > 0;
}

export type JurisdictionScopeState = "declared" | "undeclared" | "conflict";

export interface EffectiveJurisdictions {
  effective: JurisdictionId[];
  state: JurisdictionScopeState;
}

/**
 * Resolve the jurisdictions in force for one AI system.
 *
 * - org set empty                  → `undeclared`, effective []
 * - system override empty          → inherit the org set
 * - override non-empty             → orgSet ∩ override (narrowing only: a
 *                                    system can never widen its parent's scope)
 * - intersection empty             → `conflict`, effective [] — surfaced to a
 *                                    human rather than silently zeroing every
 *                                    obligation the system would otherwise have
 *
 * Output order follows the canonical display order so callers can render the
 * result without re-sorting, and two equal sets always compare equal.
 */
export function resolveEffectiveJurisdictions(
  orgSet: readonly JurisdictionId[] | null | undefined,
  systemOverride?: readonly JurisdictionId[] | null,
): EffectiveJurisdictions {
  const org = dedupeInDisplayOrder(orgSet);
  if (org.length === 0) return { effective: [], state: "undeclared" };

  const override = dedupeInDisplayOrder(systemOverride);
  if (override.length === 0) return { effective: org, state: "declared" };

  const orgLookup = new Set(org);
  const intersection = override.filter((id) => orgLookup.has(id));

  return intersection.length === 0
    ? { effective: [], state: "conflict" }
    : { effective: intersection, state: "declared" };
}

/** Deduplicate, drop unknown values, and sort into canonical display order. */
function dedupeInDisplayOrder(
  values: readonly JurisdictionId[] | null | undefined,
): JurisdictionId[] {
  if (!values || values.length === 0) return [];
  const present = new Set(values);
  return JURISDICTION_IDS.filter((id) => present.has(id));
}
