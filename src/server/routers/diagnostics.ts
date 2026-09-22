// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A procedure that fails on purpose, so the tests (unit and the smoke walk)
 * can prove what a person sees when a procedure fails for a reason on our
 * side. Off unless AISENTINEL_TEST_FAILURES=true; off, it answers NOT_FOUND
 * like any path that does not exist.
 */
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export function testFailuresEnabled(): boolean {
  return process.env.AISENTINEL_TEST_FAILURES === "true";
}

/** What the deliberate failure says internally; it must never reach the caller. */
export const DELIBERATE_FAILURE_DETAIL =
  'deliberate failure: relation "secret_internal_table" does not exist';

export const diagnosticsRouter = createTRPCRouter({
  fail: protectedProcedure.mutation(() => {
    if (!testFailuresEnabled()) throw new TRPCError({ code: "NOT_FOUND" });
    throw new Error(DELIBERATE_FAILURE_DETAIL);
  }),
});
