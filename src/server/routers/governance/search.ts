// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One search box across the program, over record NAMES only: AI systems,
 * vendors, policies, assessments, oversight gates (found by their system's
 * name), incidents and unapproved AI tools. Never descriptions, answers or
 * notes.
 *
 * Scope, enforced here and not only on the screen:
 * - the organization: every query carries `organizationId` of the caller's
 *   membership (organizationProcedure);
 * - departments: a member limited to departments finds only the systems of
 *   those departments, as the registry does (services/business-units/scope.ts),
 *   and only the assessments, gates and incidents tied to those systems
 *   (an incident tied to no system stays findable);
 * - unapproved AI tools: searched only where the organization has access to
 *   the module, as its own pages require.
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, organizationProcedure } from "../../trpc";
import {
  businessUnitScopeWhere,
  loadBusinessUnitScope,
} from "../../services/business-units/scope";
import { hasShadowAiAccess } from "@/server/services/licensing/entitlement";

/** Most results per kind of record. */
export const SEARCH_PER_KIND = 5;

export type SearchKind = "system" | "vendor" | "policy" | "assessment" | "gate" | "incident" | "shadowAi";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  name: string;
  /** For a gate: its type (PRE_DEPLOYMENT, ...), shown before the system's name. */
  detail?: string;
  href: string;
}

export const searchRouter = createTRPCRouter({
  names: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        q: z.string().trim().min(2).max(100),
      })
    )
    .query(async ({ ctx, input }): Promise<SearchHit[]> => {
      const organizationId = ctx.organization.id;
      const contains = { contains: input.q, mode: "insensitive" as const };
      const take = SEARCH_PER_KIND;

      const scope = await loadBusinessUnitScope(ctx.prisma, ctx.membership.id);
      const dept = businessUnitScopeWhere(scope);
      const systemScope: Prisma.AISystemWhereInput = dept ?? {};
      const linked = dept ? { aiSystem: dept } : {};

      const shadowOn = await hasShadowAiAccess(organizationId).catch(() => false);

      const [systems, vendors, policies, assessments, gates, incidents, tools] = await Promise.all([
        ctx.prisma.aISystem.findMany({
          where: { organizationId, ...systemScope, name: contains },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take,
        }),
        ctx.prisma.aIVendor.findMany({
          where: { organizationId, name: contains },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take,
        }),
        ctx.prisma.aIPolicy.findMany({
          where: { organizationId, title: contains },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
          take,
        }),
        ctx.prisma.aIAssessment.findMany({
          where: { organizationId, ...linked, title: contains },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
          take,
        }),
        ctx.prisma.oversightGate.findMany({
          where: { organizationId, aiSystem: { ...systemScope, name: contains } },
          select: { id: true, gateType: true, aiSystem: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take,
        }),
        ctx.prisma.aIIncident.findMany({
          where: {
            organizationId,
            title: contains,
            ...(dept ? { OR: [{ aiSystemId: null }, { aiSystem: dept }] } : {}),
          },
          select: { id: true, title: true },
          orderBy: { createdAt: "desc" },
          take,
        }),
        shadowOn
          ? ctx.prisma.shadowAIReport.findMany({
              where: { organizationId, toolName: contains },
              select: { id: true, toolName: true },
              orderBy: { createdAt: "desc" },
              take,
            })
          : Promise.resolve([] as Array<{ id: string; toolName: string }>),
      ]);

      return [
        ...systems.map((r) => ({ kind: "system" as const, id: r.id, name: r.name, href: `/governance/ai-registry/${r.id}` })),
        ...vendors.map((r) => ({ kind: "vendor" as const, id: r.id, name: r.name, href: `/governance/vendors/${r.id}` })),
        ...policies.map((r) => ({ kind: "policy" as const, id: r.id, name: r.title, href: `/governance/policies/${r.id}` })),
        ...assessments.map((r) => ({
          kind: "assessment" as const,
          id: r.id,
          name: r.title,
          href: `/governance/assessments/${r.id}`,
        })),
        ...gates.map((r) => ({
          kind: "gate" as const,
          id: r.id,
          name: r.aiSystem.name,
          detail: r.gateType,
          href: `/governance/oversight/${r.id}`,
        })),
        ...incidents.map((r) => ({ kind: "incident" as const, id: r.id, name: r.title, href: `/governance/incidents/${r.id}` })),
        ...tools.map((r) => ({ kind: "shadowAi" as const, id: r.id, name: r.toolName, href: `/governance/shadow-ai/${r.id}` })),
      ];
    }),
});
