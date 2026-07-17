// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { checkAssessmentEntitlement, getEntitledAssessmentTypes } from "@/server/services/licensing/entitlement";
import { chatComplete } from "../../services/ai/llm-door";
import {
  requireAi,
  assertAiRateLimit,
  recordGeneration,
  markAccepted,
  postureLane,
} from "../../services/ai/posture";
import { buildSystemContext, promptLocale } from "../../services/ai/context";
import {
  buildAssessmentDraftSystemPrompt,
  buildAssessmentDraftUserPrompt,
} from "../../services/ai/prompts/assessment-draft";

export const assessmentRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        type: z.enum(["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"]).optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        organizationId: ctx.organization.id,
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
      };

      const items = await ctx.prisma.aIAssessment.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
        include: {
          template: { select: { name: true, type: true } },
          aiSystem: { select: { id: true, name: true } },
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
      const assessment = await ctx.prisma.aIAssessment.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          template: true,
          aiSystem: { select: { id: true, name: true, status: true } },
        },
      });

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      return assessment;
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        templateId: z.string(),
        title: z.string().min(1),
        type: z.enum(["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check entitlement for premium types
      const entitlementResult = await checkAssessmentEntitlement(
        ctx.organization.id,
        input.type
      );

      if (!entitlementResult.entitled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: entitlementResult.reason || "You do not have access to this assessment type",
        });
      }

      const assessment = await ctx.prisma.aIAssessment.create({
        data: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          templateId: input.templateId,
          title: input.title,
          type: input.type,
          createdBy: ctx.session.user.id,
          responses: {},
        },
        include: {
          template: true,
          aiSystem: { select: { id: true, name: true } },
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIAssessment",
          entityId: assessment.id,
          action: "CREATE",
          changes: { title: input.title, type: input.type },
        },
      });

      return assessment;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        title: z.string().optional(),
        responses: z.record(z.string(), z.any()).optional(),
        mitigations: z.record(z.string(), z.any()).optional(),
        riskScore: z.number().optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input;

      const assessment = await ctx.prisma.aIAssessment.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: data as never,
      });

      if (assessment.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      return ctx.prisma.aIAssessment.findFirst({
        where: { id, organizationId: ctx.organization.id },
        include: {
          template: true,
          aiSystem: { select: { id: true, name: true } },
        },
      });
    }),

  submit: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.aIAssessment.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id },
        data: { status: "UNDER_REVIEW" },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      return ctx.prisma.aIAssessment.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          template: true,
          aiSystem: { select: { id: true, name: true } },
        },
      });
    }),

  processApproval: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        decision: z.enum(["APPROVED", "REJECTED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["OWNER", "ADMIN", "AI_OFFICER"].includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve assessments",
        });
      }

      return ctx.prisma.aIAssessment.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id },
        data: {
          status: input.decision,
          ...(input.decision === "APPROVED"
            ? { approvedBy: ctx.session.user.id, approvedAt: new Date() }
            : { reviewedBy: ctx.session.user.id, reviewedAt: new Date() }),
        },
      });
    }),

  listTemplates: organizationProcedure
    .input(z.object({ organizationId: z.string(), type: z.enum(["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.aIAssessmentTemplate.findMany({
        where: {
          OR: [
            { organizationId: ctx.organization.id },
            { isSystem: true },
          ],
          ...(input.type && { type: input.type }),
        },
        orderBy: { name: "asc" },
      });
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [total, draft, inProgress, underReview, approved] = await Promise.all([
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id, status: "DRAFT" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id, status: "IN_PROGRESS" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id, status: "UNDER_REVIEW" } }),
        ctx.prisma.aIAssessment.count({ where: { organizationId: ctx.organization.id, status: "APPROVED" } }),
      ]);

      return { total, draft, inProgress, underReview, approved };
    }),

  getEntitledTypes: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return getEntitledAssessmentTypes(ctx.organization.id);
    }),

  // Optional AI assist: draft ONE question's answer from the registry facts.
  // Gated on the org's AI posture (off by default => PRECONDITION_FAILED
  // before any prompt is built). The draft only ever lands in the editable
  // response field via the user's explicit Insert — never written to the DB
  // here; saving flows through the normal update/submit/approve workflow.
  generateAiDraft: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        questionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Posture gate FIRST — posture off/missing means zero AI calls and
      // no prompt building at all.
      const settings = await requireAi(ctx.prisma, ctx.organization.id);
      await assertAiRateLimit(ctx.prisma, ctx.organization.id);

      const assessment = await ctx.prisma.aIAssessment.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: { template: true },
      });
      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      const sections = (assessment.template?.sections ?? []) as {
        id: string;
        title: string;
        questions: { id: string; text: string; helpText?: string }[];
      }[];
      const section = sections.find((s) => s.questions?.some((q) => q.id === input.questionId));
      const question = section?.questions.find((q) => q.id === input.questionId);
      if (!section || !question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found in template" });
      }

      // Server-side context only (Prisma-derived, org-scoped).
      const { context } = await buildSystemContext(
        ctx.prisma,
        ctx.organization.id,
        assessment.aiSystemId,
        ctx.organization.name
      );

      const responses = (assessment.responses ?? {}) as Record<string, string>;
      const locale = promptLocale(ctx.getCookie("locale"));

      // Route through the lane the organization acknowledged.
      const result = await chatComplete({
        system: buildAssessmentDraftSystemPrompt(assessment.type, locale),
        user: buildAssessmentDraftUserPrompt({
          context,
          assessment: { title: assessment.title, type: assessment.type },
          sectionTitle: section.title,
          question: { text: question.text, helpText: question.helpText },
          currentResponse: responses[input.questionId] ?? null,
        }),
        lane: postureLane(settings.posture),
      });

      const generation = await recordGeneration(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        feature: "assessment_draft",
        entityType: "AIAssessment",
        entityId: assessment.id,
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
        questionId: input.questionId,
      };
    }),

  // Audit: stamp acceptedAt when the user Inserts a draft (metadata only).
  markAiAccepted: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), generationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const accepted = await markAccepted(ctx.prisma, ctx.organization.id, input.generationId);
      return { accepted };
    }),

  // Create a custom org template (DPO Central parity: createTemplate).
  // Templates are the questionnaire STRUCTURE only — entitlements gate
  // assessment creation per type, not template authoring.
  createTemplate: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        type: z.enum(["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"]),
        description: z.string().optional(),
        sections: z
          .array(
            z.object({
              id: z.string().min(1),
              title: z.string().min(1),
              questions: z
                .array(
                  z.object({
                    id: z.string().min(1),
                    text: z.string().min(1),
                    type: z.enum(["textarea", "select"]).default("textarea"),
                    required: z.boolean().default(true),
                    helpText: z.string().optional(),
                    options: z.array(z.string()).optional(),
                  })
                )
                .min(1),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.aIAssessmentTemplate.create({
        data: {
          organizationId: ctx.organization.id,
          name: input.name,
          type: input.type,
          description: input.description,
          sections: input.sections,
          isSystem: false,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIAssessmentTemplate",
          entityId: template.id,
          action: "CREATE",
          changes: { name: input.name, type: input.type },
        },
      });

      return template;
    }),

  // Clone a system template (or one of the org's own) into an editable
  // org-owned copy (DPO Central parity: cloneTemplate).
  cloneTemplate: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        templateId: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only system templates or templates from the caller's own org.
      const source = await ctx.prisma.aIAssessmentTemplate.findFirst({
        where: {
          id: input.templateId,
          OR: [{ isSystem: true }, { organizationId: ctx.organization.id }],
        },
      });

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      const template = await ctx.prisma.aIAssessmentTemplate.create({
        data: {
          organizationId: ctx.organization.id,
          name: input.name,
          type: source.type,
          description: source.description,
          sections: source.sections as never,
          frameworkRef: source.frameworkRef,
          isSystem: false,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIAssessmentTemplate",
          entityId: template.id,
          action: "CREATE",
          changes: { name: input.name, clonedFrom: source.id },
        },
      });

      return template;
    }),
});
