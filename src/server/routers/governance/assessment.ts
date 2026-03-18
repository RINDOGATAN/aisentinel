import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { checkAssessmentEntitlement, getEntitledAssessmentTypes } from "@/server/services/licensing/entitlement";

export const assessmentRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        type: z.enum(["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"]).optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
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
          ],
        }),
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
      };

      const items = await ctx.prisma.aIAssessment.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
        include: {
          template: { select: { name: true, type: true } },
          aiSystem: { select: { id: true, name: true } },
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
      const assessment = await ctx.prisma.aIAssessment.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          template: true,
          aiSystem: { select: { id: true, name: true, status: true } },
        },
      });

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      return assessment;
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        templateId: z.string(),
        title: z.string().min(1),
        type: z.enum(["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check entitlement for premium types
      const entitlementResult = await checkAssessmentEntitlement(
        ctx.organization.id,
        input.type
      );

      if (!entitlementResult.entitled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: entitlementResult.reason || "You do not have access to this assessment type",
        });
      }

      const assessment = await ctx.prisma.aIAssessment.create({
        data: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          templateId: input.templateId,
          title: input.title,
          type: input.type,
          createdBy: ctx.session.user.id,
          responses: {},
        },
        include: {
          template: true,
          aiSystem: { select: { id: true, name: true } },
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIAssessment",
          entityId: assessment.id,
          action: "CREATE",
          changes: { title: input.title, type: input.type },
        },
      });

      return assessment;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        title: z.string().optional(),
        responses: z.record(z.string(), z.any()).optional(),
        mitigations: z.record(z.string(), z.any()).optional(),
        riskScore: z.number().optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input;

      const assessment = await ctx.prisma.aIAssessment.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: data as never,
      });

      if (assessment.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      return ctx.prisma.aIAssessment.findUnique({
        where: { id },
        include: {
          template: true,
          aiSystem: { select: { id: true, name: true } },
        },
      });
    }),

  submit: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.aIAssessment.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id },
        data: { status: "UNDER_REVIEW" },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      return ctx.prisma.aIAssessment.findUnique({
        where: { id: input.id },
        include: {
          template: true,
          aiSystem: { select: { id: true, name: true } },
        },
      });
    }),

  processApproval: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        decision: z.enum(["APPROVED", "REJECTED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["OWNER", "ADMIN", "AI_OFFICER"].includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve assessments",
        });
      }

      return ctx.prisma.aIAssessment.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id },
        data: {
          status: input.decision,
          ...(input.decision === "APPROVED"
            ? { approvedBy: ctx.session.user.id, approvedAt: new Date() }
            : { reviewedBy: ctx.session.user.id, reviewedAt: new Date() }),
        },
      });
    }),

  listTemplates: organizationProcedure
    .input(z.object({ organizationId: z.string(), type: z.enum(["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.aIAssessmentTemplate.findMany({
        where: {
          OR: [
            { organizationId: ctx.organization.id },
            { isSystem: true },
          ],
          ...(input.type && { type: input.type }),
        },
        orderBy: { name: "asc" },
      });
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [total, draft, inProgress, underReview, approved] = await Promise.all([
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id, status: "DRAFT" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id, status: "IN_PROGRESS" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id, status: "UNDER_REVIEW" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id, status: "APPROVED" } }),
      ]);

      return { total, draft, inProgress, underReview, approved };
    }),

  getEntitledTypes: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return getEntitledAssessmentTypes(ctx.organization.id);
    }),
});
