// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Keep each system's requirement rows in step with the organisation's scope.
 *
 * A system's compliance record is a set of ComplianceMapping rows. They were
 * written once, when the system was set up (quick start, import, a risk
 * classification), and never again: declaring a new place, answering a
 * screening question, changing a risk level or ruling a standard out left the
 * rows as they were. The menu, the evidence step, the program report and the
 * board report all count those rows, so each of them drifted from what the
 * compliance matrix showed.
 *
 * This service recomputes, for every system, the requirements in scope today
 * and brings the rows in line:
 *
 *   - a requirement now in scope with no row gets an empty row (NOT_ASSESSED);
 *   - an empty row whose requirement is no longer in scope is removed.
 *
 * "Empty" is strict: no status, no evidence text, no notes, nobody recorded as
 * assessing it, not confirmed, and no evidence attached. A row anyone has
 * worked on is never removed, whatever the scope says; the matrix keeps
 * showing it. Nothing is removed while a legal hold covers the system.
 *
 * In scope means, per framework family:
 *
 *   - EU AI Act, NIST AI RMF, ISO/IEC 42001: the requirements of the system's
 *     risk tier (`applicableTo`), unless the framework is out of scope
 *     (src/config/framework-scope.ts: not chosen, or ruled out by the answers);
 *   - GDPR, Colorado, Texas, Washington: what the regime rules admit
 *     (src/config/regimes); an undetermined regime admits nothing, and a
 *     state law the organisation has not chosen admits nothing (the GDPR is
 *     not a choice);
 *   - California ADMT: what the ADMT rules admit once they have resolved, if
 *     chosen.
 *
 * AIUC-1 rows are left alone: they are written by agent testing, per agent.
 *
 * The pure part (`planRequirementSync`) carries the rule and is tested on its
 * own; `syncRequirements` only loads and writes.
 */

import type { FrameworkCode, Prisma, PrismaClient } from "@prisma/client";
import { buildScopeFilter } from "@/lib/applicability-scope";
import { readApplicabilitySettings } from "@/config/applicability";
import { frameworksRuledOut, TIERED_FRAMEWORKS } from "@/config/framework-scope";
import { REGIME_CODES } from "@/config/regimes";
import { activeHolds } from "@/server/services/legal-hold";
import { buildSystemScope, SYSTEM_INCLUDE, type RawOrg, type RawSystem } from "./system-scope";

const ADMT_CODE = "CA_CCPA_ADMT";

/** The frameworks whose rows this service keeps in step. */
export const SYNCED_FRAMEWORKS: readonly string[] = [...TIERED_FRAMEWORKS, ...REGIME_CODES, ADMT_CODE];

export interface SyncRequirement {
  id: string;
  frameworkCode: string;
  applicableTo: readonly string[];
  applicabilityTags: string[];
}

export interface SyncMappingRow {
  id: string;
  aiSystemId: string;
  requirementId: string;
  /** Nothing has been entered on the row (see the header). */
  empty: boolean;
}

/** What one system's scope admits, by framework family. */
export interface SystemScopeInput {
  id: string;
  riskLevel: string | null;
  regimes: { framework: string; tags: string[] }[];
  /** The ADMT tags once the ADMT rules have resolved; null while undetermined. */
  admtTags: string[] | null;
}

export interface SyncPlan {
  create: { aiSystemId: string; requirementId: string }[];
  remove: string[];
  /** Rows created and removed, per framework code: the audit entry. */
  byFramework: Record<string, { created: number; removed: number }>;
}

/** The requirement ids in scope for one system. Pure. */
export function requirementsInScope(
  system: SystemScopeInput,
  requirements: readonly SyncRequirement[],
  ruledOut: readonly string[],
): Set<string> {
  const ids = new Set<string>();
  const tiered = new Set<string>(TIERED_FRAMEWORKS);
  if (system.riskLevel) {
    for (const r of requirements) {
      if (tiered.has(r.frameworkCode) && !ruledOut.includes(r.frameworkCode) && r.applicableTo.includes(system.riskLevel)) {
        ids.add(r.id);
      }
    }
  }
  // The same gate as attach-regimes.ts and admt.syncMappings: no tags, no rows.
  const scoped = [
    ...system.regimes.map((r) => ({ framework: r.framework, tags: r.tags })),
    ...(system.admtTags ? [{ framework: ADMT_CODE, tags: system.admtTags }] : []),
  ];
  for (const scope of scoped) {
    // A state law the organisation has not chosen admits nothing.
    if (scope.tags.length === 0 || ruledOut.includes(scope.framework)) continue;
    const inScope = buildScopeFilter(scope.tags);
    for (const r of requirements) {
      if (r.frameworkCode === scope.framework && inScope(r)) ids.add(r.id);
    }
  }
  return ids;
}

/**
 * The rows to create and the empty rows to remove, for these systems. Pure.
 * `mappings` holds the existing rows of the synced frameworks only; systems
 * in `keepSystems` (a legal hold covers them) lose nothing.
 */
export function planRequirementSync(
  systems: readonly SystemScopeInput[],
  requirements: readonly SyncRequirement[],
  mappings: readonly SyncMappingRow[],
  ruledOut: readonly string[],
  keepSystems: ReadonlySet<string> = new Set(),
): SyncPlan {
  const frameworkOf = new Map(requirements.map((r) => [r.id, r.frameworkCode]));
  const synced = new Set(SYNCED_FRAMEWORKS);
  const plan: SyncPlan = { create: [], remove: [], byFramework: {} };
  const tally = (requirementId: string, key: "created" | "removed") => {
    const code = frameworkOf.get(requirementId) ?? "unknown";
    const entry = (plan.byFramework[code] ??= { created: 0, removed: 0 });
    entry[key]++;
  };
  const rowsBySystem = new Map<string, SyncMappingRow[]>();
  for (const m of mappings) {
    const list = rowsBySystem.get(m.aiSystemId) ?? [];
    list.push(m);
    rowsBySystem.set(m.aiSystemId, list);
  }
  for (const system of systems) {
    const expected = requirementsInScope(system, requirements, ruledOut);
    const rows = rowsBySystem.get(system.id) ?? [];
    const present = new Set(rows.map((r) => r.requirementId));
    for (const requirementId of expected) {
      if (present.has(requirementId)) continue;
      plan.create.push({ aiSystemId: system.id, requirementId });
      tally(requirementId, "created");
    }
    if (keepSystems.has(system.id)) continue;
    for (const row of rows) {
      const code = frameworkOf.get(row.requirementId);
      // Only the synced frameworks' rows: AIUC-1 and any other stay as they are.
      if (!row.empty || expected.has(row.requirementId) || !code || !synced.has(code)) continue;
      plan.remove.push(row.id);
      tally(row.requirementId, "removed");
    }
  }
  return plan;
}

/** The Prisma surface used here; a transaction client works too. */
type SyncDb = Pick<
  PrismaClient,
  | "organization"
  | "aISystem"
  | "complianceRequirement"
  | "complianceMapping"
  | "sampleRecord"
  | "legalHold"
  | "auditLog"
>;

export interface SyncResult {
  created: number;
  removed: number;
  byFramework: SyncPlan["byFramework"];
}

const EMPTY_ROW: Prisma.ComplianceMappingWhereInput = {
  status: "NOT_ASSESSED",
  confirmedAt: null,
  assessedBy: null,
  AND: [
    { OR: [{ evidence: null }, { evidence: "" }] },
    { OR: [{ notes: null }, { notes: "" }] },
  ],
  evidenceItems: { none: {} },
};

/**
 * Bring the rows of one system, or of every system of the organisation, in
 * line with today's scope. Retired systems and the worked example's systems
 * are left as they are. Idempotent: a second run changes nothing.
 */
export async function syncRequirements(
  db: SyncDb,
  organizationId: string,
  options: { aiSystemId?: string; userId?: string | null; reason: string; dryRun?: boolean },
): Promise<SyncResult> {
  const org = await db.organization.findFirst({
    where: { id: organizationId },
    select: { name: true, operatingJurisdictions: true, settings: true },
  });
  if (!org) return { created: 0, removed: 0, byFramework: {} };
  const places = org.operatingJurisdictions as string[];
  const { answers, frameworks } = readApplicabilitySettings(org.settings, places);
  const ruledOut = frameworksRuledOut(places, answers, frameworks);

  const sample = await db.sampleRecord.findMany({
    where: { organizationId, entityType: "AISystem" },
    select: { entityId: true },
  });
  const sampleIds = sample.map((s) => s.entityId);
  const systems = (await db.aISystem.findMany({
    where: {
      organizationId,
      status: { not: "RETIRED" },
      ...(options.aiSystemId ? { id: options.aiSystemId } : {}),
      ...(sampleIds.length > 0 ? { NOT: { id: { in: sampleIds } } } : {}),
    },
    include: SYSTEM_INCLUDE,
  })) as unknown as RawSystem[];
  if (systems.length === 0) return { created: 0, removed: 0, byFramework: {} };

  const requirementRows = await db.complianceRequirement.findMany({
    where: { framework: { code: { in: [...SYNCED_FRAMEWORKS] as FrameworkCode[] } } },
    select: { id: true, applicableTo: true, applicabilityTags: true, framework: { select: { code: true } } },
  });
  const requirements: SyncRequirement[] = requirementRows.map((r) => ({
    id: r.id,
    frameworkCode: r.framework.code,
    applicableTo: r.applicableTo,
    applicabilityTags: r.applicabilityTags,
  }));

  const systemIds = systems.map((s) => s.id);
  const inSynced = { requirement: { framework: { code: { in: [...SYNCED_FRAMEWORKS] as FrameworkCode[] } } } };
  const [rows, emptyRows, holds] = await Promise.all([
    db.complianceMapping.findMany({
      where: { organizationId, aiSystemId: { in: systemIds }, ...inSynced },
      select: { id: true, aiSystemId: true, requirementId: true },
    }),
    db.complianceMapping.findMany({
      where: { organizationId, aiSystemId: { in: systemIds }, ...inSynced, ...EMPTY_ROW },
      select: { id: true },
    }),
    activeHolds(db as PrismaClient, organizationId),
  ]);
  const empty = new Set(emptyRows.map((r) => r.id));
  const mappings: SyncMappingRow[] = rows.map((r) => ({ ...r, empty: empty.has(r.id) }));
  const orgWideHold = holds.some((h) => h.aiSystemId === null);
  const keep = new Set(
    orgWideHold ? systemIds : holds.map((h) => h.aiSystemId).filter((id): id is string => !!id),
  );

  const rawOrg: RawOrg = {
    name: org.name,
    operatingJurisdictions: org.operatingJurisdictions as string[],
    settings: org.settings,
  };
  const scopes: SystemScopeInput[] = systems.map((system) => {
    const scope = buildSystemScope(system, rawOrg);
    return {
      id: system.id,
      riskLevel: scope.riskLevel,
      regimes: scope.regimes.map((r) => ({ framework: r.framework, tags: r.tags })),
      admtTags: scope.admtResolved ? scope.admt.tags : null,
    };
  });

  const plan = planRequirementSync(scopes, requirements, mappings, ruledOut, keep);
  if (options.dryRun) {
    return { created: plan.create.length, removed: plan.remove.length, byFramework: plan.byFramework };
  }
  let created = 0;
  let removed = 0;
  if (plan.create.length > 0) {
    created = (
      await db.complianceMapping.createMany({
        data: plan.create.map((c) => ({
          organizationId,
          aiSystemId: c.aiSystemId,
          requirementId: c.requirementId,
          status: "NOT_ASSESSED" as const,
          // Derived by the scope rules, not typed by a person.
          provenance: "AUTO_RULE" as const,
          sourceRef: "scope-sync",
        })),
        skipDuplicates: true,
      })
    ).count;
  }
  if (plan.remove.length > 0) {
    // Re-checked as empty at the moment of the delete, so a row someone
    // worked on since it was read is kept.
    removed = (
      await db.complianceMapping.deleteMany({
        where: { organizationId, id: { in: plan.remove }, ...EMPTY_ROW },
      })
    ).count;
  }
  if (created > 0 || removed > 0) {
    await db.auditLog.create({
      data: {
        organizationId,
        userId: options.userId ?? null,
        entityType: "ComplianceMapping",
        entityId: options.aiSystemId ?? organizationId,
        action: "UPDATE",
        changes: {
          source: "scope-sync",
          reason: options.reason,
          created,
          removed,
          byFramework: plan.byFramework,
          ruledOut,
        } as Prisma.InputJsonValue,
      },
    });
  }
  return { created, removed, byFramework: plan.byFramework };
}

/**
 * The same, for a caller whose own save must not fail because of it: the
 * save has happened, and the rows catch up on the next change or run.
 */
export async function syncRequirementsSafely(
  db: SyncDb,
  organizationId: string,
  options: { aiSystemId?: string; userId?: string | null; reason: string },
): Promise<SyncResult | null> {
  try {
    return await syncRequirements(db, organizationId, options);
  } catch (error) {
    console.error("[scope-sync] failed", { organizationId, reason: options.reason, error });
    return null;
  }
}

/** The frameworks the organisation's answers rule out, for the tier queries. */
export async function loadRuledOutFrameworks(
  db: Pick<PrismaClient, "organization">,
  organizationId: string,
): Promise<FrameworkCode[]> {
  const org = await db.organization.findFirst({
    where: { id: organizationId },
    select: { operatingJurisdictions: true, settings: true },
  });
  const places = (org?.operatingJurisdictions ?? []) as string[];
  const { answers, frameworks } = readApplicabilitySettings(org?.settings, places);
  return frameworksRuledOut(places, answers, frameworks) as FrameworkCode[];
}
