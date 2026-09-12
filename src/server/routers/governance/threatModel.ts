// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Threat models: map, imagine, prioritise, control, test.
 *
 * The point of this router is that almost nothing has to be typed. Say what
 * the system can see, retrieve, remember, call and do, and the scenarios that
 * follow are proposed with their controls and a test for each. The team's work
 * is arguing with the list, not writing it.
 *
 * Priority is derived, never accepted from the client: two teams with the same
 * ratings get the same answer, and the rule is versioned.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import {
  CAPABILITY_IDS,
  CONTROL_LAYERS,
  SCENARIO_CATEGORIES,
  SCENARIO_LIBRARY,
  TEST_RESULTS,
  controlState,
  priorityFor,
  suggestScenarios,
} from "@/config/threat-model";
import { assertNotOnHold } from "../../services/legal-hold";

const capabilityEnum = z.enum(CAPABILITY_IDS as [string, ...string[]]);
const levelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
const blastEnum = z.enum(["LIMITED", "SIGNIFICANT", "SEVERE"]);
const categoryEnum = z.enum([
  "DISCLOSURE",
  "ACCURACY",
  "MANIPULATION",
  "AUTHORITY",
  "HARM",
  "DETECTION",
  "CHAINS",
]);
const layerEnum = z.enum(["PREVENT", "CONSTRAIN", "DETECT", "RESPOND", "ASSURE"]);
const statusEnum = z.enum(["OPEN", "MITIGATED", "ACCEPTED", "OUT_OF_SCOPE"]);

/** The config uses lower case; the database uses the Prisma enum. */
const toDbCategory = (c: string) => c.toUpperCase() as z.infer<typeof categoryEnum>;
const toDbLayer = (l: string) => l.toUpperCase() as z.infer<typeof layerEnum>;

export const threatModelRouter = createTRPCRouter({
  list: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const rows = await ctx.prisma.threatModel.findMany({
        where: { organizationId: ctx.organization.id },
        orderBy: { updatedAt: "desc" },
        include: {
          aiSystem: { select: { id: true, name: true } },
          scenarios: {
            select: {
              id: true,
              priority: true,
              status: true,
              controls: {
                select: {
                  id: true,
                  implemented: true,
                  tests: { orderBy: { testedAt: "desc" }, take: 1 },
                },
              },
            },
          },
        },
      });

      const now = new Date();
      return rows.map((m) => {
        const scenarios = m.scenarios;
        const controls = scenarios.flatMap((s) => s.controls);
        const proven = controls.filter((c) => {
          const last = c.tests[0];
          return controlState(last?.result ?? null, last?.testedAt ?? null, now) === "proven";
        }).length;

        return {
          id: m.id,
          name: m.name,
          status: m.status,
          capabilities: m.capabilities,
          aiSystem: m.aiSystem,
          updatedAt: m.updatedAt,
          reviewedAt: m.reviewedAt,
          nextReviewDue: m.nextReviewDue,
          counts: {
            scenarios: scenarios.length,
            actNow: scenarios.filter((s) => s.priority === "ACT_NOW" && s.status === "OPEN").length,
            open: scenarios.filter((s) => s.status === "OPEN").length,
            controls: controls.length,
            proven,
            untested: controls.length - proven,
          },
        };
      });
    }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const model = await ctx.prisma.threatModel.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          aiSystem: { select: { id: true, name: true } },
          scenarios: {
            orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
            include: {
              controls: {
                orderBy: { createdAt: "asc" },
                include: { tests: { orderBy: { testedAt: "desc" } } },
              },
            },
          },
        },
      });
      if (!model) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Threat model not found" });
      }

      // What the library would propose that is not already on the board. The
      // team should always be able to see what it has not considered.
      const taken = new Set(model.scenarios.map((s) => s.libraryId).filter(Boolean));
      const proposed = suggestScenarios(model.capabilities).filter((s) => !taken.has(s.id));

      return { ...model, proposed };
    }),

  /** What the library would propose for a set of capabilities, before saving. */
  preview: organizationProcedure
    .input(
      z.object({ organizationId: z.string(), capabilities: z.array(capabilityEnum).max(40) }),
    )
    .query(({ input }) => suggestScenarios(input.capabilities)),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(200),
        systemSummary: z.string().max(2000).optional(),
        aiSystemId: z.string().optional(),
        capabilities: z.array(capabilityEnum).max(40).default([]),
        /** Add every proposed scenario straight away. */
        acceptProposed: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.aiSystemId) {
        const system = await ctx.prisma.aISystem.findFirst({
          where: { id: input.aiSystemId, organizationId: ctx.organization.id },
          select: { id: true },
        });
        if (!system) {
          throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
        }
      }

      const model = await ctx.prisma.threatModel.create({
        data: {
          organizationId: ctx.organization.id,
          name: input.name,
          systemSummary: input.systemSummary,
          aiSystemId: input.aiSystemId,
          capabilities: input.capabilities,
          createdBy: ctx.session.user.id,
        },
      });

      let added = 0;
      if (input.acceptProposed && input.capabilities.length > 0) {
        added = await addLibraryScenarios(
          ctx.prisma,
          ctx.organization.id,
          model.id,
          ctx.session.user.id,
          suggestScenarios(input.capabilities).map((s) => s.id),
        );
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ThreatModel",
          entityId: model.id,
          action: "CREATE",
          changes: {
            name: input.name,
            capabilities: input.capabilities,
            scenariosAdded: added,
          },
        },
      });

      return { ...model, scenariosAdded: added };
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        systemSummary: z.string().max(2000).nullable().optional(),
        capabilities: z.array(capabilityEnum).max(40).optional(),
        status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
        nextReviewDue: z.date().nullable().optional(),
        markReviewed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.threatModel.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, capabilities: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Threat model not found" });
      }

      const { organizationId: _org, id, markReviewed, ...data } = input;

      await ctx.prisma.threatModel.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: {
          ...data,
          ...(markReviewed ? { reviewedAt: new Date() } : {}),
        } as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ThreatModel",
          entityId: id,
          action: "UPDATE",
          changes: {
            fields: Object.keys(data),
            ...(data.capabilities
              ? { capabilitiesBefore: existing.capabilities, capabilitiesAfter: data.capabilities }
              : {}),
          },
        },
      });

      return { ok: true };
    }),

  /** Add proposed scenarios from the library, with their controls and tests. */
  addFromLibrary: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        threatModelId: z.string(),
        libraryIds: z.array(z.string()).min(1).max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const model = await ctx.prisma.threatModel.findFirst({
        where: { id: input.threatModelId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!model) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Threat model not found" });
      }

      const added = await addLibraryScenarios(
        ctx.prisma,
        ctx.organization.id,
        input.threatModelId,
        ctx.session.user.id,
        input.libraryIds,
      );

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ThreatModel",
          entityId: input.threatModelId,
          action: "UPDATE",
          changes: { scenariosAdded: added, libraryIds: input.libraryIds },
        },
      });

      return { added };
    }),

  addScenario: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        threatModelId: z.string(),
        category: categoryEnum,
        title: z.string().min(1).max(300),
        description: z.string().max(3000).optional(),
        impact: levelEnum.default("MEDIUM"),
        likelihood: levelEnum.default("MEDIUM"),
        blastRadius: blastEnum.default("LIMITED"),
        owner: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const model = await ctx.prisma.threatModel.findFirst({
        where: { id: input.threatModelId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!model) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Threat model not found" });
      }

      const { organizationId: _org, ...data } = input;
      const priority = priorityFor(input.impact, input.likelihood, input.blastRadius).priority;

      const created = await ctx.prisma.threatScenario.create({
        data: {
          ...data,
          priority,
          organizationId: ctx.organization.id,
          createdBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ThreatScenario",
          entityId: created.id,
          action: "CREATE",
          changes: { title: input.title, category: input.category, priority },
        },
      });

      return created;
    }),

  updateScenario: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(3000).nullable().optional(),
        impact: levelEnum.optional(),
        likelihood: levelEnum.optional(),
        blastRadius: blastEnum.optional(),
        status: statusEnum.optional(),
        decisionNote: z.string().max(3000).nullable().optional(),
        owner: z.string().max(200).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.threatScenario.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, impact: true, likelihood: true, blastRadius: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }

      // Accepting a risk without saying why is the sentence that reads worst
      // two years later, so the server refuses it.
      const nextStatus = input.status ?? existing.status;
      if (
        (nextStatus === "ACCEPTED" || nextStatus === "OUT_OF_SCOPE") &&
        input.decisionNote !== undefined &&
        !input.decisionNote?.trim()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Say why this risk is accepted or out of scope.",
        });
      }

      const { organizationId: _org, id, ...data } = input;
      const priority = priorityFor(
        input.impact ?? existing.impact,
        input.likelihood ?? existing.likelihood,
        input.blastRadius ?? existing.blastRadius,
      ).priority;

      await ctx.prisma.threatScenario.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: { ...data, priority } as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ThreatScenario",
          entityId: id,
          action: "UPDATE",
          changes: { fields: Object.keys(data), priority },
        },
      });

      return { ok: true, priority };
    }),

  addControl: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
        layer: layerEnum,
        description: z.string().min(1).max(3000),
        howToTest: z.string().max(3000).optional(),
        owner: z.string().max(200).optional(),
        implemented: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scenario = await ctx.prisma.threatScenario.findFirst({
        where: { id: input.scenarioId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!scenario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }

      const { organizationId: _org, ...data } = input;

      const created = await ctx.prisma.threatControl.create({
        data: {
          ...data,
          implementedAt: input.implemented ? new Date() : null,
          organizationId: ctx.organization.id,
          createdBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ThreatControl",
          entityId: created.id,
          action: "CREATE",
          changes: { layer: input.layer, scenarioId: input.scenarioId },
        },
      });

      return created;
    }),

  updateControl: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        description: z.string().min(1).max(3000).optional(),
        howToTest: z.string().max(3000).nullable().optional(),
        owner: z.string().max(200).nullable().optional(),
        implemented: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.threatControl.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, implemented: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Control not found" });
      }

      const { organizationId: _org, id, ...data } = input;

      await ctx.prisma.threatControl.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: {
          ...data,
          ...(input.implemented !== undefined && input.implemented !== existing.implemented
            ? { implementedAt: input.implemented ? new Date() : null }
            : {}),
        } as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ThreatControl",
          entityId: id,
          action: "UPDATE",
          changes: { fields: Object.keys(data) },
        },
      });

      return { ok: true };
    }),

  /** Record an attempt to break the control. Appended, never edited. */
  recordTest: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        controlId: z.string(),
        method: z.string().min(1).max(3000),
        result: z.enum(TEST_RESULTS),
        notes: z.string().max(3000).optional(),
        evidenceRef: z.string().max(500).optional(),
        testedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const control = await ctx.prisma.threatControl.findFirst({
        where: { id: input.controlId, organizationId: ctx.organization.id },
        select: { id: true, scenarioId: true },
      });
      if (!control) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Control not found" });
      }

      const { organizationId: _org, ...data } = input;

      const created = await ctx.prisma.controlTest.create({
        data: {
          ...data,
          organizationId: ctx.organization.id,
          testedBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ControlTest",
          entityId: created.id,
          action: "CREATE",
          changes: {
            controlId: input.controlId,
            result: input.result,
            scenarioId: control.scenarioId,
          },
        },
      });

      return created;
    }),

  delete: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.threatModel.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, name: true, aiSystemId: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Threat model not found" });
      }
      await assertNotOnHold(ctx.prisma, ctx.organization.id, {
        aiSystemId: existing.aiSystemId,
      });

      await ctx.prisma.threatModel.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ThreatModel",
          entityId: input.id,
          action: "DELETE",
          changes: { name: existing.name },
        },
      });

      return { deleted: true };
    }),
});

/**
 * Materialise library scenarios, with a control per suggestion and the test
 * carried onto the control. This is the automation: one click turns "it can
 * issue refunds" into a scenario, three controls and a test to run.
 */
async function addLibraryScenarios(
  prisma: PrismaClient,
  organizationId: string,
  threatModelId: string,
  userId: string,
  libraryIds: string[],
): Promise<number> {
  const existing = await prisma.threatScenario.findMany({
    where: { threatModelId, organizationId },
    select: { libraryId: true },
  });
  const taken = new Set(existing.map((e) => e.libraryId).filter(Boolean));

  let added = 0;
  for (const libraryId of libraryIds) {
    if (taken.has(libraryId)) continue;
    const entry = SCENARIO_LIBRARY.find((s) => s.id === libraryId);
    if (!entry) continue;

    const priority = priorityFor(
      entry.defaults.impact,
      entry.defaults.likelihood,
      entry.defaults.blastRadius,
    ).priority;

    const scenario = await prisma.threatScenario.create({
      data: {
        organizationId,
        threatModelId,
        libraryId: entry.id,
        category: toDbCategory(entry.category),
        title: entry.title.en,
        description: entry.story.en,
        impact: entry.defaults.impact,
        likelihood: entry.defaults.likelihood,
        blastRadius: entry.defaults.blastRadius,
        priority,
        createdBy: userId,
      },
    });

    for (const control of entry.controls) {
      await prisma.threatControl.create({
        data: {
          organizationId,
          scenarioId: scenario.id,
          layer: toDbLayer(control.layer),
          description: control.text.en,
          howToTest: entry.test.en,
          createdBy: userId,
        },
      });
    }
    added += 1;
  }
  return added;
}
