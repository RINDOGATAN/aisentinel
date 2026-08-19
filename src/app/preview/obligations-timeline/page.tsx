// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Dev-only geometry harness for the obligations timeline — renders the shared
 * mock fixture straight from computeTimelineLayout, without a database and
 * without i18n, so the scale, the collision handling and the break markers can
 * be iterated on in isolation. 404s unless ENABLE_PREVIEW_ROUTES=true.
 *
 * Deliberately NOT the production component: this file walks the layout with
 * raw SVG so it stays a harness for the geometry rather than a second
 * renderer that could drift from the real one.
 */

import { notFound } from "next/navigation";
import { computeTimelineLayout } from "@/lib/obligations-timeline/layout";
import {
  MOCK_TIMELINE,
  MOCK_TIMELINE_NOW,
} from "@/lib/obligations-timeline/__fixtures__/mock-timeline";
import {
  TIMELINE,
  TONE_COLORS,
  DASHED_TONES,
} from "@/lib/obligations-timeline/palette";
import type {
  TimelineLayout,
  TimelineOrientation,
} from "@/lib/obligations-timeline/types";

function TimelineSvg({ layout }: { layout: TimelineLayout }) {
  const vertical = layout.orientation === "vertical";
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width="100%"
      style={{
        display: "block",
        background: TIMELINE.cardBg,
        fontFamily: "var(--font-jost), 'Jost', sans-serif",
      }}
    >
      {/* Past band */}
      {layout.pastBand && (
        <rect
          x={layout.pastBand.x}
          y={layout.pastBand.y}
          width={layout.pastBand.w}
          height={layout.pastBand.h}
          fill={TIMELINE.pastBand}
        />
      )}

      {/* Axis */}
      {vertical ? (
        <line
          x1={layout.axis.y}
          y1={layout.axis.x1}
          x2={layout.axis.y}
          y2={layout.axis.x2}
          stroke={TIMELINE.axis}
          strokeWidth={1.5}
        />
      ) : (
        <line
          x1={layout.axis.x1}
          y1={layout.axis.y}
          x2={layout.axis.x2}
          y2={layout.axis.y}
          stroke={TIMELINE.axis}
          strokeWidth={1.5}
        />
      )}

      {/* Year ticks */}
      {layout.ticks.map((tick) => (
        <g key={tick.label}>
          <line
            x1={tick.x}
            y1={layout.axis.y - 5}
            x2={tick.x}
            y2={layout.axis.y + 5}
            stroke={TIMELINE.tick}
            strokeWidth={1}
          />
          <text
            x={tick.x}
            y={layout.axis.y + 18}
            textAnchor="middle"
            fontSize={9}
            fill={TIMELINE.tickLabel}
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* Break markers — the chart annotating its own compression */}
      {layout.breaks.map((brk) => (
        <g key={`${brk.fromId}->${brk.toId}`}>
          <text
            x={brk.x}
            y={layout.axis.y - 12}
            textAnchor="middle"
            fontSize={8}
            fill={TIMELINE.breakGlyph}
          >
            {`⁄⁄ ${brk.trueDays}d`}
          </text>
        </g>
      ))}

      {/* Today */}
      {layout.today && !vertical && (
        <g>
          <line
            x1={layout.today.x}
            y1={8}
            x2={layout.today.x}
            y2={layout.height - 30}
            stroke={TIMELINE.today}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={layout.today.x + 4}
            y={18}
            fontSize={8}
            fill={TIMELINE.today}
            fontWeight={600}
          >
            TODAY{layout.today.clamped ? " (outside range)" : ""}
          </text>
        </g>
      )}

      {/* Milestones */}
      {layout.milestones.map((m) => {
        const color = TONE_COLORS[m.tone];
        return (
          <g key={m.id}>
            <path
              d={m.connector}
              stroke={TIMELINE.connector}
              strokeWidth={1}
              fill="none"
            />
            <circle
              cx={m.dotX}
              cy={m.dotY}
              r={m.dotR}
              fill={m.tone === "past-satisfied" ? TIMELINE.cardBg : color}
              stroke={color}
              strokeWidth={2}
            />
            <rect
              x={m.x}
              y={m.y}
              width={m.w}
              height={m.h}
              rx={6}
              fill={TIMELINE.cardBg}
              stroke={m.emphasis ? color : TIMELINE.cardBorder}
              strokeWidth={m.emphasis ? 2 : 1}
              strokeDasharray={DASHED_TONES.has(m.tone) ? "4 3" : undefined}
            />
            <rect x={m.x} y={m.y} width={3} height={m.h} fill={color} />
            {m.lines.map((line) => (
              <text
                key={line.role}
                x={m.x + 10}
                y={m.y + line.dy}
                fontSize={line.fontSize}
                fill={
                  line.role === "label" ? TIMELINE.ink : TIMELINE.inkMuted
                }
                fontWeight={line.role === "label" ? 600 : 400}
              >
                {line.text}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Variant({
  title,
  orientation,
  compact,
  maxWidth,
}: {
  title: string;
  orientation?: TimelineOrientation;
  compact?: boolean;
  maxWidth?: number;
}) {
  const layout = computeTimelineLayout(MOCK_TIMELINE, {
    nowIso: MOCK_TIMELINE_NOW,
    orientation,
    compact,
    maxWidth,
  });
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        {title} — {layout.width}×{layout.height}, {layout.breaks.length} break
        marker(s)
      </h2>
      <div
        className="rounded-xl border border-border overflow-x-auto"
        style={{ maxWidth: maxWidth ? maxWidth + 32 : undefined }}
      >
        <TimelineSvg layout={layout} />
      </div>
    </section>
  );
}

export default function ObligationsTimelinePreviewPage() {
  if (process.env.ENABLE_PREVIEW_ROUTES !== "true") notFound();

  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div>
        <h1 className="text-lg font-semibold">
          Obligations timeline preview (mock data)
        </h1>
        <p className="text-sm text-muted-foreground">
          Fixed clock: {MOCK_TIMELINE_NOW}. Geometry only — the production
          renderer resolves its own labels through i18n.
        </p>
      </div>
      <Variant title="Horizontal (web default)" />
      <Variant title="Compact (PDF)" compact />
      <Variant title="Vertical (narrow viewport)" orientation="vertical" maxWidth={420} />
    </div>
  );
}
