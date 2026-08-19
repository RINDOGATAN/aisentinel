// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Deterministic program-map layout.
 *
 * Pure function: ProgramGraph in, pixel geometry out. The SAME function runs
 * in the browser (interactive page) and on the server (PDF report), so the
 * two surfaces are geometrically identical by construction — no DOM
 * measurement, no async layout engine, no randomness.
 *
 * Shape: category lanes stacked vertically on the left (system cards in a
 * fixed-column grid per lane), a vendor rail on the right (one node per
 * distinct vendor, ordered by the mean Y of its connected systems to reduce
 * edge crossings), cubic-bezier edges from card to vendor.
 */

import type {
  ProgramGraph,
  ProgramGraphSystem,
  ProgramMapLayout,
  LayoutOptions,
  LaneBox,
  SystemNodeBox,
  VendorNodeBox,
  EdgeGeom,
  LegendItem,
  GlyphSpec,
  ProgramRiskLevel,
} from "./types";
import { riskColor, RISK_COLORS, UNCLASSIFIED_COLOR, VENDOR_RISK_COLORS, GLYPH_COLORS } from "./palette";
import { cubicBezierPath, truncateToWidth, round2 } from "./geometry";

// ── Metrics ─────────────────────────────────────────────────────────

interface Metrics {
  cardW: number;
  cardH: number;
  cardGap: number;
  lanePadX: number;
  lanePadY: number;
  laneHeaderH: number;
  laneGap: number;
  vendorW: number;
  vendorH: number;
  vendorGap: number;
  railGap: number;
  margin: number;
  titleFont: number;
  vendorFont: number;
}

const NORMAL: Metrics = {
  cardW: 200,
  cardH: 64,
  cardGap: 12,
  lanePadX: 16,
  lanePadY: 12,
  laneHeaderH: 36,
  laneGap: 16,
  vendorW: 148,
  vendorH: 44,
  vendorGap: 12,
  railGap: 72,
  margin: 16,
  titleFont: 12,
  vendorFont: 11,
};

const COMPACT: Metrics = {
  cardW: 170,
  cardH: 54,
  cardGap: 8,
  lanePadX: 12,
  lanePadY: 8,
  laneHeaderH: 28,
  laneGap: 10,
  vendorW: 126,
  vendorH: 36,
  vendorGap: 8,
  railGap: 52,
  margin: 12,
  titleFont: 10,
  vendorFont: 9,
};

const DEFAULT_MAX_WIDTH = 1160;
export const UNGROUPED_LANE_ID = "ungrouped";

const RISK_ORDER: Record<string, number> = {
  UNACCEPTABLE: 0,
  HIGH: 1,
  LIMITED: 2,
  MINIMAL: 3,
};

const LEGEND: LegendItem[] = [
  { id: "risk-unacceptable", color: RISK_COLORS.UNACCEPTABLE, shape: "stripe" },
  { id: "risk-high", color: RISK_COLORS.HIGH, shape: "stripe" },
  { id: "risk-limited", color: RISK_COLORS.LIMITED, shape: "stripe" },
  { id: "risk-minimal", color: RISK_COLORS.MINIMAL, shape: "stripe" },
  { id: "risk-unclassified", color: UNCLASSIFIED_COLOR, shape: "stripe" },
  { id: "glyph-gate", color: GLYPH_COLORS.warn, shape: "glyph" },
  { id: "glyph-policy", color: GLYPH_COLORS.present, shape: "glyph" },
  { id: "glyph-transparency", color: GLYPH_COLORS.ok, shape: "glyph" },
  { id: "glyph-personal-data", color: GLYPH_COLORS.present, shape: "glyph" },
];

// ── Glyph derivation ────────────────────────────────────────────────

export function deriveGlyphs(system: ProgramGraphSystem): GlyphSpec[] {
  const glyphs: GlyphSpec[] = [];
  const push = (kind: GlyphSpec["kind"], state: GlyphSpec["state"]) =>
    glyphs.push({ kind, state, dx: glyphs.length * 16 });

  if (system.gates.length > 0) {
    const anyBad = system.gates.some((g) => g.overdue || g.status === "FAILED");
    const allPassed = system.gates.every((g) => g.status === "PASSED");
    push("gate", anyBad ? "alert" : allPassed ? "ok" : "warn");
  }
  // Policy glyph always renders: absence of links is a visible gap.
  push("policy", system.policyLinkCount > 0 ? "present" : "missing");
  if (system.transparencyRelevant) {
    push("transparency", system.hasTransparencyProfile ? "ok" : "alert");
  }
  if (system.processesPersonalData) {
    push("personalData", "present");
  }
  return glyphs;
}

// ── Ordering (deterministic: codepoint compare, never locale-dependent) ──

function bySeverityThenName(a: ProgramGraphSystem, b: ProgramGraphSystem): number {
  const ra = a.riskLevel ? RISK_ORDER[a.riskLevel] : 4;
  const rb = b.riskLevel ? RISK_ORDER[b.riskLevel] : 4;
  if (ra !== rb) return ra - rb;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function maxSeverity(systems: ProgramGraphSystem[]): number {
  return Math.min(
    ...systems.map((s) => (s.riskLevel ? RISK_ORDER[s.riskLevel] : 4)),
    5,
  );
}

// ── Layout ──────────────────────────────────────────────────────────

export function computeProgramMapLayout(
  graph: ProgramGraph,
  opts: LayoutOptions = {},
): ProgramMapLayout {
  const m = opts.compact ? COMPACT : NORMAL;
  const maxWidth = opts.maxWidth ?? DEFAULT_MAX_WIDTH;

  // Resolve lanes: declared groups in order, plus an implicit lane for any
  // system whose groupId has no declaration. Empty groups are dropped.
  const systemsByGroup = new Map<string, ProgramGraphSystem[]>();
  const declared = new Set(graph.groups.map((g) => g.id));
  for (const system of graph.systems) {
    const key = declared.has(system.groupId) ? system.groupId : UNGROUPED_LANE_ID;
    const list = systemsByGroup.get(key) ?? [];
    list.push(system);
    systemsByGroup.set(key, list);
  }
  const laneDefs = [
    ...graph.groups.filter((g) => (systemsByGroup.get(g.id) ?? []).length > 0),
    ...(systemsByGroup.has(UNGROUPED_LANE_ID)
      ? [{ id: UNGROUPED_LANE_ID, label: "", rolloutStage: undefined }]
      : []),
  ];
  // Non-lawfirm fallback: when no explicit ordering intent exists (all groups
  // technique-derived), sort lanes by ascending max-severity rank so the
  // riskiest lanes lead. Lawfirm groups arrive pre-ordered by config.
  const allDerived = graph.groups.every((g) => g.id.startsWith("technique:"));
  if (allDerived) {
    laneDefs.sort((a, b) => {
      const sa = maxSeverity(systemsByGroup.get(a.id) ?? []);
      const sb = maxSeverity(systemsByGroup.get(b.id) ?? []);
      if (sa !== sb) return sa - sb;
      return a.id < b.id ? -1 : 1;
    });
  }

  const lanesZoneW = maxWidth - m.margin * 2 - m.vendorW - m.railGap;
  const laneInnerW = lanesZoneW - m.lanePadX * 2;
  const cols = Math.max(1, Math.floor((laneInnerW + m.cardGap) / (m.cardW + m.cardGap)));

  const lanes: LaneBox[] = [];
  const nodes: SystemNodeBox[] = [];
  let cursorY = m.margin;

  laneDefs.forEach((def, laneIndex) => {
    const systems = [...(systemsByGroup.get(def.id) ?? [])].sort(bySeverityThenName);
    const rows = Math.ceil(systems.length / cols);
    const laneH =
      m.laneHeaderH + m.lanePadY * 2 + rows * m.cardH + (rows - 1) * m.cardGap;
    const lane: LaneBox = {
      id: def.id,
      label: def.label,
      count: systems.length,
      rolloutStage: def.rolloutStage,
      headerH: m.laneHeaderH,
      alt: laneIndex % 2 === 1,
      x: m.margin,
      y: round2(cursorY),
      w: lanesZoneW,
      h: round2(laneH),
    };
    lanes.push(lane);

    systems.forEach((system, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      nodes.push({
        id: system.id,
        laneId: def.id,
        title: truncateToWidth(system.name, m.cardW - 24, m.titleFont),
        status: system.status,
        riskLevel: system.riskLevel,
        riskColor: riskColor(system.riskLevel),
        dashed: system.riskLevel === null,
        muted: system.status !== "DEPLOYED" && system.status !== "RETIRED",
        glyphs: deriveGlyphs(system),
        compliancePct: system.complianceAssessedPct,
        vendorId: system.vendorId,
        x: round2(lane.x + m.lanePadX + col * (m.cardW + m.cardGap)),
        y: round2(lane.y + m.laneHeaderH + m.lanePadY + row * (m.cardH + m.cardGap)),
        w: m.cardW,
        h: m.cardH,
      });
    });

    cursorY += laneH + m.laneGap;
  });

  const lanesBottom = cursorY - m.laneGap + m.margin;

  // Vendor rail: vendors referenced by at least one laid-out system,
  // ordered by mean Y of their systems (single deterministic pass).
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const referenced = new Map<string, number[]>();
  for (const system of graph.systems) {
    if (!system.vendorId) continue;
    const node = nodeById.get(system.id);
    if (!node) continue;
    const ys = referenced.get(system.vendorId) ?? [];
    ys.push(node.y + node.h / 2);
    referenced.set(system.vendorId, ys);
  }
  const railX = m.margin + lanesZoneW + m.railGap;
  const vendorNodes: VendorNodeBox[] = graph.vendors
    .filter((v) => referenced.has(v.id))
    .map((v) => {
      const ys = referenced.get(v.id)!;
      return { vendor: v, meanY: ys.reduce((a, b) => a + b, 0) / ys.length };
    })
    .sort((a, b) =>
      a.meanY !== b.meanY
        ? a.meanY - b.meanY
        : a.vendor.name < b.vendor.name
          ? -1
          : 1,
    )
    .map(({ vendor }, i) => ({
      id: vendor.id,
      name: truncateToWidth(vendor.name, m.vendorW - 16, m.vendorFont),
      riskColor: vendor.riskLevel ? VENDOR_RISK_COLORS[vendor.riskLevel] : null,
      bold: vendor.systemCount >= 3,
      systemCount: vendor.systemCount,
      x: railX,
      y: round2(m.margin + m.laneHeaderH + i * (m.vendorH + m.vendorGap)),
      w: m.vendorW,
      h: m.vendorH,
    }));

  const vendorById = new Map(vendorNodes.map((v) => [v.id, v]));
  const edges: EdgeGeom[] = [];
  for (const node of nodes) {
    if (!node.vendorId) continue;
    const vendor = vendorById.get(node.vendorId);
    if (!vendor) continue;
    edges.push({
      sourceId: node.id,
      targetId: vendor.id,
      path: cubicBezierPath(
        node.x + node.w,
        node.y + node.h / 2,
        vendor.x,
        vendor.y + vendor.h / 2,
      ),
    });
  }

  const railBottom =
    vendorNodes.length > 0
      ? vendorNodes[vendorNodes.length - 1].y + m.vendorH + m.margin
      : 0;

  return {
    width: maxWidth,
    height: round2(Math.max(lanesBottom, railBottom, m.margin * 2)),
    lanes,
    nodes,
    vendorNodes,
    edges,
    legend: LEGEND,
  };
}

// ── Pagination (PDF) ────────────────────────────────────────────────

/**
 * Split a graph into page-sized sub-graphs along lane boundaries. Each
 * sub-graph re-runs the layout independently, so every page is internally
 * consistent (its own vendor rail with only the vendors it references).
 */
export function paginateProgramGraph(
  graph: ProgramGraph,
  opts: LayoutOptions,
  maxContentHeight: number,
): ProgramGraph[] {
  const layout = computeProgramMapLayout(graph, opts);
  if (layout.height <= maxContentHeight || layout.lanes.length <= 1) {
    return [graph];
  }

  const pagesOfLaneIds: string[][] = [];
  let current: string[] = [];
  let used = 0;
  const m = opts.compact ? COMPACT : NORMAL;
  for (const lane of layout.lanes) {
    const need = lane.h + m.laneGap;
    if (used + need > maxContentHeight && current.length > 0) {
      pagesOfLaneIds.push(current);
      current = [];
      used = 0;
    }
    current.push(lane.id);
    used += need;
  }
  if (current.length > 0) pagesOfLaneIds.push(current);

  return pagesOfLaneIds.map((laneIds) => {
    const idSet = new Set(laneIds);
    const systems = graph.systems.filter((s) =>
      idSet.has(
        graph.groups.some((g) => g.id === s.groupId) ? s.groupId : UNGROUPED_LANE_ID,
      ),
    );
    const vendorIds = new Set(systems.map((s) => s.vendorId).filter(Boolean));
    return {
      groups: graph.groups.filter((g) => idSet.has(g.id)),
      systems,
      vendors: graph.vendors.filter((v) => vendorIds.has(v.id)),
    };
  });
}
