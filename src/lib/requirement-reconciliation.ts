// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Moves compliance links off retired and re-used requirement codes.
 *
 * The list of codes lives in src/config/requirement-supersessions.ts; read its
 * header for why this exists. This module has two halves:
 *
 *   planRequirementReconciliation() — pure. Takes one snapshot of the rows
 *     involved and returns every write to make. All decisions are taken from
 *     the snapshot, never from half-written state, which is what lets a
 *     permutation (Art. 5(1)(d) and (h) swapping meanings) resolve correctly.
 *
 *   reconcileSupersededRequirements() — loads the snapshot, plans, and applies
 *     the plan in one transaction. Called at the end of
 *     scripts/seed-frameworks.ts, so it runs on every self-hosted migrator boot
 *     (deploy/sovereign/migrate.sh) and whenever the hosted content seeds run.
 *
 * Rules, in the order they matter:
 *   - A status a person has set on the successor is never overwritten. The
 *     moved link's notes are appended to it instead, and its evidence items
 *     are re-pointed to it, so nothing is lost.
 *   - Nothing is deleted until everything attached to it has been moved:
 *     deleting a requirement row cascades to its links and their evidence.
 *   - An entry whose successor row does not exist is skipped whole. The seed
 *     creates successors before this runs; if one is missing, something else
 *     is wrong and deleting the old row would lose data.
 *   - A second run finds nothing to do: superseded rows are gone, and every
 *     link it touched on a repurposed row now carries a timestamp after the
 *     change, which marks it as made under the new meaning.
 *
 * Imported by scripts/ in the migrator image, so relative imports only.
 */

import type { ComplianceStatus, PrismaClient, Provenance } from "@prisma/client";
import {
  REQUIREMENT_SUPERSESSIONS,
  type RequirementSupersession,
} from "../config/requirement-supersessions";

export const RECONCILED_ACTION = "REQUIREMENT_RECONCILED";
export const REVIEW_ACTION = "REQUIREMENT_RECONCILIATION_REVIEW";

/** The fields that carry a person's work on a compliance link. */
export interface MappingWork {
  status: ComplianceStatus;
  evidence: string | null;
  notes: string | null;
  assessedBy: string | null;
  assessedAt: Date | null;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  provenance: Provenance;
  sourceRef: string | null;
}

export interface MappingSnapshot extends MappingWork {
  id: string;
  organizationId: string;
  aiSystemId: string;
  requirementId: string;
  createdAt: Date;
  updatedAt: Date;
  evidenceItemIds: string[];
}

export interface CrossMappingSnapshot {
  id: string;
  requirementAId: string;
  requirementBId: string;
}

export interface ReconciliationInput {
  entries: RequirementSupersession[];
  /** id → title as it stood BEFORE this run's seed. Missing = row absent then. */
  preSeedTitles: Record<string, string>;
  /** Requirement rows present now (after the seed), with their parent. */
  requirements: { id: string; parentId: string | null }[];
  /** Every link on any `from` or `to` row of the entries. */
  mappings: MappingSnapshot[];
  /** Every cross-framework mapping touching a superseded `from` row or its successor. */
  crossMappings: CrossMappingSnapshot[];
  /**
   * Mapping ids an earlier run already recorded in the audit log, as reviewed
   * or as reconciled. Its own writes carry a timestamp after the change, so
   * without this a link that received moved work would be flagged next boot.
   */
  alreadyRecorded: Set<string>;
  now: Date;
}

export type SlotRef = { mappingId: string } | { createKey: string };

export type ReconciliationOp =
  | { op: "relink"; mappingId: string; toRequirementId: string }
  | {
      op: "create";
      createKey: string;
      organizationId: string;
      aiSystemId: string;
      requirementId: string;
      work: MappingWork;
    }
  | { op: "update"; mappingId: string; work: MappingWork }
  | { op: "moveEvidence"; evidenceIds: string[]; to: SlotRef }
  | { op: "deleteMapping"; mappingId: string }
  | { op: "relinkCross"; id: string; side: "A" | "B"; toRequirementId: string }
  | { op: "deleteCross"; id: string }
  | { op: "deleteRequirement"; id: string };

export interface AuditRecord {
  organizationId: string;
  target: SlotRef;
  action: typeof RECONCILED_ACTION | typeof REVIEW_ACTION;
  changes: Record<string, unknown>;
}

export interface ReconciliationPlan {
  ops: ReconciliationOp[];
  audits: AuditRecord[];
  log: string[];
  warnings: string[];
}

const BLANK_STATUS: ComplianceStatus = "NOT_ASSESSED";

function nonEmpty(value: string | null | undefined): boolean {
  return value != null && value.trim() !== "";
}

/** True when a person has done anything on this link. */
export function carriesWork(m: MappingWork & { evidenceItemIds?: string[] }): boolean {
  return (
    m.status !== BLANK_STATUS ||
    m.assessedAt != null ||
    m.confirmedAt != null ||
    nonEmpty(m.notes) ||
    nonEmpty(m.evidence) ||
    (m.evidenceItemIds?.length ?? 0) > 0
  );
}

function workOf(m: MappingWork): MappingWork {
  return {
    status: m.status,
    evidence: m.evidence,
    notes: m.notes,
    assessedBy: m.assessedBy,
    assessedAt: m.assessedAt,
    confirmedBy: m.confirmedBy,
    confirmedAt: m.confirmedAt,
    provenance: m.provenance,
    sourceRef: m.sourceRef,
  };
}

function blankWork(entry: RequirementSupersession): MappingWork {
  return {
    status: BLANK_STATUS,
    evidence: null,
    notes: null,
    assessedBy: null,
    assessedAt: null,
    confirmedBy: null,
    confirmedAt: null,
    provenance: "AUTO_RULE",
    sourceRef: `requirement-reconciliation:${entry.key}`,
  };
}

/** The same work, with the link's record fields cleared. Keeps provenance. */
function resetWork(m: MappingWork): MappingWork {
  return {
    ...workOf(m),
    status: BLANK_STATUS,
    evidence: null,
    notes: null,
    assessedBy: null,
    assessedAt: null,
    confirmedBy: null,
    confirmedAt: null,
  };
}

function sameWork(a: MappingWork, b: MappingWork): boolean {
  const t = (d: Date | null) => (d ? d.getTime() : null);
  return (
    a.status === b.status &&
    a.evidence === b.evidence &&
    a.notes === b.notes &&
    a.assessedBy === b.assessedBy &&
    t(a.assessedAt) === t(b.assessedAt) &&
    a.confirmedBy === b.confirmedBy &&
    t(a.confirmedAt) === t(b.confirmedAt) &&
    a.provenance === b.provenance &&
    a.sourceRef === b.sourceRef
  );
}

/** Text appended to a successor that already carries a person's status. */
function carriedNote(entry: RequirementSupersession, from: MappingWork, day: string): string {
  const parts = [
    `[Carried over on ${day} from "${entry.fromCode}" (status ${from.status})` +
      (entry.kind === "repurposed" ? `, a code that now refers to a different obligation` : "") +
      `.]`,
  ];
  if (nonEmpty(from.notes)) parts.push(from.notes!.trim());
  if (nonEmpty(from.evidence)) parts.push(`Evidence: ${from.evidence!.trim()}`);
  return parts.join(" ");
}

function appendNote(existing: string | null, addition: string): string {
  return nonEmpty(existing) ? `${existing!.trimEnd()}\n\n${addition}` : addition;
}

interface Slot {
  key: string;
  organizationId: string;
  aiSystemId: string;
  requirementId: string;
  /** The link that will sit here: an existing one, a relinked one, or none (create). */
  resident: MappingSnapshot | null;
  relinkedFrom: RequirementSupersession | null;
  initial: MappingWork | null;
  work: MappingWork;
  incomingEvidence: string[];
  touchedBy: RequirementSupersession | null;
}

const slotKey = (aiSystemId: string, requirementId: string) => `${aiSystemId}|${requirementId}`;

export function planRequirementReconciliation(input: ReconciliationInput): ReconciliationPlan {
  const plan: ReconciliationPlan = { ops: [], audits: [], log: [], warnings: [] };
  const day = input.now.toISOString().slice(0, 10);
  const present = new Set(input.requirements.map((r) => r.id));
  const byKey = new Map(input.mappings.map((m) => [slotKey(m.aiSystemId, m.requirementId), m]));

  // ── Which entries can run ─────────────────────────────────────────────
  const active: RequirementSupersession[] = [];
  for (const entry of input.entries) {
    if (!present.has(entry.fromId)) continue; // never seeded here, or already reconciled
    if (!present.has(entry.toId)) {
      plan.warnings.push(
        `${entry.key}: successor "${entry.toCode}" (${entry.toId}) does not exist; entry skipped, nothing moved or deleted.`,
      );
      continue;
    }
    active.push(entry);
  }

  // ── Classify every link on a `from` row, from the snapshot ────────────
  type Outgoing = { entry: RequirementSupersession; m: MappingSnapshot };
  const outgoing: Outgoing[] = [];
  for (const entry of active) {
    const changedAt = new Date(entry.changedAt);
    const titleIsOld = entry.previousTitles.includes(input.preSeedTitles[entry.fromId] ?? "");
    for (const m of input.mappings.filter((x) => x.requirementId === entry.fromId)) {
      if (entry.kind === "superseded" || titleIsOld || m.updatedAt < changedAt) {
        outgoing.push({ entry, m });
      } else if (m.createdAt < changedAt && carriesWork(m) && !input.alreadyRecorded.has(m.id)) {
        // Made before the change, edited after it: we cannot tell which
        // meaning the person had in mind. Leave it, and say so once.
        plan.log.push(
          `${entry.key}: link ${m.id} (org ${m.organizationId}, system ${m.aiSystemId}) on "${entry.fromCode}" predates the change but was edited after it; left in place for review.`,
        );
        plan.audits.push({
          organizationId: m.organizationId,
          target: { mappingId: m.id },
          action: REVIEW_ACTION,
          changes: {
            supersession: entry.key,
            requirement: entry.fromCode,
            possibleSuccessor: entry.toCode,
            reason: entry.reason,
          },
        });
      }
    }
  }

  // A link whose work leaves in this run: every superseded link, and every
  // repurposed link that carries work. Its current work must not count as
  // "a status a person has set" on a slot it is vacating.
  const vacating = new Set(
    outgoing.filter((o) => o.entry.kind === "superseded" || carriesWork(o.m)).map((o) => o.m.id),
  );
  const deleted = new Set<string>();

  // ── Slots: every (system, requirement) this run writes to ─────────────
  const slots = new Map<string, Slot>();
  const slotFor = (m: MappingSnapshot, requirementId: string): Slot => {
    const key = slotKey(m.aiSystemId, requirementId);
    let slot = slots.get(key);
    if (!slot) {
      const resident = byKey.get(key) ?? null;
      const initial = resident ? workOf(resident) : null;
      slot = {
        key,
        organizationId: m.organizationId,
        aiSystemId: m.aiSystemId,
        requirementId,
        resident,
        relinkedFrom: null,
        initial,
        work: resident
          ? vacating.has(resident.id)
            ? resetWork(resident)
            : workOf(resident)
          : blankWork(outgoing[0].entry),
        incomingEvidence: [],
        touchedBy: null,
      };
      slots.set(key, slot);
    }
    return slot;
  };

  // Every repurposed link that loses its work is reset, unless something
  // moves into it later in this plan (the permutation case).
  for (const { entry, m } of outgoing) {
    if (entry.kind === "repurposed" && carriesWork(m)) slotFor(m, m.requirementId);
  }

  for (const { entry, m } of outgoing) {
    const where = `link ${m.id} (org ${m.organizationId}, system ${m.aiSystemId})`;
    const existingTarget = slots.get(slotKey(m.aiSystemId, entry.toId));
    const residentAtTarget = byKey.get(slotKey(m.aiSystemId, entry.toId));

    // Superseded, and nothing sits at the successor yet: move the link itself,
    // keeping its id, history and evidence.
    if (entry.kind === "superseded" && !existingTarget && !residentAtTarget) {
      plan.ops.push({ op: "relink", mappingId: m.id, toRequirementId: entry.toId });
      const slot = slotFor(m, entry.toId);
      slot.resident = { ...m, requirementId: entry.toId };
      slot.relinkedFrom = entry;
      slot.initial = workOf(m);
      slot.work = workOf(m);
      slot.touchedBy = entry;
      plan.log.push(`${entry.key}: moved ${where} from "${entry.fromCode}" to "${entry.toCode}".`);
      plan.audits.push({
        organizationId: m.organizationId,
        target: { mappingId: m.id },
        action: RECONCILED_ACTION,
        changes: { supersession: entry.key, from: entry.fromCode, to: entry.toCode, outcome: "moved" },
      });
      continue;
    }

    const slot = slotFor(m, entry.toId);

    // An empty link has nothing to carry. On a retired row it is removed; on a
    // re-used row it stays, and the system gets an empty link to the
    // successor if it has none (the link a fresh install would give it).
    if (!carriesWork(m)) {
      if (entry.kind === "superseded") {
        plan.ops.push({ op: "deleteMapping", mappingId: m.id });
        deleted.add(m.id);
        plan.log.push(`${entry.key}: removed empty ${where} on "${entry.fromCode}"; the system is already linked to "${entry.toCode}".`);
        plan.audits.push({
          organizationId: m.organizationId,
          target: slot.resident ? { mappingId: slot.resident.id } : { createKey: slot.key },
          action: RECONCILED_ACTION,
          changes: { supersession: entry.key, from: entry.fromCode, to: entry.toCode, fromMappingId: m.id, outcome: "empty duplicate removed" },
        });
      } else if (!slot.resident && !slot.touchedBy) {
        slot.touchedBy = entry;
        plan.log.push(`${entry.key}: linked system ${m.aiSystemId} (org ${m.organizationId}) to "${entry.toCode}"; its link to "${entry.fromCode}" predates the change of meaning.`);
        plan.audits.push({
          organizationId: m.organizationId,
          target: { createKey: slot.key },
          action: RECONCILED_ACTION,
          changes: { supersession: entry.key, from: entry.fromCode, to: entry.toCode, fromMappingId: m.id, outcome: "successor linked" },
        });
      }
      continue;
    }

    slot.touchedBy = entry;
    let outcome: string;
    if (!carriesWork(slot.work)) {
      slot.work = workOf(m);
      outcome = `status ${m.status} carried over`;
    } else {
      slot.work = { ...slot.work, notes: appendNote(slot.work.notes, carriedNote(entry, m, day)) };
      outcome = `kept status ${slot.work.status} already set on the successor; notes carried over`;
    }
    if (m.evidenceItemIds.length > 0) {
      slot.incomingEvidence.push(...m.evidenceItemIds);
      outcome += `; ${m.evidenceItemIds.length} evidence item(s) re-pointed`;
    }

    if (entry.kind === "superseded") {
      plan.ops.push({ op: "deleteMapping", mappingId: m.id });
      deleted.add(m.id);
    }
    plan.log.push(
      `${entry.key}: ${where} on "${entry.fromCode}" → "${entry.toCode}": ${outcome}.`,
    );
    plan.audits.push({
      organizationId: m.organizationId,
      target: slot.resident ? { mappingId: slot.resident.id } : { createKey: slot.key },
      action: RECONCILED_ACTION,
      changes: {
        supersession: entry.key,
        from: entry.fromCode,
        to: entry.toCode,
        fromMappingId: m.id,
        outcome,
      },
    });
  }

  // ── Emit link writes ──────────────────────────────────────────────────
  for (const slot of slots.values()) {
    if (slot.resident && deleted.has(slot.resident.id)) continue;
    const target: SlotRef = slot.resident
      ? { mappingId: slot.resident.id }
      : { createKey: slot.key };
    if (!slot.resident) {
      if (!slot.touchedBy) continue;
      const entry = slot.touchedBy;
      const work = carriesWork(slot.work) ? slot.work : blankWork(entry);
      plan.ops.push({
        op: "create",
        createKey: slot.key,
        organizationId: slot.organizationId,
        aiSystemId: slot.aiSystemId,
        requirementId: slot.requirementId,
        work,
      });
    } else if (!slot.initial || !sameWork(slot.initial, slot.work)) {
      plan.ops.push({ op: "update", mappingId: slot.resident.id, work: slot.work });
    }
    if (slot.incomingEvidence.length > 0) {
      plan.ops.push({ op: "moveEvidence", evidenceIds: slot.incomingEvidence, to: target });
    }
  }

  // ── Cross-framework mappings and the retired rows themselves ──────────
  const superseded = active.filter((e) => e.kind === "superseded");
  const successorOf = new Map(superseded.map((e) => [e.fromId, e.toId]));
  const pairs = new Set(input.crossMappings.map((c) => `${c.requirementAId}|${c.requirementBId}`));
  for (const c of input.crossMappings) {
    const a = successorOf.get(c.requirementAId) ?? c.requirementAId;
    const b = successorOf.get(c.requirementBId) ?? c.requirementBId;
    if (a === c.requirementAId && b === c.requirementBId) continue;
    const pair = `${a}|${b}`;
    if (pairs.has(pair) || a === b) {
      plan.ops.push({ op: "deleteCross", id: c.id });
      plan.log.push(`cross-mapping ${c.requirementAId} ↔ ${c.requirementBId}: successor pair already present; removed.`);
    } else {
      if (a !== c.requirementAId) plan.ops.push({ op: "relinkCross", id: c.id, side: "A", toRequirementId: a });
      if (b !== c.requirementBId) plan.ops.push({ op: "relinkCross", id: c.id, side: "B", toRequirementId: b });
      pairs.add(pair);
      plan.log.push(`cross-mapping ${c.requirementAId} ↔ ${c.requirementBId}: moved to ${a} ↔ ${b}.`);
    }
  }

  // Children before parents. A retired row with a child that is NOT itself
  // retired is kept: deleting it would orphan the child.
  const retiring = new Set(superseded.map((e) => e.fromId));
  const childrenOf = (id: string) => input.requirements.filter((r) => r.parentId === id);
  const depth = (id: string): number => {
    const parent = input.requirements.find((r) => r.id === id)?.parentId;
    return parent && retiring.has(parent) ? 1 + depth(parent) : 0;
  };
  for (const entry of [...superseded].sort((x, y) => depth(y.fromId) - depth(x.fromId))) {
    const strays = childrenOf(entry.fromId).filter((c) => !retiring.has(c.id));
    if (strays.length > 0) {
      plan.warnings.push(
        `${entry.key}: "${entry.fromCode}" still has children not listed as superseded (${strays.map((s) => s.id).join(", ")}); row kept.`,
      );
      continue;
    }
    plan.ops.push({ op: "deleteRequirement", id: entry.fromId });
    plan.log.push(`${entry.key}: deleted retired requirement "${entry.fromCode}" (${entry.fromId}).`);
  }

  return plan;
}

// ── Loading and applying ────────────────────────────────────────────────

type Db = PrismaClient;
type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface ReconcileOptions {
  /** Titles captured before the seed ran; defaults to the titles now in the database. */
  preSeedTitles?: Record<string, string>;
  /**
   * New wording for re-used rows that still carry an old title. The seed holds
   * these back and they are written inside the same transaction as the moves:
   * if the reconciliation fails, the old title stays, and the next attempt can
   * still tell that every link on the row was made under the old meaning.
   */
  deferredContent?: Record<string, { title: string; description: string }>;
  dryRun?: boolean;
  entries?: RequirementSupersession[];
  log?: (line: string) => void;
  now?: Date;
}

/**
 * The re-used rows whose stored title still shows their old meaning. The seed
 * must not rewrite their wording itself; it hands it over as `deferredContent`.
 */
export function rowsStillCarryingOldTitles(
  preSeedTitles: Record<string, string>,
  entries: RequirementSupersession[] = REQUIREMENT_SUPERSESSIONS,
): Set<string> {
  return new Set(
    entries
      .filter((e) => e.kind === "repurposed" && e.previousTitles.includes(preSeedTitles[e.fromId] ?? ""))
      .map((e) => e.fromId),
  );
}

/** Titles of every `from` row, to be captured before a seed rewrites them. */
export async function snapshotSupersededTitles(
  prisma: Db,
  entries: RequirementSupersession[] = REQUIREMENT_SUPERSESSIONS,
): Promise<Record<string, string>> {
  const rows = await prisma.complianceRequirement.findMany({
    where: { id: { in: entries.map((e) => e.fromId) } },
    select: { id: true, title: true },
  });
  return Object.fromEntries(rows.map((r) => [r.id, r.title]));
}

async function loadInput(
  db: Tx,
  entries: RequirementSupersession[],
  preSeedTitles: Record<string, string> | undefined,
  now: Date,
): Promise<ReconciliationInput> {
  const fromIds = entries.map((e) => e.fromId);
  const ids = [...new Set([...fromIds, ...entries.map((e) => e.toId)])];
  const requirements = await db.complianceRequirement.findMany({
    where: { OR: [{ id: { in: ids } }, { parentId: { in: fromIds } }] },
    select: { id: true, parentId: true, title: true },
  });
  const mappings = await db.complianceMapping.findMany({
    where: { requirementId: { in: ids } },
    select: {
      id: true,
      organizationId: true,
      aiSystemId: true,
      requirementId: true,
      status: true,
      evidence: true,
      notes: true,
      assessedBy: true,
      assessedAt: true,
      confirmedBy: true,
      confirmedAt: true,
      provenance: true,
      sourceRef: true,
      createdAt: true,
      updatedAt: true,
      evidenceItems: { select: { id: true } },
    },
  });
  // Both ends: the retired rows' mappings, and the successors' mappings, so the
  // planner can see when re-pointing one would duplicate a pair already there.
  const superseded = entries.filter((e) => e.kind === "superseded");
  const crossIds = [...superseded.map((e) => e.fromId), ...superseded.map((e) => e.toId)];
  const crossMappings = await db.crossFrameworkMapping.findMany({
    where: {
      OR: [{ requirementAId: { in: crossIds } }, { requirementBId: { in: crossIds } }],
    },
    select: { id: true, requirementAId: true, requirementBId: true },
  });
  const recorded = await db.auditLog.findMany({
    where: { action: { in: [REVIEW_ACTION, RECONCILED_ACTION] }, entityType: "ComplianceMapping" },
    select: { entityId: true },
  });
  return {
    entries,
    preSeedTitles:
      preSeedTitles ?? Object.fromEntries(requirements.map((r) => [r.id, r.title])),
    requirements: requirements.map(({ id, parentId }) => ({ id, parentId })),
    mappings: mappings.map(({ evidenceItems, ...m }) => ({
      ...m,
      evidenceItemIds: evidenceItems.map((e) => e.id),
    })),
    crossMappings,
    alreadyRecorded: new Set(recorded.map((r) => r.entityId)),
    now,
  };
}


async function applyPlan(tx: Tx, plan: ReconciliationPlan): Promise<void> {
  const created = new Map<string, string>();
  const idOf = (ref: SlotRef) =>
    "mappingId" in ref ? ref.mappingId : (created.get(ref.createKey) as string);

  // Order: re-point links, create and update, move evidence, then delete.
  // Nothing is deleted while anything is still attached to it.
  const byOp = <K extends ReconciliationOp["op"]>(k: K) =>
    plan.ops.filter((o): o is Extract<ReconciliationOp, { op: K }> => o.op === k);

  for (const o of byOp("relink")) {
    await tx.complianceMapping.update({ where: { id: o.mappingId }, data: { requirementId: o.toRequirementId } });
  }
  for (const o of byOp("create")) {
    const row = await tx.complianceMapping.create({
      data: {
        organizationId: o.organizationId,
        aiSystemId: o.aiSystemId,
        requirementId: o.requirementId,
        ...o.work,
      },
      select: { id: true },
    });
    created.set(o.createKey, row.id);
  }
  for (const o of byOp("update")) {
    await tx.complianceMapping.update({ where: { id: o.mappingId }, data: o.work });
  }
  for (const o of byOp("moveEvidence")) {
    await tx.complianceEvidence.updateMany({
      where: { id: { in: o.evidenceIds } },
      data: { complianceMappingId: idOf(o.to) },
    });
  }
  for (const o of byOp("deleteMapping")) {
    await tx.complianceMapping.delete({ where: { id: o.mappingId } });
  }
  for (const o of byOp("relinkCross")) {
    await tx.crossFrameworkMapping.update({
      where: { id: o.id },
      data: o.side === "A" ? { requirementAId: o.toRequirementId } : { requirementBId: o.toRequirementId },
    });
  }
  for (const o of byOp("deleteCross")) {
    await tx.crossFrameworkMapping.delete({ where: { id: o.id } });
  }
  for (const o of byOp("deleteRequirement")) {
    await tx.complianceRequirement.delete({ where: { id: o.id } });
  }
  if (plan.audits.length > 0) {
    await tx.auditLog.createMany({
      data: plan.audits.map((a) => ({
        organizationId: a.organizationId,
        userId: null,
        entityType: "ComplianceMapping",
        entityId: idOf(a.target),
        action: a.action,
        changes: a.changes as object,
        metadata: { source: "requirement-reconciliation" },
      })),
    });
  }
}

/**
 * Plans and applies the reconciliation in one transaction. Returns the plan,
 * so a caller can report or assert on it. With `dryRun`, nothing is written.
 */
export async function reconcileSupersededRequirements(
  prisma: Db,
  opts: ReconcileOptions = {},
): Promise<ReconciliationPlan> {
  const entries = opts.entries ?? REQUIREMENT_SUPERSESSIONS;
  const log = opts.log ?? ((line: string) => console.log(line));
  const now = opts.now ?? new Date();

  const plan = await prisma.$transaction(
    async (tx) => {
      const input = await loadInput(tx, entries, opts.preSeedTitles, now);
      const planned = planRequirementReconciliation(input);
      if (!opts.dryRun) {
        await applyPlan(tx, planned);
        for (const [id, content] of Object.entries(opts.deferredContent ?? {})) {
          await tx.complianceRequirement.update({ where: { id }, data: content });
          planned.log.push(`updated the wording of re-used requirement ${id} after moving its links.`);
        }
      }
      return planned;
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  const prefix = opts.dryRun ? "[reconcile:dry-run]" : "[reconcile]";
  for (const w of plan.warnings) log(`${prefix} WARNING ${w}`);
  for (const line of plan.log) log(`${prefix} ${line}`);
  const reworded = opts.dryRun ? 0 : Object.keys(opts.deferredContent ?? {}).length;
  const writes = plan.ops.length + plan.audits.length + reworded;
  log(
    writes === 0
      ? `${prefix} superseded requirement codes: nothing to do.`
      : `${prefix} superseded requirement codes: ${plan.ops.length} change(s), ${plan.audits.length} audit entr${plan.audits.length === 1 ? "y" : "ies"}${opts.dryRun ? " (not written)" : ""}.`,
  );
  return plan;
}
