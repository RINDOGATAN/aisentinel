import { z } from "zod";
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
        evidence: z.string().optional(),
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
          evidence: input.evidence,
          notes: input.notes,
          assessedBy: ctx.session.user.id,
          assessedAt: new Date(),
        },
        create: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          requirementId: input.requirementId,
          status: input.status,
          evidence: input.evidence,
          notes: input.notes,
          assessedBy: ctx.session.user.id,
          assessedAt: new Date(),
        },
      });

      return mapping;
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
