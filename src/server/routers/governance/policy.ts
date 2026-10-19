// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { editConfirmation } from "@/server/services/provenance/edit-stamp";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { assertPilotRoom, pilotLocale } from "../../services/pilot/caps";
import { TRPCError } from "@trpc/server";
import { assertNotOnHold } from "../../services/legal-hold";
import { assertCanDeleteRecords } from "../../services/authz/delete-roles";
import { findPolicyTemplate } from "@/config/policy-library";
import {
  POLICY_TYPES,
  REMOVABLE_TEMPLATE_DRAFT_WHERE,
  REVIEW_INTERVALS,
  isSubstantiveEdit,
  reviewDateAfter,
} from "@/lib/policy-meta";
import { resolvePolicyAssignments, validatePolicyAssignment } from "../../services/policy/assignments";
import { importPolicyText, IMPORT_MAX_BYTES, PolicyImportError } from "../../services/policy/import-text";
import { assertAiRateLimit, postureLane, recordGeneration, requireAi } from "../../services/ai/posture";
import { chatComplete } from "../../services/ai/llm-door";
import { promptLocale } from "../../services/ai/context";
import { buildPolicyReviewSystemPrompt, buildPolicyReviewUserPrompt } from "../../services/ai/prompts/policy-review";
import { fillMissingPolicyNumbers, nextPolicyNumber } from "../../services/policy/number";
import type { Prisma, PrismaClient } from "@prisma/client";

/** Roles that may approve or publish a policy (approve, publishVersion, update). */
const POLICY_DECIDER_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"] as const;
/** Statuses that record a decision rather than a working state. */
const DECISION_STATUSES = ["APPROVED", "PUBLISHED"] as const;
/** Roles that may remove unedited template drafts in one step (as in Settings). */
const TEMPLATE_REMOVER_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"] as const;

const policyTypeSchema = z.enum(POLICY_TYPES);
const reviewIntervalSchema = z
  .number()
  .int()
  .refine((n) => (REVIEW_INTERVALS as readonly number[]).includes(n), "Unsupported review interval");
const assignmentShape = {
  ownerMemberId: z.string().nullable().optional(),
  ownerName: z.string().max(200).nullable().optional(),
  departmentId: z.string().nullable().optional(),
};

/** Mark the first human change after creation (template drafts then stop counting as unreviewed). */
async function touchEdited(db: Pick<PrismaClient, "aIPolicy">, organizationId: string, id: string) {
  await db.aIPolicy.updateMany({ where: { id, organizationId, editedAt: null }, data: { editedAt: new Date() } });
}

/** Create one draft policy with its number and first version; the one path every create goes through. */
async function createPolicyRecord(
  db: PrismaClient,
  args: {
    organizationId: string;
    userId: string;
    data: Omit<Prisma.AIPolicyUncheckedCreateInput, "organizationId" | "createdBy" | "number">;
    changeNotes: string;
  },
) {
  const policy = await db.$transaction(async (tx) => {
    const number = await nextPolicyNumber(tx, args.organizationId);
    const created = await tx.aIPolicy.create({
      data: { ...args.data, organizationId: args.organizationId, createdBy: args.userId, number },
    });
    if (created.content) {
      await tx.aIPolicyVersion.create({
        data: {
          policyId: created.id,
          version: 1,
          content: created.content,
          changeNotes: args.changeNotes,
          createdBy: args.userId,
        },
      });
    }
    return created;
  });
  return policy;
}

export const policyRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        type: policyTypeSchema.optional(),
        status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]).optional(),
        /** "written": the organization's own policies; "template": created from a template. */
        origin: z.enum(["written", "template"]).optional(),
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
            { description: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
        ...(input.origin === "template" && { provenance: "AUTO_TEMPLATE" as const }),
        ...(input.origin === "written" && { provenance: { not: "AUTO_TEMPLATE" as const } }),
      };

      await fillMissingPolicyNumbers(ctx.prisma, ctx.organization.id);
      const rows = await ctx.prisma.aIPolicy.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { versions: true, systemLinks: true } },
          systemLinks: { take: 3, select: { aiSystem: { select: { id: true, name: true } } } },
        },
      });

      let nextCursor: string | undefined;
      if (rows.length > input.limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem?.id;
      }

      const assignments = await resolvePolicyAssignments(ctx.prisma, ctx.organization.id, rows);
      const items = rows.map((row) => ({ ...row, ...assignments.get(row.id)! }));

      return { items, nextCursor };
    }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      await fillMissingPolicyNumbers(ctx.prisma, ctx.organization.id);
      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          versions: { orderBy: { version: "desc" } },
          systemLinks: {
            include: {
              aiSystem: { select: { id: true, name: true, status: true } },
            },
          },
        },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      const assignment = (await resolvePolicyAssignments(ctx.prisma, ctx.organization.id, [policy])).get(policy.id)!;
      return { ...policy, ...assignment, organizationName: ctx.organization.name };
    }),

  /**
   * The people and departments a policy can be assigned to. Open to every
   * member, like the department filter, so the pickers can be drawn.
   */
  assignmentOptions: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [members, departments] = await Promise.all([
        ctx.prisma.organizationMember.findMany({
          where: { organizationId: ctx.organization.id },
          orderBy: { joinedAt: "asc" },
          select: { id: true, user: { select: { name: true, email: true } } },
        }),
        ctx.prisma.businessUnit.findMany({
          where: { organizationId: ctx.organization.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true, parentId: true },
        }),
      ]);
      return {
        members: members.map((m) => ({ id: m.id, name: m.user.name || m.user.email || m.id })),
        departments,
      };
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        title: z.string().min(1).max(300),
        type: policyTypeSchema,
        description: z.string().optional(),
        content: z.string().optional(),
        effectiveDate: z.string().optional(),
        reviewDate: z.string().optional(),
        reviewIntervalMonths: reviewIntervalSchema.nullable().optional(),
        /** Set when the text came from an imported file (its name, for the record). */
        importedFrom: z.string().max(300).optional(),
        /** Set when the form started from a library template. */
        templateId: z.string().max(100).optional(),
        ...assignmentShape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertPilotRoom(ctx.prisma, ctx.organization.id, "policies", pilotLocale(ctx.getCookie));
      const assignment = await validatePolicyAssignment(ctx.prisma, ctx.organization.id, input);
      // A text started from a template is marked as such; when the person
      // changed it before saving, it already counts as worked on.
      const template = input.templateId
        ? findPolicyTemplate(input.templateId, promptLocale(ctx.getCookie("locale")))
        : undefined;
      const origin = template
        ? {
            provenance: "AUTO_TEMPLATE" as const,
            sourceRef: `library:${template.id}`,
            editedAt:
              template.content === (input.content ?? "") && template.title === input.title ? null : new Date(),
          }
        : input.importedFrom
          ? { sourceRef: `import:${input.importedFrom}` }
          : {};
      const policy = await createPolicyRecord(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        changeNotes: "Initial version",
        data: {
          title: input.title,
          type: input.type,
          description: input.description,
          content: input.content,
          effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
          reviewDate: input.reviewDate ? new Date(input.reviewDate) : undefined,
          reviewIntervalMonths: input.reviewIntervalMonths ?? null,
          ...origin,
          ...assignment,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: policy.id,
          action: "CREATE",
          changes: { title: input.title, type: input.type, ...(input.importedFrom && { importedFrom: input.importedFrom }) },
        },
      });

      return policy;
    }),

  /**
   * "Use this template": a draft from the template library. It is marked as
   * coming from a template, so it is counted apart until a person works on it.
   */
  createFromTemplate: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), templateId: z.string().max(100) }))
    .mutation(async ({ ctx, input }) => {
      const locale = promptLocale(ctx.getCookie("locale"));
      const template = findPolicyTemplate(input.templateId, locale);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      await assertPilotRoom(ctx.prisma, ctx.organization.id, "policies", pilotLocale(ctx.getCookie));

      const policy = await createPolicyRecord(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        changeNotes: "Initial version",
        data: {
          title: template.title,
          type: template.type,
          description: template.description,
          content: template.content,
          status: "DRAFT",
          provenance: "AUTO_TEMPLATE",
          sourceRef: `library:${template.id}`,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: policy.id,
          action: "CREATE",
          changes: { title: template.title, type: template.type, template: template.id },
        },
      });
      return policy;
    }),

  /** A new draft with the same text, type, owner and department, and no links or approvals. */
  duplicate: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      await assertPilotRoom(ctx.prisma, ctx.organization.id, "policies", pilotLocale(ctx.getCookie));

      const locale = promptLocale(ctx.getCookie("locale"));
      const prefix = locale === "es" ? "Copia de" : "Copy of";
      const policy = await createPolicyRecord(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        changeNotes: "Initial version",
        data: {
          title: `${prefix} ${source.title}`.slice(0, 300),
          type: source.type,
          description: source.description,
          content: source.content,
          status: "DRAFT",
          reviewIntervalMonths: source.reviewIntervalMonths,
          ownerMemberId: source.ownerMemberId,
          ownerName: source.ownerName,
          departmentId: source.departmentId,
          sourceRef: `duplicate:${source.id}`,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: policy.id,
          action: "CREATE",
          changes: { title: policy.title, duplicateOf: source.id },
        },
      });
      return policy;
    }),

  /**
   * Read a Word, PDF or text file and return its text for a new draft. Nothing
   * is stored: the form shows the text and the person saves it.
   */
  importFile: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        fileName: z.string().min(1).max(300),
        // Base64 of at most IMPORT_MAX_BYTES (4 characters per 3 bytes).
        dataBase64: z.string().max(Math.ceil((IMPORT_MAX_BYTES * 4) / 3) + 8),
      })
    )
    .mutation(async ({ input }) => {
      const bytes = new Uint8Array(Buffer.from(input.dataBase64, "base64"));
      try {
        return await importPolicyText(input.fileName, bytes);
      } catch (err) {
        if (err instanceof PolicyImportError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `import_${err.code}` });
        }
        throw err;
      }
    }),

  /**
   * Suggested edits from the AI assist. Runs only when the organization turned
   * the assist on (requireAi first: no prompt is built otherwise). Nothing is
   * applied; the suggestions are returned for a person to read.
   */
  suggestEdits: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const settings = await requireAi(ctx.prisma, ctx.organization.id);
      await assertAiRateLimit(ctx.prisma, ctx.organization.id);

      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, title: true, type: true, content: true },
      });
      if (!policy) throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      if (!policy.content?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Policy has no content" });

      const locale = promptLocale(ctx.getCookie("locale"));
      const result = await chatComplete({
        system: buildPolicyReviewSystemPrompt(locale),
        user: buildPolicyReviewUserPrompt({
          title: policy.title,
          typeLabel: policy.type,
          content: policy.content,
          jurisdictions: ctx.organization.operatingJurisdictions ?? [],
        }),
        maxTokens: 2048,
        lane: postureLane(settings.posture),
      });

      const generation = await recordGeneration(ctx.prisma, {
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
        feature: "policy_review",
        entityType: "AIPolicy",
        entityId: policy.id,
        model: result?.model ?? null,
        posture: settings.posture,
        promptTokens: result?.usage?.promptTokens ?? null,
        completionTokens: result?.usage?.completionTokens ?? null,
        totalTokens: result?.usage?.totalTokens ?? null,
        durationMs: result?.durationMs ?? null,
        status: result ? "ok" : "error",
      });
      if (!result) throw new TRPCError({ code: "BAD_GATEWAY", message: "ai_failed" });

      return { generationId: generation.id, model: result.model, content: result.content };
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        title: z.string().min(1).max(300).optional(),
        description: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        effectiveDate: z.string().nullable().optional(),
        reviewDate: z.string().nullable().optional(),
        reviewIntervalMonths: reviewIntervalSchema.nullable().optional(),
        status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]).optional(),
        ...assignmentShape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ownerMemberId, ownerName, departmentId, ...data } = input;

      // APPROVED and PUBLISHED are decisions: the same roles as approve and
      // publishVersion may set them here, nobody else. The working statuses
      // (draft, review, archive) stay open to every writer.
      if (
        data.status !== undefined &&
        (DECISION_STATUSES as readonly string[]).includes(data.status) &&
        !(POLICY_DECIDER_ROLES as readonly string[]).includes(ctx.membership.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins, and AI officers can approve or publish policies",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.effectiveDate !== undefined) {
        updateData.effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : null;
      }
      if (data.reviewDate !== undefined) {
        updateData.reviewDate = data.reviewDate ? new Date(data.reviewDate) : null;
      }
      if (data.reviewIntervalMonths !== undefined) updateData.reviewIntervalMonths = data.reviewIntervalMonths;
      Object.assign(
        updateData,
        await validatePolicyAssignment(ctx.prisma, ctx.organization.id, { ownerMemberId, ownerName, departmentId }),
      );

      // An approver's edit confirms the policy; anyone else's edit clears the
      // stamp until an approver confirms it (services/provenance/edit-stamp.ts).
      // Provenance keeps its historical origin.
      Object.assign(updateData, editConfirmation(ctx.membership.role, ctx.session.user.id));

      const result = await ctx.prisma.aIPolicy.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: updateData as never,
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }
      if (isSubstantiveEdit(data)) await touchEdited(ctx.prisma, ctx.organization.id, id);

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: id,
          action: "UPDATE",
          changes: updateData as Record<string, string | number | boolean | null>,
        },
      });

      return ctx.prisma.aIPolicy.findFirst({ where: { id, organizationId: ctx.organization.id } });
    }),

  publishVersion: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        changeNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // RBAC: OWNER, ADMIN, AI_OFFICER
      if (!(POLICY_DECIDER_ROLES as readonly string[]).includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins, and AI officers can publish policy versions",
        });
      }

      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      if (!policy.content) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Policy has no content to publish" });
      }

      const newVersion = policy.currentVersion + 1;

      // Create version record
      await ctx.prisma.aIPolicyVersion.create({
        data: {
          policyId: policy.id,
          version: newVersion,
          content: policy.content,
          changeNotes: input.changeNotes,
          createdBy: ctx.session.user.id,
        },
      });

      // Update policy
      // The review date follows from the interval the organization chose: the
      // published version is next reviewed that many months from today.
      const updated = await ctx.prisma.aIPolicy.update({
        where: { id: policy.id },
        data: {
          currentVersion: newVersion,
          status: "PUBLISHED",
          ...(policy.reviewIntervalMonths && {
            reviewDate: new Date(reviewDateAfter(new Date(), policy.reviewIntervalMonths)),
          }),
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: policy.id,
          action: "PUBLISH",
          changes: { version: newVersion, changeNotes: input.changeNotes },
        },
      });

      return updated;
    }),

  approve: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // RBAC: OWNER, ADMIN, AI_OFFICER
      if (!(POLICY_DECIDER_ROLES as readonly string[]).includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners, admins, and AI officers can approve policies",
        });
      }

      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      const updated = await ctx.prisma.aIPolicy.update({
        where: { id: policy.id },
        data: {
          status: "APPROVED",
          approvedBy: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: policy.id,
          action: "APPROVE",
          changes: { status: "APPROVED" },
        },
      });

      return updated;
    }),

  linkSystem: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        policyId: z.string(),
        aiSystemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify both policy and system belong to this organization
      const [policy, system] = await Promise.all([
        ctx.prisma.aIPolicy.findFirst({
          where: { id: input.policyId, organizationId: ctx.organization.id },
          select: { id: true },
        }),
        ctx.prisma.aISystem.findFirst({
          where: { id: input.aiSystemId, organizationId: ctx.organization.id },
          select: { id: true },
        }),
      ]);

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }
      if (!system) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
      }

      const link = await ctx.prisma.aIPolicySystemLink.create({
        data: {
          policyId: input.policyId,
          aiSystemId: input.aiSystemId,
        },
      });
      await touchEdited(ctx.prisma, ctx.organization.id, input.policyId);
      return link;
    }),

  unlinkSystem: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        policyId: z.string(),
        aiSystemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the policy belongs to this organization
      const policy = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.policyId, organizationId: ctx.organization.id },
        select: { id: true },
      });

      if (!policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      const removed = await ctx.prisma.aIPolicySystemLink.deleteMany({
        where: {
          policyId: input.policyId,
          aiSystemId: input.aiSystemId,
        },
      });
      await touchEdited(ctx.prisma, ctx.organization.id, input.policyId);
      return removed;
    }),

  /**
   * Owners and admins only. Its versions and system links go with it. An
   * organisation-wide hold, or a hold on any system the policy is linked to,
   * refuses the deletion.
   */
  delete: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCanDeleteRecords(ctx.membership.role);

      const existing = await ctx.prisma.aIPolicy.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, title: true, status: true, systemLinks: { select: { aiSystemId: true } } },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      await assertNotOnHold(ctx.prisma, ctx.organization.id);
      for (const aiSystemId of new Set(existing.systemLinks.map((l) => l.aiSystemId))) {
        await assertNotOnHold(ctx.prisma, ctx.organization.id, { aiSystemId });
      }

      await ctx.prisma.aIPolicy.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "AIPolicy",
          entityId: input.id,
          action: "DELETE",
          changes: { title: existing.title, status: existing.status },
        },
      });

      return { deleted: true };
    }),

  getStats: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const org = { organizationId: ctx.organization.id };
      const [total, draft, published, archived, reviewDue, fromTemplates, toReview] = await Promise.all([
        ctx.prisma.aIPolicy.count({
          where: { organizationId: ctx.organization.id },
        }),
        ctx.prisma.aIPolicy.count({
          where: { organizationId: ctx.organization.id, status: "DRAFT" },
        }),
        ctx.prisma.aIPolicy.count({
          where: { organizationId: ctx.organization.id, status: "PUBLISHED" },
        }),
        ctx.prisma.aIPolicy.count({
          where: { organizationId: ctx.organization.id, status: "ARCHIVED" },
        }),
        ctx.prisma.aIPolicy.count({
          where: {
            organizationId: ctx.organization.id,
            reviewDate: { lte: thirtyDaysFromNow, gte: now },
            status: { not: "ARCHIVED" },
          },
        }),
        ctx.prisma.aIPolicy.count({ where: { ...org, provenance: "AUTO_TEMPLATE" } }),
        ctx.prisma.aIPolicy.count({
          where: { ...org, provenance: "AUTO_TEMPLATE", status: "DRAFT", confirmedAt: null, editedAt: null },
        }),
      ]);

      return {
        total,
        draft,
        published,
        archived,
        reviewDue,
        writtenHere: total - fromTemplates,
        fromTemplates,
        toReview,
      };
    }),

  /** The titles in use, so the template library can mark the templates already adopted. */
  titles: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const rows = await ctx.prisma.aIPolicy.findMany({
        where: { organizationId: ctx.organization.id },
        select: { title: true },
      });
      return rows.map((r) => r.title);
    }),

  /** How many template drafts nobody has edited could be removed in one step. */
  templateDraftsPlan: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const remove = await ctx.prisma.aIPolicy.count({
        where: { organizationId: ctx.organization.id, ...REMOVABLE_TEMPLATE_DRAFT_WHERE },
      });
      return { remove };
    }),

  /**
   * Remove the template drafts nobody has edited, confirmed or moved on from
   * draft. Everything a person worked on stays. A legal hold refuses it, and
   * it is recorded in the audit trail.
   */
  removeTemplateDrafts: orgWriteProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx }) => {
      if (!(TEMPLATE_REMOVER_ROLES as readonly string[]).includes(ctx.membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to remove template drafts" });
      }
      const candidates = await ctx.prisma.aIPolicy.findMany({
        where: { organizationId: ctx.organization.id, ...REMOVABLE_TEMPLATE_DRAFT_WHERE },
        select: { id: true, systemLinks: { select: { aiSystemId: true } } },
      });
      await assertNotOnHold(ctx.prisma, ctx.organization.id, { what: "template drafts" });
      for (const aiSystemId of new Set(candidates.flatMap((c) => c.systemLinks.map((l) => l.aiSystemId)))) {
        await assertNotOnHold(ctx.prisma, ctx.organization.id, { aiSystemId, what: "template drafts" });
      }
      const ids = candidates.map((c) => c.id);
      if (ids.length === 0) return { removed: 0 };

      await ctx.prisma.$transaction(async (tx) => {
        await tx.aIPolicy.deleteMany({
          where: { id: { in: ids }, organizationId: ctx.organization.id, ...REMOVABLE_TEMPLATE_DRAFT_WHERE },
        });
        await tx.auditLog.create({
          data: {
            organizationId: ctx.organization.id,
            userId: ctx.session.user.id,
            entityType: "AIPolicy",
            entityId: ctx.organization.id,
            action: "DELETE_TEMPLATE_DRAFTS",
            changes: { removed: ids.length },
          },
        });
      });
      return { removed: ids.length };
    }),
});
