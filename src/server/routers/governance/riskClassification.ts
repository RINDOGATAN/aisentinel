import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";

export const riskClassificationRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        riskLevel: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const systems = await ctx.prisma.aISystem.findMany({
        where: {
          organizationId: ctx.organization.id,
          ...(input.search && {
            name: { contains: input.search, mode: "insensitive" },
          }),
        },
        include: {
          riskClassification: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (input.riskLevel) {
        return systems.filter(
          (s) => s.riskClassification?.riskLevel === input.riskLevel
        );
      }

      return systems;
    }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.riskClassification.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
        include: {
          aiSystem: true,
          history: { orderBy: { changedAt: "desc" } },
        },
      });
    }),

  classify: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        riskLevel: z.enum(["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"]),
        rationale: z.string().min(1),
        annexIIICategory: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the AI system belongs to this organization
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      const existing = await ctx.prisma.riskClassification.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
      });

      if (existing) {
        // Create history entry
        await ctx.prisma.riskClassificationHistory.create({
          data: {
            riskClassificationId: existing.id,
            previousLevel: existing.riskLevel,
            newLevel: input.riskLevel,
            rationale: input.rationale,
            changedBy: ctx.session.user.id,
          },
        });

        // Update classification
        const updated = await ctx.prisma.riskClassification.update({
          where: { id: existing.id },
          data: {
            riskLevel: input.riskLevel,
            rationale: input.rationale,
            annexIIICategory: input.annexIIICategory,
            classifiedBy: ctx.session.user.id,
            classifiedAt: new Date(),
          },
          include: { aiSystem: true },
        });

        // Auto-generate compliance mappings for any new applicable requirements
        const applicableRequirements = await ctx.prisma.complianceRequirement.findMany({
          where: { applicableTo: { has: input.riskLevel } },
          select: { id: true },
        });

        const complianceMappingsCreated = applicableRequirements.length > 0
          ? (await ctx.prisma.complianceMapping.createMany({
              data: applicableRequirements.map((req) => ({
                organizationId: ctx.organization.id,
                aiSystemId: input.aiSystemId,
                requirementId: req.id,
                status: "NOT_ASSESSED" as const,
              })),
              skipDuplicates: true,
            })).count
          : 0;

        return { ...updated, complianceMappingsCreated };
      }

      // Create new classification
      const classification = await ctx.prisma.riskClassification.create({
        data: {
          aiSystemId: input.aiSystemId,
          organizationId: ctx.organization.id,
          riskLevel: input.riskLevel,
          rationale: input.rationale,
          annexIIICategory: input.annexIIICategory,
          classifiedBy: ctx.session.user.id,
        },
        include: { aiSystem: true },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "RiskClassification",
          entityId: classification.id,
          action: "CREATE",
          changes: { riskLevel: input.riskLevel, aiSystemId: input.aiSystemId },
        },
      });

      // Auto-generate compliance mappings for applicable requirements
      const applicableRequirements = await ctx.prisma.complianceRequirement.findMany({
        where: { applicableTo: { has: input.riskLevel } },
        select: { id: true },
      });

      const complianceMappingsCreated = applicableRequirements.length > 0
        ? (await ctx.prisma.complianceMapping.createMany({
            data: applicableRequirements.map((req) => ({
              organizationId: ctx.organization.id,
              aiSystemId: input.aiSystemId,
              requirementId: req.id,
              status: "NOT_ASSESSED" as const,
            })),
            skipDuplicates: true,
          })).count
        : 0;

      return { ...classification, complianceMappingsCreated };
    }),

  getHistory: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const classification = await ctx.prisma.riskClassification.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
      });

      if (!classification) return [];

      return ctx.prisma.riskClassificationHistory.findMany({
        where: { riskClassificationId: classification.id },
        orderBy: { changedAt: "desc" },
      });
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [unacceptable, high, limited, minimal, unclassified] = await Promise.all([
        ctx.prisma.riskClassification.count({
          where: { organizationId: ctx.organization.id, riskLevel: "UNACCEPTABLE" },
        }),
        ctx.prisma.riskClassification.count({
          where: { organizationId: ctx.organization.id, riskLevel: "HIGH" },
        }),
        ctx.prisma.riskClassification.count({
          where: { organizationId: ctx.organization.id, riskLevel: "LIMITED" },
        }),
        ctx.prisma.riskClassification.count({
          where: { organizationId: ctx.organization.id, riskLevel: "MINIMAL" },
        }),
        ctx.prisma.aISystem.count({
          where: {
            organizationId: ctx.organization.id,
            riskClassification: null,
          },
        }),
      ]);

      return { unacceptable, high, limited, minimal, unclassified };
    }),
});
