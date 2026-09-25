// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AIUC-1 test evidence, per AI agent.
 *
 * Reuses the compliance register: a test is a TEST_RESULT evidence row on the
 * agent's mapping to the requirement, an accepted partial an APPROVAL row that
 * names the test, "not applicable" the mapping's own status with the reason
 * in its notes. The rules that read them are in src/config/aiuc1-evidence.ts.
 *
 * Recording a test never changes the mapping's status: a test result is
 * evidence, and the compliance status stays a person's call on the
 * compliance page (the register's rule: nothing sets COMPLIANT on its own).
 * Rows are appended, never edited; compliance.removeEvidence refuses them.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import {
  AIUC1_CODES,
  AIUC1_TEST_RESULTS,
  acceptanceEvidenceRow,
  agentReadiness,
  isAgentSystem,
  requirementState,
  testEvidenceRow,
} from "@/config/aiuc1-evidence";
import { aiuc1RequirementId } from "@/config/aiuc1-requirements";
import {
  AIUC1_FRAMEWORK_CODE,
  aiuc1Seeded,
  loadAgentRows,
  loadAgentsWithReadiness,
} from "../../services/aiuc1/readiness";

/** Accepting a partial result and ruling a requirement out are decisions. */
const DECISION_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

function assertDecider(role: string) {
  if (!DECISION_ROLES.includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This decision needs an owner, admin or AI officer role.",
    });
  }
}

const codeEnum = z.enum(AIUC1_CODES);

/** The agent, in this organisation, or NOT_FOUND / BAD_REQUEST. */
async function ownedAgent(prisma: PrismaClient, organizationId: string, aiSystemId: string) {
  const system = await prisma.aISystem.findFirst({
    where: { id: aiSystemId, organizationId },
    select: {
      id: true,
      name: true,
      technique: true,
      status: true,
      agentProfile: { select: { autonomy: true } },
    },
  });
  if (!system) throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
  const agent = {
    id: system.id,
    name: system.name,
    technique: system.technique,
    status: system.status,
    autonomy: system.agentProfile?.autonomy ?? null,
  };
  return { agent, isAgent: isAgentSystem(agent) };
}

/** The seeded requirement row for a code, or a clear error on an instance without AIUC-1. */
async function requirementRow(prisma: PrismaClient, code: string) {
  const row = await prisma.complianceRequirement.findFirst({
    where: { id: aiuc1RequirementId(code), framework: { code: AIUC1_FRAMEWORK_CODE } },
    select: { id: true },
  });
  if (!row) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "AIUC-1 is not loaded on this instance yet (run the framework seed).",
    });
  }
  return row;
}

/** Names for the people who recorded, for display. Only members of this organisation. */
async function memberNames(
  prisma: PrismaClient,
  organizationId: string,
  ids: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: unique }, organizationMemberships: { some: { organizationId } } },
    select: { id: true, name: true, email: true },
  });
  return Object.fromEntries(users.map((u) => [u.id, u.name || u.email || u.id]));
}

export const aiuc1Router = createTRPCRouter({
  /** Every agent in the organisation, with its readiness. */
  agents: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [agents, seeded] = await Promise.all([
        loadAgentsWithReadiness(ctx.prisma, ctx.organization.id),
        aiuc1Seeded(ctx.prisma),
      ]);
      return {
        seeded,
        agents: agents.map((a) => ({
          id: a.id,
          name: a.name,
          technique: a.technique,
          status: a.status,
          autonomy: a.autonomy,
          overall: a.readiness.overall,
          domains: a.readiness.domains.map(({ requirements: _r, ...tally }) => tally),
        })),
      };
    }),

  /** One agent: the six domains, each requirement's state and its evidence. */
  agent: organizationProcedure
    .input(z.object({ organizationId: z.string(), aiSystemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { agent, isAgent } = await ownedAgent(ctx.prisma, ctx.organization.id, input.aiSystemId);
      const [rows, seeded] = await Promise.all([
        loadAgentRows(ctx.prisma, ctx.organization.id, [agent.id]),
        aiuc1Seeded(ctx.prisma),
      ]);
      const readiness = agentReadiness(rows.get(agent.id) ?? new Map(), new Date());
      const people = await memberNames(
        ctx.prisma,
        ctx.organization.id,
        readiness.domains.flatMap((d) =>
          d.requirements.flatMap((r) => [
            ...r.tests.map((t) => t.recordedBy),
            ...(r.acceptance ? [r.acceptance.acceptedBy] : []),
            ...r.otherEvidence.map((e) => e.addedBy),
          ]),
        ),
      );
      return {
        agent,
        isAgent,
        seeded,
        people,
        overall: readiness.overall,
        domains: readiness.domains.map((d) => ({
          ...d,
          requirements: d.requirements.map(({ requirement, ...view }) => ({
            ...view,
            title: requirement.title,
            paraphrase: requirement.paraphrase,
            application: requirement.application,
            capabilities: [...requirement.capabilities],
            path: requirement.path,
          })),
        })),
      };
    }),

  /** Append one test to a requirement. */
  recordTest: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        code: codeEnum,
        method: z.string().trim().min(10).max(3000),
        result: z.enum(AIUC1_TEST_RESULTS),
        observed: z.string().max(3000).optional(),
        evidenceRef: z.string().max(500).optional(),
        performedBy: z.string().max(200).optional(),
        testedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { agent, isAgent } = await ownedAgent(ctx.prisma, ctx.organization.id, input.aiSystemId);
      if (!isAgent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "AIUC-1 tests are recorded for AI agents only.",
        });
      }
      const now = new Date();
      const testedAt = input.testedAt ?? now;
      // A few minutes of clock difference between browser and server is fine;
      // a test dated in the future is not.
      if (testedAt.getTime() > now.getTime() + 5 * 60_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A test cannot be dated in the future." });
      }
      const requirement = await requirementRow(ctx.prisma, input.code);

      // The unique key (aiSystemId, requirementId) is not org-scoped; the
      // system was checked above. Created as NOT_ASSESSED; an existing
      // mapping's status is left as it is.
      const mapping = await ctx.prisma.complianceMapping.upsert({
        where: { aiSystemId_requirementId: { aiSystemId: agent.id, requirementId: requirement.id } },
        update: {},
        create: {
          organizationId: ctx.organization.id,
          aiSystemId: agent.id,
          requirementId: requirement.id,
          status: "NOT_ASSESSED",
        },
        select: { id: true },
      });

      const row = testEvidenceRow({
        code: input.code,
        method: input.method,
        result: input.result,
        observed: input.observed ?? null,
        evidenceRef: input.evidenceRef ?? null,
        performedBy: input.performedBy ?? null,
        testedAt,
      });
      const evidence = await ctx.prisma.complianceEvidence.create({
        data: {
          complianceMappingId: mapping.id,
          organizationId: ctx.organization.id,
          ...row,
          addedBy: ctx.session.user.id,
        },
        select: { id: true },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ComplianceEvidence",
          entityId: evidence.id,
          action: "AIUC1_TEST_RECORDED",
          changes: {
            aiSystemId: agent.id,
            code: input.code,
            result: input.result,
            testedAt: testedAt.toISOString(),
          },
        },
      });

      return evidence;
    }),

  /** Accept the latest test of a requirement when it is a partial, with a reason. */
  acceptPartial: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        aiSystemId: z.string(),
        code: codeEnum,
        testId: z.string(),
        reason: z.string().trim().min(10).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDecider(ctx.membership.role);
      const { agent } = await ownedAgent(ctx.prisma, ctx.organization.id, input.aiSystemId);
      const mapping = await ctx.prisma.complianceMapping.findFirst({
        where: {
          organizationId: ctx.organization.id,
          aiSystemId: agent.id,
          requirementId: aiuc1RequirementId(input.code),
        },
        select: {
          id: true,
          status: true,
          notes: true,
          evidenceItems: {
            where: { organizationId: ctx.organization.id },
            select: { id: true, type: true, title: true, url: true, description: true, addedBy: true, addedAt: true },
          },
        },
      });
      if (!mapping) throw new TRPCError({ code: "NOT_FOUND", message: "No test recorded" });

      const view = requirementState(
        { code: input.code, mappingStatus: mapping.status, mappingNotes: mapping.notes, evidence: mapping.evidenceItems },
        new Date(),
      );
      // Only the latest test can be accepted, only when it is a partial, and
      // only once: an older partial has been superseded by what came after.
      if (!view.latest || view.latest.id !== input.testId || view.latest.result !== "PARTIAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only the latest test, when it is a partial result, can be accepted.",
        });
      }
      if (view.acceptance) {
        throw new TRPCError({ code: "CONFLICT", message: "This partial result is already accepted." });
      }

      const evidence = await ctx.prisma.complianceEvidence.create({
        data: {
          complianceMappingId: mapping.id,
          organizationId: ctx.organization.id,
          ...acceptanceEvidenceRow({ code: input.code, testId: input.testId, reason: input.reason }),
          addedBy: ctx.session.user.id,
        },
        select: { id: true },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ComplianceEvidence",
          entityId: evidence.id,
          action: "AIUC1_PARTIAL_ACCEPTED",
          changes: { aiSystemId: agent.id, code: input.code, testId: input.testId },
        },
      });

      return evidence;
    }),

  /**
   * Mark a requirement not applicable to this agent, with the reason, or
   * undo it. The mapping's status is the record; the reason is its notes.
   */
  setApplicability: orgWriteProcedure
    .input(
      z.discriminatedUnion("applicable", [
        z.object({
          organizationId: z.string(),
          aiSystemId: z.string(),
          code: codeEnum,
          applicable: z.literal(false),
          reason: z.string().trim().min(10).max(2000),
        }),
        z.object({
          organizationId: z.string(),
          aiSystemId: z.string(),
          code: codeEnum,
          applicable: z.literal(true),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      assertDecider(ctx.membership.role);
      const { agent, isAgent } = await ownedAgent(ctx.prisma, ctx.organization.id, input.aiSystemId);
      if (!isAgent) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "AIUC-1 applies to AI agents only." });
      }
      const requirement = await requirementRow(ctx.prisma, input.code);
      const key = { aiSystemId_requirementId: { aiSystemId: agent.id, requirementId: requirement.id } };
      const stamp = {
        assessedBy: ctx.session.user.id,
        assessedAt: new Date(),
        confirmedBy: ctx.session.user.id,
        confirmedAt: new Date(),
      };

      let mappingId: string;
      if (!input.applicable) {
        const mapping = await ctx.prisma.complianceMapping.upsert({
          where: key,
          update: { status: "NOT_APPLICABLE", notes: input.reason, ...stamp },
          create: {
            organizationId: ctx.organization.id,
            aiSystemId: agent.id,
            requirementId: requirement.id,
            status: "NOT_APPLICABLE",
            notes: input.reason,
            ...stamp,
          },
          select: { id: true },
        });
        mappingId = mapping.id;
      } else {
        // Undo only what this action does: a requirement marked not applicable
        // goes back to not assessed. Any other status is a person's finding
        // and is left alone.
        const existing = await ctx.prisma.complianceMapping.findFirst({
          where: { organizationId: ctx.organization.id, aiSystemId: agent.id, requirementId: requirement.id },
          select: { id: true, status: true },
        });
        if (!existing || existing.status !== "NOT_APPLICABLE") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This requirement is not marked not applicable." });
        }
        await ctx.prisma.complianceMapping.update({
          where: { id: existing.id },
          data: { status: "NOT_ASSESSED", notes: null, ...stamp },
        });
        mappingId = existing.id;
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ComplianceMapping",
          entityId: mappingId,
          action: input.applicable ? "AIUC1_APPLICABLE_AGAIN" : "AIUC1_NOT_APPLICABLE",
          changes: {
            aiSystemId: agent.id,
            code: input.code,
            ...(input.applicable ? {} : { reason: input.reason }),
          },
        },
      });

      return { id: mappingId };
    }),
});
