// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Snapshot diff — what changed between two captures of a governance program.
 *
 * Pure and defensive: snapshots taken by older builds are missing fields newer
 * builds write, and a diff that throws on last quarter's payload is a diff
 * nobody can run on history. Every field is read through a tolerant accessor
 * and an absent value is reported as absent, never as zero.
 */

import type {
  Delta,
  DiffableSnapshot,
  NamedRef,
  NullableDelta,
  RulePackChange,
  SnapshotDiff,
} from "./types";

export type * from "./types";

function delta(from: number, to: number): Delta {
  return { from, to, delta: to - from };
}

function nullableDelta(from: number | null, to: number | null): NullableDelta {
  return {
    from,
    to,
    delta: from === null || to === null ? null : to - from,
  };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreMap(
  entries: { id: string; score: number }[] | undefined | null,
): Map<string, number> {
  return new Map((entries ?? []).map((e) => [e.id, num(e.score)]));
}

function systemRefs(snap: DiffableSnapshot): Map<string, NamedRef> {
  const systems = snap.graph?.systems ?? [];
  return new Map(systems.map((s) => [s.id, { id: s.id, name: s.name }]));
}

function gapIds(snap: DiffableSnapshot): Set<string> {
  return new Set((snap.scorecard?.maturity?.gaps ?? []).map((g) => g.id));
}

function unconfirmedCount(snap: DiffableSnapshot): number {
  const a = snap.assurance;
  if (!a || typeof a.total !== "number" || typeof a.confirmed !== "number") {
    return 0;
  }
  return Math.max(0, a.total - a.confirmed);
}

function assurancePct(snap: DiffableSnapshot): number | null {
  const pct = snap.assurance?.weightedPct;
  return typeof pct === "number" && Number.isFinite(pct) ? pct : null;
}

/**
 * Compare two snapshot payloads. Union semantics throughout: a dimension present
 * in only one snapshot still appears, with the missing side reported as 0, so a
 * newly added dimension shows up as a gain rather than vanishing.
 */
export function diffSnapshots(
  prev: DiffableSnapshot,
  next: DiffableSnapshot,
): SnapshotDiff {
  const prevDims = scoreMap(prev.scorecard?.maturity?.dimensions);
  const nextDims = scoreMap(next.scorecard?.maturity?.dimensions);
  const dimensionIds = [...new Set([...prevDims.keys(), ...nextDims.keys()])].sort();

  const prevNist = scoreMap(prev.scorecard?.maturity?.nist);
  const nextNist = scoreMap(next.scorecard?.maturity?.nist);
  const nistIds = [...new Set([...prevNist.keys(), ...nextNist.keys()])].sort();

  const prevSystems = systemRefs(prev);
  const nextSystems = systemRefs(next);

  const prevGaps = gapIds(prev);
  const nextGaps = gapIds(next);

  const prevPacks = prev.rulePacks ?? {};
  const nextPacks = next.rulePacks ?? {};
  const packIds = [
    ...new Set([...Object.keys(prevPacks), ...Object.keys(nextPacks)]),
  ].sort();
  const rulePackChanges: RulePackChange[] = packIds
    .filter((pack) => (prevPacks[pack] ?? null) !== (nextPacks[pack] ?? null))
    .map((pack) => ({
      pack,
      from: prevPacks[pack] ?? null,
      to: nextPacks[pack] ?? null,
    }));

  return {
    overall: delta(
      num(prev.scorecard?.maturity?.overall),
      num(next.scorecard?.maturity?.overall),
    ),
    dimensions: dimensionIds.map((id) => ({
      id,
      ...delta(prevDims.get(id) ?? 0, nextDims.get(id) ?? 0),
    })),
    nist: nistIds.map((id) => ({
      id,
      ...delta(prevNist.get(id) ?? 0, nextNist.get(id) ?? 0),
    })),
    assurance: nullableDelta(assurancePct(prev), assurancePct(next)),
    counts: {
      systems: delta(prevSystems.size, nextSystems.size),
      classified: delta(
        num(prev.scorecard?.snapshot?.classification?.classified),
        num(next.scorecard?.snapshot?.classification?.classified),
      ),
      overdueGates: delta(
        num(prev.scorecard?.snapshot?.oversight?.overdue),
        num(next.scorecard?.snapshot?.oversight?.overdue),
      ),
      unconfirmed: delta(unconfirmedCount(prev), unconfirmedCount(next)),
    },
    systemsAdded: [...nextSystems.values()]
      .filter((s) => !prevSystems.has(s.id))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
    systemsRemoved: [...prevSystems.values()]
      .filter((s) => !nextSystems.has(s.id))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
    gapsClosed: [...prevGaps].filter((g) => !nextGaps.has(g)).sort(),
    gapsOpened: [...nextGaps].filter((g) => !prevGaps.has(g)).sort(),
    rulePackChanges,
  };
}
