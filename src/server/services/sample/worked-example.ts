// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Creating and removing the worked example.
 *
 * Everything it creates is registered in `sample_records`, and removal walks
 * exactly those rows. That is the whole design: nothing the person creates
 * themselves is ever in the list, so "remove the sample data" cannot take their
 * work with it, and a row whose target has already been deleted by hand is
 * simply skipped.
 *
 * Removal happens in reverse creation order, so a child never outlives the
 * parent whose delete would have cascaded it away.
 *
 * The one thing the example changes rather than creates is where the
 * organisation operates: scope resolution can say nothing at all until a
 * jurisdiction is declared, and an example that resolves to "no regime yet" on
 * every page teaches the opposite of what it should. The previous value is kept
 * in the sample record's `restore` and put back on removal.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import {
  EXAMPLE_ASSESSMENT_ANSWERS,
  EXAMPLE_GATE,
  EXAMPLE_INCIDENT,
  EXAMPLE_POLICY,
  EXAMPLE_SYSTEMS,
  EXAMPLE_VENDORS,
  WORKED_EXAMPLE_JURISDICTIONS,
  WORKED_EXAMPLE_VERSION,
} from "@/config/worked-example";
import { createUnifiedAssessmentDraft } from "@/server/services/program/starter-artifacts";
import type { PilotLocale } from "@/config/pilot";

/** Every model the example writes to, in creation order. */
export const SAMPLE_ENTITY_TYPES = [
  "Organization",
  "AIVendor",
  "AISystem",
  "RiskClassification",
  "AIPolicy",
  "OversightGate",
  "AIIncident",
  "AIAssessmentTemplate",
  "AIAssessment",
] as const;

export type SampleEntityType = (typeof SAMPLE_ENTITY_TYPES)[number];

/** How each entity type is deleted, or restored when the record carries one. */
const DELETERS: Record<
  SampleEntityType,
  ((prisma: PrismaClient, id: string, organizationId: string) => Promise<void>) | null
> = {
  // The organisation itself is never deleted by removing an example; its row
  // exists only to carry what to put back.
  Organization: null,
  AIVendor: async (p, id, organizationId) => {
    await p.aIVendor.deleteMany({ where: { id, organizationId } });
  },
  AISystem: async (p, id, organizationId) => {
    await p.aISystem.deleteMany({ where: { id, organizationId } });
  },
  RiskClassification: async (p, id, organizationId) => {
    await p.riskClassification.deleteMany({ where: { id, organizationId } });
  },
  AIPolicy: async (p, id, organizationId) => {
    await p.aIPolicy.deleteMany({ where: { id, organizationId } });
  },
  OversightGate: async (p, id, organizationId) => {
    await p.oversightGate.deleteMany({ where: { id, organizationId } });
  },
  AIIncident: async (p, id, organizationId) => {
    await p.aIIncident.deleteMany({ where: { id, organizationId } });
  },
  AIAssessmentTemplate: async (p, id, organizationId) => {
    await p.aIAssessmentTemplate.deleteMany({ where: { id, organizationId } });
  },
  AIAssessment: async (p, id, organizationId) => {
    await p.aIAssessment.deleteMany({ where: { id, organizationId } });
  },
};

export interface SampleStatus {
  present: boolean;
  /** How many records the example is holding, by type. */
  counts: Partial<Record<SampleEntityType, number>>;
  total: number;
  createdAt: Date | null;
}

export async function getSampleStatus(
  prisma: PrismaClient,
  organizationId: string,
): Promise<SampleStatus> {
  const rows = await prisma.sampleRecord.findMany({
    where: { organizationId },
    select: { entityType: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const counts: Partial<Record<SampleEntityType, number>> = {};
  for (const row of rows) {
    // The organisation row is bookkeeping, not a record the person sees.
    if (row.entityType === "Organization") continue;
    const key = row.entityType as SampleEntityType;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((n, v) => n + (v ?? 0), 0);
  return { present: rows.length > 0, counts, total, createdAt: rows[0]?.createdAt ?? null };
}

/**
 * The ids of every sample record, by type, for the screens that mark them. One
 * query per page rather than a column on fifteen tables.
 */
export async function getSampleIds(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Record<string, string[]>> {
  const rows = await prisma.sampleRecord.findMany({
    where: { organizationId },
    select: { entityType: true, entityId: true },
  });
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    if (row.entityType === "Organization") continue;
    (out[row.entityType] ??= []).push(row.entityId);
  }
  return out;
}

export interface CreateSampleResult {
  created: boolean;
  /** Already present: the example is not added twice. */
  reason?: "already-present";
  counts: Partial<Record<SampleEntityType, number>>;
  /** True when the example declared a jurisdiction the organisation lacked. */
  declaredJurisdictions: boolean;
}

/**
 * Add the worked example to this organisation. Idempotent: an organisation that
 * already holds the example gets nothing new, because two copies of an example
 * are worse than none.
 */
export async function createWorkedExample(
  prisma: PrismaClient,
  args: { organizationId: string; userId: string; locale: PilotLocale },
): Promise<CreateSampleResult> {
  const { organizationId, userId, locale } = args;

  const existing = await prisma.sampleRecord.count({ where: { organizationId } });
  if (existing > 0) {
    const status = await getSampleStatus(prisma, organizationId);
    return { created: false, reason: "already-present", counts: status.counts, declaredJurisdictions: false };
  }

  const counts: Partial<Record<SampleEntityType, number>> = {};
  const record = async (entityType: SampleEntityType, entityId: string, restore?: Prisma.InputJsonValue) => {
    await prisma.sampleRecord.create({
      data: { organizationId, entityType, entityId, ...(restore === undefined ? {} : { restore }) },
    });
    if (entityType !== "Organization") counts[entityType] = (counts[entityType] ?? 0) + 1;
  };

  // ── Where the example organisation operates ──────────────────────────────
  // Only when nothing is declared. An organisation that has already said where
  // it operates has made a statement of its own, and an example must not
  // overwrite it.
  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { operatingJurisdictions: true, jurisdictionsReviewedAt: true },
  });
  let declaredJurisdictions = false;
  if (org && org.operatingJurisdictions.length === 0) {
    // Read what to put back BEFORE writing over it. Obvious, and the reason
    // this is a local rather than a field read after the update.
    const restore = {
      operatingJurisdictions: [...org.operatingJurisdictions] as string[],
      jurisdictionsReviewedAt: org.jurisdictionsReviewedAt?.toISOString() ?? null,
    };
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        operatingJurisdictions: [...WORKED_EXAMPLE_JURISDICTIONS] as never,
        jurisdictionsReviewedAt: new Date(),
      },
    });
    await record("Organization", organizationId, restore);
    declaredJurisdictions = true;
  }

  // ── The vendor behind the high-risk system ───────────────────────────────
  const vendorIdByKey = new Map<string, string>();
  for (const vendor of EXAMPLE_VENDORS) {
    const row = await prisma.aIVendor.create({
      data: {
        organizationId,
        name: vendor.name[locale],
        description: vendor.description[locale],
        riskLevel: vendor.riskLevel,
        status: "UNDER_REVIEW",
        metadata: { source: "worked-example", version: WORKED_EXAMPLE_VERSION },
      },
    });
    vendorIdByKey.set(vendor.key, row.id);
    await record("AIVendor", row.id);
  }

  // ── The systems and their classifications ────────────────────────────────
  const systemIdByKey = new Map<string, string>();
  for (const spec of EXAMPLE_SYSTEMS) {
    const system = await prisma.aISystem.create({
      data: {
        organizationId,
        name: spec.name[locale],
        description: spec.description[locale],
        purpose: spec.purpose[locale],
        technique: spec.technique,
        role: spec.role,
        status: spec.status,
        processesPersonalData: spec.processesPersonalData,
        businessOwner: spec.businessOwner[locale],
        technicalOwner: spec.technicalOwner[locale],
        vendorId: spec.vendorKey ? (vendorIdByKey.get(spec.vendorKey) ?? null) : null,
        metadata: { source: "worked-example", version: WORKED_EXAMPLE_VERSION },
      },
    });
    systemIdByKey.set(spec.key, system.id);
    await record("AISystem", system.id);

    const classification = await prisma.riskClassification.create({
      data: {
        organizationId,
        aiSystemId: system.id,
        riskLevel: spec.risk.level,
        annexIIICategory: spec.risk.annexIIICategory,
        rationale: spec.risk.rationale[locale],
        classifiedBy: userId,
        // The example states its rationale the way a person's classification
        // must, so it is USER_ENTERED rather than a rule's output.
        provenance: "USER_ENTERED",
        sourceRef: `worked-example@${WORKED_EXAMPLE_VERSION}`,
      },
    });
    await record("RiskClassification", classification.id);
  }

  // ── The policy ───────────────────────────────────────────────────────────
  const policy = await prisma.aIPolicy.create({
    data: {
      organizationId,
      title: EXAMPLE_POLICY.title[locale],
      type: EXAMPLE_POLICY.type,
      description: EXAMPLE_POLICY.description[locale],
      content: EXAMPLE_POLICY.content[locale],
      status: "DRAFT",
      createdBy: userId,
      provenance: "AUTO_TEMPLATE",
      sourceRef: `worked-example@${WORKED_EXAMPLE_VERSION}`,
    },
  });
  await record("AIPolicy", policy.id);

  // ── The oversight review ─────────────────────────────────────────────────
  const gateSystemId = systemIdByKey.get(EXAMPLE_GATE.systemKey);
  if (gateSystemId) {
    const gate = await prisma.oversightGate.create({
      data: {
        organizationId,
        aiSystemId: gateSystemId,
        gateType: EXAMPLE_GATE.gateType,
        description: EXAMPLE_GATE.description[locale],
        reviewCadence: EXAMPLE_GATE.reviewCadence[locale],
        nextReviewDate: new Date(Date.now() + EXAMPLE_GATE.firstReviewInDays * 86_400_000),
        status: "PENDING",
        provenance: "AUTO_TEMPLATE",
        sourceRef: `worked-example@${WORKED_EXAMPLE_VERSION}`,
      },
    });
    await record("OversightGate", gate.id);
  }

  // ── The incident ─────────────────────────────────────────────────────────
  const incidentSystemId = systemIdByKey.get(EXAMPLE_INCIDENT.systemKey);
  const awareAt = new Date(Date.now() - 2 * 86_400_000);
  const incident = await prisma.aIIncident.create({
    data: {
      organizationId,
      aiSystemId: incidentSystemId ?? null,
      title: EXAMPLE_INCIDENT.title[locale],
      description: EXAMPLE_INCIDENT.description[locale],
      type: EXAMPLE_INCIDENT.type,
      severity: EXAMPLE_INCIDENT.severity,
      status: "RESOLVED",
      rootCauseCategory: EXAMPLE_INCIDENT.rootCauseCategory[locale],
      impactDescription: EXAMPLE_INCIDENT.impactDescription[locale],
      awareAt,
      resolvedAt: new Date(awareAt.getTime() + 6 * 3_600_000),
      reportedBy: userId,
    },
  });
  await record("AIIncident", incident.id);

  // ── The answered impact assessment ───────────────────────────────────────
  // Built by the same path the product uses, so the example's assessment is the
  // real question set for the system's resolved scope, not a frozen copy.
  const assessmentSystemId = systemIdByKey.get("applicant-screening");
  if (assessmentSystemId) {
    const draft = await createUnifiedAssessmentDraft(prisma, {
      organizationId,
      aiSystemId: assessmentSystemId,
      userId,
      locale,
      source: "worked-example",
    });
    if (draft.created) {
      const responses = Object.fromEntries(
        Object.entries(EXAMPLE_ASSESSMENT_ANSWERS).map(([id, text]) => [id, text[locale]]),
      );
      await prisma.aIAssessment.update({
        where: { id: draft.assessmentId },
        data: { responses, status: "IN_PROGRESS" },
      });
      await record("AIAssessmentTemplate", draft.templateId);
      await record("AIAssessment", draft.assessmentId);
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Organization",
      entityId: organizationId,
      action: "CREATE_SAMPLE_DATA",
      changes: { version: WORKED_EXAMPLE_VERSION, locale, counts, declaredJurisdictions },
    },
  });

  return { created: true, counts, declaredJurisdictions };
}

export interface RemoveSampleResult {
  removed: number;
  /** Rows whose target was already gone: counted, not an error. */
  alreadyGone: number;
  jurisdictionsRestored: boolean;
}

/**
 * Remove every record the example created, and nothing else. Reverse creation
 * order, so a parent's cascade never surprises a later step.
 */
export async function removeWorkedExample(
  prisma: PrismaClient,
  args: { organizationId: string; userId: string },
): Promise<RemoveSampleResult> {
  const { organizationId, userId } = args;
  const rows = await prisma.sampleRecord.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  let removed = 0;
  let alreadyGone = 0;
  let jurisdictionsRestored = false;

  for (const row of rows) {
    const type = row.entityType as SampleEntityType;

    // A record that carries what to put back is a change, not a creation.
    if (row.restore && type === "Organization") {
      const restore = row.restore as { operatingJurisdictions?: string[]; jurisdictionsReviewedAt?: string | null };
      await prisma.organization.updateMany({
        where: { id: organizationId },
        data: {
          operatingJurisdictions: (restore.operatingJurisdictions ?? []) as never,
          jurisdictionsReviewedAt: restore.jurisdictionsReviewedAt
            ? new Date(restore.jurisdictionsReviewedAt)
            : null,
        },
      });
      jurisdictionsRestored = true;
      continue;
    }

    const deleter = DELETERS[type];
    if (!deleter) continue;
    try {
      await deleter(prisma, row.entityId, organizationId);
      removed += 1;
    } catch {
      // Gone already, or taken out by a parent's cascade a moment ago. Either
      // way the row is no longer there, which is what was asked for.
      alreadyGone += 1;
    }
  }

  await prisma.sampleRecord.deleteMany({ where: { organizationId } });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Organization",
      entityId: organizationId,
      action: "DELETE_SAMPLE_DATA",
      changes: { removed, alreadyGone, jurisdictionsRestored, version: WORKED_EXAMPLE_VERSION },
    },
  });

  return { removed, alreadyGone, jurisdictionsRestored };
}
