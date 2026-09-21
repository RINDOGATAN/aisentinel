// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { consume, policyFor } from "@/lib/rate-limit";

export const feedbackRouter = createTRPCRouter({
  submit: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        page: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Anyone may call this, signed in or not, and every call is a row. The
      // limit is counted here, in the procedure, so a batched request or an
      // encoded procedure name in the address cannot step around it. Callers
      // whose address cannot be read share one allowance.
      const allowance = consume(`feedback::${ctx.clientIp}`, policyFor("feedback"));
      if (!allowance.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many requests. Try again in ${allowance.retryAfterSeconds} seconds.`,
        });
      }

      await ctx.prisma.feedback.create({
        data: {
          message: input.message,
          page: input.page,
        },
      });
      return { success: true };
    }),
});
