// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A short reference for an AI system, for people to quote: "AIS-001", the
 * system's running number within its organization (assigned on create, see
 * src/server/services/ai-system/number.ts), padded like the policy
 * references ("POL-001"). Null when the system has no number yet.
 */
export const SYSTEM_REFERENCE_PREFIX = "AIS-";

export function systemReference(number: number | null | undefined): string | null {
  if (number == null) return null;
  return `${SYSTEM_REFERENCE_PREFIX}${String(number).padStart(3, "0")}`;
}
