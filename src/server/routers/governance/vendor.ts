import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const vendorRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
        status: z.enum(["ACTIVE", "UNDER_REVIEW", "APPROVED", "SUSPENDED", "TERMINATED"]).optional(),
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
            { contactName: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
        ...(input.riskLevel && { riskLevel: input.riskLevel }),
        ...(input.status && { status: input.status }),
      };

      const items = await ctx.prisma.aIVendor.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { assessments: true, systems: true } },
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
      const vendor = await ctx.prisma.aIVendor.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          catalogEntry: true,
          assessments: { orderBy: { createdAt: "desc" } },
          systems: {
            select: { id: true, name: true, status: true, technique: true },
            orderBy: { name: "asc" },
          },
        },
      });

      if (!vendor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
      }

      return vendor;
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(200),
        website: z.string().optional(),
        description: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().optional(),
        riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
        status: z.enum(["ACTIVE", "UNDER_REVIEW", "APPROVED", "SUSPENDED", "TERMINATED"]).default("UNDER_REVIEW"),
        contractStartDate: z.string().optional(),
        contractExpiryDate: z.string().optional(),
        dpoCentralVendorId: z.string().optional(),
        notes: z.string().optional(),
        catalogSlug: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vendor = await ctx.prisma.aIVendor.create({
        data: {
          organizationId: ctx.organization.id,
          name: input.name,
          website: input.website,
          description: input.description,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          riskLevel: input.riskLevel ?? undefined,
          status: input.status,
          contractStartDate: input.contractStartDate ? new Date(input.contractStartDate) : undefined,
          contractExpiryDate: input.contractExpiryDate ? new Date(input.contractExpiryDate) : undefined,
          dpoCentralVendorId: input.dpoCentralVendorId,
          notes: input.notes,
          catalogSlug: input.catalogSlug,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIVendor",
          entityId: vendor.id,
          action: "CREATE",
          changes: { name: input.name },
        },
      });

      return vendor;
    }),

  createWithSystem: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        // vendor fields
        name: z.string().min(1).max(200),
        website: z.string().optional(),
        description: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().optional(),
        riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
        status: z.enum(["ACTIVE", "UNDER_REVIEW", "APPROVED", "SUSPENDED", "TERMINATED"]).default("UNDER_REVIEW"),
        contractStartDate: z.string().optional(),
        contractExpiryDate: z.string().optional(),
        dpoCentralVendorId: z.string().optional(),
        notes: z.string().optional(),
        catalogSlug: z.string().optional(),
        // optional AI system creation
        createSystem: z.boolean().default(false),
        systemName: z.string().optional(),
        systemRole: z.string().optional(),
        systemTechnique: z.string().optional(),
        systemPurpose: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async (tx) => {
        const vendor = await tx.aIVendor.create({
          data: {
            organizationId: ctx.organization.id,
            name: input.name,
            website: input.website,
            description: input.description,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            riskLevel: input.riskLevel ?? undefined,
            status: input.status,
            contractStartDate: input.contractStartDate ? new Date(input.contractStartDate) : undefined,
            contractExpiryDate: input.contractExpiryDate ? new Date(input.contractExpiryDate) : undefined,
            dpoCentralVendorId: input.dpoCentralVendorId,
            notes: input.notes,
            catalogSlug: input.catalogSlug,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: ctx.organization.id,
            userId: ctx.session.user.id,
            entityType: "AIVendor",
            entityId: vendor.id,
            action: "CREATE",
            changes: { name: input.name },
          },
        });

        let system = null;
        if (input.createSystem && input.systemName) {
          system = await tx.aISystem.create({
            data: {
              organizationId: ctx.organization.id,
              name: input.systemName,
              technique: (input.systemTechnique || "OTHER") as never,
              role: (input.systemRole || "DEPLOYER") as never,
              status: "DRAFT" as never,
              purpose: input.systemPurpose,
              vendorId: vendor.id,
            },
          });

          await tx.auditLog.create({
            data: {
              organizationId: ctx.organization.id,
              userId: ctx.session.user.id,
              entityType: "AISystem",
              entityId: system.id,
              action: "CREATE",
              changes: { name: input.systemName, vendorId: vendor.id },
            },
          });
        }

        return { vendor, system };
      });

      return result;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        website: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        contactName: z.string().nullable().optional(),
        contactEmail: z.string().nullable().optional(),
        riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).nullable().optional(),
        status: z.enum(["ACTIVE", "UNDER_REVIEW", "APPROVED", "SUSPENDED", "TERMINATED"]).optional(),
        contractStartDate: z.string().nullable().optional(),
        contractExpiryDate: z.string().nullable().optional(),
        dpoCentralVendorId: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input;

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        if (key === "contractStartDate" || key === "contractExpiryDate") {
          updateData[key] = value ? new Date(value as string) : null;
        } else {
          updateData[key] = value;
        }
      }

      const result = await ctx.prisma.aIVendor.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: updateData as never,
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIVendor",
          entityId: id,
          action: "UPDATE",
          changes: updateData as Record<string, string | number | boolean | null>,
        },
      });

      return ctx.prisma.aIVendor.findFirst({ where: { id, organizationId: ctx.organization.id } });
    }),

  delete: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.aIVendor.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIVendor",
          entityId: input.id,
          action: "DELETE",
        },
      });

      return { success: true };
    }),

  createAssessment: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        vendorId: z.string(),
        title: z.string().min(1),
        responses: z.record(z.string(), z.any()).optional(),
        findings: z.string().optional(),
        nextReviewDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vendor = await ctx.prisma.aIVendor.findFirst({
        where: { id: input.vendorId, organizationId: ctx.organization.id },
      });

      if (!vendor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
      }

      const assessment = await ctx.prisma.aIVendorAssessment.create({
        data: {
          vendorId: input.vendorId,
          organizationId: ctx.organization.id,
          title: input.title,
          responses: (input.responses as Record<string, string>) ?? undefined,
          findings: input.findings,
          nextReviewDate: input.nextReviewDate ? new Date(input.nextReviewDate) : undefined,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIVendorAssessment",
          entityId: assessment.id,
          action: "CREATE",
          changes: { title: input.title, vendorId: input.vendorId },
        },
      });

      return assessment;
    }),

  updateAssessment: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        assessmentId: z.string(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "EXPIRED"]).optional(),
        riskScore: z.number().optional(),
        responses: z.record(z.string(), z.any()).optional(),
        findings: z.string().nullable().optional(),
        nextReviewDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.prisma.aIVendorAssessment.findFirst({
        where: { id: input.assessmentId, organizationId: ctx.organization.id },
      });

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      const updateData: Record<string, unknown> = {};
      if (input.status !== undefined) updateData.status = input.status;
      if (input.riskScore !== undefined) updateData.riskScore = input.riskScore;
      if (input.responses !== undefined) updateData.responses = input.responses;
      if (input.findings !== undefined) updateData.findings = input.findings;
      if (input.nextReviewDate !== undefined) {
        updateData.nextReviewDate = input.nextReviewDate ? new Date(input.nextReviewDate) : null;
      }

      if (input.status === "COMPLETED" && assessment.status !== "COMPLETED") {
        updateData.completedBy = ctx.session.user.id;
        updateData.completedAt = new Date();
      }

      const updated = await ctx.prisma.aIVendorAssessment.update({
        where: { id: input.assessmentId },
        data: updateData as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIVendorAssessment",
          entityId: input.assessmentId,
          action: "UPDATE",
          changes: updateData as Record<string, string | number | boolean | null>,
        },
      });

      return updated;
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const now = new Date();
      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const [total, critical, highRisk, expiringSoon] = await Promise.all([
        ctx.prisma.aIVendor.count({
          where: { organizationId: ctx.organization.id },
        }),
        ctx.prisma.aIVendor.count({
          where: { organizationId: ctx.organization.id, riskLevel: "CRITICAL" },
        }),
        ctx.prisma.aIVendor.count({
          where: { organizationId: ctx.organization.id, riskLevel: "HIGH" },
        }),
        ctx.prisma.aIVendor.count({
          where: {
            organizationId: ctx.organization.id,
            contractExpiryDate: { lte: ninetyDaysFromNow, gte: now },
            status: { not: "TERMINATED" },
          },
        }),
      ]);

      return { total, critical, highRisk, expiringSoon };
    }),
});
