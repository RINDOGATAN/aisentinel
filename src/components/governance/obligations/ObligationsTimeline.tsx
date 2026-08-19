"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Interactive renderer for the regulatory obligations timeline.
 *
 * A dumb walk of the deterministic TimelineLayout computed by the shared pure
 * module (the same one the PDF will use), plus selection. The canvas is
 * deliberately light inside the dark app — an information graphic, not a
 * themed panel — matching the governance map.
 *
 * Narrow viewports get the vertical spine rather than a squeezed or
 * horizontally-scrolled desktop chart: shrinking the horizontal layout hides
 * the "today" anchor, which is the one element the whole picture hangs on.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { computeTimelineLayout } from "@/lib/obligations-timeline/layout";
import {
  TIMELINE,
  TONE_COLORS,
  DASHED_TONES,
} from "@/lib/obligations-timeline/palette";
import type {
  TimelineLayout,
  TimelineMilestoneInput,
} from "@/lib/obligations-timeline/types";
import type { ObligationRow } from "@/server/services/obligations/obligations-data";

const MOBILE_BREAKPOINT = 768;

/**
 * The count line is the honesty surface: in-scope and undetermined are shown
 * as two numbers and never summed, and a zero with unresolved scope is phrased
 * as "not yet determined" rather than as "0 systems".
 */
export function useCountLabel() {
  const t = useTranslations("obligations");

  return (row: ObligationRow): string | null => {
    const inScope = row.inScope.length;
    const undetermined = row.undetermined.length;

    if (row.countUnit === "organization") {
      if (row.applicability === "applies") return t("counts.organization");
      if (undetermined > 0)
        return t("counts.undeterminedOnly", { count: undetermined });
      return t("counts.notApplicable");
    }

    if (inScope > 0 && undetermined > 0) {
      return t("counts.inScopeWithUndetermined", { inScope, undetermined });
    }
    if (inScope > 0) return t("counts.inScope", { count: inScope });
    if (undetermined > 0)
      return t("counts.undeterminedOnly", { count: undetermined });
    return t("counts.notApplicable");
  };
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return narrow;
}

function TimelineSvg({
  layout,
  ariaLabel,
  todayLabel,
  selectedId,
  onSelect,
}: {
  layout: TimelineLayout;
  ariaLabel: string;
  todayLabel: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const vertical = layout.orientation === "vertical";

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width="100%"
      role="img"
      aria-label={ariaLabel}
      style={{
        display: "block",
        background: TIMELINE.cardBg,
        fontFamily: "var(--font-jost), 'Jost', sans-serif",
      }}
    >
      {layout.pastBand && (
        <rect
          x={layout.pastBand.x}
          y={layout.pastBand.y}
          width={layout.pastBand.w}
          height={layout.pastBand.h}
          fill={TIMELINE.pastBand}
        />
      )}

      {/* Axis — in vertical mode the layout swaps the roles of x and y */}
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

      {!vertical &&
        layout.ticks.map((tick) => (
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

      {/* Break markers: the chart annotating a gap it compressed, so the
          eleven-month CA→EU interval is never silently misrepresented. */}
      {!vertical &&
        layout.breaks.map((brk) => (
          <text
            key={`${brk.fromId}->${brk.toId}`}
            x={brk.x}
            y={layout.axis.y - 12}
            textAnchor="middle"
            fontSize={8}
            fill={TIMELINE.breakGlyph}
          >
            {`⁄⁄ ${brk.trueDays}d`}
          </text>
        ))}

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
            {todayLabel}
          </text>
        </g>
      )}

      {layout.milestones.map((m) => {
        const color = TONE_COLORS[m.tone];
        const selected = selectedId === m.id;
        return (
          <g
            key={m.id}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(m.id)}
            opacity={selectedId && !selected ? 0.55 : 1}
          >
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
              stroke={selected || m.emphasis ? color : TIMELINE.cardBorder}
              strokeWidth={selected || m.emphasis ? 2 : 1}
              strokeDasharray={DASHED_TONES.has(m.tone) ? "4 3" : undefined}
            />
            <rect x={m.x} y={m.y} width={3} height={m.h} fill={color} />
            {m.lines.map((line) => (
              <text
                key={line.role}
                x={m.x + 10}
                y={m.y + line.dy}
                fontSize={line.fontSize}
                fill={line.role === "label" ? TIMELINE.ink : TIMELINE.inkMuted}
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

export function ObligationsTimeline({
  rows,
  nowIso,
  selectedId = null,
  onSelect,
}: {
  rows: ObligationRow[];
  nowIso?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const t = useTranslations("obligations");
  const locale = useLocale();
  const countLabel = useCountLabel();
  const narrow = useIsNarrow();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );

  const inputs: TimelineMilestoneInput[] = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        dateIso: row.dateIso,
        label: row.title,
        dateLabel: dateFormatter.format(new Date(`${row.dateIso}T00:00:00Z`)),
        countLabel: countLabel(row),
        tone: row.tone,
        emphasis: row.id === rows.find((r) => r.phase !== "past")?.id,
      })),
    // countLabel is recreated each render by useTranslations; the row set and
    // formatter are what actually change the output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, dateFormatter],
  );

  const layout = useMemo(
    () =>
      computeTimelineLayout(inputs, {
        nowIso,
        orientation: narrow ? "vertical" : "horizontal",
        maxWidth: narrow ? 420 : undefined,
      }),
    [inputs, nowIso, narrow],
  );

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <TimelineSvg
        layout={layout}
        ariaLabel={t("ariaLabel")}
        todayLabel={t("legend.today")}
        selectedId={selectedId}
        onSelect={(id) => onSelect?.(id)}
      />
      <div className="flex flex-wrap gap-3 px-3 py-2 border-t border-border bg-card">
        {layout.legend.map((item) => (
          <span
            key={item.id}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: item.color }}
            />
            {t(`tone.${item.id}`)}
          </span>
        ))}
        {layout.breaks.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {t("legend.breakMarker")}
          </span>
        )}
      </div>
    </div>
  );
}
