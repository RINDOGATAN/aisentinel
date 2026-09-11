// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Audit router — reading the organisation's own audit trail.
 *
 * The trail was always written; until now nothing could read it beyond the ten
 * most recent rows on the dashboard. A record that cannot be produced is not a
 * record: counsel answering a discovery request, and a regulator asking who
 * changed what and when, both need the whole trail, filtered and exportable.
 *
 * RBAC: reading the trail shows who did what, which is personal data about
 * colleagues, so it is restricted to OWNER / ADMIN / AI_OFFICER rather than
 * open to every member. There is deliberately no write path of any kind: audit
 * entries are appended by the mutations that cause them and never edited here.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure } from "../../trpc";

/** Seeing who did what is restricted; it is a record about people. */
const READER_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

/** One page. The UI pages with a cursor rather than offering a bigger page. */
const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

const filterInput = z.object({
  organizationId: z.string(),
  entityType: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  userId: z.string().optional(),
  /** Inclusive lower bound on createdAt. */
  from: z.date().optional(),
  /** Inclusive upper bound on createdAt. */
  to: z.date().optional(),
});

function assertReader(role: string) {
  if (!READER_ROLES.includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Reading the audit trail requires an owner, admin or AI officer role.",
    });
  }
}

/** Shared where-clause builder so the list and the facets never diverge. */
export function auditWhere(
  organizationId: string,
  f: { entityType?: string; action?: string; userId?: string; from?: Date; to?: Date },
) {
  return {
    organizationId,
    ...(f.entityType ? { entityType: f.entityType } : {}),
    ...(f.action ? { action: f.action } : {}),
    ...(f.userId ? { userId: f.userId } : {}),
    ...(f.from || f.to
      ? {
          createdAt: {
            ...(f.from ? { gte: f.from } : {}),
            ...(f.to ? { lte: f.to } : {}),
          },
        }
      : {}),
  };
}

export const auditRouter = createTRPCRouter({
  /**
   * One page of the trail, newest first. Cursor paging rather than offset: the
   * trail grows while it is being read, and an offset would skip or repeat rows.
   */
  list: organizationProcedure
    .input(
      filterInput.extend({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertReader(ctx.membership.role);
      const take = input.limit ?? PAGE_SIZE;

      const rows = await ctx.prisma.auditLog.findMany({
        where: auditWhere(ctx.organization.id, input),
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      const hasMore = rows.length > take;
      const page = hasMore ? rows.slice(0, take) : rows;

      return {
        entries: page.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          changes: r.changes,
          metadata: r.metadata,
          createdAt: r.createdAt,
          // The user relation is SetNull on delete, so an entry can outlive its
          // actor. Say so rather than showing an empty column.
          actorId: r.userId,
          actorName: r.user?.name ?? null,
          actorEmail: r.user?.email ?? null,
        })),
        nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
      };
    }),

  /**
   * The distinct values present in this organisation's trail, so the filters
   * offer what actually exists rather than a hard-coded list that drifts.
   */
  facets: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      assertReader(ctx.membership.role);
      const where = { organizationId: ctx.organization.id };

      const [actions, entityTypes, actors, total, oldest] = await Promise.all([
        ctx.prisma.auditLog.groupBy({
          by: ["action"],
          where,
          _count: { action: true },
          orderBy: { _count: { action: "desc" } },
          take: 100,
        }),
        ctx.prisma.auditLog.groupBy({
          by: ["entityType"],
          where,
          _count: { entityType: true },
          orderBy: { _count: { entityType: "desc" } },
          take: 100,
        }),
        ctx.prisma.auditLog.findMany({
          where,
          distinct: ["userId"],
          select: { userId: true, user: { select: { name: true, email: true } } },
          take: 100,
        }),
        ctx.prisma.auditLog.count({ where }),
        ctx.prisma.auditLog.findFirst({
          where,
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
      ]);

      return {
        actions: actions.map((a) => ({ value: a.action, count: a._count.action })),
        entityTypes: entityTypes.map((e) => ({
          value: e.entityType,
          count: e._count.entityType,
        })),
        actors: actors
          .filter((a) => a.userId)
          .map((a) => ({
            id: a.userId as string,
            name: a.user?.name ?? null,
            email: a.user?.email ?? null,
          })),
        total,
        earliest: oldest?.createdAt ?? null,
      };
    }),
});
