// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Start from another client": what a consultant may copy from one client's
 * programme into another's, and what never moves.
 *
 * The rule that governs everything here: COPIED, never linked. Every copied
 * row is a new row in the target organisation with no reference back to the
 * source, so one client's later changes never reach another client's file,
 * and the target never learns which client the template came from.
 *
 * Pure leaf module: no Prisma, no React. The copy itself is in
 * src/server/services/client-template/copy.ts.
 */

/** The parts a person can tick, in the order the dialog shows them. */
export const COPY_PARTS = [
  "policies",
  "assessmentTemplates",
  "aiSystems",
  "oversightGates",
  "vendors",
  "vendorReviews",
  "obligations",
] as const;

export type CopyPart = (typeof COPY_PARTS)[number];

/**
 * A part that only makes sense with another. An oversight gate belongs to an
 * AI system, and a vendor review to a vendor, so neither is copied alone.
 */
export const PART_REQUIRES: Partial<Record<CopyPart, CopyPart>> = {
  oversightGates: "aiSystems",
  vendorReviews: "vendors",
};

/**
 * Ticked when the dialog opens. AI systems (client-specific) and the
 * obligations answers (optional in the directive) start unticked, and so do
 * the parts that depend on them.
 */
export const DEFAULT_PARTS: readonly CopyPart[] = [
  "policies",
  "assessmentTemplates",
  "vendors",
  "vendorReviews",
];

/** Drop any part whose prerequisite is not also chosen. */
export function effectiveParts(parts: readonly CopyPart[]): CopyPart[] {
  const chosen = new Set(parts);
  return COPY_PARTS.filter((p) => {
    if (!chosen.has(p)) return false;
    const needs = PART_REQUIRES[p];
    return !needs || chosen.has(needs);
  });
}

/**
 * Records that are never copied, whatever is ticked: they are the client's own
 * history, people, evidence or commercial terms. Named by Prisma delegate so a
 * test can prove the copy never writes to any of them.
 */
export const NEVER_COPY = [
  "aIIncident",
  "aIIncidentTimeline",
  "aIIncidentTask",
  "aIIncidentNotification",
  "regulatoryProceeding",
  "proceedingEvent",
  "complianceEvidence",
  "complianceMapping",
  "controlTest",
  "auditLog", // the target gets one new entry of its own; nothing is copied from the source
  "boardReport",
  "programSnapshotRecord",
  "organizationMember",
  "user",
  "customer",
  "customerOrganization",
  "skillEntitlement",
  "skillActivation",
  "legalHold",
  "aIAssessment",
  "aIAssessmentVersion",
  "riskClassification",
  "sensitiveDataAssessment",
  "dataRecipient",
  "shadowAIReport",
  "threatModel",
  "aiGeneration",
  "sampleRecord",
] as const;

/** Only an owner or an admin may use an organisation as a source or a target. */
export const TEMPLATE_ROLES = ["OWNER", "ADMIN"] as const;

export function canUseForTemplate(role: string | null | undefined): boolean {
  return (TEMPLATE_ROLES as readonly string[]).includes(role ?? "");
}

/**
 * `sourceRef` on copied policies and gates. Deliberately the same for every
 * copy and never the source's id: the target must not be able to tell which
 * client the template came from.
 */
export const CLIENT_TEMPLATE_REF = "client-template";

/**
 * Key under `metadata` (systems, vendors) and `settings` (the organisation's
 * obligations answers) marking a copy nobody has reviewed yet. Editing the
 * record clears it. While it is there the program path counts the step as
 * started, never done.
 */
export const TEMPLATE_COPY_KEY = "templateCopy";

type Json = Record<string, unknown>;

function asObject(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

/** Metadata with the pending mark added. */
export function withTemplateCopyMark(metadata: unknown, copiedAt: Date): Json {
  return {
    ...asObject(metadata),
    [TEMPLATE_COPY_KEY]: { pending: true, copiedAt: copiedAt.toISOString() },
  };
}

export function hasTemplateCopyMark(metadata: unknown): boolean {
  return asObject(asObject(metadata)[TEMPLATE_COPY_KEY]).pending === true;
}

/** Metadata with the pending mark removed, or null when nothing needs to change. */
export function withoutTemplateCopyMark(metadata: unknown): Json | null {
  if (!hasTemplateCopyMark(metadata)) return null;
  const { [TEMPLATE_COPY_KEY]: _removed, ...rest } = asObject(metadata);
  return rest;
}

/** The Prisma filter for "copied from a template, not yet reviewed". */
export const TEMPLATE_COPY_PENDING_WHERE = {
  metadata: { path: [TEMPLATE_COPY_KEY, "pending"], equals: true },
};

/** The words that mark a copied vendor review and each copied policy's first version. */
export const TEMPLATE_COPY_NOTE = {
  en: "Copied from a template. Review for this client.",
  es: "Copiado de una plantilla. Revísalo para este cliente.",
} as const;

export type TemplateLocale = keyof typeof TEMPLATE_COPY_NOTE;

/**
 * The target's audit entry. Dated, and naming nothing about the source: no
 * name, no id, no slug.
 */
export function templateAuditNote(date: Date): string {
  return `Created from a template on ${date.toISOString().slice(0, 10)}`;
}
