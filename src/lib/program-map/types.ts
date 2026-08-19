// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program map core types.
 *
 * This module (and everything under src/lib/program-map/) is a pure library:
 * importable from client components, tRPC routers, and the PDF pipeline alike.
 * It must stay free of Prisma, Next.js, and React imports — enum-like values
 * are mirrored as string-literal unions so the future public register can
 * consume a redacted ProgramGraph without dragging server types along.
 */

export type ProgramRiskLevel = "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL";
export type ProgramSystemStatus =
  | "DRAFT"
  | "DEVELOPMENT"
  | "TESTING"
  | "DEPLOYED"
  | "RETIRED";
export type ProgramGateStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "PASSED"
  | "FAILED"
  | "DEFERRED";
export type ProgramVendorRisk = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type RolloutStage = "ADOPT" | "PILOT" | "RESTRICT" | "HOLD";

// ── Graph input ─────────────────────────────────────────────────────

export interface ProgramGraphGroup {
  /** Lawfirm category id, "technique:<AITechnique>", or "ungrouped" */
  id: string;
  /** Locale-resolved BEFORE layout — the layout never translates */
  label: string;
  rolloutStage?: RolloutStage;
}

export interface ProgramGraphGate {
  gateType: string;
  status: ProgramGateStatus;
  overdue: boolean;
}

export interface ProgramGraphSystem {
  id: string;
  name: string;
  groupId: string;
  riskLevel: ProgramRiskLevel | null;
  status: ProgramSystemStatus;
  processesPersonalData: boolean;
  vendorId: string | null;
  gates: ProgramGraphGate[];
  policyLinkCount: number;
  /** GENERATIVE_AI systems have Art. 50 relevance */
  transparencyRelevant: boolean;
  hasTransparencyProfile: boolean;
  /** 0–100 across the system's compliance mappings; null = no mappings */
  complianceAssessedPct: number | null;
}

export interface ProgramGraphVendor {
  id: string;
  name: string;
  riskLevel: ProgramVendorRisk | null;
  systemCount: number;
}

export interface ProgramGraph {
  groups: ProgramGraphGroup[];
  systems: ProgramGraphSystem[];
  vendors: ProgramGraphVendor[];
}

// ── Layout output ───────────────────────────────────────────────────

export interface LayoutBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GlyphKind = "gate" | "policy" | "transparency" | "personalData";
/**
 * ok      = control in place (green)
 * warn    = in progress / pending (amber)
 * alert   = overdue, failed, or missing-but-required (red)
 * missing = absent-but-expected placeholder (gray outline — a visible gap)
 * present = neutral informational marker
 */
export type GlyphState = "ok" | "warn" | "alert" | "missing" | "present";

export interface GlyphSpec {
  kind: GlyphKind;
  state: GlyphState;
  /** x offset within the node box (y is fixed per row) */
  dx: number;
}

export interface LaneBox extends LayoutBox {
  id: string;
  label: string;
  count: number;
  rolloutStage?: RolloutStage;
  headerH: number;
  /** zebra background toggle */
  alt: boolean;
}

export interface SystemNodeBox extends LayoutBox {
  id: string;
  laneId: string;
  /** truncated for display; full name lives on the graph input */
  title: string;
  status: ProgramSystemStatus;
  riskLevel: ProgramRiskLevel | null;
  /** stripe + accents; unclassified gets the gap treatment */
  riskColor: string;
  /** dashed border ⇒ unclassified (coverage gap must be visible) */
  dashed: boolean;
  muted: boolean; // DRAFT/DEVELOPMENT/TESTING render muted
  glyphs: GlyphSpec[];
  compliancePct: number | null;
  vendorId: string | null;
}

export interface VendorNodeBox extends LayoutBox {
  id: string;
  name: string;
  riskColor: string | null;
  /** vendors serving >= 3 systems get a bolder border (concentration cue) */
  bold: boolean;
  systemCount: number;
}

export interface EdgeGeom {
  sourceId: string; // system id
  targetId: string; // vendor id
  /** SVG path data (cubic bezier) */
  path: string;
}

export interface LegendItem {
  /** stable id — renderers resolve display labels via i18n */
  id:
    | "risk-unacceptable"
    | "risk-high"
    | "risk-limited"
    | "risk-minimal"
    | "risk-unclassified"
    | "glyph-gate"
    | "glyph-policy"
    | "glyph-transparency"
    | "glyph-personal-data";
  color: string;
  shape: "stripe" | "glyph";
}

export interface ProgramMapLayout {
  width: number;
  height: number;
  lanes: LaneBox[];
  nodes: SystemNodeBox[];
  vendorNodes: VendorNodeBox[];
  edges: EdgeGeom[];
  legend: LegendItem[];
}

export interface LayoutOptions {
  /** total canvas width budget; default 1160 */
  maxWidth?: number;
  /** tighter cards/gaps for PDF landscape density */
  compact?: boolean;
}
