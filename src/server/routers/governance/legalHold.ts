// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Legal holds: placing them, releasing them, and seeing what is in force.
 *
 * Placing a hold is a decision taken on counsel's instruction, so it is
 * restricted to owners, admins and AI officers, and both placing and releasing
 * require a written reason. A release with no reason is the thing that reads
 * worst two years later.
 *
 * Reading is open to every member: anyone who might try to delete something
 * should be able to see that a hold exists and why.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";

const HOLD_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

function assertMayHold(role: string) {
  if (!HOLD_ROLES.includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Placing or releasing a legal hold requires an owner, admin or AI officer role.",
    });
  }
}

export const legalHoldRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        includeReleased: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.legalHold.findMany({
        where: {
          organizationId: ctx.organization.id,
          ...(input.includeReleased ? {} : { releasedAt: null }),
        },
        orderBy: [{ releasedAt: "asc" }, { issuedAt: "desc" }],
        include: { aiSystem: { select: { id: true, name: true } } },
      });

      const actorIds = [
        ...new Set(rows.flatMap((r) => [r.issuedBy, r.releasedBy].filter(Boolean) as string[])),
      ];
      const actors = await ctx.prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      });
      const byId = new Map(actors.map((a) => [a.id, a.name ?? a.email]));

      return rows.map((r) => ({
        ...r,
        issuedByName: byId.get(r.issuedBy) ?? null,
        releasedByName: r.releasedBy ? (byId.get(r.releasedBy) ?? null) : null,
      }));
    }),

  place: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        matter: z.string().min(1).max(200),
        reason: z.string().min(1).max(4000),
        aiSystemId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertMayHold(ctx.membership.role);

      if (input.aiSystemId) {
        const system = await ctx.prisma.aISystem.findFirst({
          where: { id: input.aiSystemId, organizationId: ctx.organization.id },
          select: { id: true },
        });
        if (!system) {
          throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
        }
      }

      const created = await ctx.prisma.legalHold.create({
        data: {
          organizationId: ctx.organization.id,
          matter: input.matter,
          reason: input.reason,
          aiSystemId: input.aiSystemId,
          issuedBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "LegalHold",
          entityId: created.id,
          action: "PLACE_LEGAL_HOLD",
          changes: {
            matter: input.matter,
            scope: input.aiSystemId ? "system" : "organization",
            aiSystemId: input.aiSystemId ?? null,
          },
        },
      });

      return created;
    }),

  release: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        releaseReason: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertMayHold(ctx.membership.role);

      const hold = await ctx.prisma.legalHold.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, matter: true, releasedAt: true },
      });
      if (!hold) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Legal hold not found" });
      }
      if (hold.releasedAt) {
        throw new TRPCError({ code: "CONFLICT", message: "This hold is already released" });
      }

      await ctx.prisma.legalHold.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id },
        data: {
          releasedBy: ctx.session.user.id,
          releasedAt: new Date(),
          releaseReason: input.releaseReason,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "LegalHold",
          entityId: input.id,
          action: "RELEASE_LEGAL_HOLD",
          changes: { matter: hold.matter, reason: input.releaseReason },
        },
      });

      return { released: true };
    }),
});
