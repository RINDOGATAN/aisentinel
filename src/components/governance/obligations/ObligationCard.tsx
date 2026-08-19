"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Per-milestone detail card.
 *
 * Carries the two things a countdown alone cannot: what the obligation
 * actually requires, and exactly which of the organisation's systems are in
 * scope, undetermined, or out of scope — with the undetermined ones naming
 * the missing fact and offering the action that resolves it.
 */

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, HelpCircle } from "lucide-react";
import { TONE_COLORS } from "@/lib/obligations-timeline/palette";
import type { ObligationRow } from "@/server/services/obligations/obligations-data";

export function ObligationCard({
  row,
  expanded,
  onToggle,
}: {
  row: ObligationRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("obligations");
  const locale = useLocale();
  const tone = TONE_COLORS[row.tone];

  const dateLabel = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${row.dateIso}T00:00:00Z`));

  // Signed days: negative is in the past. An overdue milestone leads with what
  // is still outstanding, because that is the actionable part.
  const outstanding = row.inScope.length - row.satisfiedCount;
  const timing =
    row.daysRemaining === 0
      ? t("card.appliesToday")
      : row.daysRemaining > 0
        ? t("card.daysRemaining", { days: row.daysRemaining })
        : t("card.daysAgo", { days: Math.abs(row.daysRemaining) });

  return (
    <Card
      id={row.id}
      className={`scroll-mt-24 transition-colors ${
        expanded ? "border-primary/40" : ""
      }`}
    >
      <CardContent className="p-4 space-y-3">
        <button
          type="button"
          onClick={onToggle}
          className="w-full text-left flex items-start justify-between gap-4"
        >
          <div className="min-w-0 flex items-start gap-3">
            <span
              className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: tone }}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dateLabel} · {timing}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] shrink-0"
            style={{ color: tone, borderColor: tone }}
          >
            {t(`tone.${row.tone}`)}
          </Badge>
        </button>

        {/* Scope summary is always visible — it is the answer most people came for */}
        <p className="text-xs text-muted-foreground pl-6">
          {row.overdue && outstanding > 0
            ? `${t("counts.outstanding", { count: outstanding })}`
            : row.applicability === "applies" && row.countUnit === "systems"
              ? t("counts.satisfied", {
                  satisfied: row.satisfiedCount,
                  total: row.inScope.length,
                })
              : row.applicability === "unknown"
                ? t("counts.undeterminedOnly", { count: row.undetermined.length })
                : row.applicability === "applies"
                  ? t("counts.organization")
                  : t("counts.notApplicable")}
        </p>

        {expanded && (
          <div className="pl-6 space-y-4 pt-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {t("card.whatItMeans")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {row.whatItMeans}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {t("card.citation")}
              </p>
              {/* Legal citations are never translated */}
              <p className="text-[11px] font-mono text-muted-foreground break-words">
                {row.citation}
              </p>
              <p className="text-[11px] font-mono text-muted-foreground">
                {row.provision}
              </p>
            </div>

            {row.inScope.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {t("card.affectedSystems")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {row.inScope.map((s) => (
                    <Link
                      key={s.id}
                      href={`/governance/ai-registry/${s.id}`}
                      className="text-[11px] px-2 py-0.5 rounded border border-border hover:border-primary/50 transition-colors"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {row.undetermined.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  {t("card.undeterminedSystems")}
                </p>
                <div className="space-y-1">
                  {row.undetermined.map((s) => (
                    <div
                      key={s.id}
                      className="text-[11px] text-muted-foreground flex flex-wrap items-baseline gap-1.5"
                    >
                      <span className="font-medium text-foreground/80">
                        {s.name}
                      </span>
                      <span>— {t(`reason.${s.reason}`)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {row.href && (
                <Link href={row.href}>
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    {t("card.resolve")}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              )}
              {row.requirementIds.length > 0 && (
                <Link href="/governance/compliance">
                  <Button size="sm" variant="ghost" className="text-xs h-7">
                    {t("card.viewRequirements")}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
