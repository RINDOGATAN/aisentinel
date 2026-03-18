import { z } from "zod";
import { createTRPCRouter, protectedProcedure, organizationProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { OrganizationRole } from "@prisma/client";

export const organizationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                aiSystems: true,
                assessments: true,
                incidents: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organization.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          _count: {
            select: {
              aiSystems: true,
              assessments: true,
              incidents: true,
              complianceMappings: true,
            },
          },
        },
      });

      return {
        ...org,
        currentUserRole: ctx.membership.role,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
        domain: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.organization.findUnique({
        where: { slug: input.slug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An organization with this slug already exists",
        });
      }

      const organization = await ctx.prisma.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
          domain: input.domain,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: OrganizationRole.OWNER,
            },
          },
        },
        include: { members: true },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: ctx.session.user.id,
          entityType: "Organization",
          entityId: organization.id,
          action: "CREATE",
          changes: { name: input.name, slug: input.slug },
        },
      });

      return organization;
    }),

  addMember: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email(),
        role: z.nativeEnum(OrganizationRole).default(OrganizationRole.MEMBER),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["OWNER", "ADMIN"].includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to add members",
        });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with this email. They must sign up first.",
        });
      }

      const existingMembership = await ctx.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: ctx.organization.id,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user is already a member of the organization",
        });
      }

      const membership = await ctx.prisma.organizationMember.create({
        data: {
          organizationId: ctx.organization.id,
          userId: user.id,
          role: input.role,
          invitedEmail: input.email,
          invitedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      return membership;
    }),

  updateMember: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
        role: z.nativeEnum(OrganizationRole),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can change member roles",
        });
      }

      // Verify member belongs to this organization
      const member = await ctx.prisma.organizationMember.findFirst({
        where: { id: input.memberId, organizationId: ctx.organization.id },
      });
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this organization" });
      }

      return ctx.prisma.organizationMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  removeMember: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["OWNER", "ADMIN"].includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to remove members",
        });
      }

      const memberToRemove = await ctx.prisma.organizationMember.findFirst({
        where: { id: input.memberId, organizationId: ctx.organization.id },
      });

      if (!memberToRemove) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      if (memberToRemove.role === "OWNER") {
        const ownerCount = await ctx.prisma.organizationMember.count({
          where: { organizationId: ctx.organization.id, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last owner of an organization",
          });
        }
      }

      await ctx.prisma.organizationMember.delete({ where: { id: input.memberId } });
      return { success: true };
    }),

  getDashboardStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const orgId = ctx.organization.id;

      const [
        totalSystems,
        deployedSystems,
        highRiskSystems,
        activeAssessments,
        recentAuditLogs,
        // Risk posture
        riskUnacceptable,
        riskHigh,
        riskLimited,
        riskMinimal,
        // Incidents
        totalIncidents,
        criticalIncidents,
        openIncidents,
        // Oversight
        pendingGates,
        overdueGates,
        // Assessment pipeline
        assessmentDraft,
        assessmentInProgress,
        assessmentUnderReview,
        assessmentApproved,
        // Compliance summary
        complianceCompliant,
        compliancePartial,
        complianceNonCompliant,
        complianceNotAssessed,
        // Quickstart
        importedVendorCount,
      ] = await Promise.all([
        ctx.prisma.aISystem.count({ where: { organizationId: orgId } }),
        ctx.prisma.aISystem.count({ where: { organizationId: orgId, status: "DEPLOYED" } }),
        ctx.prisma.riskClassification.count({
          where: { organizationId: orgId, riskLevel: { in: ["HIGH", "UNACCEPTABLE"] } },
        }),
        ctx.prisma.aIAssessment.count({
          where: { organizationId: orgId, status: { in: ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW"] } },
        }),
        ctx.prisma.auditLog.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { name: true, email: true } } },
        }),
        // Risk posture counts
        ctx.prisma.riskClassification.count({ where: { organizationId: orgId, riskLevel: "UNACCEPTABLE" } }),
        ctx.prisma.riskClassification.count({ where: { organizationId: orgId, riskLevel: "HIGH" } }),
        ctx.prisma.riskClassification.count({ where: { organizationId: orgId, riskLevel: "LIMITED" } }),
        ctx.prisma.riskClassification.count({ where: { organizationId: orgId, riskLevel: "MINIMAL" } }),
        // Incidents
        ctx.prisma.aIIncident.count({ where: { organizationId: orgId } }),
        ctx.prisma.aIIncident.count({ where: { organizationId: orgId, severity: "CRITICAL" } }),
        ctx.prisma.aIIncident.count({
          where: { organizationId: orgId, status: { in: ["REPORTED", "INVESTIGATING", "MITIGATING"] } },
        }),
        // Oversight
        ctx.prisma.oversightGate.count({ where: { organizationId: orgId, status: "PENDING" } }),
        ctx.prisma.oversightGate.count({
          where: {
            organizationId: orgId,
            status: { in: ["PENDING", "IN_REVIEW"] },
            nextReviewDate: { lt: new Date() },
          },
        }),
        // Assessment pipeline
        ctx.prisma.aIAssessment.count({ where: { organizationId: orgId, status: "DRAFT" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: orgId, status: "IN_PROGRESS" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: orgId, status: "UNDER_REVIEW" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: orgId, status: "APPROVED" } }),
        // Compliance summary
        ctx.prisma.complianceMapping.count({ where: { organizationId: orgId, status: "COMPLIANT" } }),
        ctx.prisma.complianceMapping.count({ where: { organizationId: orgId, status: "PARTIALLY_COMPLIANT" } }),
        ctx.prisma.complianceMapping.count({ where: { organizationId: orgId, status: "NON_COMPLIANT" } }),
        ctx.prisma.complianceMapping.count({ where: { organizationId: orgId, status: "NOT_ASSESSED" } }),
        // Quickstart: count vendors imported from VW
        ctx.prisma.aIVendor.count({
          where: {
            organizationId: orgId,
            metadata: { path: ["importedFrom"], equals: "vendorwatch" },
          },
        }),
      ]);

      return {
        totalSystems,
        deployedSystems,
        highRiskSystems,
        activeAssessments,
        recentAuditLogs,
        riskPosture: {
          unacceptable: riskUnacceptable,
          high: riskHigh,
          limited: riskLimited,
          minimal: riskMinimal,
        },
        incidents: {
          total: totalIncidents,
          critical: criticalIncidents,
          open: openIncidents,
        },
        oversight: {
          pending: pendingGates,
          overdue: overdueGates,
        },
        assessmentPipeline: {
          draft: assessmentDraft,
          inProgress: assessmentInProgress,
          underReview: assessmentUnderReview,
          approved: assessmentApproved,
        },
        complianceSummary: {
          compliant: complianceCompliant,
          partial: compliancePartial,
          nonCompliant: complianceNonCompliant,
          notAssessed: complianceNotAssessed,
        },
        importedVendorCount,
      };
    }),
});
