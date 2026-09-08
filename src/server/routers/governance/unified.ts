// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The unified impact assessment: one question set calibrated to the EU AI Act,
 * the GDPR, California ADMT, Colorado, Texas and Washington at once.
 *
 * `getTemplate` returns the questions that actually apply to one system —
 * the common core plus the overlays its resolved scopes select — together with
 * the requirement codes each answer evidences and the regimes still
 * undetermined. `createAssessment` materialises that question set as a real
 * assessment the existing assessment workflow can answer, review and export.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { loadSystemScope } from "@/server/services/scope/system-scope";
import {
  UNIFIED_ASSESSMENT_LAW_REVIEWED_AS_OF,
  UNIFIED_ASSESSMENT_REVIEW_MARKER,
  UNIFIED_ASSESSMENT_VERSION,
  citationsFor,
  selectUnifiedQuestions,
  type SelectedSection,
} from "@/config/unified-assessment";

type ContentLocale = "en" | "es";

function localeFrom(cookie: string | undefined): ContentLocale {
  return cookie === "es" ? "es" : "en";
}

/** The template shape the existing assessment renderer understands. */
function toTemplateSections(sections: SelectedSection[], locale: ContentLocale) {
  return sections.map((section) => ({
    id: section.id,
    title: section.title[locale],
    intro: section.intro?.[locale],
    questions: section.questions.map((q) => ({
      id: q.id,
      text: q.text[locale],
      helpText: q.helpText?.[locale],
      type: q.type,
      required: q.required,
      options: q.options,
      // Carried through so the renderer can show why a question is asked and
      // what answering it evidences. Extra keys are ignored by the renderer.
      reason: q.reason,
      satisfies: q.satisfies,
      feeds: q.feeds ?? ["assessment"],
    })),
  }));
}

export const unifiedRouter = createTRPCRouter({
  /** The scoped question set for one system, with its citations and gaps. */
  getTemplate: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const scope = await loadSystemScope(ctx.prisma, ctx.organization.id, input.aiSystemId);
      const locale = localeFrom(ctx.getCookie("locale"));
      const sections = selectUnifiedQuestions(scope.overlayTags);
      const questionCount = sections.reduce((n, s) => n + s.questions.length, 0);
      const overlayCount = sections.reduce(
        (n, s) => n + s.questions.filter((q) => q.reason !== "core").length,
        0,
      );
      return {
        system: scope.system,
        organizationName: scope.organizationName,
        jurisdictions: scope.jurisdictions,
        jurisdictionsDeclared: scope.jurisdictionsDeclared,
        overlayTags: scope.overlayTags,
        undetermined: scope.undetermined,
        admtState: scope.admt.state,
        riskLevel: scope.riskLevel,
        annexIiiCategory: scope.annexIiiCategory,
        sections: toTemplateSections(sections, locale),
        citations: citationsFor(sections),
        counts: { questions: questionCount, core: questionCount - overlayCount, overlay: overlayCount },
        version: UNIFIED_ASSESSMENT_VERSION,
        lawReviewedAsOf: UNIFIED_ASSESSMENT_LAW_REVIEWED_AS_OF,
        reviewMarker: UNIFIED_ASSESSMENT_REVIEW_MARKER[locale],
      };
    }),

  /**
   * Materialise the scoped question set as an assessment on this system.
   *
   * The template is created per system rather than shared, because the question
   * set is a function of that system's scope: a shared template would either
   * carry every overlay for everyone or freeze one system's scope onto the
   * next. Org-owned, so it never collides with the seeded system templates.
   */
  createAssessment: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        title: z.string().min(1).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await loadSystemScope(ctx.prisma, ctx.organization.id, input.aiSystemId);
      if (!scope.jurisdictionsDeclared) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Declare the organisation's operating jurisdictions before generating a unified assessment: without them no overlay can be resolved.",
        });
      }
      const locale = localeFrom(ctx.getCookie("locale"));
      const sections = selectUnifiedQuestions(scope.overlayTags);
      const templateSections = toTemplateSections(sections, locale);
      const name = input.title ?? `Unified AI impact assessment — ${scope.system.name}`;

      const template = await ctx.prisma.aIAssessmentTemplate.create({
        data: {
          organizationId: ctx.organization.id,
          name,
          type: "CUSTOM",
          description: `Unified impact assessment calibrated to ${scope.jurisdictions.join(", ")}. Content ${UNIFIED_ASSESSMENT_VERSION}; law reviewed ${UNIFIED_ASSESSMENT_LAW_REVIEWED_AS_OF}; legal sign-off pending.`,
          frameworkRef: "Unified: EU AI Act Art. 27 / GDPR Art. 35 / CCPA ADMT / CO / TX / WA",
          sections: templateSections as unknown as object[],
          isSystem: false,
        },
      });

      const assessment = await ctx.prisma.aIAssessment.create({
        data: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          templateId: template.id,
          type: "CUSTOM",
          title: name,
          status: "DRAFT",
          responses: {},
          createdBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          action: "CREATE",
          entityType: "AIAssessment",
          entityId: assessment.id,
          changes: {
            source: "unified-assessment",
            version: UNIFIED_ASSESSMENT_VERSION,
            overlayTags: scope.overlayTags,
            questionCount: templateSections.reduce((n, s) => n + s.questions.length, 0),
          },
        },
      });

      return { assessmentId: assessment.id, templateId: template.id, overlayTags: scope.overlayTags };
    }),
});
