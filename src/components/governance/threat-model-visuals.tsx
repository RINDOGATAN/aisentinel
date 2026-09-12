"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The pictures a threat model needs.
 *
 * Four of them, each answering one question at a glance: what can this system
 * reach, which scenarios matter most, where the controls sit, and how much of
 * it has actually been tested. Plain SVG on the product's own palette, no
 * chart dependency, readable at phone width.
 *
 * The visuals are deliberately blunt. A matrix with three dots in the top right
 * tells a room more in two seconds than a table of twenty rows.
 */

import { useMemo } from "react";
import {
  CAPABILITIES,
  CAPABILITY_GROUPS,
  CAPABILITY_GROUP_LABELS,
  CONTROL_LAYERS,
  CONTROL_LAYER_LABELS,
  type CapabilityGroup,
  type ControlLayer,
} from "@/config/threat-model";

const AMBER = "#f5a623";
const MUTED = "rgba(245, 166, 35, 0.25)";
const LINE = "rgba(255, 255, 255, 0.12)";
const TEXT = "currentColor";

type Lang = "en" | "es";

// ============================================================
// 1. What the system can reach
// ============================================================

/**
 * The capability map: the system at the centre, its reach around it. The ring
 * thickens with the number of capabilities in a group, so a system that can do
 * a great deal looks like it can do a great deal.
 */
export function CapabilityMap({
  capabilities,
  lang,
  title,
}: {
  capabilities: string[];
  lang: Lang;
  title: string;
}) {
  const byGroup = useMemo(() => {
    const map = new Map<CapabilityGroup, string[]>();
    for (const group of CAPABILITY_GROUPS) map.set(group, []);
    for (const id of capabilities) {
      const cap = CAPABILITIES.find((c) => c.id === id);
      if (cap) map.get(cap.group)?.push(cap.label[lang]);
    }
    return map;
  }, [capabilities, lang]);

  const groups = CAPABILITY_GROUPS.filter((g) => (byGroup.get(g)?.length ?? 0) > 0);
  if (groups.length === 0) return null;

  const width = 720;
  const rowHeight = 78;
  const height = groups.length * rowHeight + 36;
  const centreX = 150;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto text-muted-foreground"
      role="img"
      aria-label={title}
    >
      {/* The system */}
      <rect
        x={16}
        y={height / 2 - 26}
        width={centreX - 40}
        height={52}
        rx={10}
        fill="rgba(245, 166, 35, 0.12)"
        stroke={AMBER}
      />
      <text
        x={16 + (centreX - 40) / 2}
        y={height / 2 + 5}
        textAnchor="middle"
        fontSize="13"
        fill={AMBER}
        fontWeight="600"
      >
        {title.length > 18 ? `${title.slice(0, 17)}…` : title}
      </text>

      {groups.map((group, i) => {
        const items = byGroup.get(group) ?? [];
        const y = 28 + i * rowHeight;
        const strokeWidth = Math.min(6, 1.5 + items.length);
        return (
          <g key={group}>
            <path
              d={`M ${centreX - 22} ${height / 2} C ${centreX + 30} ${height / 2}, ${centreX + 30} ${y + 20}, ${centreX + 70} ${y + 20}`}
              fill="none"
              stroke={MUTED}
              strokeWidth={strokeWidth}
            />
            <text x={centreX + 78} y={y + 12} fontSize="11" fill={TEXT} opacity={0.75}>
              {CAPABILITY_GROUP_LABELS[group][lang].toUpperCase()}
            </text>
            <text x={centreX + 78} y={y + 32} fontSize="13" fill={TEXT}>
              {items.join(" · ").length > 72
                ? `${items.join(" · ").slice(0, 71)}…`
                : items.join(" · ")}
            </text>
            <line
              x1={centreX + 74}
              y1={y + 44}
              x2={width - 20}
              y2={y + 44}
              stroke={LINE}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================
// 2. Which scenarios matter most
// ============================================================

export interface MatrixPoint {
  id: string;
  title: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  likelihood: "LOW" | "MEDIUM" | "HIGH";
  blastRadius: "LIMITED" | "SIGNIFICANT" | "SEVERE";
  status: string;
}

const LEVEL_INDEX = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;

/**
 * Likelihood across, impact up. A dot per scenario; severe blast radius gets a
 * ring around it, because that is the one that cannot be talked down.
 */
export function PriorityMatrix({
  points,
  labels,
}: {
  points: MatrixPoint[];
  labels: { impact: string; likelihood: string; low: string; high: string; severe: string };
}) {
  const size = 320;
  const pad = 42;
  const cell = (size - pad) / 3;

  const placed = useMemo(() => {
    const counts = new Map<string, number>();
    return points.map((p) => {
      const key = `${p.likelihood}-${p.impact}`;
      const n = counts.get(key) ?? 0;
      counts.set(key, n + 1);
      // Spiral the overlapping dots inside their cell rather than stacking them.
      const angle = n * 2.4;
      const radius = n === 0 ? 0 : Math.min(cell / 3, 6 + n * 3);
      const cx = pad + LEVEL_INDEX[p.likelihood] * cell + cell / 2 + Math.cos(angle) * radius;
      const cy =
        size - pad - LEVEL_INDEX[p.impact] * cell - cell / 2 + Math.sin(angle) * radius;
      return { ...p, cx, cy };
    });
  }, [points, cell]);

  return (
    <svg
      viewBox={`0 0 ${size + 10} ${size + 10}`}
      className="w-full h-auto max-w-[340px] text-muted-foreground"
      role="img"
      aria-label={`${labels.impact} / ${labels.likelihood}`}
    >
      {/* Cells: the top-right corner carries the weight, so it is warmest. */}
      {[0, 1, 2].map((col) =>
        [0, 1, 2].map((row) => {
          const heat = (col + row) / 4;
          return (
            <rect
              key={`${col}-${row}`}
              x={pad + col * cell}
              y={size - pad - (row + 1) * cell}
              width={cell - 2}
              height={cell - 2}
              rx={6}
              fill={`rgba(245, 166, 35, ${0.04 + heat * 0.12})`}
              stroke={LINE}
            />
          );
        }),
      )}

      {/* Axes */}
      <text x={pad} y={size - 12} fontSize="10" fill={TEXT} opacity={0.7}>
        {labels.low}
      </text>
      <text x={size - 30} y={size - 12} fontSize="10" fill={TEXT} opacity={0.7} textAnchor="end">
        {labels.high}
      </text>
      <text
        x={pad + (size - pad) / 2}
        y={size + 6}
        fontSize="11"
        fill={TEXT}
        textAnchor="middle"
        opacity={0.85}
      >
        {labels.likelihood}
      </text>
      <text
        x={12}
        y={size / 2}
        fontSize="11"
        fill={TEXT}
        textAnchor="middle"
        opacity={0.85}
        transform={`rotate(-90 12 ${size / 2})`}
      >
        {labels.impact}
      </text>

      {placed.map((p) => {
        const resolved = p.status !== "OPEN";
        return (
          <g key={p.id}>
            {p.blastRadius === "SEVERE" && (
              <circle
                cx={p.cx}
                cy={p.cy}
                r={11}
                fill="none"
                stroke={AMBER}
                strokeOpacity={0.5}
                strokeWidth={1.5}
              />
            )}
            <circle
              cx={p.cx}
              cy={p.cy}
              r={6}
              fill={resolved ? "transparent" : AMBER}
              stroke={AMBER}
              strokeWidth={resolved ? 1.5 : 0}
              opacity={resolved ? 0.6 : 0.95}
            >
              <title>{p.title}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================
// 3. Where the controls sit
// ============================================================

/**
 * One bar per layer. An empty layer is the point of the picture: a system with
 * four prevent controls and nothing that detects or responds is a system that
 * will find out about its first incident from a customer.
 */
export function ControlCoverage({
  byLayer,
  lang,
  emptyLabel,
}: {
  byLayer: Record<string, { total: number; proven: number }>;
  lang: Lang;
  emptyLabel: string;
}) {
  const max = Math.max(1, ...CONTROL_LAYERS.map((l) => byLayer[l.toUpperCase()]?.total ?? 0));

  return (
    <div className="space-y-2">
      {CONTROL_LAYERS.map((layer) => {
        const key = layer.toUpperCase();
        const entry = byLayer[key] ?? { total: 0, proven: 0 };
        const width = (entry.total / max) * 100;
        const provenWidth = entry.total > 0 ? (entry.proven / entry.total) * width : 0;
        return (
          <div key={layer} className="flex items-center gap-3">
            <span className="text-xs w-24 shrink-0 text-muted-foreground">
              {CONTROL_LAYER_LABELS[layer as ControlLayer][lang]}
            </span>
            <div className="flex-1 h-3 rounded-sm bg-muted/40 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary/30"
                style={{ width: `${width}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-primary"
                style={{ width: `${provenWidth}%` }}
              />
            </div>
            <span className="text-xs w-20 shrink-0 text-right tabular-nums text-muted-foreground">
              {entry.total === 0 ? emptyLabel : `${entry.proven}/${entry.total}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 4. How much of it has been tested
// ============================================================

/**
 * A ring, because the number that matters is a proportion: of the controls we
 * claim, how many have we actually tried to break.
 */
export function EvidenceRing({
  proven,
  total,
  label,
  caption,
}: {
  proven: number;
  total: number;
  label: string;
  caption: string;
}) {
  const pct = total === 0 ? 0 : Math.round((proven / total) * 100);
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0" role="img" aria-label={label}>
        <circle cx="60" cy="60" r={r} fill="none" stroke={LINE} strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={AMBER}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 60 60)"
        />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          fontSize="24"
          fontWeight="600"
          fill={AMBER}
          className="tabular-nums"
        >
          {pct}%
        </text>
        <text x="60" y="76" textAnchor="middle" fontSize="10" fill={TEXT} opacity={0.6}>
          {proven}/{total}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

// ============================================================
// 5. The loop, as a header
// ============================================================

export function LoopStrip({ steps, active }: { steps: string[]; active?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-2">
          <span
            className={
              active === i
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }
          >
            {i + 1}. {step}
          </span>
          {i < steps.length - 1 && <span className="text-muted-foreground/40">→</span>}
        </span>
      ))}
    </div>
  );
}
