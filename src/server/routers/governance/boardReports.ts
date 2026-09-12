// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Board reporting: what was put in front of the board, and what came back.
 *
 * Recording a report captures a program snapshot at the same moment, so the
 * figures the board saw can be reproduced exactly rather than recalculated from
 * a database that has moved on. That is the difference between "here is what we
 * report today" and "here is what the board was shown on that date".
 *
 * A report whose date has passed cannot be deleted. It can be corrected, and
 * the correction is audited.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { captureProgramSnapshot } from "../../services/program/snapshot";
import { assertNotOnHold } from "../../services/legal-hold";

const AUDIENCES = [
  "BOARD",
  "AUDIT_COMMITTEE",
  "RISK_COMMITTEE",
  "EXECUTIVE",
  "REGULATOR",
  "OTHER",
] as const;

export const boardReportsRouter = createTRPCRouter({
  list: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input: _input }) => {
      const rows = await ctx.prisma.boardReport.findMany({
        where: { organizationId: ctx.organization.id },
        orderBy: { reportedAt: "desc" },
        include: {
          snapshot: {
            select: { id: true, overall: true, payloadHash: true, createdAt: true },
          },
        },
      });

      const latest = rows[0];
      return {
        reports: rows,
        // A cadence is the thing a claim tests. Say when the last report was
        // and when the next is due, rather than leaving it to be worked out.
        cadence: {
          lastReportedAt: latest?.reportedAt ?? null,
          nextDue: rows.find((r) => r.nextReportDue)?.nextReportDue ?? null,
          count: rows.length,
        },
      };
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        title: z.string().min(1).max(300),
        period: z.string().max(100).optional(),
        audience: z.enum(AUDIENCES).default("BOARD"),
        reportedAt: z.date(),
        presenter: z.string().max(200).optional(),
        attendees: z.array(z.string().max(200)).max(50).default([]),
        summary: z.string().max(10000).optional(),
        decisionsRequested: z.string().max(5000).optional(),
        decisionsTaken: z.string().max(5000).optional(),
        actionsAgreed: z.string().max(5000).optional(),
        nextReportDue: z.date().optional(),
        locale: z.enum(["en", "es"]).default("en"),
        /** Freeze the figures as they stand now. */
        captureSnapshot: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let snapshotId: string | undefined;
      if (input.captureSnapshot) {
        try {
          const snap = await captureProgramSnapshot(ctx.prisma, ctx.organization.id, input.locale, {
            reason: "MANUAL",
            createdBy: ctx.session.user.id,
            label: `Board report: ${input.title}`,
          });
          snapshotId = snap.id;
        } catch {
          // A snapshot that cannot be captured must not lose the report. The
          // record simply says it has no frozen figures behind it.
          snapshotId = undefined;
        }
      }

      const { organizationId: _org, locale: _locale, captureSnapshot: _c, ...data } = input;

      const created = await ctx.prisma.boardReport.create({
        data: {
          ...data,
          snapshotId,
          organizationId: ctx.organization.id,
          createdBy: ctx.session.user.id,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "BoardReport",
          entityId: created.id,
          action: "CREATE",
          changes: {
            title: input.title,
            audience: input.audience,
            reportedAt: input.reportedAt.toISOString(),
            snapshotId: snapshotId ?? null,
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
        period: z.string().max(100).nullable().optional(),
        audience: z.enum(AUDIENCES).optional(),
        reportedAt: z.date().optional(),
        presenter: z.string().max(200).nullable().optional(),
        attendees: z.array(z.string().max(200)).max(50).optional(),
        summary: z.string().max(10000).nullable().optional(),
        decisionsRequested: z.string().max(5000).nullable().optional(),
        decisionsTaken: z.string().max(5000).nullable().optional(),
        actionsAgreed: z.string().max(5000).nullable().optional(),
        nextReportDue: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.boardReport.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      const { organizationId: _org, id, ...data } = input;

      await ctx.prisma.boardReport.updateMany({
        where: { id, organizationId: ctx.organization.id },
        data: data as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "BoardReport",
          entityId: id,
          action: "UPDATE",
          changes: { fields: Object.keys(data) },
        },
      });

      return { ok: true };
    }),

  delete: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.boardReport.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, title: true, reportedAt: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }
      if (existing.reportedAt.getTime() <= Date.now()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "A report that has already been given is a record of what the board was told. Correct it rather than deleting it.",
        });
      }
      await assertNotOnHold(ctx.prisma, ctx.organization.id);

      await ctx.prisma.boardReport.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "BoardReport",
          entityId: input.id,
          action: "DELETE",
          changes: { title: existing.title },
        },
      });

      return { deleted: true };
    }),
});
