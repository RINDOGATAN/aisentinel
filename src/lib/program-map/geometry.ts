// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Deterministic geometry helpers shared by the web map, the scorecard
 * charts, and the PDF renderers. No DOM measurement anywhere — text width
 * uses a fixed per-character estimate so client and server agree byte-for-
 * byte on every coordinate.
 */

// ── Text estimation ─────────────────────────────────────────────────

const NARROW = new Set("iljftr.,:;'|!()[] ".split(""));
const WIDE = new Set("mwMW@%".split(""));
const UPPER = /[A-Z0-9]/;

/**
 * Approximate rendered width of `text` at `fontSize` for a typical
 * grotesque (Inter/Jost-class). Deliberately slightly generous so
 * truncation errs toward shorter, never overflowing.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const ch of text) {
    if (NARROW.has(ch)) units += 0.34;
    else if (WIDE.has(ch)) units += 0.92;
    else if (UPPER.test(ch)) units += 0.68;
    else units += 0.54;
  }
  return units * fontSize;
}

/** Truncate with a trailing ellipsis so the result fits maxWidth. */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
): string {
  if (estimateTextWidth(text, fontSize) <= maxWidth) return text;
  const ellipsis = "…";
  let out = "";
  for (const ch of text) {
    if (estimateTextWidth(out + ch + ellipsis, fontSize) > maxWidth) break;
    out += ch;
  }
  return out.trimEnd() + ellipsis;
}

// ── Bezier edges ────────────────────────────────────────────────────

/**
 * Horizontal cubic bezier from (x1,y1) to (x2,y2); curvature 0..1 sets
 * how far the control points reach toward the midpoint.
 */
export function cubicBezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature = 0.35,
): string {
  const dx = Math.max(Math.abs(x2 - x1) * curvature, 24);
  const c1x = round2(x1 + dx);
  const c2x = round2(x2 - dx);
  return `M ${round2(x1)} ${round2(y1)} C ${c1x} ${round2(y1)}, ${c2x} ${round2(y2)}, ${round2(x2)} ${round2(y2)}`;
}

// ── Radar (spider) chart ────────────────────────────────────────────

export interface RadarPoint {
  x: number;
  y: number;
}

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleRad: number,
): RadarPoint {
  return {
    x: round2(cx + r * Math.cos(angleRad)),
    y: round2(cy + r * Math.sin(angleRad)),
  };
}

/**
 * Points of a radar polygon for `values` (0..max), starting at 12 o'clock,
 * clockwise. Returns one point per value.
 */
export function radarPolygonPoints(
  values: number[],
  max: number,
  cx: number,
  cy: number,
  radius: number,
): RadarPoint[] {
  const n = values.length;
  return values.map((v, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = (Math.max(0, Math.min(v, max)) / max) * radius;
    return polarToCartesian(cx, cy, r, angle);
  });
}

export function pointsToPath(points: RadarPoint[], close = true): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  const body = rest.map((p) => `L ${p.x} ${p.y}`).join(" ");
  return `M ${first.x} ${first.y} ${body}${close ? " Z" : ""}`;
}

// ── Donut arcs ──────────────────────────────────────────────────────

/**
 * SVG path for a donut segment between startAngle and endAngle (radians,
 * 0 = 3 o'clock, clockwise positive).
 */
export function donutArcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
