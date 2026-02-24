import { z } from "zod";
import { createTRPCRouter, organizationProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { hasShadowAiAccess } from "@/server/services/licensing/entitlement";
import type { ShadowAIStatus } from "@prisma/client";

async function assertShadowAiAccess(organizationId: string) {
  if (!(await hasShadowAiAccess(organizationId)))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Shadow AI Discovery requires a premium license",
    });
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  DISCOVERED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "PROHIBITED"],
  APPROVED: ["REGISTERED"],
  PROHIBITED: [],
  REGISTERED: [],
};

export const shadowAiRouter = createTRPCRouter({
  checkAccess: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return hasShadowAiAccess(ctx.organization.id);
    }),

  listTools: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        category: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertShadowAiAccess(ctx.organization.id);

      const where = {
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { vendor: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
        ...(input.category && { category: input.category }),
      };

      const items = await ctx.prisma.shadowAITool.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { name: "asc" },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  listReports: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        status: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertShadowAiAccess(ctx.organization.id);

      const where = {
        organizationId: ctx.organization.id,
        ...(input.search && {
          toolName: { contains: input.search, mode: "insensitive" as const },
        }),
        ...(input.status && { status: input.status as ShadowAIStatus }),
      };

      const items = await ctx.prisma.shadowAIReport.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: { tool: true },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  getReportById: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertShadowAiAccess(ctx.organization.id);

      const report = await ctx.prisma.shadowAIReport.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: { tool: true },
      });

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      return report;
    }),

  createReport: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        toolId: z.string().optional(),
        toolName: z.string().min(1).max(200),
        department: z.string().optional(),
        usageDescription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertShadowAiAccess(ctx.organization.id);

      const report = await ctx.prisma.shadowAIReport.create({
        data: {
          organizationId: ctx.organization.id,
          toolId: input.toolId || null,
          toolName: input.toolName,
          status: "DISCOVERED",
          reportedBy: ctx.session.user.id,
          department: input.department || null,
          usageDescription: input.usageDescription || null,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ShadowAIReport",
          entityId: report.id,
          action: "CREATE",
          changes: { toolName: input.toolName },
        },
      });

      return report;
    }),

  updateReport: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        status: z.string().optional(),
        department: z.string().nullable().optional(),
        usageDescription: z.string().nullable().optional(),
        registeredSystemId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertShadowAiAccess(ctx.organization.id);

      const existing = await ctx.prisma.shadowAIReport.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      // Validate status transition
      if (input.status) {
        const allowed = VALID_TRANSITIONS[existing.status] ?? [];
        if (!allowed.includes(input.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot transition from ${existing.status} to ${input.status}`,
          });
        }

        if (input.status === "REGISTERED" && !input.registeredSystemId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "registeredSystemId is required when registering a tool",
          });
        }
      }

      const updateData: Record<string, unknown> = {};
      if (input.status !== undefined) updateData.status = input.status;
      if (input.department !== undefined) updateData.department = input.department;
      if (input.usageDescription !== undefined) updateData.usageDescription = input.usageDescription;
      if (input.registeredSystemId !== undefined) updateData.registeredSystemId = input.registeredSystemId;

      const updated = await ctx.prisma.shadowAIReport.update({
        where: { id: input.id },
        data: updateData as never,
        include: { tool: true },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ShadowAIReport",
          entityId: input.id,
          action: "UPDATE",
          changes: updateData as Record<string, string | number | boolean | null>,
        },
      });

      return updated;
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      await assertShadowAiAccess(ctx.organization.id);

      const [total, discovered, underReview, approved, prohibited] =
        await Promise.all([
          ctx.prisma.shadowAIReport.count({
            where: { organizationId: ctx.organization.id },
          }),
          ctx.prisma.shadowAIReport.count({
            where: { organizationId: ctx.organization.id, status: "DISCOVERED" },
          }),
          ctx.prisma.shadowAIReport.count({
            where: { organizationId: ctx.organization.id, status: "UNDER_REVIEW" },
          }),
          ctx.prisma.shadowAIReport.count({
            where: { organizationId: ctx.organization.id, status: "APPROVED" },
          }),
          ctx.prisma.shadowAIReport.count({
            where: { organizationId: ctx.organization.id, status: "PROHIBITED" },
          }),
        ]);

      return { total, discovered, underReview, approved, prohibited };
    }),
});
