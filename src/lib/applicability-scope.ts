// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Applicability-tag scoping — the single source of "does this requirement row
 * apply to this system?".
 *
 * Pure module: no Prisma, no React, no Next. Both consumers (the compliance
 * matrix/counts and the ADMT mapping sync) must resolve scope identically, so
 * the predicate lives here rather than being written out twice.
 *
 * It was written twice once, and the copies disagreed: the matrix stripped
 * jurisdiction tags before matching while `admt.syncMappings` matched on the
 * raw set with Prisma's `hasSome`. Because every California row carries
 * `jurisdiction:US_CA` and every positive ADMT scope emits it, the raw match
 * selected all 92 rows for everyone the regime touched — a business with no
 * ADMT at all had the 59 Article 11 notice, opt-out and access requirements
 * written into its compliance record. The matrix showed 37 rows, the stored
 * record said 92, and every count downstream read the stored record.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

/**
 * Jurisdiction tags gate whether a framework reaches an organization at all;
 * they do not pick out rows within it. Matching runs on the remaining tags,
 * which are the ones that actually select.
 */
export const JURISDICTION_TAG_PREFIX = "jurisdiction:";

export const selectorTags = (tags: readonly string[]) =>
  tags.filter((tag) => !tag.startsWith(JURISDICTION_TAG_PREFIX));

/** The shape every consumer must supply — nothing else is read. */
export interface TaggedRequirement {
  applicabilityTags: string[];
}

/**
 * Builds the in-scope predicate for one resolved scope.
 *
 * `scopeTags === undefined` means the caller is not scoping — every row stands.
 * An empty array means the rules layer resolved and admitted nothing, which is
 * a different answer and must admit nothing. Untagged requirements always
 * stand: they belong to frameworks that scope by risk tier instead, and
 * dropping them would empty the EU AI Act matrix.
 *
 * Note for callers querying a database: this cannot be expressed as Prisma's
 * `hasSome`, which has neither the "untagged rows always stand" case nor the
 * jurisdiction strip. Read the candidate rows and filter them through this.
 */
export function buildScopeFilter(scopeTags: readonly string[] | undefined) {
  if (scopeTags === undefined) return () => true;

  const selectors = selectorTags(scopeTags);

  return (r: TaggedRequirement) => {
    if (r.applicabilityTags.length === 0) return true;
    if (selectors.length === 0) return false;
    const rowSelectors = selectorTags(r.applicabilityTags);
    // Scoped by jurisdiction alone ⇒ applies wherever the framework applies.
    if (rowSelectors.length === 0) return true;
    return rowSelectors.some((tag) => selectors.includes(tag));
  };
}
