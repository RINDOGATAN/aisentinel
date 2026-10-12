// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Shared-key authentication for the inbound /api/import/* endpoints.
 *
 * Two properties matter here, and neither is obvious from the call site:
 *
 * 1. The comparison is constant-time. A plain `===` or `Array.includes` leaks
 *    the length of the shared prefix through timing, which turns guessing a key
 *    into a linear search rather than an exhaustive one.
 * 2. The endpoints are rate limited. Without a limit, an attacker gets
 *    unlimited guesses however good the comparison is.
 */

import { safeEqualAny } from "@/lib/safe-equal";
import { enforce } from "@/lib/rate-limit";

function configuredKeys(): string[] {
  return (process.env.VW_IMPORT_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export function validateImportApiKey(request: Request): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return false;

  // Every key is compared (src/lib/safe-equal.ts), so the time taken does not
  // reveal which key matched.
  return safeEqualAny(apiKey, configuredKeys());
}

/**
 * The single guard every /api/import/* route calls first.
 *
 * Returns a Response to send back, or null to carry on. Rate limiting runs
 * BEFORE authentication on purpose: an unauthenticated caller must not be able
 * to spend the server's time on key comparisons without limit.
 */
export function guardImportRequest(request: Request): Response | null {
  const limited = enforce(request, "import");
  if (limited) return limited;

  if (!validateImportApiKey(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
