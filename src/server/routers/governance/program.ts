// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AI Governance Program router — feeds the program page (map + scorecard +
 * guidance). Thin wrapper: all assembly lives in
 * src/server/services/program/program-data.ts, shared verbatim with the PDF
 * export route so the two surfaces cannot diverge.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  organizationProcedure,
  orgWriteProcedure,
} from "../../trpc";
import {
  getProgramGraphData,
  getProgramScorecardData,
} from "../../services/program/program-data";
import {
  captureProgramSnapshot,
  getPreviousSnapshot,
  getSnapshot,
  listSnapshots,
} from "../../services/program/snapshot";
import { diffSnapshots } from "@/lib/program-diff";

const localeInput = z.enum(["en", "es"]).default("en");

export const programRouter = createTRPCRouter({
  getProgramGraph: organizationProcedure
    .input(z.object({ organizationId: z.string(), locale: localeInput }))
    .query(({ ctx, input }) =>
      getProgramGraphData(ctx.prisma, ctx.organization.id, input.locale),
    ),

  getProgramScorecard: organizationProcedure
    .input(z.object({ organizationId: z.string(), locale: localeInput }))
    .query(({ ctx, input }) =>
      getProgramScorecardData(ctx.prisma, ctx.organization.id, input.locale),
    ),

  // ── Snapshots ─────────────────────────────────────────────────────
  // Immutable captures: create, read, delete. There is deliberately no
  // update procedure — an editable snapshot is not a record of anything.

  listSnapshots: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(({ ctx, input }) =>
      listSnapshots(ctx.prisma, ctx.organization.id, input.limit),
    ),

  getSnapshot: organizationProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const snapshot = await getSnapshot(
        ctx.prisma,
        ctx.organization.id,
        input.id,
      );
      if (!snapshot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Snapshot not found" });
      }
      return snapshot;
    }),

  /** Diff a snapshot against its immediate predecessor (or an explicit one). */
  getSnapshotDiff: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        againstId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const current = await getSnapshot(
        ctx.prisma,
        ctx.organization.id,
        input.id,
      );
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Snapshot not found" });
      }

      const previous = input.againstId
        ? await getSnapshot(ctx.prisma, ctx.organization.id, input.againstId)
        : await getPreviousSnapshot(
            ctx.prisma,
            ctx.organization.id,
            current.createdAt,
          );

      if (!previous) {
        return { current, previous: null, diff: null };
      }

      return {
        current,
        previous,
        diff: diffSnapshots(previous.payload, current.payload),
      };
    }),

  captureSnapshot: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        locale: localeInput,
        label: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await captureProgramSnapshot(
        ctx.prisma,
        ctx.organization.id,
        input.locale,
        {
          reason: "MANUAL",
          createdBy: ctx.session.user.id,
          label: input.label,
        },
      );

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ProgramSnapshot",
          entityId: result.id,
          action: "CREATE",
          changes: {
            reason: "MANUAL",
            overall: result.overall,
            payloadHash: result.payloadHash,
          },
        },
      });

      return result;
    }),

  /**
   * Deleting a snapshot destroys evidence, so it is restricted to the roles
   * that can also delete the program itself.
   */
  deleteSnapshot: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!["OWNER", "ADMIN"].includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete snapshots",
        });
      }

      const { count } = await ctx.prisma.programSnapshotRecord.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });
      if (count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Snapshot not found" });
      }

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "ProgramSnapshot",
          entityId: input.id,
          action: "DELETE",
          changes: {},
        },
      });

      return { success: true };
    }),
});
