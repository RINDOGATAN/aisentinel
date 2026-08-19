// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * EU AI Act Art. 50 transparency router: per-system transparency profile
 * (obligation statuses, marking methods, grace-period fact) plus the
 * deterministic screening suggestions and the posture-gated AI-drafted
 * transparency statement. The rules layer (src/config/transparency-rules.ts)
 * owns all applicability and deadline logic — this router only orchestrates.
 */

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { chatComplete } from "../../services/ai/llm-door";
import {
  requireAi,
  assertAiRateLimit,
  recordGeneration,
  postureLane,
} from "../../services/ai/posture";
import { buildSystemContext, promptLocale } from "../../services/ai/context";
import {
  buildTransparencyStatementSystemPrompt,
  buildTransparencyStatementUserPrompt,
} from "../../services/ai/prompts/transparency-statement";
import {
  MARKING_METHODS,
  computeMarkingDeadline,
  suggestArt50Obligations,
} from "@/config/transparency-rules";

const OBLIGATION_STATUS = z.enum(["NOT_APPLICABLE", "REQUIRED", "IMPLEMENTED"]);

export const transparencyRouter = createTRPCRouter({
  get: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      // buildSystemContext is org-scoped and 404s unknown/foreign system ids.
      const { context, facts } = await buildSystemContext(
        ctx.prisma,
        ctx.organization.id,
        input.aiSystemId,
        ctx.organization.name
      );

      const profile = await ctx.prisma.transparencyProfile.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
      });

      const suggestions = suggestArt50Obligations({
        ...facts,
        role: context.system.role,
      });

      return {
        profile,
        suggestions,
        markingDeadline: computeMarkingDeadline({
          placedOnMarketBefore2Aug2026: profile?.placedOnMarketBefore2Aug2026,
          markingStatus: profile?.art50MarkingStatus ?? null,
        }),
      };
    }),

  upsert: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        art50InteractionStatus: OBLIGATION_STATUS,
        art50MarkingStatus: OBLIGATION_STATUS,
        art50EmotionStatus: OBLIGATION_STATUS,
        art50DeepfakeStatus: OBLIGATION_STATUS,
        markingMethods: z.array(z.enum(MARKING_METHODS)).default([]),
        placedOnMarketBefore2Aug2026: z.boolean().nullable().optional(),
        notes: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const system = await ctx.prisma.aISystem.findFirst({
        where: { id: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      const existing = await ctx.prisma.transparencyProfile.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
        select: { id: true },
      });

      const data = {
        art50InteractionStatus: input.art50InteractionStatus,
        art50MarkingStatus: input.art50MarkingStatus,
        art50EmotionStatus: input.art50EmotionStatus,
        art50DeepfakeStatus: input.art50DeepfakeStatus,
        markingMethods: input.markingMethods,
        placedOnMarketBefore2Aug2026: input.placedOnMarketBefore2Aug2026 ?? null,
        notes: input.notes ?? null,
        reviewedBy: ctx.session.user.id,
        reviewedAt: new Date(),
        // A human editing an artifact IS confirming it; provenance keeps its
        // historical origin (where the row came from, not who vouches for it).
        confirmedBy: ctx.session.user.id,
        confirmedAt: new Date(),
      };

      const profile = await ctx.prisma.transparencyProfile.upsert({
        where: { aiSystemId: input.aiSystemId },
        create: {
          aiSystemId: input.aiSystemId,
          organizationId: ctx.organization.id,
          ...data,
        },
        update: data,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "TransparencyProfile",
          entityId: profile.id,
          action: existing ? "UPDATE" : "CREATE",
          changes: {
            aiSystemId: input.aiSystemId,
            art50InteractionStatus: input.art50InteractionStatus,
            art50MarkingStatus: input.art50MarkingStatus,
            art50EmotionStatus: input.art50EmotionStatus,
            art50DeepfakeStatus: input.art50DeepfakeStatus,
            markingMethods: input.markingMethods,
            placedOnMarketBefore2Aug2026: input.placedOnMarketBefore2Aug2026 ?? null,
          },
        },
      });

      return profile;
    }),

  generateStatement: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Posture gate FIRST — posture off/missing means zero AI calls and
      // no prompt building at all.
      const settings = await requireAi(ctx.prisma, ctx.organization.id);
      await assertAiRateLimit(ctx.prisma, ctx.organization.id);

      const { context, facts } = await buildSystemContext(
        ctx.prisma,
        ctx.organization.id,
        input.aiSystemId,
        ctx.organization.name
      );

      const profile = await ctx.prisma.transparencyProfile.findFirst({
        where: { aiSystemId: input.aiSystemId, organizationId: ctx.organization.id },
      });

      const suggestions = suggestArt50Obligations({
        ...facts,
        role: context.system.role,
      });
      const markingDeadline = computeMarkingDeadline({
        placedOnMarketBefore2Aug2026: profile?.placedOnMarketBefore2Aug2026,
        markingStatus: profile?.art50MarkingStatus ?? null,
      });

      const locale = promptLocale(ctx.getCookie("locale"));

      const result = await chatComplete({
        system: buildTransparencyStatementSystemPrompt(locale),
        user: buildTransparencyStatementUserPrompt({
          context,
          profile: profile
            ? {
                art50InteractionStatus: profile.art50InteractionStatus,
                art50MarkingStatus: profile.art50MarkingStatus,
                art50EmotionStatus: profile.art50EmotionStatus,
                art50DeepfakeStatus: profile.art50DeepfakeStatus,
                markingMethods: profile.markingMethods,
                placedOnMarketBefore2Aug2026: profile.placedOnMarketBefore2Aug2026,
                notes: profile.notes,
              }
            : null,
          suggestions,
          markingDeadline: markingDeadline
            ? {
                deadline: markingDeadline.deadline.toISOString().slice(0, 10),
                graceApplies: markingDeadline.graceApplies,
                overdue: markingDeadline.overdue,
              }
            : null,
        }),
        maxTokens: 2048,
        lane: postureLane(settings.posture),
      });

      const generation = await recordGeneration(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        feature: "transparency_statement",
        entityType: "AISystem",
        entityId: input.aiSystemId,
        model: result?.model ?? null,
        posture: settings.posture,
        promptTokens: result?.usage?.promptTokens ?? null,
        completionTokens: result?.usage?.completionTokens ?? null,
        totalTokens: result?.usage?.totalTokens ?? null,
        durationMs: result?.durationMs ?? null,
        status: result ? "ok" : "error",
      });

      if (!result) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "ai_failed" });
      }

      return {
        generationId: generation.id,
        model: result.model,
        content: result.content,
      };
    }),
});
