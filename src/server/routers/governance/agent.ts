// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Agent governance: how much a system does on its own, what it may reach, who
 * is accountable and who can stop it.
 *
 * The agentic layer used to hang on one screening answer. That was enough to
 * decide whether the stress test ran, but not to answer any of the questions
 * the stress test raises. This records the answers, and the scope service
 * reads them in preference to the old screening flag.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import {
  AGENT_AUTONOMY_VALUES,
  AUTONOMY_HELP,
  AUTONOMY_LABELS,
  AGENT_CONTROL_LABELS,
  AGENT_RULES_VERSION,
  assessAgent,
  EMPTY_AGENT_FACTS,
  type AgentAutonomyValue,
} from "@/config/agent-rules";

const PROFILE_SELECT = {
  id: true,
  aiSystemId: true,
  autonomy: true,
  actionScope: true,
  downstreamAgents: true,
  tools: true,
  humanSponsor: true,
  killSwitch: true,
  killSwitchTestedAt: true,
  reversalWindow: true,
  traceability: true,
  notes: true,
  reviewedBy: true,
  reviewedAt: true,
  provenance: true,
  confirmedBy: true,
  confirmedAt: true,
} as const;

/** Recording how autonomous a system is, is a governance determination. */
const WRITE_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

type ContentLocale = "en" | "es";
const localeFrom = (cookie: string | undefined): ContentLocale => (cookie === "es" ? "es" : "en");

export const agentRouter = createTRPCRouter({
  /** Autonomy levels with their names and what each one means. */
  options: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(({ ctx }) => {
      const locale = localeFrom(ctx.getCookie("locale"));
      return {
        version: AGENT_RULES_VERSION,
        autonomy: AGENT_AUTONOMY_VALUES.map((value) => ({
          value,
          label: AUTONOMY_LABELS[value][locale],
          help: AUTONOMY_HELP[value][locale],
        })),
        controls: Object.entries(AGENT_CONTROL_LABELS).map(([id, label]) => ({
          id,
          label: label[locale],
        })),
      };
    }),

  /** The profile for one system, with what it implies. */
  getProfile: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true, name: true, technique: true },
      });
      if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });

      const profile = await ctx.prisma.agentProfile.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
        select: PROFILE_SELECT,
      });

      const facts = profile
        ? {
            autonomy: profile.autonomy as AgentAutonomyValue,
            actionScope: profile.actionScope,
            downstreamAgents: profile.downstreamAgents,
            tools: profile.tools,
            humanSponsor: profile.humanSponsor,
            killSwitch: profile.killSwitch,
            killSwitchTestedAt: profile.killSwitchTestedAt,
            reversalWindow: profile.reversalWindow,
            traceability: profile.traceability,
          }
        : EMPTY_AGENT_FACTS;

      return { system, profile, assessment: assessAgent(facts) };
    }),

  upsertProfile: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        autonomy: z.enum(["NOT_ASSESSED", "NONE", "SUGGESTS", "ACTS_WITH_APPROVAL", "ACTS_AUTONOMOUSLY"]),
        actionScope: z.string().max(4000).nullable().optional(),
        downstreamAgents: z.string().max(4000).nullable().optional(),
        tools: z.array(z.string().min(1).max(200)).max(50).optional(),
        humanSponsor: z.string().max(200).nullable().optional(),
        killSwitch: z.string().max(4000).nullable().optional(),
        killSwitchTestedAt: z.string().datetime().nullable().optional(),
        reversalWindow: z.string().max(200).nullable().optional(),
        traceability: z.string().max(4000).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!WRITE_ROLES.includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins and AI officers can record agent governance",
        });
      }
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });

      const reviewer = ctx.session.user.name ?? ctx.session.user.email ?? ctx.session.user.id;
      const data = {
        autonomy: input.autonomy,
        actionScope: input.actionScope ?? null,
        downstreamAgents: input.downstreamAgents ?? null,
        tools: input.tools ?? [],
        humanSponsor: input.humanSponsor ?? null,
        killSwitch: input.killSwitch ?? null,
        killSwitchTestedAt: input.killSwitchTestedAt ? new Date(input.killSwitchTestedAt) : null,
        reversalWindow: input.reversalWindow ?? null,
        traceability: input.traceability ?? null,
        notes: input.notes ?? null,
        reviewedBy: reviewer,
        reviewedAt: new Date(),
        // Typed by a person, so it needs no separate confirmation step.
        provenance: "USER_ENTERED" as const,
      };

      const profile = await ctx.prisma.agentProfile.upsert({
        where: { aiSystemId: input.aiSystemId },
        update: data,
        create: { ...data, aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
        select: PROFILE_SELECT,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          action: "UPDATE",
          entityType: "AgentProfile",
          entityId: profile.id,
          changes: { autonomy: input.autonomy, tools: input.tools?.length ?? 0 },
        },
      });

      return profile;
    }),
});
