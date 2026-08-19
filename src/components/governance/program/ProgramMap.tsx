"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Interactive renderer for the AI Governance Map.
 *
 * A dumb walk of the deterministic ProgramMapLayout (computed by the shared
 * pure module also used by the PDF report) plus three interaction layers:
 * hover-to-focus dimming, filters that dim (never relayout), and
 * click-through to the AI registry. The canvas is deliberately light inside
 * the dark app — an information graphic, not a themed panel.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  computeProgramMapLayout,
  UNGROUPED_LANE_ID,
} from "@/lib/program-map/layout";
import {
  CANVAS,
  GLYPH_COLORS,
  STAGE_COLORS,
  RISK_COLORS,
  UNCLASSIFIED_COLOR,
} from "@/lib/program-map/palette";
import type {
  ProgramGraph,
  SystemNodeBox,
  GlyphSpec,
  ProgramRiskLevel,
} from "@/lib/program-map/types";

type TierId = ProgramRiskLevel | "UNCLASSIFIED";

const ALL_TIERS: TierId[] = [
  "UNACCEPTABLE",
  "HIGH",
  "LIMITED",
  "MINIMAL",
  "UNCLASSIFIED",
];

const tierColor = (tier: TierId) =>
  tier === "UNCLASSIFIED" ? UNCLASSIFIED_COLOR : RISK_COLORS[tier];

const nodeHasGap = (node: SystemNodeBox) =>
  node.dashed ||
  node.glyphs.some((g) => g.state === "alert" || g.state === "missing");

// ── Glyphs (12px vocabulary, colored by state) ──────────────────────

function Glyph({ glyph, x, y }: { glyph: GlyphSpec; x: number; y: number }) {
  const color = GLYPH_COLORS[glyph.state];
  const outlineOnly = glyph.state === "missing";
  switch (glyph.kind) {
    case "gate":
      // Shield; alert renders outline + center dot, ok/warn filled.
      return (
        <g transform={`translate(${x}, ${y})`}>
          <path
            d="M5 0 L10 2 V6.5 Q10 10.5 5 12 Q0 10.5 0 6.5 V2 Z"
            fill={glyph.state === "alert" || outlineOnly ? "none" : color}
            stroke={color}
            strokeWidth={1}
          />
          {glyph.state === "alert" && <circle cx={5} cy={6} r={1.6} fill={color} />}
        </g>
      );
    case "policy":
      // Document with folded corner; missing = gray outline placeholder.
      return (
        <g transform={`translate(${x}, ${y})`}>
          <path
            d="M0 0 H6 L9 3 V12 H0 Z"
            fill={outlineOnly ? "none" : color}
            fillOpacity={outlineOnly ? 0 : 0.18}
            stroke={color}
            strokeWidth={1}
          />
          <path d="M6 0 V3 H9" fill="none" stroke={color} strokeWidth={1} />
        </g>
      );
    case "transparency":
      // "50" chip (Art. 50)
      return (
        <g transform={`translate(${x}, ${y + 1})`}>
          <rect
            width={16}
            height={10}
            rx={3}
            fill={glyph.state === "ok" ? color : "none"}
            fillOpacity={glyph.state === "ok" ? 0.18 : 0}
            stroke={color}
            strokeWidth={1}
          />
          <text
            x={8}
            y={7.5}
            textAnchor="middle"
            fontSize={6.5}
            fontWeight={700}
            fill={color}
          >
            50
          </text>
        </g>
      );
    case "personalData":
      return (
        <g transform={`translate(${x}, ${y})`}>
          <circle cx={5} cy={3} r={2.4} fill={color} />
          <path d="M0.5 12 Q5 6.5 9.5 12 Z" fill={color} />
        </g>
      );
  }
}

// ── Component ───────────────────────────────────────────────────────

export function ProgramMap({
  graph,
  interactive = true,
  maxWidth,
}: {
  graph: ProgramGraph;
  /** false = static preview: no toolbar, no hover dimming, no click-through */
  interactive?: boolean;
  /** layout width budget; defaults to the layout module's own default */
  maxWidth?: number;
}) {
  const t = useTranslations("program.map");
  const router = useRouter();

  const layout = useMemo(
    () => computeProgramMapLayout(graph, maxWidth ? { maxWidth } : undefined),
    [graph, maxWidth],
  );

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeTiers, setActiveTiers] = useState<Set<TierId>>(
    () => new Set(ALL_TIERS),
  );
  const [showPreDeployment, setShowPreDeployment] = useState(true);
  const [gapsOnly, setGapsOnly] = useState(false);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!map.has(a)) map.set(a, new Set());
      map.get(a)!.add(b);
    };
    for (const edge of layout.edges) {
      link(edge.sourceId, edge.targetId);
      link(edge.targetId, edge.sourceId);
    }
    return map;
  }, [layout.edges]);

  const nodeMatches = (node: SystemNodeBox): boolean => {
    const tier: TierId = node.riskLevel ?? "UNCLASSIFIED";
    if (!activeTiers.has(tier)) return false;
    if (!showPreDeployment && node.muted) return false;
    if (gapsOnly && !nodeHasGap(node)) return false;
    return true;
  };

  const matching = useMemo(() => {
    const set = new Set<string>();
    for (const node of layout.nodes) if (nodeMatches(node)) set.add(node.id);
    // A vendor matches when any connected system matches.
    for (const vendor of layout.vendorNodes) {
      const neighbors = adjacency.get(vendor.id);
      if (neighbors && [...neighbors].some((id) => set.has(id))) {
        set.add(vendor.id);
      }
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, adjacency, activeTiers, showPreDeployment, gapsOnly]);

  const inFocus = (id: string) =>
    hoveredId === null || id === hoveredId || adjacency.get(hoveredId)?.has(id);

  const elementStyle = (id: string): React.CSSProperties => {
    // Static preview renders everything at full strength — no filters are
    // reachable and no hover state exists, so dimming would only confuse.
    if (!interactive) return {};
    const matches = matching.has(id);
    const focused = inFocus(id);
    return {
      opacity: !matches ? 0.15 : focused ? 1 : 0.25,
      filter: matches && !focused ? "grayscale(0.6)" : undefined,
      transition: "opacity 200ms ease, filter 200ms ease",
    };
  };

  const edgeOpacity = (sourceId: string, targetId: string): number => {
    if (!interactive) return 1;
    if (!matching.has(sourceId) || !matching.has(targetId)) return 0;
    if (hoveredId === null) return 1;
    return sourceId === hoveredId || targetId === hoveredId ? 1 : 0.12;
  };

  const toggleTier = (tier: TierId) =>
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });

  const glyphRowY = (node: SystemNodeBox) => node.y + node.h - 17;

  return (
    <div className="space-y-3">
      {/* Filter toolbar (dark theme, matches the app) — interactive mode only */}
      <div
        className="flex items-center gap-2 flex-wrap"
        style={interactive ? undefined : { display: "none" }}
      >
        {ALL_TIERS.map((tier) => {
          const active = activeTiers.has(tier);
          return (
            <Button
              key={tier}
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs gap-1.5"
              onClick={() => toggleTier(tier)}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: tierColor(tier),
                  opacity: active ? 1 : 0.35,
                }}
              />
              {t(`tier.${tier}`)}
            </Button>
          );
        })}
        <span className="w-px h-4 bg-border mx-1" />
        <Button
          variant={showPreDeployment ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setShowPreDeployment((v) => !v)}
        >
          {t("filters.showPreDeployment")}
        </Button>
        <Button
          variant={gapsOnly ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setGapsOnly((v) => !v)}
        >
          {t("filters.gapsOnly")}
        </Button>
      </div>

      {/* Light canvas */}
      <div
        className="rounded-xl border border-border overflow-x-auto"
        style={{ background: CANVAS.bg }}
      >
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          role="img"
          aria-label={t("ariaLabel")}
          style={{
            display: "block",
            minWidth: 720,
            fontFamily: "var(--font-jost), 'Jost', sans-serif",
          }}
          onMouseLeave={interactive ? () => setHoveredId(null) : undefined}
        >
          <defs>
            <pattern id="program-map-dots" width={22} height={22} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={1} fill={CANVAS.dotGrid} />
            </pattern>
          </defs>
          <rect width={layout.width} height={layout.height} fill={CANVAS.bg} />
          <rect width={layout.width} height={layout.height} fill="url(#program-map-dots)" />

          {/* Lanes */}
          {layout.lanes.map((lane) => (
            <g key={lane.id}>
              <rect
                x={lane.x}
                y={lane.y}
                width={lane.w}
                height={lane.h}
                fill={lane.alt ? CANVAS.laneAltBg : CANVAS.laneBg}
                stroke={CANVAS.laneBorder}
                strokeWidth={1}
              />
              <text
                x={lane.x + 12}
                y={lane.y + 22}
                fontSize={13}
                fontWeight={600}
                fill={CANVAS.ink}
              >
                {lane.id === UNGROUPED_LANE_ID ? t("ungrouped") : lane.label}
                <tspan fontSize={11} fontWeight={400} fill={CANVAS.inkMuted}>
                  {"  ·  "}
                  {lane.count}
                </tspan>
              </text>
              {lane.rolloutStage && (
                <g>
                  <rect
                    x={lane.x + lane.w - 12 - (t(`stage.${lane.rolloutStage}`).length * 6.5 + 14)}
                    y={lane.y + 9}
                    width={t(`stage.${lane.rolloutStage}`).length * 6.5 + 14}
                    height={16}
                    rx={8}
                    fill={STAGE_COLORS[lane.rolloutStage].bg}
                  />
                  <text
                    x={lane.x + lane.w - 12 - (t(`stage.${lane.rolloutStage}`).length * 6.5 + 14) / 2}
                    y={lane.y + 20.5}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    letterSpacing={1}
                    fill={STAGE_COLORS[lane.rolloutStage].fg}
                  >
                    {t(`stage.${lane.rolloutStage}`).toUpperCase()}
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* Edges (under nodes) */}
          {layout.edges.map((edge) => (
            <path
              key={`${edge.sourceId}-${edge.targetId}`}
              d={edge.path}
              fill="none"
              stroke={CANVAS.edge}
              strokeWidth={1.25}
              style={{
                opacity: edgeOpacity(edge.sourceId, edge.targetId),
                transition: "opacity 200ms ease",
              }}
            />
          ))}

          {/* System cards */}
          {layout.nodes.map((node) => (
            <g
              key={node.id}
              style={{
                ...elementStyle(node.id),
                cursor: interactive ? "pointer" : "default",
              }}
              onMouseEnter={interactive ? () => setHoveredId(node.id) : undefined}
              onClick={
                interactive
                  ? () => router.push(`/governance/ai-registry/${node.id}`)
                  : undefined
              }
            >
              <rect
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx={6}
                fill={CANVAS.cardBg}
                stroke={CANVAS.cardBorder}
                strokeWidth={1}
                strokeDasharray={node.dashed ? "4 3" : undefined}
              />
              <rect
                x={node.x}
                y={node.y + 6}
                width={4}
                height={node.h - 12}
                rx={2}
                fill={node.riskColor}
              />
              <text
                x={node.x + 12}
                y={node.y + 20}
                fontSize={12}
                fontWeight={node.muted ? 400 : 600}
                fontStyle={node.muted ? "italic" : undefined}
                fill={node.muted ? CANVAS.inkMuted : CANVAS.ink}
              >
                {node.title}
              </text>
              {node.glyphs.map((glyph) => (
                <Glyph
                  key={glyph.kind}
                  glyph={glyph}
                  x={node.x + 12 + glyph.dx}
                  y={glyphRowY(node)}
                />
              ))}
              {node.compliancePct !== null && (
                <g>
                  <rect
                    x={node.x + node.w - 36}
                    y={node.y + node.h - 13}
                    width={24}
                    height={4}
                    rx={2}
                    fill={CANVAS.laneBorder}
                  />
                  <rect
                    x={node.x + node.w - 36}
                    y={node.y + node.h - 13}
                    width={(24 * node.compliancePct) / 100}
                    height={4}
                    rx={2}
                    fill={GLYPH_COLORS.present}
                  />
                </g>
              )}
            </g>
          ))}

          {/* Vendor rail */}
          {layout.vendorNodes.map((vendor) => (
            <g
              key={vendor.id}
              style={elementStyle(vendor.id)}
              onMouseEnter={
                interactive ? () => setHoveredId(vendor.id) : undefined
              }
            >
              <rect
                x={vendor.x}
                y={vendor.y}
                width={vendor.w}
                height={vendor.h}
                rx={8}
                fill={CANVAS.cardBg}
                stroke={vendor.riskColor ?? CANVAS.cardBorder}
                strokeWidth={vendor.bold ? 2 : 1}
              />
              <text
                x={vendor.x + 10}
                y={vendor.y + 18}
                fontSize={11}
                fontWeight={600}
                fill={CANVAS.ink}
              >
                {vendor.name}
              </text>
              <text
                x={vendor.x + 10}
                y={vendor.y + vendor.h - 9}
                fontSize={9}
                fill={CANVAS.inkMuted}
              >
                {t("vendorSystems", { count: vendor.systemCount })}
              </text>
            </g>
          ))}
        </svg>

        {/* Legend (inside the light canvas) */}
        <div
          className="flex items-center gap-x-4 gap-y-1.5 flex-wrap px-4 py-3 border-t"
          style={{ borderColor: CANVAS.laneBorder }}
        >
          {layout.legend.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 text-[11px]"
              style={{ color: CANVAS.inkMuted }}
            >
              {item.shape === "stripe" ? (
                <span
                  className="inline-block w-[3px] h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
              ) : (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-[3px] border"
                  style={{ borderColor: item.color }}
                />
              )}
              {t(`legend.${item.id}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
