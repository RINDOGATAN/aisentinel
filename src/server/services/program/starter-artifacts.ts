// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The drafts a new program starts with, so the first screen after the wizard
 * has work in it rather than empty lists:
 *
 *   - a unified impact assessment (EU AI Act Art. 27 / GDPR Art. 35 and the
 *     declared state regimes) for every high-risk system, scoped exactly as
 *     the Cross-border tab would scope it;
 *   - a due-diligence review for every vendor imported from the catalogue,
 *     pre-filled with what the catalogue states and what it leaves open.
 *
 * Everything is created as DRAFT and nothing is answered: an assessment is a
 * record of a person's judgment, and a draft only saves them the setup.
 * Idempotent: a system that already has an assessment, or a vendor that
 * already has a review, is skipped.
 */

import type { PrismaClient } from "@prisma/client";
import { loadSystemScope } from "@/server/services/scope/system-scope";
import {
  UNIFIED_ASSESSMENT_LAW_REVIEWED_AS_OF,
  UNIFIED_ASSESSMENT_VERSION,
  selectUnifiedQuestions,
  type SelectedSection,
} from "@/config/unified-assessment";
import { toCatalogFacts, vendorDueDiligenceFindings } from "./vendor-due-diligence";

export type ContentLocale = "en" | "es";

/** The template shape the existing assessment renderer understands. */
export function toTemplateSections(sections: SelectedSection[], locale: ContentLocale) {
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

export type UnifiedDraftResult =
  | { created: true; assessmentId: string; templateId: string; overlayTags: string[] }
  | { created: false; reason: "jurisdictions-undeclared" };

/**
 * Creates a DRAFT unified impact assessment for one system. Returns
 * `jurisdictions-undeclared` rather than guessing a scope: without declared
 * jurisdictions no overlay can be resolved.
 */
export async function createUnifiedAssessmentDraft(
  prisma: PrismaClient,
  args: { organizationId: string; aiSystemId: string; userId: string; locale: ContentLocale; title?: string; source?: string },
): Promise<UnifiedDraftResult> {
  const scope = await loadSystemScope(prisma, args.organizationId, args.aiSystemId);
  if (!scope.jurisdictionsDeclared) return { created: false, reason: "jurisdictions-undeclared" };

  const sections = selectUnifiedQuestions(scope.overlayTags);
  const templateSections = toTemplateSections(sections, args.locale);
  const name = args.title ?? `Unified AI impact assessment — ${scope.system.name}`;

  const template = await prisma.aIAssessmentTemplate.create({
    data: {
      organizationId: args.organizationId,
      name,
      type: "CUSTOM",
      description: `Unified impact assessment calibrated to ${scope.jurisdictions.join(", ")}. Content ${UNIFIED_ASSESSMENT_VERSION}; law reviewed ${UNIFIED_ASSESSMENT_LAW_REVIEWED_AS_OF}; legal sign-off pending.`,
      frameworkRef: "Unified: EU AI Act Art. 27 / GDPR Art. 35 / CCPA ADMT / CO / TX / WA",
      sections: templateSections as unknown as object[],
      isSystem: false,
    },
  });

  const assessment = await prisma.aIAssessment.create({
    data: {
      organizationId: args.organizationId,
      aiSystemId: args.aiSystemId,
      templateId: template.id,
      type: "CUSTOM",
      title: name,
      status: "DRAFT",
      responses: {},
      createdBy: args.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: args.organizationId,
      userId: args.userId,
      action: "CREATE",
      entityType: "AIAssessment",
      entityId: assessment.id,
      changes: {
        source: args.source ?? "unified-assessment",
        version: UNIFIED_ASSESSMENT_VERSION,
        overlayTags: scope.overlayTags,
        questionCount: templateSections.reduce((n, s) => n + s.questions.length, 0),
      },
    },
  });

  return { created: true, assessmentId: assessment.id, templateId: template.id, overlayTags: scope.overlayTags };
}

const TITLES = {
  assessment: { en: "Impact assessment: {name}", es: "Evaluación de impacto: {name}" },
  vendorReview: { en: "Initial due diligence: {name}", es: "Diligencia debida inicial: {name}" },
} as const;

const fill = (t: string, name: string) => t.replace("{name}", name);

export interface StarterResult {
  assessments: number;
  vendorReviews: number;
  /** High-risk systems left without a draft because jurisdictions are undeclared. */
  assessmentsSkippedUndeclared: number;
}

export async function createStarterArtifacts(
  prisma: PrismaClient,
  args: { organizationId: string; userId: string; locale: ContentLocale; systemIds: string[] },
): Promise<StarterResult> {
  const result: StarterResult = { assessments: 0, vendorReviews: 0, assessmentsSkippedUndeclared: 0 };

  // Impact assessments for the high-risk systems just created.
  const highRisk = await prisma.aISystem.findMany({
    where: {
      organizationId: args.organizationId,
      id: { in: args.systemIds },
      riskClassification: { riskLevel: "HIGH" },
      assessments: { none: {} },
    },
    select: { id: true, name: true },
  });
  for (const system of highRisk) {
    const draft = await createUnifiedAssessmentDraft(prisma, {
      organizationId: args.organizationId,
      aiSystemId: system.id,
      userId: args.userId,
      locale: args.locale,
      title: fill(TITLES.assessment[args.locale], system.name),
      source: "quickstart-starter",
    });
    if (draft.created) result.assessments++;
    else result.assessmentsSkippedUndeclared++;
  }

  // Due-diligence reviews for catalogue vendors that have none yet.
  const vendors = await prisma.aIVendor.findMany({
    where: {
      organizationId: args.organizationId,
      catalogSlug: { not: null },
      assessments: { none: {} },
    },
    select: { id: true, name: true, catalogEntry: true },
  });
  const nextReview = new Date();
  nextReview.setFullYear(nextReview.getFullYear() + 1);
  for (const vendor of vendors) {
    if (!vendor.catalogEntry) continue;
    const review = await prisma.aIVendorAssessment.create({
      data: {
        vendorId: vendor.id,
        organizationId: args.organizationId,
        title: fill(TITLES.vendorReview[args.locale], vendor.name),
        status: "DRAFT",
        findings: vendorDueDiligenceFindings(toCatalogFacts(vendor.catalogEntry), args.locale),
        nextReviewDate: nextReview,
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: args.organizationId,
        userId: args.userId,
        action: "CREATE",
        entityType: "AIVendorAssessment",
        entityId: review.id,
        changes: { source: "quickstart-starter", vendorId: vendor.id },
      },
    });
    result.vendorReviews++;
  }

  return result;
}
