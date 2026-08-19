// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Provenance router — the "auto-assessed → confirm" workflow.
 *
 * Auto-generated governance artifacts are only defensible when a human has
 * taken ownership of them. These endpoints surface what still needs
 * confirming, let an approver confirm in bulk, and report the org-wide
 * assurance percentage.
 *
 * RBAC note: reading confirmation state is deliberately open to every member
 * INCLUDING VIEWER — hiding it would let a viewer quote an unconfirmed number
 * as fact, which is the exact failure this feature exists to prevent. Only the
 * write path is gated, and confirmation is an approval, so it additionally
 * requires OWNER / ADMIN / AI_OFFICER (a MEMBER may edit an artifact but not
 * vouch for it).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import {
  getConfirmationCounts,
  UNCONFIRMED_WHERE,
} from "../../services/provenance/summary";
import { computeConfirmationSummary } from "@/lib/provenance/state";
import { ARTIFACT_CLASSES, type ArtifactClass } from "@/lib/provenance/types";

/** The five models that carry provenance columns. */
const CONFIRMABLE_ENTITIES = [
  "RiskClassification",
  "ComplianceMapping",
  "OversightGate",
  "AIPolicy",
  "TransparencyProfile",
] as const;
type ConfirmableEntity = (typeof CONFIRMABLE_ENTITIES)[number];

const entityEnum = z.enum(CONFIRMABLE_ENTITIES);

/** Confirming is an approval, not an edit. */
const APPROVER_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

/** Bulk confirm is capped so one request can never fan out unbounded. */
const MAX_ITEMS = 200;

const itemsInput = z.object({
  organizationId: z.string(),
  items: z
    .array(z.object({ entityType: entityEnum, id: z.string() }))
    .min(1)
    .max(MAX_ITEMS),
});

/**
 * The only Prisma capability this router needs: a scoped bulk update. Narrowing
 * to this shape keeps the five delegates interchangeable without pulling in
 * five different generated argument types.
 */
interface ConfirmableDelegate {
  updateMany(args: {
    where: { id: { in: string[] }; organizationId: string };
    data: { confirmedBy: string | null; confirmedAt: Date | null };
  }): Promise<{ count: number }>;
}

/** Maps an entity name to its Prisma delegate. Every delegate is org-scoped below. */
function delegateFor(
  prisma: Record<string, unknown>,
  entityType: ConfirmableEntity,
): ConfirmableDelegate {
  const key: Record<ConfirmableEntity, string> = {
    RiskClassification: "riskClassification",
    ComplianceMapping: "complianceMapping",
    OversightGate: "oversightGate",
    AIPolicy: "aIPolicy",
    TransparencyProfile: "transparencyProfile",
  };
  return prisma[key[entityType]] as ConfirmableDelegate;
}

function groupByEntity(items: { entityType: ConfirmableEntity; id: string }[]) {
  const grouped = new Map<ConfirmableEntity, string[]>();
  for (const item of items) {
    const ids = grouped.get(item.entityType) ?? [];
    ids.push(item.id);
    grouped.set(item.entityType, ids);
  }
  return grouped;
}

export const provenanceRouter = createTRPCRouter({
  /**
   * Items still awaiting human confirmation, newest first, cursor-paginated
   * across a stable ordering. Readable by any member (see file header).
   */
  listQueue: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        entityType: entityEnum.optional(),
        aiSystemId: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.organization.id;
      const base = { organizationId: orgId, ...UNCONFIRMED_WHERE };
      const systemScope = input.aiSystemId ? { aiSystemId: input.aiSystemId } : {};
      const wants = (entity: ConfirmableEntity) =>
        !input.entityType || input.entityType === entity;

      const [risks, mappings, gates, policies, profiles] = await Promise.all([
        wants("RiskClassification")
          ? ctx.prisma.riskClassification.findMany({
              where: { ...base, ...systemScope },
              select: {
                id: true,
                riskLevel: true,
                provenance: true,
                sourceRef: true,
                classifiedAt: true,
                aiSystemId: true,
                aiSystem: { select: { name: true } },
              },
              orderBy: { classifiedAt: "desc" },
              take: input.limit,
            })
          : [],
        wants("ComplianceMapping")
          ? ctx.prisma.complianceMapping.findMany({
              where: { ...base, ...systemScope },
              select: {
                id: true,
                status: true,
                evidence: true,
                provenance: true,
                sourceRef: true,
                updatedAt: true,
                aiSystemId: true,
                aiSystem: { select: { name: true } },
                requirement: { select: { code: true, title: true } },
              },
              orderBy: { updatedAt: "desc" },
              take: input.limit,
            })
          : [],
        wants("OversightGate")
          ? ctx.prisma.oversightGate.findMany({
              where: { ...base, ...systemScope },
              select: {
                id: true,
                gateType: true,
                status: true,
                provenance: true,
                sourceRef: true,
                updatedAt: true,
                aiSystemId: true,
                aiSystem: { select: { name: true } },
              },
              orderBy: { updatedAt: "desc" },
              take: input.limit,
            })
          : [],
        wants("AIPolicy") && !input.aiSystemId
          ? ctx.prisma.aIPolicy.findMany({
              where: base,
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
                provenance: true,
                sourceRef: true,
                updatedAt: true,
              },
              orderBy: { updatedAt: "desc" },
              take: input.limit,
            })
          : [],
        wants("TransparencyProfile")
          ? ctx.prisma.transparencyProfile.findMany({
              where: { ...base, ...systemScope },
              select: {
                id: true,
                provenance: true,
                sourceRef: true,
                reviewedAt: true,
                aiSystemId: true,
                aiSystem: { select: { name: true } },
              },
              orderBy: { reviewedAt: "desc" },
              take: input.limit,
            })
          : [],
      ]);

      const items = [
        ...risks.map((r) => ({
          entityType: "RiskClassification" as const,
          id: r.id,
          label: r.aiSystem.name,
          summary: r.riskLevel,
          provenance: r.provenance,
          sourceRef: r.sourceRef,
          at: r.classifiedAt,
          href: `/governance/ai-registry/${r.aiSystemId}`,
        })),
        ...mappings.map((m) => ({
          entityType: "ComplianceMapping" as const,
          id: m.id,
          label: `${m.requirement.code} — ${m.requirement.title}`,
          summary: m.status,
          provenance: m.provenance,
          sourceRef: m.sourceRef ?? m.evidence?.slice(0, 160) ?? null,
          at: m.updatedAt,
          href: `/governance/compliance?systemId=${m.aiSystemId}`,
        })),
        ...gates.map((g) => ({
          entityType: "OversightGate" as const,
          id: g.id,
          label: `${g.aiSystem.name} — ${g.gateType}`,
          summary: g.status,
          provenance: g.provenance,
          sourceRef: g.sourceRef,
          at: g.updatedAt,
          href: `/governance/oversight/${g.id}`,
        })),
        ...policies.map((p) => ({
          entityType: "AIPolicy" as const,
          id: p.id,
          label: p.title,
          summary: `${p.type} · ${p.status}`,
          provenance: p.provenance,
          sourceRef: p.sourceRef,
          at: p.updatedAt,
          href: `/governance/policies/${p.id}`,
        })),
        ...profiles.map((t) => ({
          entityType: "TransparencyProfile" as const,
          id: t.id,
          label: t.aiSystem.name,
          summary: "Art. 50",
          provenance: t.provenance,
          sourceRef: t.sourceRef,
          at: t.reviewedAt,
          href: `/governance/ai-registry/${t.aiSystemId}`,
        })),
      ].sort((a, b) => b.at.getTime() - a.at.getTime());

      // Cursor is a composite "entityType:id" so paging is stable across the
      // merged, date-ordered list.
      const startIndex = input.cursor
        ? items.findIndex((i) => `${i.entityType}:${i.id}` === input.cursor) + 1
        : 0;
      const page = items.slice(startIndex, startIndex + input.limit);
      const last = page[page.length - 1];

      return {
        items: page,
        nextCursor:
          startIndex + input.limit < items.length && last
            ? `${last.entityType}:${last.id}`
            : null,
      };
    }),

  /** Org-wide assurance percentage, class-weighted. Readable by any member. */
  getConfirmationSummary: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const counts = await getConfirmationCounts(ctx.prisma, ctx.organization.id);
      return computeConfirmationSummary(counts);
    }),

  /** Take human ownership of auto-derived artifacts. */
  confirm: orgWriteProcedure.input(itemsInput).mutation(async ({ ctx, input }) => {
    if (!APPROVER_ROLES.includes(ctx.membership.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Only owners, admins, and AI officers can confirm auto-assessed artifacts",
      });
    }

    const now = new Date();
    const grouped = groupByEntity(input.items);
    let confirmed = 0;

    for (const [entityType, ids] of grouped) {
      const delegate = delegateFor(
        ctx.prisma as unknown as Record<string, unknown>,
        entityType,
      );
      const result = await delegate.updateMany({
        where: { id: { in: ids }, organizationId: ctx.organization.id },
        data: { confirmedBy: ctx.session.user.id, confirmedAt: now },
      });
      // A short count means an id was not in this organization: refuse the
      // whole request rather than silently confirming a subset.
      if (result.count !== ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `One or more ${entityType} items were not found in this organization`,
        });
      }
      confirmed += result.count;
    }

    await ctx.prisma.auditLog.createMany({
      data: input.items.map((item) => ({
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        entityType: item.entityType,
        entityId: item.id,
        action: "CONFIRM",
        changes: { confirmedAt: now.toISOString() },
        metadata: { source: "provenance-review" },
      })),
    });

    return { confirmed };
  }),

  /** Withdraw confirmation (e.g. confirmed in error). */
  unconfirm: orgWriteProcedure.input(itemsInput).mutation(async ({ ctx, input }) => {
    if (!APPROVER_ROLES.includes(ctx.membership.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Only owners, admins, and AI officers can withdraw confirmation",
      });
    }

    const grouped = groupByEntity(input.items);
    let unconfirmed = 0;

    for (const [entityType, ids] of grouped) {
      const delegate = delegateFor(
        ctx.prisma as unknown as Record<string, unknown>,
        entityType,
      );
      const result = await delegate.updateMany({
        where: { id: { in: ids }, organizationId: ctx.organization.id },
        data: { confirmedBy: null, confirmedAt: null },
      });
      if (result.count !== ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `One or more ${entityType} items were not found in this organization`,
        });
      }
      unconfirmed += result.count;
    }

    await ctx.prisma.auditLog.createMany({
      data: input.items.map((item) => ({
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        entityType: item.entityType,
        entityId: item.id,
        action: "UNCONFIRM",
        changes: {},
        metadata: { source: "provenance-review" },
      })),
    });

    return { unconfirmed };
  }),
});

export type { ConfirmableEntity, ArtifactClass };
export { ARTIFACT_CLASSES, CONFIRMABLE_ENTITIES };
