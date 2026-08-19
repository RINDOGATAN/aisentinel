// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Types for snapshot-to-snapshot comparison. Structural (nothing imported from
 * Prisma or the server tree) so the diff is a pure library usable by the web
 * page, the PDF annex and tests alike.
 */

export interface Delta {
  from: number;
  to: number;
  delta: number;
}

export interface NullableDelta {
  from: number | null;
  to: number | null;
  delta: number | null;
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface RulePackChange {
  pack: string;
  from: string | null;
  to: string | null;
}

export interface SnapshotDiff {
  overall: Delta;
  dimensions: ({ id: string } & Delta)[];
  nist: ({ id: string } & Delta)[];
  assurance: NullableDelta;
  counts: {
    systems: Delta;
    classified: Delta;
    overdueGates: Delta;
    unconfirmed: Delta;
  };
  systemsAdded: NamedRef[];
  systemsRemoved: NamedRef[];
  gapsClosed: string[];
  gapsOpened: string[];
  /**
   * Rule-pack versions that moved between the two captures. This is the field
   * that separates "your program improved" from "the law moved underneath
   * you" — the first question anyone asks about a number that changed.
   */
  rulePackChanges: RulePackChange[];
}

/**
 * The minimum shape a diff needs. Deliberately loose and all-optional below the
 * top level: snapshots captured by older builds will be missing newer fields,
 * and a diff that throws on an old payload is a diff nobody can run on history.
 */
export interface DiffableSnapshot {
  graph?: {
    systems?: { id: string; name: string }[];
  } | null;
  scorecard?: {
    maturity?: {
      overall?: number;
      dimensions?: { id: string; score: number }[];
      nist?: { id: string; score: number }[];
      gaps?: { id: string; count?: number }[];
    } | null;
    snapshot?: {
      classification?: { classified?: number } | null;
      oversight?: { overdue?: number } | null;
    } | null;
  } | null;
  assurance?: {
    weightedPct?: number;
    confirmed?: number;
    total?: number;
  } | null;
  rulePacks?: Record<string, string> | null;
}
