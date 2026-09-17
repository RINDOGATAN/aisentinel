// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program map palette — the single color source for BOTH the interactive
 * page and the PDF report (the PDF design-system re-exports from here so
 * the two surfaces cannot drift).
 *
 * The map canvas is deliberately LIGHT inside the dark app, mirroring the
 * DPO Central data-flow map: maximum legibility for a dense information
 * graphic, and it prints as-is.
 */

import type {
  ProgramRiskLevel,
  ProgramVendorRisk,
  GlyphState,
  RolloutStage,
} from "./types";
import { TIER_MARKER } from "@/config/risk-tier-palette";

// ── Canvas ──────────────────────────────────────────────────────────

export const CANVAS = {
  bg: "#ffffff",
  laneBg: "#ffffff",
  laneAltBg: "#fafafa",
  laneBorder: "#e5e5e5",
  dotGrid: "#e5e5e5",
  cardBg: "#ffffff",
  cardBorder: "#d6d3ce",
  ink: "#1f2937",
  inkMuted: "#6b7280",
  inkFaint: "#9ca3af",
  edge: "#cbd5e1",
} as const;

// ── EU AI Act risk tiers ────────────────────────────────────────────
// Sourced from the shared tier tokens (src/config/risk-tier-palette.ts),
// light set, because the canvas is light. Tiers are shown as a stripe or
// border (a marker), never as coloured text.

const TIER = TIER_MARKER.light;

export const RISK_COLORS: Record<ProgramRiskLevel, string> = {
  UNACCEPTABLE: TIER.UNACCEPTABLE,
  HIGH: TIER.HIGH,
  LIMITED: TIER.LIMITED,
  MINIMAL: TIER.MINIMAL,
};

/** Unclassified = a visible gap (dashed border), never a blend-in neutral */
export const UNCLASSIFIED_COLOR = TIER.UNCLASSIFIED;

export function riskColor(level: ProgramRiskLevel | null): string {
  return level ? RISK_COLORS[level] : UNCLASSIFIED_COLOR;
}

export const VENDOR_RISK_COLORS: Record<ProgramVendorRisk, string> = {
  CRITICAL: TIER.UNACCEPTABLE,
  HIGH: TIER.HIGH,
  MEDIUM: TIER.LIMITED,
  LOW: TIER.MINIMAL,
};

// ── Glyph states ────────────────────────────────────────────────────

export const GLYPH_COLORS: Record<GlyphState, string> = {
  ok: "#059669",
  warn: "#d97706",
  alert: "#dc2626",
  missing: "#9ca3af",
  present: "#64748b",
};

// ── Rollout stage chips ─────────────────────────────────────────────

export const STAGE_COLORS: Record<RolloutStage, { fg: string; bg: string }> = {
  ADOPT: { fg: "#047857", bg: "#d1fae5" },
  PILOT: { fg: "#1d4ed8", bg: "#dbeafe" },
  RESTRICT: { fg: "#b45309", bg: "#fef3c7" },
  HOLD: { fg: "#b91c1c", bg: "#fee2e2" },
};

// ── Scorecard / radar (dark-theme surfaces use app tokens; these are
//    for the shared SVG charts that appear on light PDF pages too) ──

export const CHART = {
  radarFill: "rgba(245, 166, 35, 0.20)",
  radarStroke: "#f5a623",
  radarTarget: "#94a3b8",
  gridLine: "#e5e5e5",
  axisLabel: "#6b7280",
} as const;
