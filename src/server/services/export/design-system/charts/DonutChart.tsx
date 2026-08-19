// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import React from "react";
import { View, Text, StyleSheet, Svg, Circle, Path } from "@react-pdf/renderer";
import { donutArcPath } from "@/lib/program-map/geometry";
import { tokens } from "../tokens";

const s = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: tokens.space[3],
  },
  centerLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: tokens.typography.size.h1,
    fontFamily: tokens.typography.family.sans,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.color.brand.ink,
    letterSpacing: tokens.typography.letterSpacing.tight,
    lineHeight: tokens.typography.lineHeight.tight,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  valueSuffix: {
    fontSize: tokens.typography.size.h3,
    fontFamily: tokens.typography.family.sans,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.color.brand.ink,
    marginLeft: 1,
  },
  subValue: {
    fontSize: tokens.typography.size.micro,
    color: tokens.color.text.muted,
    fontWeight: tokens.typography.weight.medium,
    marginTop: 2,
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
    maxWidth: 160,
  },
  subCaption: {
    marginTop: 2,
    fontSize: tokens.typography.size.caption,
    color: tokens.color.text.secondary,
    textAlign: "center",
    maxWidth: 160,
  },
});

export function DonutChart({
  value,
  max,
  color,
  size = tokens.chart.donut.size,
  thickness = tokens.chart.donut.thickness,
  label,
  sublabel,
  displayMode = "percent",
  subValue,
}: {
  value: number;
  max: number;
  /** Fill color; defaults to the brand accent */
  color?: string;
  size?: number;
  thickness?: number;
  label?: string;
  sublabel?: string;
  displayMode?: "percent" | "count" | "custom";
  subValue?: string;
}) {
  const fillColor = color ?? tokens.color.brand.accent;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 1;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  // Shared geometry: radians, 0 = 3 o'clock; start at 12 o'clock.
  const start = -Math.PI / 2;
  const end = start + pct * 2 * Math.PI;
  const path =
    pct > 0 && pct < 1
      ? donutArcPath(cx, cy, radius, radius - thickness, start, end)
      : null;

  const centerText =
    displayMode === "percent"
      ? Math.round(pct * 100).toString()
      : displayMode === "count"
        ? value.toString()
        : "";
  const centerSuffix = displayMode === "percent" ? "%" : "";

  return (
    <View style={s.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius - thickness / 2}
            stroke={tokens.color.surface.subtleAlt}
            strokeWidth={thickness}
            fill="none"
          />
          {pct === 1 && (
            <Circle
              cx={cx}
              cy={cy}
              r={radius - thickness / 2}
              stroke={fillColor}
              strokeWidth={thickness}
              fill="none"
            />
          )}
          {path && <Path d={path} fill={fillColor} />}
        </Svg>
        <View style={s.centerLayer}>
          <View style={s.valueRow}>
            <Text style={s.value}>
              {displayMode === "custom" ? (subValue ?? "") : centerText}
            </Text>
            {centerSuffix && <Text style={s.valueSuffix}>{centerSuffix}</Text>}
          </View>
          {/* Slash form is locale-neutral — beats translating "of"/"de". */}
          {displayMode !== "custom" && max > 0 && (
            <Text style={s.subValue}>
              {displayMode === "percent" ? `${value} / ${max}` : `/ ${max}`}
            </Text>
          )}
        </View>
      </View>
      {label && <Text style={s.caption}>{label}</Text>}
      {sublabel && <Text style={s.subCaption}>{sublabel}</Text>}
    </View>
  );
}
