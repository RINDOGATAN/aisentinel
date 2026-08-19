// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * PDF renderer of the Governance Map — a dumb walk of ProgramMapLayout
 * using @react-pdf/renderer SVG primitives. All geometry comes precomputed
 * from src/lib/program-map/layout.ts and all colors from palette.ts, the
 * same modules the interactive page consumes, so the exported map is
 * geometrically identical to the on-screen map by construction.
 */

import React from "react";
import { Svg, G, Rect, Path, Circle, Text as SvgText } from "@react-pdf/renderer";
import type {
  ProgramMapLayout,
  SystemNodeBox,
  LaneBox,
  GlyphSpec,
} from "@/lib/program-map/types";
import {
  CANVAS,
  GLYPH_COLORS,
  STAGE_COLORS,
} from "@/lib/program-map/palette";

const FONT = "Inter";

// ── Glyph paths (local coordinates, ~9px tall) ──────────────────────

function shieldPath(x: number, y: number): string {
  // Simple shield: flat top, tapered point.
  return `M ${x} ${y} L ${x + 8} ${y} L ${x + 8} ${y + 5} L ${x + 4} ${y + 9} L ${x} ${y + 5} Z`;
}

function Glyph({ glyph, x, y }: { glyph: GlyphSpec; x: number; y: number }) {
  const color = GLYPH_COLORS[glyph.state];
  const gx = x + glyph.dx;
  switch (glyph.kind) {
    case "gate":
      return (
        <Path
          d={shieldPath(gx, y)}
          fill={glyph.state === "alert" ? "none" : color}
          stroke={color}
          strokeWidth={1}
        />
      );
    case "policy":
      return (
        <Rect
          x={gx}
          y={y}
          width={7}
          height={9}
          fill={glyph.state === "missing" ? "none" : color}
          stroke={color}
          strokeWidth={1}
        />
      );
    case "transparency":
      return (
        <G>
          <Rect
            x={gx}
            y={y}
            width={12}
            height={9}
            rx={2}
            fill="none"
            stroke={color}
            strokeWidth={1}
          />
          <SvgText
            x={gx + 6}
            y={y + 7}
            textAnchor="middle"
            style={{ fontSize: 6, fontFamily: FONT, fill: color }}
          >
            50
          </SvgText>
        </G>
      );
    case "personalData":
      return <Circle cx={gx + 4} cy={y + 4.5} r={3.5} fill={color} />;
  }
}

// ── Lane header ─────────────────────────────────────────────────────

function LaneHeader({ lane }: { lane: LaneBox }) {
  const stage = lane.rolloutStage ? STAGE_COLORS[lane.rolloutStage] : null;
  const labelX = lane.x + 12;
  const labelY = lane.y + lane.headerH / 2 + 3;
  return (
    <G>
      <SvgText
        x={labelX}
        y={labelY}
        style={{
          fontSize: 10,
          fontFamily: FONT,
          fontWeight: 600,
          fill: CANVAS.ink,
        }}
      >
        {`${lane.label}  ·  ${lane.count}`}
      </SvgText>
      {stage && lane.rolloutStage && (
        <G>
          <Rect
            x={lane.x + lane.w - 74}
            y={lane.y + lane.headerH / 2 - 8}
            width={62}
            height={14}
            rx={7}
            fill={stage.bg}
          />
          <SvgText
            x={lane.x + lane.w - 43}
            y={lane.y + lane.headerH / 2 + 2}
            textAnchor="middle"
            style={{
              fontSize: 6.5,
              fontFamily: FONT,
              fontWeight: 600,
              fill: stage.fg,
            }}
          >
            {lane.rolloutStage}
          </SvgText>
        </G>
      )}
    </G>
  );
}

// ── System card ─────────────────────────────────────────────────────

function SystemCard({ node }: { node: SystemNodeBox }) {
  const titleColor = node.muted ? CANVAS.inkMuted : CANVAS.ink;
  const glyphY = node.y + node.h - 15;
  return (
    <G>
      <Rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={4}
        fill={CANVAS.cardBg}
        stroke={node.dashed ? node.riskColor : CANVAS.cardBorder}
        strokeWidth={node.dashed ? 1.2 : 1}
        strokeDasharray={node.dashed ? "4 3" : undefined}
      />
      {/* Risk stripe */}
      <Rect x={node.x} y={node.y} width={4} height={node.h} fill={node.riskColor} />
      <SvgText
        x={node.x + 12}
        y={node.y + 17}
        style={{
          fontSize: 9,
          fontFamily: FONT,
          fontWeight: node.muted ? 400 : 600,
          fill: titleColor,
        }}
      >
        {node.title}
      </SvgText>
      {node.glyphs.map((glyph) => (
        <Glyph key={glyph.kind} glyph={glyph} x={node.x + 10} y={glyphY} />
      ))}
      {/* Compliance micro-bar, bottom-right */}
      {node.compliancePct !== null && (
        <G>
          <Rect
            x={node.x + node.w - 34}
            y={glyphY + 3}
            width={24}
            height={3}
            fill={CANVAS.laneBorder}
          />
          <Rect
            x={node.x + node.w - 34}
            y={glyphY + 3}
            width={(24 * node.compliancePct) / 100}
            height={3}
            fill={GLYPH_COLORS.ok}
          />
        </G>
      )}
    </G>
  );
}

// ── Map ─────────────────────────────────────────────────────────────

/**
 * Renders the map scaled to `width` points, preserving aspect ratio.
 */
export function ProgramMapSvg({
  layout,
  width,
}: {
  layout: ProgramMapLayout;
  width: number;
}) {
  const height = (width * layout.height) / layout.width;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
    >
      <Rect x={0} y={0} width={layout.width} height={layout.height} fill={CANVAS.bg} />
      {layout.lanes.map((lane) => (
        <G key={lane.id}>
          <Rect
            x={lane.x}
            y={lane.y}
            width={lane.w}
            height={lane.h}
            fill={lane.alt ? CANVAS.laneAltBg : CANVAS.laneBg}
            stroke={CANVAS.laneBorder}
            strokeWidth={1}
          />
          <LaneHeader lane={lane} />
        </G>
      ))}
      {/* Edges under cards */}
      {layout.edges.map((edge) => (
        <Path
          key={`${edge.sourceId}-${edge.targetId}`}
          d={edge.path}
          stroke={CANVAS.edge}
          strokeWidth={1.25}
          fill="none"
        />
      ))}
      {layout.nodes.map((node) => (
        <SystemCard key={node.id} node={node} />
      ))}
      {layout.vendorNodes.map((vendor) => (
        <G key={vendor.id}>
          <Rect
            x={vendor.x}
            y={vendor.y}
            width={vendor.w}
            height={vendor.h}
            rx={6}
            fill={CANVAS.cardBg}
            stroke={vendor.riskColor ?? CANVAS.cardBorder}
            strokeWidth={vendor.bold ? 2 : 1.25}
          />
          <SvgText
            x={vendor.x + 10}
            y={vendor.y + vendor.h / 2 - 1}
            style={{
              fontSize: 8.5,
              fontFamily: FONT,
              fontWeight: 600,
              fill: CANVAS.ink,
            }}
          >
            {vendor.name}
          </SvgText>
          <SvgText
            x={vendor.x + 10}
            y={vendor.y + vendor.h / 2 + 9}
            style={{ fontSize: 6.5, fontFamily: FONT, fill: CANVAS.inkMuted }}
          >
            {`× ${vendor.systemCount}`}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}
