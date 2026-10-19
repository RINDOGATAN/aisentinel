// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A short reference for an AI system, for people to quote ("AIS-7K2Q9X")
 * where the full record id is too long to read out.
 *
 * Derived from the record id, so it needs no column, never changes, and is the
 * same in every list, page and export. Record ids are cuids, whose last
 * characters are random, so six of them are enough to tell an organisation's
 * systems apart.
 */
export const SYSTEM_REFERENCE_PREFIX = "AIS-";

export function systemReference(id: string): string {
  const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `${SYSTEM_REFERENCE_PREFIX}${tail}`;
}
