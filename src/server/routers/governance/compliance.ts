// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure, publicProcedure } from "../../trpc";
import { buildScopeFilter } from "@/lib/applicability-scope";

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

  /**
   * In-scope requirement counts per framework, for the framework tabs.
   *
   * `listFrameworks` is a public procedure and reports every seeded row, which
   * is right for the framework itself and wrong for a tab label: a framework
   * whose applicability is scoped (California ADMT) would advertise ~50
   * requirements to an organization none of them reach. Frameworks whose rows
   * carry no applicability tags keep their full count, so nothing changes for
   * the EU AI Act, NIST or ISO.
   */
  getFrameworkCounts: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        /**
         * Omitted and empty mean different things, and the difference is the
         * whole point. Omitted = the caller is not scoping (or cannot yet:
         * the rules layer has not resolved), so report every row. Empty =
         * the rules layer resolved and nothing tagged is in scope, so report
         * only the untagged rows. Collapsing the two would let an
         * undetermined scope render as a confident zero.
         */
        applicabilityTags: z.array(z.string()).optional(),
        /**
         * The framework those tags govern. Applicability tags are specific to
         * one regime — California's mean nothing to the EU AI Act — so without
         * this a future tagged framework would be scoped by a foreign
         * vocabulary, match nothing, and silently report zero.
         */
        scopedFrameworkCode: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const frameworks = await ctx.prisma.complianceFramework.findMany({
        select: { id: true, code: true },
      });

      const counts = await Promise.all(
        frameworks.map(async (fw) => {
          // Scoping applies only to the framework the tags belong to; every
          // other framework reports its full size, exactly as before.
          const scoped = input.scopedFrameworkCode === undefined
            || input.scopedFrameworkCode === fw.code;

          if (!scoped || input.applicabilityTags === undefined) {
            return {
              frameworkId: fw.id,
              code: fw.code,
              count: await ctx.prisma.complianceRequirement.count({
                where: { frameworkId: fw.id },
              }),
            };
          }

          // Counted in memory rather than with `hasSome`, so it agrees with
          // getMatrix: both must use the same selector-tag semantics.
          const rows = await ctx.prisma.complianceRequirement.findMany({
            where: { frameworkId: fw.id },
            select: { applicabilityTags: true },
          });

          const inScope = buildScopeFilter(input.applicabilityTags);
          return {
            frameworkId: fw.id,
            code: fw.code,
            count: rows.filter(inScope).length,
          };
        })
      );

      return counts;
    }),

  getMatrix: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        frameworkId: z.string(),
        /**
         * Applicability tags from the rules layer (currently the California
         * ADMT resolver). When present, only requirements carrying at least one
         * of these tags are returned — without it the ADMT tab would show every
         * seeded row for every system regardless of scope.
         *
         * Untagged requirements are always returned: they belong to frameworks
         * that scope by risk tier instead, and filtering them out here would
         * empty the EU AI Act matrix.
         */
        applicabilityTags: z.array(z.string()).optional(),
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

      // Scope filtering runs in memory rather than in the `where`, because the
      // children arrive through a relation include that a top-level `where`
      // does not reach: filtering only the parents would return a scoped parent
      // with all of its out-of-scope children attached.
      const inScope = buildScopeFilter(input.applicabilityTags);

      const scoped = requirements
        .map((req) => ({ ...req, children: req.children.filter(inScope) }))
        // A parent survives if it is itself in scope or still has a child that
        // is — dropping it would strand the child.
        .filter((req) => inScope(req) || req.children.length > 0);

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
      const topLevel = scoped.filter((r) => !r.parentId);

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
      // The unique key (aiSystemId, requirementId) is not org-scoped —
      // verify the system belongs to this organization before upserting,
      // or a crafted aiSystemId could write into another org's mapping.
      const ownedSystem = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!ownedSystem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

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
          // A human editing an artifact IS confirming it. Provenance keeps its
          // historical origin: it records where the row came from, not who
          // vouches for it now.
          confirmedBy: ctx.session.user.id,
          confirmedAt: new Date(),
        },
        create: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          requirementId: input.requirementId,
          status: input.status,
          notes: input.notes,
          assessedBy: ctx.session.user.id,
          assessedAt: new Date(),
          confirmedBy: ctx.session.user.id,
          confirmedAt: new Date(),
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

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ComplianceMapping",
          entityId: mapping.id,
          action: "UPDATE",
          changes: { status: input.status, propagatedCount },
        },
      });

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
      // Same org-scoping guard as updateMapping: the unique key is not
      // org-scoped, so verify system ownership first.
      const ownedSystem = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!ownedSystem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

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

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ComplianceEvidence",
          entityId: evidence.id,
          action: "CREATE",
          changes: { type: input.type, title: input.title },
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

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ComplianceEvidence",
          entityId: input.evidenceId,
          action: "DELETE",
          changes: { title: evidence.title },
        },
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
