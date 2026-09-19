"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one way to show a risk tier (and the vendor-risk / severity scales that
 * borrow it): a neutral chip, a coloured marker, and the label in the normal
 * text colour. Colours come from src/config/risk-tier-palette.ts via the
 * --tier-* CSS variables. Never colour the label text itself.
 */

import type * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { useEnumLabels } from "@/lib/enum-labels";
import { cn } from "@/lib/utils";
import { TIER_BG_CLASS, toRiskTier } from "@/config/risk-tier-palette";

/**
 * The coloured shape for a tier: a filled dot, or a hollow ring for
 * "not classified". `shape="bar"` gives a short vertical bar for legends
 * and list rows.
 */
export function TierMarker({
  level,
  shape = "dot",
  className,
}: {
  level: string | null | undefined;
  shape?: "dot" | "bar" | "square";
  className?: string;
}) {
  const tier = toRiskTier(level);
  const base =
    shape === "bar"
      ? "w-1 h-3.5 rounded-sm"
      : shape === "square"
        ? "size-2.5 rounded-sm"
        : "size-2 rounded-full";
  const fill =
    tier === "UNCLASSIFIED"
      ? "border-[1.5px] border-tier-unclassified bg-transparent"
      : TIER_BG_CLASS[tier];
  return (
    <span
      aria-hidden="true"
      data-tier={tier}
      className={cn("inline-block shrink-0", base, fill, className)}
    />
  );
}

/** Neutral chip + marker + label (label must be supplied). */
export function TierChip({
  level,
  children,
  className,
}: {
  level: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-tier={toRiskTier(level)}
      className={cn("bg-tier-chip text-foreground border-border gap-1.5", className)}
    >
      <TierMarker level={level} />
      {children}
    </Badge>
  );
}

/**
 * Risk-tier badge with the translated label by default. A null/undefined
 * level renders the "not classified" state (hollow ring).
 */
export function RiskTierBadge({
  level,
  label,
  className,
}: {
  level: string | null | undefined;
  label?: React.ReactNode;
  className?: string;
}) {
  const { riskLabel } = useEnumLabels();
  const tr = useTranslations("riskClassification");
  const text = label ?? (level ? riskLabel(level) : tr("unclassified"));
  return (
    <TierChip level={level} className={className}>
      {text}
    </TierChip>
  );
}
