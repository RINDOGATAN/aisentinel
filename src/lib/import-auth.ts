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

import { createHash, timingSafeEqual } from "node:crypto";
import { enforce } from "@/lib/rate-limit";

/**
 * Compare two strings without revealing where they first differ.
 *
 * Both sides are hashed to a fixed 32 bytes before the comparison, so neither
 * the position of the first difference nor the length of the candidate is
 * observable in the timing. Comparing the raw strings would need a length
 * check first, and that check is itself a length oracle.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

function configuredKeys(): string[] {
  return (process.env.VW_IMPORT_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export function validateImportApiKey(request: Request): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return false;

  const keys = configuredKeys();
  // Check every key rather than returning on the first match, so the time
  // taken does not reveal which key matched or how many are configured.
  let matched = false;
  for (const key of keys) {
    if (constantTimeEquals(apiKey, key)) matched = true;
  }
  return matched;
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
