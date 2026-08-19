// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program snapshots — immutable, reproducible captures of a governance program.
 *
 * A governance artifact that leaves the building must still be explainable
 * months later, against a database that has since moved on. A snapshot freezes
 * exactly what `program-data.ts` returned — verbatim, no reshaping, so the
 * screen, the PDF and the archived copy cannot diverge — together with the
 * rule-pack versions in force at capture time. That last part is what lets a
 * diff separate "the program improved" from "the law moved underneath you".
 *
 * Immutable by construction: this module exposes create, read and delete. There
 * is deliberately no update path.
 */

import type { PrismaClient, SnapshotReason } from "@prisma/client";
import { createHash } from "node:crypto";
import type { ProgramGraph } from "@/lib/program-map/types";
import type { ContentLocale } from "@/config/lawfirm-ai-toolkit";
import { rulePackVersions, type RulePackId } from "@/config/rule-pack-versions";
import {
  getProgramGraphData,
  getProgramScorecardData,
  type ProgramScorecardData,
} from "./program-data";

/**
 * Payload guard. Program graphs are tens of KB in normal use; a pathological
 * inventory (thousands of systems) must not put a multi-MB row in the table.
 * Over the cap we store a lane-truncated graph and flag it, so the snapshot is
 * still a usable record and is honest about being partial.
 */
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
const TRUNCATED_SYSTEM_LIMIT = 400;

/** EXPORT snapshots are a side effect of downloading; keep the recent tail only. */
const EXPORT_RETENTION_PER_LOCALE = 20;

export interface CaptureOptions {
  reason: SnapshotReason;
  createdBy: string;
  label?: string;
}

export interface SnapshotListItem {
  id: string;
  label: string | null;
  reason: SnapshotReason;
  locale: string;
  overall: number;
  systemCount: number;
  confirmedPct: number;
  payloadHash: string;
  createdBy: string;
  createdAt: Date;
}

export interface StoredSnapshotPayload {
  graph: ProgramGraph;
  scorecard: ProgramScorecardData;
  assurance: AssuranceLike | null;
  rulePacks: Partial<Record<RulePackId, string>>;
  truncated?: boolean;
}

export interface StoredSnapshot extends SnapshotListItem {
  payload: StoredSnapshotPayload;
}

/**
 * Shape of the assurance block when confirmation tracking is enabled. Kept
 * structural (not imported) so this module does not depend on a sibling track
 * that may not have landed — an absent block is a first-class state, rendered
 * as "confirmation tracking not yet enabled" rather than as zero.
 */
export interface AssuranceLike {
  weightedPct: number;
  confirmed: number;
  total: number;
  byClass?: { id: string; confirmed: number; total: number; pct: number }[];
}

/**
 * Deterministic JSON with stable key order, so the same program always hashes
 * to the same value regardless of property insertion order.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`)
    .join(",")}}`;
}

export function hashPayload(payload: {
  graph: unknown;
  scorecard: unknown;
  rulePacks: unknown;
}): string {
  return createHash("sha256")
    .update(
      canonicalize({
        graph: payload.graph,
        scorecard: payload.scorecard,
        rulePacks: payload.rulePacks,
      }),
    )
    .digest("hex");
}

/** Drop systems (and the now-unreferenced vendors) beyond the cap. */
function truncateGraph(graph: ProgramGraph): ProgramGraph {
  const systems = graph.systems.slice(0, TRUNCATED_SYSTEM_LIMIT);
  const vendorIds = new Set(
    systems.map((s) => s.vendorId).filter((id): id is string => id !== null),
  );
  const groupIds = new Set(systems.map((s) => s.groupId));
  return {
    groups: graph.groups.filter((g) => groupIds.has(g.id)),
    systems,
    vendors: graph.vendors.filter((v) => vendorIds.has(v.id)),
  };
}

/**
 * Capture a snapshot of the org's program as it stands right now.
 *
 * MUST be called AFTER any surrounding transaction has committed — never
 * inside one. The quickstart's program-creation transaction runs against a 30s
 * budget and a snapshot must never be able to extend it or fail it; a snapshot
 * that doesn't get written is a missing record, a transaction that rolls back
 * is a missing program.
 */
export async function captureProgramSnapshot(
  prisma: PrismaClient,
  organizationId: string,
  locale: ContentLocale,
  opts: CaptureOptions,
): Promise<{ id: string; payloadHash: string; overall: number }> {
  const [graph, scorecard] = await Promise.all([
    getProgramGraphData(prisma, organizationId, locale),
    getProgramScorecardData(prisma, organizationId, locale),
  ]);

  const rulePacks = rulePackVersions();
  const assurance =
    (scorecard as { assurance?: AssuranceLike | null }).assurance ?? null;

  let storedGraph = graph;
  let truncated = false;
  if (
    canonicalize({ graph, scorecard, rulePacks }).length > MAX_PAYLOAD_BYTES
  ) {
    storedGraph = truncateGraph(graph);
    truncated = true;
  }

  const payloadHash = hashPayload({
    graph: storedGraph,
    scorecard,
    rulePacks,
  });

  const record = await prisma.programSnapshotRecord.create({
    data: {
      organizationId,
      label: opts.label ?? null,
      reason: opts.reason,
      locale,
      graph: JSON.parse(
        JSON.stringify(truncated ? { ...storedGraph, truncated } : storedGraph),
      ),
      scorecard: JSON.parse(JSON.stringify(scorecard)),
      assurance: assurance ? JSON.parse(JSON.stringify(assurance)) : undefined,
      overall: scorecard.maturity.overall,
      systemCount: graph.systems.length,
      confirmedPct: assurance ? Math.round(assurance.weightedPct) : 0,
      rulePacks,
      payloadHash,
      createdBy: opts.createdBy,
    },
    select: { id: true, payloadHash: true, overall: true },
  });

  if (opts.reason === "EXPORT") {
    await pruneSnapshots(prisma, organizationId);
  }

  return record;
}

export async function listSnapshots(
  prisma: PrismaClient,
  organizationId: string,
  limit = 50,
): Promise<SnapshotListItem[]> {
  return prisma.programSnapshotRecord.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      label: true,
      reason: true,
      locale: true,
      overall: true,
      systemCount: true,
      confirmedPct: true,
      payloadHash: true,
      createdBy: true,
      createdAt: true,
    },
  });
}

/**
 * Org-scoped read. Deliberately `findFirst` with the organizationId in the
 * where clause — never `findUnique` by id, which would return another org's
 * snapshot to anyone who guessed a cuid.
 */
export async function getSnapshot(
  prisma: PrismaClient,
  organizationId: string,
  id: string,
): Promise<StoredSnapshot | null> {
  const row = await prisma.programSnapshotRecord.findFirst({
    where: { id, organizationId },
  });
  if (!row) return null;

  const graph = row.graph as unknown as ProgramGraph & { truncated?: boolean };
  return {
    id: row.id,
    label: row.label,
    reason: row.reason,
    locale: row.locale,
    overall: row.overall,
    systemCount: row.systemCount,
    confirmedPct: row.confirmedPct,
    payloadHash: row.payloadHash,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    payload: {
      graph,
      scorecard: row.scorecard as unknown as ProgramScorecardData,
      assurance: (row.assurance as unknown as AssuranceLike | null) ?? null,
      rulePacks: (row.rulePacks ?? {}) as Partial<Record<RulePackId, string>>,
      truncated: graph.truncated === true,
    },
  };
}

/**
 * The most recent snapshot strictly older than `before` — the comparison point
 * for a trend block.
 */
export async function getPreviousSnapshot(
  prisma: PrismaClient,
  organizationId: string,
  before: Date,
): Promise<StoredSnapshot | null> {
  const row = await prisma.programSnapshotRecord.findFirst({
    where: { organizationId, createdAt: { lt: before } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!row) return null;
  return getSnapshot(prisma, organizationId, row.id);
}

/**
 * Retention: MANUAL and QUICKSTART snapshots are evidence and are kept
 * indefinitely. EXPORT snapshots accumulate with every download, so only the
 * recent tail per locale is retained.
 */
export async function pruneSnapshots(
  prisma: PrismaClient,
  organizationId: string,
): Promise<number> {
  const exports_ = await prisma.programSnapshotRecord.findMany({
    where: { organizationId, reason: "EXPORT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, locale: true },
  });

  const seen = new Map<string, number>();
  const doomed: string[] = [];
  for (const row of exports_) {
    const n = (seen.get(row.locale) ?? 0) + 1;
    seen.set(row.locale, n);
    if (n > EXPORT_RETENTION_PER_LOCALE) doomed.push(row.id);
  }
  if (doomed.length === 0) return 0;

  const { count } = await prisma.programSnapshotRecord.deleteMany({
    where: { organizationId, id: { in: doomed } },
  });
  return count;
}
