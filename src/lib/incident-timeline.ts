// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The timeline entries the incident router writes by itself (on creation, on a
 * status change, and the reason when an incident is marked recorded in error,
 * src/server/routers/governance/incident.ts) are stored in English
 * with raw enum values. This reads them back into their parts, so a Spanish screen
 * can say them in Spanish, for old rows as well as new ones. Entries a person typed
 * return null and are shown as written.
 */

export type SystemTimelineEntry =
  | { kind: "reported"; severity: string; type: string }
  | { kind: "status"; from: string | null; to: string }
  | { kind: "recordedInError"; reason: string };

export function parseSystemTimelineEntry(action: string, description: string | null | undefined): SystemTimelineEntry | null {
  if (action === "Incident reported") {
    const m = /^([A-Z_]+) (.+) incident reported$/.exec(description ?? "");
    if (!m) return null;
    return { kind: "reported", severity: m[1], type: m[2].toUpperCase().replace(/ /g, "_") };
  }
  // The reason given when an incident was marked recorded in error: the action
  // is fixed, the reason is shown as written.
  if (action === "Recorded in error") return { kind: "recordedInError", reason: description ?? "" };
  const s = /^Status changed to ([A-Z_]+)$/.exec(action);
  if (s) {
    const d = /^Status updated from ([A-Z_]+) to ([A-Z_]+)$/.exec(description ?? "");
    return { kind: "status", from: d ? d[1] : null, to: s[1] };
  }
  return null;
}
