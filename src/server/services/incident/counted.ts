// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The incidents that count. An incident marked RECORDED_IN_ERROR stays on
 * record (it is never deleted) but is left out of every total, statutory
 * deadline and report. Spread into an aIIncident `where`, or use as the
 * `where` of a filtered `_count`.
 */
export const RECORDED_IN_ERROR = "RECORDED_IN_ERROR" as const;

export const COUNTED_INCIDENT = { status: { not: RECORDED_IN_ERROR } };
