// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { createTRPCRouter, protectedProcedure } from "../../trpc";

const MAX_CLIENT_ORGS = 50;

export const clientsRouter = createTRPCRouter({
  listClients: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get all orgs this user belongs to (capped for safety)
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      take: MAX_CLIENT_ORGS,
      orderBy: { organization: { name: "asc" } },
    });

    // Fetch stats for each org in parallel, with per-org error isolation
    const clients = await Promise.all(
      memberships.map(async (membership) => {
        const orgId = membership.organizationId;
        const base = {
          organizationId: orgId,
          organizationName: membership.organization.name,
          organizationSlug: membership.organization.slug,
          role: membership.role,
        };

        try {
          const [
            activeAssessments,
            openIncidents,
            highRiskSystems,
            activeVendors,
            pendingGates,
            lastLog,
          ] = await Promise.all([
            ctx.prisma.aIAssessment.count({
              where: {
                organizationId: orgId,
                status: { in: ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW"] },
              },
            }),
            ctx.prisma.aIIncident.count({
              where: {
                organizationId: orgId,
                status: { in: ["REPORTED", "INVESTIGATING", "MITIGATING"] },
              },
            }),
            ctx.prisma.riskClassification.count({
              where: {
                organizationId: orgId,
                riskLevel: { in: ["HIGH", "UNACCEPTABLE"] },
              },
            }),
            ctx.prisma.aIVendor.count({
              where: {
                organizationId: orgId,
                status: "ACTIVE",
              },
            }),
            ctx.prisma.oversightGate.count({
              where: {
                organizationId: orgId,
                status: "PENDING",
              },
            }),
            ctx.prisma.auditLog.findFirst({
              where: { organizationId: orgId },
              orderBy: { createdAt: "desc" },
              select: { createdAt: true },
            }),
          ]);

          return {
            ...base,
            activeAssessments,
            openIncidents,
            highRiskSystems,
            activeVendors,
            pendingGates,
            lastActivity: lastLog?.createdAt ?? null,
            needsAttention: openIncidents > 0 || pendingGates > 0,
          };
        } catch (error) {
          console.error(`Failed to fetch stats for org ${orgId}:`, error);
          return {
            ...base,
            activeAssessments: 0,
            openIncidents: 0,
            highRiskSystems: 0,
            activeVendors: 0,
            pendingGates: 0,
            lastActivity: null,
            needsAttention: false,
          };
        }
      })
    );

    return clients;
  }),
});
