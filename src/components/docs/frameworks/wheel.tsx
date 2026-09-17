"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { frameworksData, isUnderReview } from "@/lib/frameworks/model";
import { CellDetail, type CellRef } from "./cell-detail";
import { DEPTH_FILL } from "./depth";

// Geometry kept from the alpha: rim at the outside, core at the centre.
const R0 = 64;
const R1 = 330;
const GAP = 0.012;

function pt(r: number, a: number): [number, number] {
  return [r * Math.sin(a), -r * Math.cos(a)];
}

function arc(ri: number, ro: number, a0: number, a1: number): string {
  const p0 = pt(ro, a0);
  const p1 = pt(ro, a1);
  const p2 = pt(ri, a1);
  const p3 = pt(ri, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const f = (p: [number, number]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  return `M${f(p0)}A${ro},${ro} 0 ${large} 1 ${f(p1)}L${f(p2)}A${ri},${ri} 0 ${large} 0 ${f(p3)}Z`;
}

export function FrameworksWheel() {
  const t = useTranslations("docs.frameworks");
  const router = useRouter();
  const hatchId = `hatch-${useId().replace(/:/g, "")}`;
  const { frameworks: F, rings: R } = frameworksData;
  const n = F.length;
  const step = (R1 - R0) / R.length;

  const [focusPos, setFocusPos] = useState({ f: 0, r: 0 });
  const [focused, setFocused] = useState<string | null>(null);
  const [hover, setHover] = useState<CellRef | null>(null);
  const [selected, setSelected] = useState<CellRef | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, SVGPathElement>());

  const key = (fi: number, ri: number) => `${fi}:${ri}`;

  const moveTo = (fi: number, ri: number) => {
    const next = { f: (fi + n) % n, r: Math.max(0, Math.min(R.length - 1, ri)) };
    setFocusPos(next);
    cellRefs.current.get(key(next.f, next.r))?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, fi: number, ri: number) => {
    const moves: Record<string, () => void> = {
      ArrowRight: () => moveTo(fi + 1, ri),
      ArrowLeft: () => moveTo(fi - 1, ri),
      ArrowUp: () => moveTo(fi, ri - 1),
      ArrowDown: () => moveTo(fi, ri + 1),
      Home: () => moveTo(0, ri),
      End: () => moveTo(n - 1, ri),
      Enter: () => setSelected({ framework: F[fi].id, ring: R[ri].id }),
      " ": () => setSelected({ framework: F[fi].id, ring: R[ri].id }),
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      move();
    }
  };

  const preview = hover ?? (focused ? (() => {
    const [fi, ri] = focused.split(":").map(Number);
    return { framework: F[fi].id, ring: R[ri].id };
  })() : null);
  const previewText = (() => {
    if (!preview) return t("wheel.help");
    const f = F.find((x) => x.id === preview.framework)!;
    const r = R.find((x) => x.id === preview.ring)!;
    const c = f.cells[r.id];
    const head = `${f.short} · ${r.label} · ${t("depth.title").toLowerCase()} ${c.depth}`;
    return isUnderReview(c) ? `${head} · ${t("underReview")}` : `${head}. ${c.summary}`;
  })();

  const highlighted = R.find((r) => r.id === highlight);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="rounded-xl border border-border bg-card p-3 sm:p-5">
        <svg
          viewBox="-600 -430 1200 860"
          className="block h-auto w-full touch-manipulation"
          role="group"
          aria-label={t("wheel.label")}
          data-testid="frameworks-wheel"
        >
          <defs>
            <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="var(--muted-foreground)" strokeWidth="2.4" />
            </pattern>
          </defs>
          {F.map((f, fi) => {
            const a0 = (fi * 2 * Math.PI) / n + GAP;
            const a1 = ((fi + 1) * 2 * Math.PI) / n - GAP;
            const mid = (a0 + a1) / 2;
            const lp = pt(R1 + 18, mid);
            const s = Math.sin(mid);
            const c = Math.cos(mid);
            const np = pt(R1 + 44, mid);
            return (
              <g key={f.id}>
                {R.map((r, ri) => {
                  const ro = R1 - ri * step;
                  const rin = ro - step;
                  const cell = f.cells[r.id];
                  const review = isUnderReview(cell);
                  const k = key(fi, ri);
                  const isSel = selected?.framework === f.id && selected.ring === r.id;
                  const dim = !!highlight && highlight !== r.id;
                  const label = t(review ? "wheel.cellReview" : "wheel.cell", {
                    framework: f.short,
                    dimension: r.label,
                    depth: cell.depth,
                  });
                  return (
                    <g key={r.id} opacity={dim ? 0.18 : 1}>
                      <path
                        ref={(el) => {
                          if (el) cellRefs.current.set(k, el);
                          else cellRefs.current.delete(k);
                        }}
                        d={arc(rin, ro, a0, a1)}
                        fill={DEPTH_FILL[cell.depth]}
                        stroke={isSel || focused === k ? "var(--foreground)" : "var(--card)"}
                        strokeWidth={isSel || focused === k ? 3 : 1.2}
                        role="button"
                        tabIndex={focusPos.f === fi && focusPos.r === ri ? 0 : -1}
                        aria-label={label}
                        aria-pressed={isSel}
                        data-cell={`${f.id}/${r.id}`}
                        data-review={review ? "true" : undefined}
                        className="cursor-pointer outline-none"
                        onClick={() => {
                          setFocusPos({ f: fi, r: ri });
                          setSelected({ framework: f.id, ring: r.id });
                        }}
                        onKeyDown={(e) => onKeyDown(e, fi, ri)}
                        onFocus={() => {
                          setFocused(k);
                          setFocusPos({ f: fi, r: ri });
                        }}
                        onBlur={() => setFocused((cur) => (cur === k ? null : cur))}
                        onMouseEnter={() => setHover({ framework: f.id, ring: r.id })}
                        onMouseLeave={() => setHover(null)}
                      />
                      {review && (
                        <path
                          d={arc(rin + 1, ro - 1, a0 + 0.004, a1 - 0.004)}
                          fill={`url(#${hatchId})`}
                          pointerEvents="none"
                          aria-hidden="true"
                          data-hatch="true"
                        />
                      )}
                    </g>
                  );
                })}
                <a
                  href={`/docs/frameworks/compare?f=${encodeURIComponent(f.id)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/docs/frameworks/compare?f=${encodeURIComponent(f.id)}`);
                  }}
                  className="hidden sm:inline"
                  aria-label={`${t("detail.compare")}: ${f.name}`}
                >
                  <text
                    x={lp[0]}
                    y={lp[1] + (c < -0.3 ? 22 : c > 0.3 ? -4 : 10)}
                    textAnchor={Math.abs(s) < 0.2 ? "middle" : s > 0 ? "start" : "end"}
                    fontSize="28"
                    fill="var(--foreground)"
                    className="hover:underline"
                  >
                    {f.short}
                  </text>
                </a>
                <text
                  x={np[0]}
                  y={np[1] + 20}
                  textAnchor="middle"
                  fontSize="56"
                  fontWeight="600"
                  fill="var(--foreground)"
                  className="sm:hidden"
                  aria-hidden="true"
                >
                  {fi + 1}
                </text>
              </g>
            );
          })}
          <g className="hidden sm:inline" aria-hidden="true" fontSize="24" fill="var(--muted-foreground)" textAnchor="middle">
            <text y={-4}>{t("wheel.rim", { ring: R[0].short })}</text>
            <text y={26}>{t("wheel.core", { ring: R[R.length - 1].short })}</text>
          </g>
        </svg>
        <ol className="mt-3 grid grid-cols-2 gap-x-4 list-decimal pl-5 text-xs sm:hidden" aria-label={t("wheel.sliceKey")}>
          {F.map((f) => (
            <li key={f.id}>
              <Link href={`/docs/frameworks/compare?f=${encodeURIComponent(f.id)}`} className="hover:text-primary">
                {f.short}
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-3 min-h-[2.5rem] text-sm text-muted-foreground" aria-hidden="true">
          {previewText}
        </p>
        <p className="text-xs text-muted-foreground">
          <Link href="/docs/frameworks/table" className="text-primary hover:underline">
            {t("wheel.tableLink")}
          </Link>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 self-start">
        <h2 className="font-semibold mb-1">{t("rings.title")}</h2>
        <p className="text-xs text-muted-foreground mb-3">{t("rings.help")}</p>
        <ol className="space-y-0.5">
          {R.map((r, ri) => {
            const on = highlight === r.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  title={r.question}
                  onClick={() => setHighlight(on ? null : r.id)}
                  className={`w-full rounded-md border px-2 py-1 text-left text-sm transition-colors ${
                    on
                      ? "border-primary/30 bg-primary/15 font-medium text-primary"
                      : "border-transparent hover:bg-secondary"
                  }`}
                >
                  <span className="inline-block w-6 text-muted-foreground">{ri + 1}</span>
                  {r.label}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {highlighted
            ? [highlighted.question, highlighted.depthMeaning && t("rings.depthMeaning", { meaning: highlighted.depthMeaning })]
                .filter(Boolean)
                .join(" ")
            : ""}
        </p>
      </div>

      <CellDetail
        cell={selected}
        onClose={() => {
          setSelected(null);
          cellRefs.current.get(key(focusPos.f, focusPos.r))?.focus();
        }}
      />
    </div>
  );
}
