// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Deterministic obligations-timeline layout.
 *
 * Pure function: milestone inputs in, pixel geometry out. The SAME function
 * runs in the browser and on the server (PDF), so the two surfaces are
 * geometrically identical by construction — no DOM measurement, no clock read,
 * no randomness. `nowIso` is an input for exactly that reason.
 *
 * THE SCALE IS THE LOAD-BEARING DECISION. A pure linear time axis crushes the
 * Dec-2026/Jan-2027 cluster into unreadable overlap and wastes half the canvas
 * on an empty 2029. A pure ordinal axis spaces everything evenly but destroys
 * the one fact the calendar exists to communicate: California ADMT lands
 * ELEVEN MONTHS before the EU's Annex III duties. So the position is blended —
 * ordinal-dominant for legibility, with enough linear weight that a long gap
 * still reads as long — and where the follow-up min-gap pass compresses a real
 * interval beyond tolerance we emit a break marker carrying the true interval,
 * so the chart annotates its own distortion instead of hiding it.
 */

import type {
  TimelineLayout,
  TimelineLayoutOptions,
  TimelineMilestoneInput,
  MilestoneBox,
  TimelineBreak,
  TimelineTick,
  TimelineTextLine,
  TimelineLegendItem,
  TimelineTone,
} from "./types";
import { TONE_COLORS } from "./palette";
import { truncateToWidth, cubicBezierPath, round2 } from "@/lib/program-map/geometry";

// ── Metrics ─────────────────────────────────────────────────────────

interface Metrics {
  margin: number;
  axisY: number;
  cardW: number;
  cardH: number;
  dotR: number;
  /** Vertical distance from the axis to the nearest card edge. */
  stemLen: number;
  /** Extra offset for the outer row of a two-row side. */
  rowOffset: number;
  dateFont: number;
  labelFont: number;
  countFont: number;
  tickFont: number;
  legendH: number;
}

const NORMAL: Metrics = {
  margin: 24,
  axisY: 150,
  cardW: 168,
  cardH: 64,
  dotR: 6,
  stemLen: 34,
  rowOffset: 74,
  dateFont: 9,
  labelFont: 11,
  countFont: 9,
  tickFont: 9,
  legendH: 28,
};

const COMPACT: Metrics = {
  margin: 16,
  axisY: 118,
  cardW: 136,
  cardH: 52,
  dotR: 4.5,
  stemLen: 26,
  rowOffset: 60,
  dateFont: 7.5,
  labelFont: 9,
  countFont: 7.5,
  tickFont: 7.5,
  legendH: 22,
};

const DEFAULT_MAX_WIDTH = 1160;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Blend weight. 0 = pure ordinal (even spacing, gap magnitude invisible),
 * 1 = pure linear (true proportion, near-term cluster illegible). 0.35 keeps
 * clustered deadlines readable while a multi-year gap still visibly dwarfs a
 * one-month one.
 */
export const LINEAR_WEIGHT = 0.35;

/** A compressed interval is annotated once it is distorted beyond this. */
export const BREAK_DISTORTION_TOLERANCE = 0.2;

const ALL_TONES: TimelineTone[] = [
  "overdue",
  "imminent",
  "upcoming",
  "past-satisfied",
  "not-applicable",
  "unknown",
];

const LEGEND: TimelineLegendItem[] = ALL_TONES.map((id) => ({
  id,
  color: TONE_COLORS[id],
}));

// ── Helpers ─────────────────────────────────────────────────────────

function parseUtc(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00.000Z`).getTime();
}

/** Text lines for a card, truncated to the card's inner width. */
function cardLines(
  m: TimelineMilestoneInput,
  metrics: Metrics,
): TimelineTextLine[] {
  const inner = metrics.cardW - 16;
  const lines: TimelineTextLine[] = [
    {
      text: truncateToWidth(m.dateLabel, inner, metrics.dateFont),
      fontSize: metrics.dateFont,
      dy: 14,
      role: "date",
    },
    {
      text: truncateToWidth(m.label, inner, metrics.labelFont),
      fontSize: metrics.labelFont,
      dy: 30,
      role: "label",
    },
  ];
  if (m.countLabel) {
    lines.push({
      text: truncateToWidth(m.countLabel, inner, metrics.countFont),
      fontSize: metrics.countFont,
      dy: 46,
      role: "count",
    });
  }
  return lines;
}

/** Jan-1 ticks spanning the milestone range, padded by ~90 days each side. */
function yearTicks(
  minMs: number,
  maxMs: number,
  toX: (ms: number) => number,
): TimelineTick[] {
  const startYear = new Date(minMs).getUTCFullYear();
  const endYear = new Date(maxMs).getUTCFullYear();
  const ticks: TimelineTick[] = [];
  for (let y = startYear; y <= endYear + 1; y++) {
    const ms = Date.UTC(y, 0, 1);
    if (ms < minMs || ms > maxMs) continue;
    ticks.push({ x: round2(toX(ms)), label: String(y) });
  }
  return ticks;
}

// ── Layout ──────────────────────────────────────────────────────────

export function computeTimelineLayout(
  milestones: TimelineMilestoneInput[],
  opts: TimelineLayoutOptions = {},
): TimelineLayout {
  const metrics = opts.compact ? COMPACT : NORMAL;
  const maxWidth = opts.maxWidth ?? DEFAULT_MAX_WIDTH;
  const orientation = opts.orientation ?? "horizontal";

  // Deterministic order: date, then id. Never rely on input order.
  const sorted = [...milestones].sort((a, b) => {
    const delta = parseUtc(a.dateIso) - parseUtc(b.dateIso);
    if (delta !== 0) return delta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  if (orientation === "vertical") {
    return verticalLayout(sorted, metrics, maxWidth, opts.nowIso);
  }

  const axisX1 = metrics.margin;
  const axisX2 = maxWidth - metrics.margin;
  // Cards are centred on their dots, so the dot range is inset by half a card
  // at each end — otherwise the first and last cards hang off the canvas.
  const dotX1 = axisX1 + metrics.cardW / 2;
  const dotX2 = axisX2 - metrics.cardW / 2;
  const axisWidth = Math.max(dotX2 - dotX1, 1);

  if (sorted.length === 0) {
    return {
      width: maxWidth,
      height: metrics.axisY + metrics.stemLen + metrics.cardH + metrics.margin,
      orientation: "horizontal",
      axis: { y: metrics.axisY, x1: axisX1, x2: axisX2 },
      ticks: [],
      today: null,
      pastBand: null,
      milestones: [],
      breaks: [],
      legend: LEGEND,
    };
  }

  const times = sorted.map((m) => parseUtc(m.dateIso));
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);
  const span = maxMs - minMs;

  // ── Blended position ──────────────────────────────────────────────
  const n = sorted.length;
  const rawPos = times.map((t, i) => {
    const linear = span === 0 ? 0.5 : (t - minMs) / span;
    const ordinal = n === 1 ? 0.5 : i / (n - 1);
    return LINEAR_WEIGHT * linear + (1 - LINEAR_WEIGHT) * ordinal;
  });

  let xs = rawPos.map((p) => dotX1 + p * axisWidth);

  // ── Min-gap pass: left to right, push right only (order preserved) ─
  const minGap = metrics.cardW / 2 + 8;
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] < minGap) xs[i] = xs[i - 1] + minGap;
  }
  // If the pass overflowed the axis, rescale the whole run back into it so
  // nothing is pushed off-canvas.
  const overflow = xs[xs.length - 1] - dotX2;
  if (overflow > 0 && xs.length > 1) {
    const usable = dotX2 - dotX1;
    const produced = xs[xs.length - 1] - xs[0];
    const scale = produced === 0 ? 1 : usable / produced;
    xs = xs.map((x) => dotX1 + (x - xs[0]) * scale);
  }

  // ── Break markers where compression distorted a real interval ──────
  const breaks: TimelineBreak[] = [];
  if (span > 0) {
    const totalPx = xs[xs.length - 1] - xs[0];
    for (let i = 1; i < sorted.length; i++) {
      const trueDays = Math.round((times[i] - times[i - 1]) / DAY_MS);
      if (trueDays <= 0) continue;
      const trueShare = (times[i] - times[i - 1]) / span;
      const drawnShare = totalPx === 0 ? 0 : (xs[i] - xs[i - 1]) / totalPx;
      // Only flag *compression* (drawn much smaller than true) — an expanded
      // short gap is the intended readability trade, not a lie about distance.
      if (trueShare > 0 && drawnShare < trueShare * (1 - BREAK_DISTORTION_TOLERANCE)) {
        breaks.push({
          x: round2((xs[i - 1] + xs[i]) / 2),
          fromId: sorted[i - 1].id,
          toId: sorted[i].id,
          trueDays,
        });
      }
    }
  }

  // ── Side assignment within collision clusters ─────────────────────
  // A cluster is a run of cards whose x-ranges overlap; within it we
  // alternate by cluster-local index so the choice is deterministic (no
  // jitter, no global parity that flips when one milestone is filtered out).
  const sides: ("above" | "below")[] = [];
  let clusterStart = 0;
  for (let i = 0; i < xs.length; i++) {
    if (i > 0 && xs[i] - xs[i - 1] >= metrics.cardW) clusterStart = i;
    sides.push((i - clusterStart) % 2 === 0 ? "above" : "below");
  }

  // Two cards on the same side within one cluster get a second row.
  const rowIndex: number[] = [];
  {
    const lastOnSide: Record<"above" | "below", number> = {
      above: -Infinity,
      below: -Infinity,
    };
    for (let i = 0; i < xs.length; i++) {
      const side = sides[i];
      const prev = lastOnSide[side];
      rowIndex.push(prev !== -Infinity && xs[i] - prev < metrics.cardW ? 1 : 0);
      lastOnSide[side] = xs[i];
    }
  }

  // The axis sits wherever the tallest stack of cards above it needs it to.
  // A fixed axisY silently pushed a second row of "above" cards off the top of
  // the canvas at narrower widths.
  const maxRowAbove = Math.max(
    0,
    ...rowIndex.filter((_, i) => sides[i] === "above"),
  );
  const maxRowBelow = Math.max(
    0,
    ...rowIndex.filter((_, i) => sides[i] === "below"),
  );
  const topExtent =
    metrics.stemLen + maxRowAbove * metrics.rowOffset + metrics.cardH;
  const bottomExtent =
    metrics.stemLen + maxRowBelow * metrics.rowOffset + metrics.cardH;
  const axisY = Math.max(metrics.axisY, metrics.margin + topExtent);

  const boxes: MilestoneBox[] = sorted.map((m, i) => {
    const side = sides[i];
    const row = rowIndex[i];
    const dotX = round2(xs[i]);
    const dotY = axisY;
    const offset = metrics.stemLen + row * metrics.rowOffset;
    const y =
      side === "above" ? axisY - offset - metrics.cardH : axisY + offset;
    const x = round2(dotX - metrics.cardW / 2);
    const connectorEndY = side === "above" ? y + metrics.cardH : y;
    return {
      id: m.id,
      side,
      x,
      y: round2(y),
      w: metrics.cardW,
      h: metrics.cardH,
      dotX,
      dotY,
      dotR: metrics.dotR,
      connector: cubicBezierPath(dotX, dotY, dotX, connectorEndY, 0.2),
      tone: m.tone,
      emphasis: m.emphasis,
      lines: cardLines(m, metrics),
    };
  });

  // ── Today marker ──────────────────────────────────────────────────
  let today: TimelineLayout["today"] = null;
  if (opts.nowIso) {
    const nowMs = new Date(opts.nowIso).getTime();
    // Interpolate "today" onto the *drawn* axis by finding its neighbours in
    // real time and mapping proportionally between their drawn positions —
    // consistent with the blended scale rather than a second, linear one.
    let x: number;
    let clamped = false;
    if (nowMs <= times[0]) {
      x = xs[0];
      clamped = nowMs < times[0];
    } else if (nowMs >= times[times.length - 1]) {
      x = xs[xs.length - 1];
      clamped = nowMs > times[times.length - 1];
    } else {
      let j = 1;
      while (j < times.length && times[j] < nowMs) j++;
      const t0 = times[j - 1];
      const t1 = times[j];
      const frac = t1 === t0 ? 0 : (nowMs - t0) / (t1 - t0);
      x = xs[j - 1] + frac * (xs[j] - xs[j - 1]);
    }
    today = { x: round2(x), clamped };
  }

  const height = axisY + bottomExtent + metrics.margin + metrics.legendH;

  return {
    width: maxWidth,
    height: round2(height),
    orientation: "horizontal",
    axis: { y: axisY, x1: axisX1, x2: axisX2 },
    ticks: span === 0 ? [] : yearTicks(minMs, maxMs, (ms) => {
      // Map a tick's real time through the same neighbour interpolation.
      if (ms <= times[0]) return xs[0];
      if (ms >= times[times.length - 1]) return xs[xs.length - 1];
      let j = 1;
      while (j < times.length && times[j] < ms) j++;
      const t0 = times[j - 1];
      const t1 = times[j];
      const frac = t1 === t0 ? 0 : (ms - t0) / (t1 - t0);
      return xs[j - 1] + frac * (xs[j] - xs[j - 1]);
    }),
    today,
    // The band shades time that has already elapsed. It exists only when
    // "now" is genuinely past the first milestone — a today marker clamped to
    // the left edge means nothing has happened yet, and shading there would
    // invent a past.
    pastBand:
      today && new Date(opts.nowIso!).getTime() > times[0]
        ? {
            x: axisX1,
            y: metrics.margin,
            w: round2(Math.max(today.x - axisX1, 0)),
            h: round2(height - metrics.margin - metrics.legendH),
          }
        : null,
    milestones: boxes,
    breaks,
    legend: LEGEND,
  };
}

// ── Vertical (narrow viewports) ─────────────────────────────────────

/**
 * Same data, same tones, same determinism — a vertical spine with stacked
 * cards. A scaled-down horizontal timeline is unreadable on a phone, and a
 * horizontally scrollable one hides the "today" anchor, which is the single
 * most important mark on the chart.
 */
function verticalLayout(
  sorted: TimelineMilestoneInput[],
  metrics: Metrics,
  maxWidth: number,
  nowIso?: string,
): TimelineLayout {
  const spineX = metrics.margin + metrics.dotR + 6;
  const cardX = spineX + 22;
  const cardW = Math.max(160, maxWidth - cardX - metrics.margin);
  const rowGap = 12;
  const rowH = metrics.cardH + rowGap;

  const boxes: MilestoneBox[] = sorted.map((m, i) => {
    const y = metrics.margin + i * rowH;
    return {
      id: m.id,
      side: "below",
      x: round2(cardX),
      y: round2(y),
      w: round2(cardW),
      h: metrics.cardH,
      dotX: round2(spineX),
      dotY: round2(y + metrics.cardH / 2),
      dotR: metrics.dotR,
      connector: `M ${round2(spineX)} ${round2(y + metrics.cardH / 2)} L ${round2(cardX)} ${round2(y + metrics.cardH / 2)}`,
      tone: m.tone,
      emphasis: m.emphasis,
      lines: cardLines(m, { ...metrics, cardW }),
    };
  });

  const contentH = sorted.length * rowH;
  const height = metrics.margin * 2 + contentH + metrics.legendH;

  // Today sits between the two rows that straddle it.
  let today: TimelineLayout["today"] = null;
  if (nowIso && sorted.length > 0) {
    const nowMs = new Date(nowIso).getTime();
    const times = sorted.map((m) => parseUtc(m.dateIso));
    let index = times.findIndex((t) => t >= nowMs);
    let clamped = false;
    if (index === -1) {
      index = sorted.length;
      clamped = true;
    } else if (index === 0 && nowMs < times[0]) {
      clamped = true;
    }
    today = {
      x: round2(metrics.margin + index * rowH),
      clamped,
    };
  }

  return {
    width: maxWidth,
    height: round2(height),
    orientation: "vertical",
    axis: {
      y: spineX,
      x1: metrics.margin,
      x2: round2(metrics.margin + contentH),
    },
    ticks: [],
    today,
    pastBand: null,
    milestones: boxes,
    breaks: [],
    legend: LEGEND,
  };
}
