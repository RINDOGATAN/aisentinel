// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure, publicProcedure } from "../../trpc";

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

  getCrossMappedRequirements: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        requirementId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const mappings = await ctx.prisma.crossFrameworkMapping.findMany({
        where: {
          OR: [
            { requirementAId: input.requirementId },
            { requirementBId: input.requirementId },
          ],
        },
        include: {
          requirementA: { include: { framework: true } },
          requirementB: { include: { framework: true } },
        },
      });

      return mappings.map((m) => {
        const isA = m.requirementAId === input.requirementId;
        const linked = isA ? m.requirementB : m.requirementA;
        return {
          id: m.id,
          relationship: m.relationship,
          notes: m.notes,
          requirementId: linked.id,
          code: linked.code,
          title: linked.title,
          frameworkName: linked.framework.name,
          frameworkCode: linked.framework.code,
        };
      });
    }),

  updateMapping: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        requirementId: z.string(),
        status: z.enum(["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT", "NOT_APPLICABLE", "NOT_ASSESSED"]),
        notes: z.string().optional(),
        propagateToLinked: z.boolean().optional().default(false),
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

      let propagatedCount = 0;

      if (
        input.propagateToLinked &&
        (input.status === "COMPLIANT" || input.status === "PARTIALLY_COMPLIANT")
      ) {
        const crossMappings = await ctx.prisma.crossFrameworkMapping.findMany({
          where: {
            OR: [
              { requirementAId: input.requirementId },
              { requirementBId: input.requirementId },
            ],
            relationship: "equivalent",
          },
        });

        const linkedReqIds = crossMappings.map((m) =>
          m.requirementAId === input.requirementId ? m.requirementBId : m.requirementAId
        );

        for (const linkedReqId of linkedReqIds) {
          const existing = await ctx.prisma.complianceMapping.findUnique({
            where: {
              aiSystemId_requirementId: {
                aiSystemId: input.aiSystemId,
                requirementId: linkedReqId,
              },
            },
          });

          if (!existing || existing.status === "NOT_ASSESSED") {
            await ctx.prisma.complianceMapping.upsert({
              where: {
                aiSystemId_requirementId: {
                  aiSystemId: input.aiSystemId,
                  requirementId: linkedReqId,
                },
              },
              update: {
                status: input.status,
                notes: input.notes
                  ? `[Propagated] ${input.notes}`
                  : "[Propagated from cross-framework mapping]",
                assessedBy: ctx.session.user.id,
                assessedAt: new Date(),
              },
              create: {
                organizationId: ctx.organization.id,
                aiSystemId: input.aiSystemId,
                requirementId: linkedReqId,
                status: input.status,
                notes: input.notes
                  ? `[Propagated] ${input.notes}`
                  : "[Propagated from cross-framework mapping]",
                assessedBy: ctx.session.user.id,
                assessedAt: new Date(),
              },
            });
            propagatedCount++;
          }
        }
      }

      return { ...mapping, propagatedCount };
    }),

  addEvidence: orgWriteProcedure
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

  removeEvidence: orgWriteProcedure
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

  getSystemScorecard: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const mappings = await ctx.prisma.complianceMapping.findMany({
        where: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
        },
        select: {
          status: true,
          requirement: {
            select: {
              code: true,
              title: true,
              framework: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      });

      // Group by framework
      const byFramework = new Map<
        string,
        {
          frameworkId: string;
          frameworkName: string;
          frameworkCode: string;
          compliant: number;
          partial: number;
          nonCompliant: number;
          notApplicable: number;
          notAssessed: number;
          gaps: { code: string; title: string; status: string }[];
        }
      >();

      for (const m of mappings) {
        const fw = m.requirement.framework;
        if (!byFramework.has(fw.id)) {
          byFramework.set(fw.id, {
            frameworkId: fw.id,
            frameworkName: fw.name,
            frameworkCode: fw.code,
            compliant: 0,
            partial: 0,
            nonCompliant: 0,
            notApplicable: 0,
            notAssessed: 0,
            gaps: [],
          });
        }
        const entry = byFramework.get(fw.id)!;
        switch (m.status) {
          case "COMPLIANT":
            entry.compliant++;
            break;
          case "PARTIALLY_COMPLIANT":
            entry.partial++;
            break;
          case "NON_COMPLIANT":
            entry.nonCompliant++;
            entry.gaps.push({
              code: m.requirement.code,
              title: m.requirement.title,
              status: m.status,
            });
            break;
          case "NOT_APPLICABLE":
            entry.notApplicable++;
            break;
          case "NOT_ASSESSED":
            entry.notAssessed++;
            entry.gaps.push({
              code: m.requirement.code,
              title: m.requirement.title,
              status: m.status,
            });
            break;
        }
      }

      // Sort gaps: NON_COMPLIANT first, then NOT_ASSESSED, limit to top 5 per framework
      const frameworks = Array.from(byFramework.values()).map((fw) => {
        const statusOrder: Record<string, number> = { NON_COMPLIANT: 0, NOT_ASSESSED: 1 };
        fw.gaps.sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2));
        fw.gaps = fw.gaps.slice(0, 5);
        return fw;
      });

      // Overall stats
      const total = mappings.length;
      const totalCompliant = mappings.filter((m) => m.status === "COMPLIANT").length;
      const totalPartial = mappings.filter((m) => m.status === "PARTIALLY_COMPLIANT").length;
      const totalNonCompliant = mappings.filter((m) => m.status === "NON_COMPLIANT").length;
      const totalNotApplicable = mappings.filter((m) => m.status === "NOT_APPLICABLE").length;
      const assessed = total - mappings.filter((m) => m.status === "NOT_ASSESSED").length - totalNotApplicable;
      const compliancePercent =
        assessed > 0 ? Math.round(((totalCompliant + totalPartial) / assessed) * 100) : 0;

      return {
        total,
        totalCompliant,
        totalPartial,
        totalNonCompliant,
        totalNotApplicable,
        assessed,
        compliancePercent,
        frameworks,
      };
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
