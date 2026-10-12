// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Constant-time comparison for static secrets (the cron bearer token, the
 * import keys). A plain `===` or `Array.includes` returns at the first byte
 * that differs, so the time taken says how much of a guess was right.
 *
 * Both sides are hashed to a fixed 32 bytes before `timingSafeEqual`, so
 * neither the position of the first difference nor the length of the
 * candidate shows in the timing. Node runtime only (route handlers, never
 * the edge middleware).
 */

import { createHash, timingSafeEqual } from "node:crypto";

/** True when `a` and `b` are the same string; the time taken does not depend on where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

/**
 * True when `candidate` equals ANY of `accepted`. Every entry is compared,
 * even after a match, so the time taken does not reveal which entry matched.
 */
export function safeEqualAny(candidate: string, accepted: readonly string[]): boolean {
  let matched = false;
  for (const key of accepted) {
    if (safeEqual(candidate, key)) matched = true;
  }
  return matched;
}

/**
 * The cron guard's comparison: the `Authorization` header must be exactly
 * `Bearer <secret>`. An unset or empty secret never matches.
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return safeEqual(authorization ?? "", `Bearer ${secret}`);
}
