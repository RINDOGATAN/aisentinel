// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import React from "react";
import { View, Text, StyleSheet, Svg, Path, Line, Text as SvgText } from "@react-pdf/renderer";
import {
  radarPolygonPoints,
  pointsToPath,
  polarToCartesian,
} from "@/lib/program-map/geometry";
import { tokens, CHART } from "../tokens";

const LABEL_MARGIN = 30;

const s = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: tokens.space[3],
  },
  caption: {
    marginTop: tokens.space[3],
    fontSize: tokens.typography.size.micro,
    fontFamily: tokens.typography.family.sans,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.color.text.muted,
    textTransform: "uppercase",
    letterSpacing: tokens.typography.letterSpacing.caps,
    textAlign: "center",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: tokens.space[3],
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: tokens.space[4],
  },
  legendSwatch: {
    width: 10,
    height: 3,
    marginRight: tokens.space[2],
  },
  legendText: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    fontWeight: tokens.typography.weight.medium,
  },
});

export interface RadarAxis {
  /** Translated axis label (e.g. "GOVERN") */
  label: string;
  current: number;
  target: number;
}

/**
 * Radar (spider) chart — current polygon (brand fill) vs target polygon
 * (dashed outline). Geometry comes from src/lib/program-map/geometry.ts,
 * shared with the web renderer so both surfaces agree exactly.
 */
export function RadarChart({
  axes,
  size = tokens.chart.radar.size,
  max = 100,
  label,
  currentLegend,
  targetLegend,
}: {
  axes: RadarAxis[];
  size?: number;
  max?: number;
  label?: string;
  /** Translated legend labels; legend hidden when absent */
  currentLegend?: string;
  targetLegend?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - LABEL_MARGIN;
  const n = axes.length;

  const ringPaths = tokens.chart.radar.rings.map((ring) =>
    pointsToPath(
      radarPolygonPoints(Array<number>(n).fill(ring), max, cx, cy, radius),
    ),
  );
  const spokes = radarPolygonPoints(Array<number>(n).fill(max), max, cx, cy, radius);
  const currentPath = pointsToPath(
    radarPolygonPoints(axes.map((a) => a.current), max, cx, cy, radius),
  );
  const targetPath = pointsToPath(
    radarPolygonPoints(axes.map((a) => a.target), max, cx, cy, radius),
  );

  return (
    <View style={s.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {ringPaths.map((d, i) => (
          <Path key={`ring-${i}`} d={d} stroke={CHART.gridLine} strokeWidth={0.75} fill="none" />
        ))}
        {spokes.map((p, i) => (
          <Line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={CHART.gridLine}
            strokeWidth={0.75}
          />
        ))}
        <Path d={currentPath} fill={CHART.radarFill} stroke={CHART.radarStroke} strokeWidth={1.5} />
        <Path
          d={targetPath}
          fill="none"
          stroke={CHART.radarTarget}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {axes.map((a, i) => {
          const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
          const p = polarToCartesian(cx, cy, radius + 14, angle);
          return (
            <SvgText
              key={`label-${i}`}
              x={p.x}
              y={p.y + 2}
              textAnchor="middle"
              style={{
                fontSize: tokens.typography.size.micro,
                fontFamily: tokens.typography.family.sans,
                fontWeight: tokens.typography.weight.semibold,
                fill: CHART.axisLabel,
              }}
            >
              {a.label}
            </SvgText>
          );
        })}
      </Svg>
      {currentLegend && targetLegend && (
        <View style={s.legendRow}>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: CHART.radarStroke }]} />
            <Text style={s.legendText}>{currentLegend}</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: CHART.radarTarget }]} />
            <Text style={s.legendText}>{targetLegend}</Text>
          </View>
        </View>
      )}
      {label && <Text style={s.caption}>{label}</Text>}
    </View>
  );
}
