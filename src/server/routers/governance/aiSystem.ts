import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const aiSystemRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        status: z.enum(["DRAFT", "DEVELOPMENT", "TESTING", "DEPLOYED", "RETIRED"]).optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        organizationId: ctx.organization.id,
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { description: { contains: input.search, mode: "insensitive" as const } },
            { purpose: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
        ...(input.status && { status: input.status }),
      };

      const items = await ctx.prisma.aISystem.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
        include: {
          riskClassification: { select: { riskLevel: true } },
          _count: { select: { models: true, dataSources: true, assessments: true } },
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
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          vendor: { select: { id: true, name: true, riskLevel: true, status: true, website: true, contractExpiryDate: true } },
          models: true,
          dataSources: true,
          riskClassification: { include: { history: { orderBy: { changedAt: "desc" } } } },
          assessments: {
            include: { template: { select: { name: true, type: true } } },
            orderBy: { updatedAt: "desc" },
          },
          oversightGates: { orderBy: { createdAt: "desc" } },
          _count: { select: { complianceMappings: true } },
        },
      });

      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      return system;
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        technique: z.enum(["MACHINE_LEARNING", "DEEP_LEARNING", "GENERATIVE_AI", "AGENTIC_AI", "NLP", "COMPUTER_VISION", "SPEECH_RECOGNITION", "ROBOTICS", "RULE_BASED", "EXPERT_SYSTEM", "STATISTICAL", "OTHER"]),
        role: z.enum(["PROVIDER", "DEPLOYER", "IMPORTER", "DISTRIBUTOR", "USER"]),
        status: z.enum(["DRAFT", "DEVELOPMENT", "TESTING", "DEPLOYED", "RETIRED"]).default("DRAFT"),
        purpose: z.string().optional(),
        businessOwner: z.string().optional(),
        technicalOwner: z.string().optional(),
        processesPersonalData: z.boolean().default(false),
        dpoCentralVendorId: z.string().optional(),
        dpoCentralAssetIds: z.array(z.string()).optional(),
        vendorId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.create({
        data: {
          organizationId: ctx.organization.id,
          name: input.name,
          description: input.description,
          technique: input.technique,
          role: input.role,
          status: input.status,
          purpose: input.purpose,
          businessOwner: input.businessOwner,
          technicalOwner: input.technicalOwner,
          processesPersonalData: input.processesPersonalData,
          dpoCentralVendorId: input.dpoCentralVendorId,
          dpoCentralAssetIds: input.dpoCentralAssetIds ?? [],
          vendorId: input.vendorId || undefined,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AISystem",
          entityId: system.id,
          action: "CREATE",
          changes: { name: input.name },
        },
      });

      return system;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        technique: z.enum(["MACHINE_LEARNING", "DEEP_LEARNING", "GENERATIVE_AI", "AGENTIC_AI", "NLP", "COMPUTER_VISION", "SPEECH_RECOGNITION", "ROBOTICS", "RULE_BASED", "EXPERT_SYSTEM", "STATISTICAL", "OTHER"]).optional(),
        role: z.enum(["PROVIDER", "DEPLOYER", "IMPORTER", "DISTRIBUTOR", "USER"]).optional(),
        status: z.enum(["DRAFT", "DEVELOPMENT", "TESTING", "DEPLOYED", "RETIRED"]).optional(),
        purpose: z.string().optional(),
        businessOwner: z.string().optional(),
        technicalOwner: z.string().optional(),
        processesPersonalData: z.boolean().optional(),
        deploymentDate: z.date().optional(),
        retirementDate: z.date().optional(),
        vendorId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input;

      const system = await ctx.prisma.aISystem.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: data as never,
      });

      if (system.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AISystem",
          entityId: id,
          action: "UPDATE",
          changes: data,
        },
      });

      return ctx.prisma.aISystem.findFirst({ where: { id, organizationId: ctx.organization.id } });
    }),

  delete: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.aISystem.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AISystem",
          entityId: input.id,
          action: "DELETE",
        },
      });

      return { success: true };
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [total, draft, deployed, retired] = await Promise.all([
        ctx.prisma.aISystem.count({ where: { organizationId: ctx.organization.id } }),
        ctx.prisma.aISystem.count({ where: { organizationId: ctx.organization.id, status: "DRAFT" } }),
        ctx.prisma.aISystem.count({ where: { organizationId: ctx.organization.id, status: "DEPLOYED" } }),
        ctx.prisma.aISystem.count({ where: { organizationId: ctx.organization.id, status: "RETIRED" } }),
      ]);

      return { total, draft, deployed, retired };
    }),
});
