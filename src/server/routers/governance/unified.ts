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
import { runAgenticStressTest } from "@/config/agentic-stress-test";
import {
  buildAgenticAddendumArtifact,
  buildAssessmentArtifact,
  buildNoticeArtifact,
  buildProtocolArtifact,
} from "@/server/services/artifacts/build-artifacts";
import { renderArtifactMarkdown } from "@/server/services/artifacts/render-markdown";
import {
  evidenceTitle,
  planRegisterUpdate,
  type MappingRow,
  type RequirementRow,
} from "@/lib/assessment-to-register";
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

  /**
   * The agentic stress test: where each artifact breaks when the system hands
   * its output to an autonomous downstream agent, and what the agentic layer
   * demands. Returns nothing at all until a handoff has been declared.
   */
  stressTest: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const scope = await loadSystemScope(ctx.prisma, ctx.organization.id, input.aiSystemId);
      const locale = localeFrom(ctx.getCookie("locale"));
      const result = runAgenticStressTest(scope.overlayTags);
      return {
        declared: scope.overlayTags.includes("agentic"),
        counts: result.counts,
        findings: result.applicable.map((f) => ({
          id: f.id,
          severity: f.severity,
          artifacts: f.artifacts,
          title: f.title[locale],
          assumption: f.assumption[locale],
          breakage: f.breakage[locale],
          provision: f.provision[locale],
          citations: f.citations,
          evidencedBy: f.evidencedBy,
        })),
      };
    }),

  /**
   * Generate one of the four artifacts as Markdown.
   *
   * Answers come from the most recent unified assessment on the system unless
   * a specific assessment is named. Deterministic: no model is called, so the
   * same facts always produce the same document.
   */
  generateArtifact: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        kind: z.enum(["assessment", "notice", "protocol", "agentic-addendum"]),
        assessmentId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = await loadSystemScope(ctx.prisma, ctx.organization.id, input.aiSystemId);
      const locale = localeFrom(ctx.getCookie("locale"));

      // Org-scoped on both axes: the assessment must belong to this
      // organisation AND to the system being documented.
      const assessment = await ctx.prisma.aIAssessment.findFirst({
        where: {
          organizationId: ctx.organization.id,
          aiSystemId: input.aiSystemId,
          ...(input.assessmentId ? { id: input.assessmentId } : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, responses: true, updatedAt: true },
      });

      const answers = (assessment?.responses ?? {}) as Record<string, unknown>;
      const artifactInput = {
        scope,
        answers,
        locale,
        generatedAt: new Date().toISOString().slice(0, 10),
      };

      const artifact =
        input.kind === "assessment"
          ? buildAssessmentArtifact(artifactInput)
          : input.kind === "notice"
            ? buildNoticeArtifact(artifactInput)
            : input.kind === "protocol"
              ? buildProtocolArtifact(artifactInput)
              : buildAgenticAddendumArtifact(artifactInput);

      return {
        artifact,
        markdown: renderArtifactMarkdown(artifact),
        sourceAssessment: assessment
          ? { id: assessment.id, title: assessment.title, updatedAt: assessment.updatedAt }
          : null,
      };
    }),

  /**
   * What applying this assessment to the compliance register would do, and
   * doing it.
   *
   * Answering the unified assessment produces text tied to specific
   * requirements. Without this the register stayed at NOT_ASSESSED and the
   * only way to close the gap was to open each requirement and paste the same
   * answer again.
   */
  previewRegisterUpdate: organizationProcedure
    .input(z.object({ organizationId: z.string(), assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await buildPlan(ctx, input.assessmentId);
      return plan.summary;
    }),

  applyToRegister: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), assessmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { plan, assessment } = await buildPlan(ctx, input.assessmentId);
      if (plan.evidence.length === 0) {
        return { ...plan.counts, applied: 0 };
      }
      const reviewer = ctx.session.user.name ?? ctx.session.user.email ?? ctx.session.user.id;
      const mappingIdByRequirement = plan.mappingIdByRequirement;

      let applied = 0;
      for (const item of plan.evidence) {
        const mappingId = mappingIdByRequirement.get(item.requirementId);
        if (!mappingId) continue;
        await ctx.prisma.complianceEvidence.create({
          data: {
            complianceMappingId: mappingId,
            organizationId: ctx.organization.id,
            type: "DOCUMENT",
            title: item.title,
            description: item.description,
            addedBy: reviewer,
          },
        });
        if (item.liftStatus) {
          // Documented, not yet judged sufficient. Only a person sets
          // COMPLIANT, and the provenance says where this came from.
          await ctx.prisma.complianceMapping.update({
            where: { id: mappingId },
            data: {
              status: "PARTIALLY_COMPLIANT",
              provenance: "AUTO_TEMPLATE",
              sourceRef: `assessment:${input.assessmentId}`,
            },
          });
        }
        applied += 1;
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          action: "CREATE",
          entityType: "ComplianceEvidence",
          entityId: assessment.id,
          changes: {
            source: "unified-assessment",
            evidenceAdded: applied,
            statusesLifted: plan.counts.lifted,
          },
        },
      });

      return { ...plan.counts, applied };
    }),
});

/**
 * Shared by the preview and the apply, so the number shown is the number that
 * happens.
 */
async function buildPlan(
  ctx: {
    prisma: typeof import("@/lib/prisma").default;
    organization: { id: string };
  },
  assessmentId: string,
) {
  const assessment = await ctx.prisma.aIAssessment.findFirst({
    where: { id: assessmentId, organizationId: ctx.organization.id },
    select: {
      id: true,
      title: true,
      aiSystemId: true,
      responses: true,
      template: { select: { sections: true } },
    },
  });
  if (!assessment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
  }

  const sections = (assessment.template?.sections ?? []) as unknown as {
    questions?: { id: string; satisfies?: unknown }[];
  }[];
  const responses = (assessment.responses ?? {}) as Record<string, unknown>;

  const [requirementRows, mappingRows] = await Promise.all([
    ctx.prisma.complianceRequirement.findMany({
      select: { id: true, code: true, framework: { select: { code: true } } },
    }),
    ctx.prisma.complianceMapping.findMany({
      where: { organizationId: ctx.organization.id, aiSystemId: assessment.aiSystemId },
      select: {
        id: true,
        requirementId: true,
        status: true,
        evidenceItems: { select: { title: true } },
      },
    }),
  ]);

  const requirements: RequirementRow[] = requirementRows.map((r) => ({
    id: r.id,
    code: r.code,
    frameworkCode: r.framework.code,
  }));
  const mappings: MappingRow[] = mappingRows.map((m) => ({
    requirementId: m.requirementId,
    status: m.status,
    evidenceTitles: m.evidenceItems.map((e) => e.title),
  }));

  const plan = planRegisterUpdate(sections, responses, requirements, mappings, assessment.title);
  const mappingIdByRequirement = new Map(mappingRows.map((m) => [m.requirementId, m.id]));

  return {
    assessment,
    plan: { ...plan, mappingIdByRequirement },
    summary: {
      counts: plan.counts,
      unmapped: plan.unmapped,
      unknown: plan.unknown,
      // What the evidence will be titled, so the preview is concrete.
      sampleTitle: plan.evidence[0] ? plan.evidence[0].title : evidenceTitle(assessment.title, "…"),
    },
  };
}
