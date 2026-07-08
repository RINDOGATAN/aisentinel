// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

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
          incidents: {
            select: { id: true, title: true, type: true, severity: true, status: true, reportedAt: true },
            orderBy: { reportedAt: "desc" as const },
            take: 20,
          },
          policyLinks: {
            include: { policy: { select: { id: true, title: true, type: true, status: true, currentVersion: true } } },
            orderBy: { policy: { updatedAt: "desc" as const } },
          },
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

  addModel: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        name: z.string().min(1).max(200),
        provider: z.string().optional(),
        modelType: z.string().optional(),
        version: z.string().optional(),
        trainingDataSummary: z.string().optional(),
        knownLimitations: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
      });
      if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });

      const model = await ctx.prisma.aIModel.create({
        data: {
          aiSystemId: input.aiSystemId,
          organizationId: ctx.organization.id,
          name: input.name,
          provider: input.provider,
          modelType: input.modelType,
          version: input.version,
          trainingDataSummary: input.trainingDataSummary,
          knownLimitations: input.knownLimitations,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIModel",
          entityId: model.id,
          action: "CREATE",
          changes: { name: input.name, aiSystemId: input.aiSystemId },
        },
      });

      return model;
    }),

  updateModel: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        modelId: z.string(),
        name: z.string().min(1).max(200).optional(),
        provider: z.string().optional(),
        modelType: z.string().optional(),
        version: z.string().optional(),
        trainingDataSummary: z.string().optional(),
        knownLimitations: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { modelId, organizationId, ...data } = input;
      const result = await ctx.prisma.aIModel.updateMany({
        where: { id: modelId, organizationId: ctx.organization.id },
        data: data as never,
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Model not found" });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIModel",
          entityId: modelId,
          action: "UPDATE",
          changes: data,
        },
      });

      return ctx.prisma.aIModel.findFirst({ where: { id: modelId, organizationId: ctx.organization.id } });
    }),

  deleteModel: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), modelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.aIModel.deleteMany({
        where: { id: input.modelId, organizationId: ctx.organization.id },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Model not found" });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIModel",
          entityId: input.modelId,
          action: "DELETE",
        },
      });

      return { success: true };
    }),

  addDataSource: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        name: z.string().min(1).max(200),
        sourceType: z.enum(["TRAINING", "FINE_TUNING", "VALIDATION", "INPUT", "OUTPUT"]),
        description: z.string().optional(),
        containsPersonalData: z.boolean().default(false),
        dataCategories: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
      });
      if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });

      const ds = await ctx.prisma.aISystemDataSource.create({
        data: {
          aiSystemId: input.aiSystemId,
          organizationId: ctx.organization.id,
          name: input.name,
          sourceType: input.sourceType,
          description: input.description,
          containsPersonalData: input.containsPersonalData,
          dataCategories: input.dataCategories,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AISystemDataSource",
          entityId: ds.id,
          action: "CREATE",
          changes: { name: input.name, aiSystemId: input.aiSystemId },
        },
      });

      return ds;
    }),

  updateDataSource: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        dataSourceId: z.string(),
        name: z.string().min(1).max(200).optional(),
        sourceType: z.enum(["TRAINING", "FINE_TUNING", "VALIDATION", "INPUT", "OUTPUT"]).optional(),
        description: z.string().optional(),
        containsPersonalData: z.boolean().optional(),
        dataCategories: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { dataSourceId, organizationId, ...data } = input;
      const result = await ctx.prisma.aISystemDataSource.updateMany({
        where: { id: dataSourceId, organizationId: ctx.organization.id },
        data: data as never,
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Data source not found" });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AISystemDataSource",
          entityId: dataSourceId,
          action: "UPDATE",
          changes: data,
        },
      });

      return ctx.prisma.aISystemDataSource.findFirst({ where: { id: dataSourceId, organizationId: ctx.organization.id } });
    }),

  deleteDataSource: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), dataSourceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.aISystemDataSource.deleteMany({
        where: { id: input.dataSourceId, organizationId: ctx.organization.id },
      });
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Data source not found" });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AISystemDataSource",
          entityId: input.dataSourceId,
          action: "DELETE",
        },
      });

      return { success: true };
    }),
});
