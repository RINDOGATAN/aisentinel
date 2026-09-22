// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What a failed procedure tells the person who called it.
 *
 * A deliberate refusal (not found, forbidden, a pilot limit, bad input) is a
 * TRPCError with its own code and a message written for the person; it passes
 * through untouched. Anything else arrives as INTERNAL_SERVER_ERROR carrying
 * whatever the underlying exception said, which for a database error is the
 * query and the schema. That never reaches the person: they get a sentence
 * they can act on and a reference, and the server log gets the full error
 * under the same reference.
 */
import type { TRPCError } from "@trpc/server";
import { internalErrorMessage, type ErrorLocale } from "@/config/error-copy";
import { newErrorReference } from "@/lib/error-reference";

export interface PublicErrorResult {
  message: string;
  /** Set only when the message was replaced. */
  reference?: string;
}

export function publicError(
  error: TRPCError,
  opts: { path?: string; locale: ErrorLocale; log?: (...args: unknown[]) => void },
): PublicErrorResult {
  if (error.code !== "INTERNAL_SERVER_ERROR") return { message: error.message };

  const reference = newErrorReference();
  (opts.log ?? console.error)(
    `[error ${reference}] procedure ${opts.path ?? "<unknown>"} failed:`,
    error.cause ?? error,
  );
  return { message: internalErrorMessage(opts.locale, reference), reference };
}
