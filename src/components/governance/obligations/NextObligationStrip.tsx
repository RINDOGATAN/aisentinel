"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Dashboard countdown strip — the return-visit trigger.
 *
 * One line naming the next obligation and how it touches this organisation's
 * own inventory, plus a mini-rail of the next three. When operating
 * jurisdictions have not been declared it says so rather than implying the
 * calendar is complete: a confident countdown built on an unanswered question
 * would be the most misleading thing on the page.
 */

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, ArrowRight, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { TONE_COLORS } from "@/lib/obligations-timeline/palette";

export function NextObligationStrip() {
  const { organization } = useOrganization();
  const t = useTranslations("obligations");
  const locale = useLocale();
  const orgId = organization?.id ?? "";
  const contentLocale = locale === "es" ? "es" : "en";

  const { data } = trpc.obligations.getNextObligation.useQuery(
    { organizationId: orgId, locale: contentLocale },
    { enabled: !!orgId },
  );

  if (!data?.next) return null;

  const next = data.next;
  const days = next.daysRemaining;
  const inScope = next.inScope.length;
  const undetermined = next.undetermined.length;

  const headline =
    days < 0
      ? t("next.overdue", { title: next.title, days: Math.abs(days) })
      : days === 0
        ? t("next.countdownToday", { title: next.title })
        : t("next.countdownDays", { days, title: next.title });

  // Same honesty rule as the timeline: never collapse "we can't tell" into a zero.
  const scopeLine =
    next.countUnit === "organization" && next.applicability === "applies"
      ? t("next.affectsOrganization")
      : inScope > 0 && undetermined > 0
        ? t("counts.inScopeWithUndetermined", { inScope, undetermined })
        : inScope > 0
          ? t("next.affectsSystems", { count: inScope })
          : undetermined > 0
            ? t("next.scopeUnknown")
            : t("counts.notApplicable");

  return (
    <Card className={next.overdue ? "border-destructive/40" : "border-primary/25"}>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div
          className={`p-2 rounded-lg shrink-0 ${
            next.overdue ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          {next.overdue ? (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          ) : (
            <CalendarClock className="w-5 h-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              next.overdue ? "text-destructive" : ""
            }`}
          >
            {headline}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{scopeLine}</p>

          {!data.jurisdictionsDeclared && (
            <p className="text-xs text-warning mt-1">
              {t("jurisdictionsUndeclared")}{" "}
              <Link
                href="/governance/settings"
                className="underline hover:no-underline"
              >
                {t("declareJurisdictions")}
              </Link>
            </p>
          )}
        </div>

        {/* Mini-rail: the next three, colour-coded by tone */}
        <div className="flex items-center gap-1.5 shrink-0">
          {data.upcoming.map((m) => (
            <Link
              key={m.id}
              href={`/governance/obligations#${m.id}`}
              title={m.title}
              aria-label={m.title}
            >
              <span
                className="block w-2.5 h-2.5 rounded-full hover:ring-2 hover:ring-offset-1 hover:ring-offset-background transition-all"
                style={{ background: TONE_COLORS[m.tone] }}
              />
            </Link>
          ))}
        </div>

        <Link href={`/governance/obligations#${next.id}`} className="shrink-0">
          <span className="text-xs text-primary hover:underline flex items-center gap-1">
            {t("next.viewAll")}
            <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
