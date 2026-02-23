import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, publicProcedure } from "../../trpc";

export const complianceRouter = createTRPCRouter({
  listFrameworks: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.complianceFramework.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { requirements: true } },
      },
    });
  }),

  listRequirements: publicProcedure
    .input(
      z.object({
        frameworkId: z.string(),
        parentId: z.string().optional().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.complianceRequirement.findMany({
        where: {
          frameworkId: input.frameworkId,
          parentId: input.parentId ?? null,
        },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { children: true } },
        },
      });
    }),

  getMatrix: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        frameworkId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const requirements = await ctx.prisma.complianceRequirement.findMany({
        where: { frameworkId: input.frameworkId },
        orderBy: { sortOrder: "asc" },
        include: {
          children: { orderBy: { sortOrder: "asc" } },
        },
      });

      const mappings = await ctx.prisma.complianceMapping.findMany({
        where: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          requirement: { frameworkId: input.frameworkId },
        },
        include: {
          evidenceItems: { orderBy: { addedAt: "desc" } },
        },
      });

      const mappingMap = new Map(mappings.map((m) => [m.requirementId, m]));

      // Build hierarchical structure
      const topLevel = requirements.filter((r) => !r.parentId);

      return topLevel.map((req) => ({
        ...req,
        mapping: mappingMap.get(req.id) ?? null,
        children: req.children.map((child) => ({
          ...child,
          mapping: mappingMap.get(child.id) ?? null,
        })),
      }));
    }),

  updateMapping: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        requirementId: z.string(),
        status: z.enum(["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT", "NOT_APPLICABLE", "NOT_ASSESSED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mapping = await ctx.prisma.complianceMapping.upsert({
        where: {
          aiSystemId_requirementId: {
            aiSystemId: input.aiSystemId,
            requirementId: input.requirementId,
          },
        },
        update: {
          status: input.status,
          notes: input.notes,
          assessedBy: ctx.session.user.id,
          assessedAt: new Date(),
        },
        create: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          requirementId: input.requirementId,
          status: input.status,
          notes: input.notes,
          assessedBy: ctx.session.user.id,
          assessedAt: new Date(),
        },
        include: { evidenceItems: true },
      });

      return mapping;
    }),

  addEvidence: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        requirementId: z.string(),
        type: z.enum(["POLICY", "DOCUMENT", "TEST_RESULT", "MONITORING", "AUDIT", "TRAINING", "APPROVAL", "OTHER"]),
        title: z.string().min(1),
        url: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert the mapping first (create with NOT_ASSESSED if it doesn't exist)
      const mapping = await ctx.prisma.complianceMapping.upsert({
        where: {
          aiSystemId_requirementId: {
            aiSystemId: input.aiSystemId,
            requirementId: input.requirementId,
          },
        },
        update: {},
        create: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          requirementId: input.requirementId,
          status: "NOT_ASSESSED",
        },
      });

      const evidence = await ctx.prisma.complianceEvidence.create({
        data: {
          complianceMappingId: mapping.id,
          organizationId: ctx.organization.id,
          type: input.type,
          title: input.title,
          url: input.url,
          description: input.description,
          addedBy: ctx.session.user.id,
        },
      });

      return evidence;
    }),

  removeEvidence: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        evidenceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const evidence = await ctx.prisma.complianceEvidence.findFirst({
        where: {
          id: input.evidenceId,
          organizationId: ctx.organization.id,
        },
      });

      if (!evidence) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evidence item not found" });
      }

      await ctx.prisma.complianceEvidence.delete({
        where: { id: input.evidenceId },
      });

      return { success: true };
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where = {
        organizationId: ctx.organization.id,
        ...(input.aiSystemId && { aiSystemId: input.aiSystemId }),
      };

      const [compliant, partial, nonCompliant, notApplicable, notAssessed] = await Promise.all([
        ctx.prisma.complianceMapping.count({ where: { ...where, status: "COMPLIANT" } }),
        ctx.prisma.complianceMapping.count({ where: { ...where, status: "PARTIALLY_COMPLIANT" } }),
        ctx.prisma.complianceMapping.count({ where: { ...where, status: "NON_COMPLIANT" } }),
        ctx.prisma.complianceMapping.count({ where: { ...where, status: "NOT_APPLICABLE" } }),
        ctx.prisma.complianceMapping.count({ where: { ...where, status: "NOT_ASSESSED" } }),
      ]);

      return { compliant, partial, nonCompliant, notApplicable, notAssessed };
    }),
});
