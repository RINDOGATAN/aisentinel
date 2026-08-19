"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useTranslations } from "next-intl";
import {
  radarPolygonPoints,
  pointsToPath,
  polarToCartesian,
} from "@/lib/program-map/geometry";
import { CHART } from "@/lib/program-map/palette";
import type { NistAxis } from "@/server/services/program/maturity";

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 110;

export function NistRadar({ axes }: { axes: NistAxis[] }) {
  const t = useTranslations("program.nist");
  const current = radarPolygonPoints(
    axes.map((a) => a.score),
    100,
    CX,
    CY,
    R,
  );
  const target = radarPolygonPoints(
    axes.map((a) => a.target),
    100,
    CX,
    CY,
    R,
  );

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[320px] mx-auto"
      role="img"
      aria-label={t("ariaLabel")}
    >
      {/* Grid rings */}
      {[25, 50, 75, 100].map((ring) => (
        <path
          key={ring}
          d={pointsToPath(
            radarPolygonPoints(
              axes.map(() => ring),
              100,
              CX,
              CY,
              R,
            ),
          )}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {/* Spokes + labels */}
      {axes.map((axis, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / axes.length;
        const end = polarToCartesian(CX, CY, R, angle);
        const label = polarToCartesian(CX, CY, R + 26, angle);
        return (
          <g key={axis.id}>
            <line
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize={11}
              fontWeight={600}
            >
              {t(axis.id)}
            </text>
            <text
              x={label.x}
              y={label.y + 13}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground"
              fontSize={11}
            >
              {axis.score}
            </text>
          </g>
        );
      })}
      {/* Target (dashed) then current */}
      <path
        d={pointsToPath(target)}
        fill="none"
        stroke={CHART.radarTarget}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <path
        d={pointsToPath(current)}
        fill={CHART.radarFill}
        stroke={CHART.radarStroke}
        strokeWidth={2}
      />
      {current.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={CHART.radarStroke} />
      ))}
    </svg>
  );
}
