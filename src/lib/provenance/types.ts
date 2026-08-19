// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Provenance core types.
 *
 * This module (and everything under src/lib/provenance/) is a pure library:
 * importable from client components, tRPC routers, and the PDF pipeline alike.
 * It must stay free of Prisma, Next.js and React imports — the Prisma
 * `Provenance` enum is mirrored here as a string-literal union so the web,
 * PDF and scoring layers all share one definition (same doctrine as
 * src/lib/program-map/types.ts).
 */

/**
 * Where a governance artifact came from. Mirrors the Prisma `Provenance`
 * enum — keep the two in sync (a test asserts the union is exhaustive).
 */
export const PROVENANCE_VALUES = [
  "USER_ENTERED",
  "AUTO_CATALOG",
  "AUTO_TEMPLATE",
  "AUTO_RULE",
  "IMPORTED",
] as const;
export type ProvenanceValue = (typeof PROVENANCE_VALUES)[number];

/**
 * The five artifact classes that carry provenance. Deliberately not every
 * table: an AISystem row is an inventory fact, not an assertion — its
 * trustworthiness is carried by whether its classification is confirmed.
 */
export const ARTIFACT_CLASSES = [
  "riskClassification",
  "compliance",
  "policy",
  "oversight",
  "transparency",
] as const;
export type ArtifactClass = (typeof ARTIFACT_CLASSES)[number];

/** The minimum shape needed to judge whether a row is confirmed. */
export interface ProvenanceBearing {
  provenance: ProvenanceValue;
  confirmedAt: Date | string | null;
}

/**
 * How an artifact reads to a human.
 * - `human`     : a person entered it; nothing to confirm.
 * - `confirmed` : auto-derived, but a person has taken ownership of it.
 * - `unconfirmed`: auto-derived and nobody has vouched for it yet.
 */
export type ProvenanceState = "human" | "confirmed" | "unconfirmed";

export interface ClassCount {
  confirmed: number;
  total: number;
}

export interface ClassSummary {
  id: ArtifactClass;
  confirmed: number;
  total: number;
  /** Rounded 0-100; 0 when the class is empty (it is excluded from the roll-up). */
  pct: number;
}

export interface ConfirmationSummary {
  /** Class-weighted headline percentage, 0-100. */
  weightedPct: number;
  byClass: ClassSummary[];
  /** Raw totals across all classes — shown as the "(86 of 210 items)" detail. */
  confirmed: number;
  total: number;
}
