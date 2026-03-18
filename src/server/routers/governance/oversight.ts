import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const oversightRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        gateType: z.string().optional(),
        status: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        organizationId: ctx.organization.id,
        ...(input.search && {
          OR: [
            { description: { contains: input.search, mode: "insensitive" as const } },
            { aiSystem: { name: { contains: input.search, mode: "insensitive" as const } } },
            { assignedTo: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
        ...(input.gateType && { gateType: input.gateType as never }),
        ...(input.status && { status: input.status as never }),
      };

      const items = await ctx.prisma.oversightGate.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
        include: {
          aiSystem: { select: { id: true, name: true, status: true } },
          _count: { select: { decisions: true } },
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
      const gate = await ctx.prisma.oversightGate.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          aiSystem: { select: { id: true, name: true, status: true } },
          decisions: {
            orderBy: { decidedAt: "desc" },
          },
        },
      });

      if (!gate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Oversight gate not found" });
      }

      return gate;
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        gateType: z.string(),
        description: z.string().optional(),
        reviewCadence: z.string().optional(),
        nextReviewDate: z.string().optional(),
        assignedTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gate = await ctx.prisma.oversightGate.create({
        data: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          gateType: input.gateType as never,
          description: input.description,
          reviewCadence: input.reviewCadence,
          nextReviewDate: input.nextReviewDate ? new Date(input.nextReviewDate) : undefined,
          assignedTo: input.assignedTo,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "OversightGate",
          entityId: gate.id,
          action: "CREATE",
          changes: { gateType: input.gateType, aiSystemId: input.aiSystemId },
        },
      });

      return gate;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        status: z.string().optional(),
        description: z.string().optional(),
        reviewCadence: z.string().optional(),
        nextReviewDate: z.string().nullable().optional(),
        assignedTo: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.reviewCadence !== undefined) updateData.reviewCadence = data.reviewCadence;
      if (data.nextReviewDate !== undefined) {
        updateData.nextReviewDate = data.nextReviewDate ? new Date(data.nextReviewDate) : null;
      }
      if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

      const result = await ctx.prisma.oversightGate.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: updateData as never,
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Oversight gate not found" });
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "OversightGate",
          entityId: id,
          action: "UPDATE",
          changes: updateData as Record<string, string | number | boolean | null>,
        },
      });

      return ctx.prisma.oversightGate.findUnique({ where: { id } });
    }),

  addDecision: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        gateId: z.string(),
        decision: z.enum(["APPROVE", "REJECT", "DEFER"]),
        rationale: z.string().min(1),
        evidenceReviewed: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // RBAC: OWNER, ADMIN, AI_OFFICER
      if (!["OWNER", "ADMIN", "AI_OFFICER"].includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins, and AI officers can make oversight decisions",
        });
      }

      const gate = await ctx.prisma.oversightGate.findFirst({
        where: { id: input.gateId, organizationId: ctx.organization.id },
      });

      if (!gate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Oversight gate not found" });
      }

      const decision = await ctx.prisma.oversightDecision.create({
        data: {
          gateId: input.gateId,
          organizationId: ctx.organization.id,
          decision: input.decision as never,
          rationale: input.rationale,
          evidenceReviewed: input.evidenceReviewed,
          decidedBy: ctx.session.user.id,
        },
      });

      // Auto-update gate status based on decision
      const statusMap: Record<string, string> = {
        APPROVE: "PASSED",
        REJECT: "FAILED",
        DEFER: "DEFERRED",
      };

      const updateData: Record<string, unknown> = {
        status: statusMap[input.decision],
      };

      // Auto-advance nextReviewDate for periodic gates
      if (input.decision === "APPROVE" && gate.gateType === "PERIODIC_REVIEW" && gate.reviewCadence && gate.nextReviewDate) {
        const next = new Date(gate.nextReviewDate);
        const cadence = gate.reviewCadence.toLowerCase();
        if (cadence.includes("month")) {
          const months = parseInt(cadence) || 3;
          next.setMonth(next.getMonth() + months);
        } else if (cadence.includes("quarter")) {
          next.setMonth(next.getMonth() + 3);
        } else if (cadence.includes("year") || cadence.includes("annual")) {
          next.setFullYear(next.getFullYear() + 1);
        } else {
          // Default: advance 3 months
          next.setMonth(next.getMonth() + 3);
        }
        updateData.nextReviewDate = next;
        // Reset status to PENDING for next cycle
        updateData.status = "PENDING";
      }

      await ctx.prisma.oversightGate.update({
        where: { id: input.gateId },
        data: updateData as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "OversightDecision",
          entityId: decision.id,
          action: input.decision,
          changes: { gateId: input.gateId, rationale: input.rationale },
        },
      });

      return decision;
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [pending, inReview, passed, failed, overdue] = await Promise.all([
        ctx.prisma.oversightGate.count({
          where: { organizationId: ctx.organization.id, status: "PENDING" },
        }),
        ctx.prisma.oversightGate.count({
          where: { organizationId: ctx.organization.id, status: "IN_REVIEW" },
        }),
        ctx.prisma.oversightGate.count({
          where: { organizationId: ctx.organization.id, status: "PASSED" },
        }),
        ctx.prisma.oversightGate.count({
          where: { organizationId: ctx.organization.id, status: "FAILED" },
        }),
        ctx.prisma.oversightGate.count({
          where: {
            organizationId: ctx.organization.id,
            status: { in: ["PENDING", "IN_REVIEW"] },
            nextReviewDate: { lt: new Date() },
          },
        }),
      ]);

      return { pending, inReview, passed, failed, overdue, total: pending + inReview + passed + failed };
    }),
});
