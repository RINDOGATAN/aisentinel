// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** Organization slugs are unique and at most 50 characters (see organization.create). */
const MAX_SLUG = 50;

/**
 * The first slug not in `taken`: `base` itself, then `base-2`, `base-3`, …
 * The base is shortened when needed so the suffixed slug still fits. Returns
 * null only if a thousand variants are all taken.
 */
export function firstFreeSlug(base: string, taken: ReadonlySet<string>): string | null {
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, MAX_SLUG - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return null;
}
