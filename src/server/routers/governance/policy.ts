// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const policyRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        type: z.enum(["AI_USAGE", "AI_GOVERNANCE", "AI_ETHICS", "AI_RISK_MANAGEMENT", "AI_DATA_GOVERNANCE", "AI_PROCUREMENT", "AI_INCIDENT_RESPONSE", "AI_TRANSPARENCY", "CUSTOM"]).optional(),
        status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]).optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        organizationId: ctx.organization.id,
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            { description: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
      };

      const items = await ctx.prisma.aIPolicy.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { versions: true, systemLinks: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          versions: { orderBy: { version: "desc" } },
          systemLinks: {
            include: {
              aiSystem: { select: { id: true, name: true, status: true } },
            },
          },
        },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      return policy;
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        title: z.string().min(1).max(300),
        type: z.enum(["AI_USAGE", "AI_GOVERNANCE", "AI_ETHICS", "AI_RISK_MANAGEMENT", "AI_DATA_GOVERNANCE", "AI_PROCUREMENT", "AI_INCIDENT_RESPONSE", "AI_TRANSPARENCY", "CUSTOM"]),
        description: z.string().optional(),
        content: z.string().optional(),
        effectiveDate: z.string().optional(),
        reviewDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.prisma.aIPolicy.create({
        data: {
          organizationId: ctx.organization.id,
          title: input.title,
          type: input.type,
          description: input.description,
          content: input.content,
          effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
          reviewDate: input.reviewDate ? new Date(input.reviewDate) : undefined,
          createdBy: ctx.session.user.id,
        },
      });

      // Auto-create version 1
      if (input.content) {
        await ctx.prisma.aIPolicyVersion.create({
          data: {
            policyId: policy.id,
            version: 1,
            content: input.content,
            changeNotes: "Initial version",
            createdBy: ctx.session.user.id,
          },
        });
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: policy.id,
          action: "CREATE",
          changes: { title: input.title, type: input.type },
        },
      });

      return policy;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        title: z.string().min(1).max(300).optional(),
        description: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        effectiveDate: z.string().nullable().optional(),
        reviewDate: z.string().nullable().optional(),
        status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.effectiveDate !== undefined) {
        updateData.effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : null;
      }
      if (data.reviewDate !== undefined) {
        updateData.reviewDate = data.reviewDate ? new Date(data.reviewDate) : null;
      }

      const result = await ctx.prisma.aIPolicy.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: updateData as never,
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: id,
          action: "UPDATE",
          changes: updateData as Record<string, string | number | boolean | null>,
        },
      });

      return ctx.prisma.aIPolicy.findFirst({ where: { id, organizationId: ctx.organization.id } });
    }),

  publishVersion: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        changeNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // RBAC: OWNER, ADMIN, AI_OFFICER
      if (!["OWNER", "ADMIN", "AI_OFFICER"].includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins, and AI officers can publish policy versions",
        });
      }

      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      if (!policy.content) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Policy has no content to publish" });
      }

      const newVersion = policy.currentVersion + 1;

      // Create version record
      await ctx.prisma.aIPolicyVersion.create({
        data: {
          policyId: policy.id,
          version: newVersion,
          content: policy.content,
          changeNotes: input.changeNotes,
          createdBy: ctx.session.user.id,
        },
      });

      // Update policy
      const updated = await ctx.prisma.aIPolicy.update({
        where: { id: policy.id },
        data: {
          currentVersion: newVersion,
          status: "PUBLISHED",
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: policy.id,
          action: "PUBLISH",
          changes: { version: newVersion, changeNotes: input.changeNotes },
        },
      });

      return updated;
    }),

  approve: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // RBAC: OWNER, ADMIN, AI_OFFICER
      if (!["OWNER", "ADMIN", "AI_OFFICER"].includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins, and AI officers can approve policies",
        });
      }

      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      const updated = await ctx.prisma.aIPolicy.update({
        where: { id: policy.id },
        data: {
          status: "APPROVED",
          approvedBy: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: policy.id,
          action: "APPROVE",
          changes: { status: "APPROVED" },
        },
      });

      return updated;
    }),

  linkSystem: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        policyId: z.string(),
        aiSystemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify both policy and system belong to this organization
      const [policy, system] = await Promise.all([
        ctx.prisma.aIPolicy.findFirst({
          where: { id: input.policyId, organizationId: ctx.organization.id },
          select: { id: true },
        }),
        ctx.prisma.aISystem.findFirst({
          where: { id: input.aiSystemId, organizationId: ctx.organization.id },
          select: { id: true },
        }),
      ]);

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      return ctx.prisma.aIPolicySystemLink.create({
        data: {
          policyId: input.policyId,
          aiSystemId: input.aiSystemId,
        },
      });
    }),

  unlinkSystem: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        policyId: z.string(),
        aiSystemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the policy belongs to this organization
      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.policyId, organizationId: ctx.organization.id },
        select: { id: true },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      return ctx.prisma.aIPolicySystemLink.deleteMany({
        where: {
          policyId: input.policyId,
          aiSystemId: input.aiSystemId,
        },
      });
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [total, draft, published, archived, reviewDue] = await Promise.all([
        ctx.prisma.aIPolicy.count({
          where: { organizationId: ctx.organization.id },
        }),
        ctx.prisma.aIPolicy.count({
          where: { organizationId: ctx.organization.id, status: "DRAFT" },
        }),
        ctx.prisma.aIPolicy.count({
          where: { organizationId: ctx.organization.id, status: "PUBLISHED" },
        }),
        ctx.prisma.aIPolicy.count({
          where: { organizationId: ctx.organization.id, status: "ARCHIVED" },
        }),
        ctx.prisma.aIPolicy.count({
          where: {
            organizationId: ctx.organization.id,
            reviewDate: { lte: thirtyDaysFromNow, gte: now },
            status: { not: "ARCHIVED" },
          },
        }),
      ]);

      return { total, draft, published, archived, reviewDue };
    }),
});
