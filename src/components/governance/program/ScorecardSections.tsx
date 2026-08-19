"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Scorecard building blocks for the Program page: headline tiles, the
 * dimension grid, the 90-day plan, rollout guidance, and the law-firm
 * professional-duties grid. All data arrives locale-resolved from
 * program.getProgramScorecard.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { STAGE_COLORS } from "@/lib/program-map/palette";
import type {
  DimensionScore,
  ProgramGap,
} from "@/server/services/program/maturity";
import type { ProgramScorecardData } from "@/server/services/program/program-data";

// ── Headline tiles ──────────────────────────────────────────────────

export function ScorecardTiles({
  tiles,
}: {
  tiles: ProgramScorecardData["tiles"];
}) {
  const t = useTranslations("program.tiles");
  const items = [
    { label: t("overall"), value: `${tiles.overall}`, accent: true },
    {
      label: t("systemsGoverned"),
      value: `${tiles.systemsGoverned.classified}/${tiles.systemsGoverned.total}`,
    },
    {
      label: t("highRisk"),
      value:
        tiles.highRiskUnderOversight.needing === 0
          ? "—"
          : `${tiles.highRiskUnderOversight.withGate}/${tiles.highRiskUnderOversight.needing}`,
    },
    {
      label: t("policyCoverage"),
      value: `${tiles.policyCoverage.coreTypesPresent}/6`,
    },
    { label: t("complianceAssessed"), value: `${tiles.complianceAssessedPct}%` },
    { label: t("openGaps"), value: `${tiles.openGaps}`, warn: tiles.openGaps > 0 },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 text-center">
            <div
              className={`text-2xl font-bold ${
                item.accent
                  ? "text-primary"
                  : item.warn
                    ? "text-warning"
                    : ""
              }`}
            >
              {item.value}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {item.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Dimension grid ──────────────────────────────────────────────────

export function DimensionGrid({ dimensions }: { dimensions: DimensionScore[] }) {
  const t = useTranslations("program.dimension");
  return (
    <div className="space-y-3">
      {dimensions.map((dim) => (
        <div key={dim.id}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t(dim.id)}</span>
            <span className="font-medium tabular-nums">{dim.score}</span>
          </div>
          <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/80"
              style={{ width: `${dim.score}%` }}
            />
            {/* target tick */}
            <div
              className="absolute inset-y-0 w-0.5 bg-muted-foreground/60"
              style={{ left: `${dim.target}%` }}
              title={`${dim.target}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 90-day plan ─────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<ProgramGap["severity"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-secondary text-muted-foreground border-border",
};

export function NinetyDayPlan({
  plan,
}: {
  plan: ProgramScorecardData["plan"];
}) {
  const t = useTranslations("program.plan");
  const bucketLabels: Record<string, string> = {
    "1-30": t("bucket1"),
    "31-60": t("bucket2"),
    "61-90": t("bucket3"),
  };
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plan.map((bucket) => (
        <div key={bucket.bucket} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {bucketLabels[bucket.bucket]}
          </p>
          {bucket.items.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">{t("empty")}</p>
          ) : (
            bucket.items.map((item) => (
              <Link key={item.gapId} href={item.href} className="block">
                <Card className="hover:border-primary/50 transition-all cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${SEVERITY_STYLES[item.severity]}`}
                      >
                        {item.count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <span>{t("effort", { effort: item.effort })}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

// ── Rollout guidance ────────────────────────────────────────────────

export function RolloutGuidance({
  rollout,
}: {
  rollout: ProgramScorecardData["rollout"];
}) {
  const t = useTranslations("program.stage");
  if (rollout.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rollout.map((rec) => {
        const stage = STAGE_COLORS[rec.stage];
        return (
          <Card key={rec.categoryId}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{rec.label}</p>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ color: stage.fg, backgroundColor: stage.bg }}
                >
                  {t(rec.stage)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{rec.summary}</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                {rec.preconditions.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Professional-duties grid (lawfirm) ──────────────────────────────

const DUTY_STATUS_STYLES: Record<string, string> = {
  inPlace: "bg-success/15 text-success border-success/30",
  partial: "bg-warning/15 text-warning border-warning/30",
  missing: "bg-destructive/15 text-destructive border-destructive/30",
  recommended: "bg-secondary text-muted-foreground border-border",
};

export function DutiesGrid({
  duties,
}: {
  duties: NonNullable<ProgramScorecardData["duties"]>;
}) {
  const t = useTranslations("program.duties");
  return (
    <div className="space-y-3">
      {duties.map((duty) => (
        <Card key={duty.id}>
          <CardContent className="p-4">
            <div className="sm:flex items-start justify-between gap-6">
              <div className="sm:max-w-[45%]">
                <p className="text-sm font-medium">{duty.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {duty.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 sm:mt-0 sm:justify-end">
                {duty.controls.map((control, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={`text-[10px] ${DUTY_STATUS_STYLES[control.status]}`}
                    title={t(`status.${control.status}`)}
                  >
                    {control.kind === "policy" || control.kind === "training"
                      ? control.label
                      : control.kind === "gateType"
                        ? t("controlGate", { gateType: control.label ?? "" })
                        : t(`control.${control.kind}`)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
