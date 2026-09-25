// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A small ring in the accent colour: the track is always drawn, the arc fills
 * in when the value arrives, so nothing moves when progress loads. Decorative:
 * the progress it shows is always also written out as text beside it.
 */

export function ProgressRing({
  value,
  total,
  size = 28,
  children,
}: {
  /** Null while loading: only the track is drawn. */
  value: number | null;
  total: number;
  size?: number;
  children?: React.ReactNode;
}) {
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = value === null || total === 0 ? 0 : Math.min(1, value / total);
  return (
    <span
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
          style={{ opacity: fraction === 0 ? 0 : 1 }}
        />
      </svg>
      {children && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
          {children}
        </span>
      )}
    </span>
  );
}

/** A thin bar in the accent colour, for the phone's stage line. */
export function ProgressBar({ value, total }: { value: number | null; total: number }) {
  const fraction = value === null || total === 0 ? 0 : Math.min(1, value / total);
  return (
    <span className="block h-1 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
      <span
        className="block h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500"
        style={{ width: `${Math.round(fraction * 100)}%` }}
      />
    </span>
  );
}
