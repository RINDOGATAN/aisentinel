// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useTranslations } from "next-intl";
import type { Depth } from "@/lib/frameworks/model";

// Depth reads as more of the brand colour: 0 is the muted surface, 3 is full
// amber. The mixes are against the card colour so the steps stay even on the
// dark theme.
export const DEPTH_FILL: Record<Depth, string> = {
  0: "var(--muted)",
  1: "color-mix(in srgb, var(--primary) 35%, var(--card))",
  2: "color-mix(in srgb, var(--primary) 65%, var(--card))",
  3: "var(--primary)",
};

const DEPTH_TEXT: Record<Depth, string> = {
  0: "var(--foreground)",
  1: "var(--foreground)",
  2: "var(--primary-foreground)",
  3: "var(--primary-foreground)",
};

/** The stripes laid over a cell whose source is still being checked. */
export const HATCH_BACKGROUND =
  "repeating-linear-gradient(45deg, transparent 0 3px, var(--muted-foreground) 3px 5px)";

export function DepthChip({ depth, underReview = false }: { depth: Depth; underReview?: boolean }) {
  const t = useTranslations("docs.frameworks");
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-xs font-semibold shrink-0"
      style={{
        background: underReview ? `${HATCH_BACKGROUND}, ${DEPTH_FILL[depth]}` : DEPTH_FILL[depth],
        color: DEPTH_TEXT[depth],
      }}
      title={`${t("depth.title")}: ${t("depth.value", { depth })}`}
    >
      {depth}
    </span>
  );
}

export function UnderReviewTag() {
  const t = useTranslations("docs.frameworks");
  return (
    // Body-colour text on a neutral fill; the hatch swatch (the same one the
    // legend and the wheel use) carries the signal, not coloured text.
    <span className="inline-flex items-center gap-1.5 rounded border border-border bg-tier-chip px-1.5 text-[11px] font-medium text-foreground">
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 rounded-sm border border-border"
        style={{ background: HATCH_BACKGROUND }}
      />
      {t("underReview")}
    </span>
  );
}

export function DepthLegend() {
  const t = useTranslations("docs.frameworks");
  const depths: Depth[] = [0, 1, 2, 3];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span>{t("depth.legend")}</span>
      {depths.map((d) => (
        <span key={d} className="inline-flex items-center gap-1">
          <DepthChip depth={d} />
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 rounded border border-border"
          style={{ background: HATCH_BACKGROUND }}
        />
        {t("underReview")}
      </span>
    </div>
  );
}
