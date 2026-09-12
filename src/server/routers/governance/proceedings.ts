// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Proceedings: every inquiry, enforcement action and claim, in one register.
 *
 * One incident becomes several proceedings across several jurisdictions. The
 * risk is rarely any single case; it is that the factual position taken in one
 * is read in another. The register keeps each proceeding with its authority,
 * reference, deadlines, correspondence and the factual position taken, so a
 * divergence is visible here rather than in an opponent's exhibit.
 *
 * Events are appended. Deleting a proceeding is refused once it has events: a
 * proceeding with a history is a record, and it is closed rather than removed.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { JURISDICTION_IDS } from "@/config/jurisdictions";
import { assertNotOnHold } from "../../services/legal-hold";

const TYPES = [
  "INQUIRY",
  "INVESTIGATION",
  "ENFORCEMENT",
  "CONSENT_ORDER",
  "MARKET_SURVEILLANCE",
  "CIVIL_LITIGATION",
  "CLASS_ACTION",
  "REPRESENTATIVE_ACTION",
  "SECURITIES_CLAIM",
  "DERIVATIVE_CLAIM",
  "OTHER",
] as const;

const STATUSES = [
  "MONITORING",
  "OPEN",
  "RESPONDING",
  "DECIDED",
  "APPEALED",
  "CLOSED",
] as const;

const EVENT_KINDS = [
  "RECEIVED",
  "SENT",
  "FILING",
  "DEADLINE",
  "DECISION",
  "MEETING",
  "NOTE",
] as const;

const OPEN_STATUSES = ["MONITORING", "OPEN", "RESPONDING", "APPEALED"];

export const proceedingsRouter = createTRPCRouter({
  list: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        includeClosed: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.regulatoryProceeding.findMany({
        where: {
          organizationId: ctx.organization.id,
          ...(input.includeClosed ? {} : { status: { in: OPEN_STATUSES as never } }),
        },
        orderBy: [{ status: "asc" }, { openedAt: "desc" }],
        include: {
          incident: { select: { id: true, title: true } },
          aiSystem: { select: { id: true, name: true } },
          events: {
            where: { completedAt: null, dueAt: { not: null } },
            orderBy: { dueAt: "asc" },
            take: 1,
          },
          _count: { select: { events: true } },
        },
      });

      return rows.map((r) => ({
        ...r,
        nextDeadline: r.events[0] ?? null,
        // Two proceedings whose recorded factual position differs are the
        // thing this register exists to surface. The comparison is left to a
        // person; the flag is only that both have stated one.
        hasPosition: !!r.positionSummary?.trim(),
      }));
    }),

  getById: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.prisma.regulatoryProceeding.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: {
          incident: { select: { id: true, title: true } },
          aiSystem: { select: { id: true, name: true } },
          events: { orderBy: [{ dueAt: "asc" }, { occurredAt: "desc" }] },
        },
      });
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceeding not found" });
      }
      return row;
    }),

  /** The open deadlines across every proceeding, soonest first. */
  upcomingDeadlines: organizationProcedure
    .input(z.object({ organizationId: z.string(), limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.proceedingEvent.findMany({
        where: {
          organizationId: ctx.organization.id,
          completedAt: null,
          dueAt: { not: null },
        },
        orderBy: { dueAt: "asc" },
        take: input.limit,
        include: {
          proceeding: { select: { id: true, title: true, authority: true, status: true } },
        },
      });
      return rows;
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        title: z.string().min(1).max(300),
        authority: z.string().min(1).max(200),
        jurisdiction: z.enum(JURISDICTION_IDS).optional(),
        type: z.enum(TYPES).default("INQUIRY"),
        status: z.enum(STATUSES).default("MONITORING"),
        reference: z.string().max(200).optional(),
        openedAt: z.date().optional(),
        summary: z.string().max(5000).optional(),
        originNote: z.string().max(5000).optional(),
        externalCounsel: z.string().max(200).optional(),
        incidentId: z.string().optional(),
        aiSystemId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.incidentId) {
        const incident = await ctx.prisma.aIIncident.findFirst({
          where: { id: input.incidentId, organizationId: ctx.organization.id },
          select: { id: true },
        });
        if (!incident) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found" });
        }
      }
      if (input.aiSystemId) {
        const system = await ctx.prisma.aISystem.findFirst({
          where: { id: input.aiSystemId, organizationId: ctx.organization.id },
          select: { id: true },
        });
        if (!system) {
          throw new TRPCError({ code: "NOT_FOUND", message: "AI system not found" });
        }
      }

      const { organizationId: _org, ...data } = input;

      const created = await ctx.prisma.regulatoryProceeding.create({
        data: {
          ...data,
          organizationId: ctx.organization.id,
          createdBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "RegulatoryProceeding",
          entityId: created.id,
          action: "CREATE",
          changes: {
            title: input.title,
            authority: input.authority,
            type: input.type,
            jurisdiction: input.jurisdiction ?? null,
          },
        },
      });

      return created;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        title: z.string().min(1).max(300).optional(),
        authority: z.string().min(1).max(200).optional(),
        jurisdiction: z.enum(JURISDICTION_IDS).nullable().optional(),
        type: z.enum(TYPES).optional(),
        status: z.enum(STATUSES).optional(),
        reference: z.string().max(200).nullable().optional(),
        openedAt: z.date().nullable().optional(),
        closedAt: z.date().nullable().optional(),
        summary: z.string().max(5000).nullable().optional(),
        positionSummary: z.string().max(5000).nullable().optional(),
        originNote: z.string().max(5000).nullable().optional(),
        externalCounsel: z.string().max(200).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.regulatoryProceeding.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceeding not found" });
      }

      const { organizationId: _org, id, ...data } = input;

      await ctx.prisma.regulatoryProceeding.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: data as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "RegulatoryProceeding",
          entityId: id,
          action: "UPDATE",
          changes: {
            fields: Object.keys(data),
            ...(data.status ? { from: existing.status, to: data.status } : {}),
          },
        },
      });

      return { ok: true };
    }),

  addEvent: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        proceedingId: z.string(),
        kind: z.enum(EVENT_KINDS).default("NOTE"),
        title: z.string().min(1).max(300),
        detail: z.string().max(5000).optional(),
        occurredAt: z.date().optional(),
        dueAt: z.date().optional(),
        reference: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const proceeding = await ctx.prisma.regulatoryProceeding.findFirst({
        where: { id: input.proceedingId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!proceeding) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceeding not found" });
      }

      const { organizationId: _org, ...data } = input;

      const created = await ctx.prisma.proceedingEvent.create({
        data: {
          ...data,
          organizationId: ctx.organization.id,
          recordedBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ProceedingEvent",
          entityId: created.id,
          action: "CREATE",
          changes: {
            proceedingId: input.proceedingId,
            kind: input.kind,
            title: input.title,
            dueAt: input.dueAt?.toISOString() ?? null,
          },
        },
      });

      return created;
    }),

  completeEvent: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.proceedingEvent.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, title: true, proceedingId: true, completedAt: true },
      });
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }
      if (event.completedAt) {
        throw new TRPCError({ code: "CONFLICT", message: "Already recorded as done" });
      }

      await ctx.prisma.proceedingEvent.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id },
        data: { completedAt: new Date() },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ProceedingEvent",
          entityId: input.id,
          action: "COMPLETE",
          changes: { title: event.title, proceedingId: event.proceedingId },
        },
      });

      return { ok: true };
    }),

  delete: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.regulatoryProceeding.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, title: true, _count: { select: { events: true } } },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceeding not found" });
      }
      if (existing._count.events > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "This proceeding has a recorded history and cannot be deleted. Close it instead.",
        });
      }
      await assertNotOnHold(ctx.prisma, ctx.organization.id);

      await ctx.prisma.regulatoryProceeding.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "RegulatoryProceeding",
          entityId: input.id,
          action: "DELETE",
          changes: { title: existing.title },
        },
      });

      return { deleted: true };
    }),
});
