"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Dashboard countdown strip — the return-visit trigger.
 *
 * The next obligation still ahead and how it touches this organisation's own
 * inventory, plus a mini-rail of the next three. Duties already in force are
 * one quiet line under it, never the headline; the red border and the
 * triangle appear only when something measurable was missed. When operating
 * jurisdictions have not been declared it says so rather than implying the
 * calendar is complete: a confident countdown built on an unanswered question
 * would be the most misleading thing on the page.
 */

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { StatusMark } from "@/components/ui/status-note";
import { CalendarClock, ArrowRight, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { TONE_COLORS } from "@/lib/obligations-timeline/palette";
import { obligationHeadline } from "@/lib/obligation-headline";

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
  const inScope = next.inScope.length;
  const undetermined = next.undetermined.length;

  // The red border and the triangle are for something this organisation has
  // measurably not done. A duty that is simply in force is not that.
  const overdueCount = data.counts.overdue;
  const inForceCount = data.counts.inForce;
  const alarmed = overdueCount > 0;

  const dateLabel = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${next.dateIso}T00:00:00Z`));
  // Two lines, never one sentence: see src/lib/obligation-headline.ts.
  const headline = obligationHeadline(next, dateLabel, (key, values) =>
    t(key, values),
  );

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
    // The Card primitive brings its own py-6; with the content's padding on top
    // of it a one-line strip stood in a tall empty box on a phone.
    <Card
      className={`py-0 gap-0 ${
        alarmed ? "border-destructive" : "border-primary/25"
      }`}
    >
      {/* A wrapping row at every width. As a column the icon's box stretched
          to the full width of the card: an empty tinted bar above the text. */}
      <CardContent className="p-3 sm:p-4 flex flex-wrap items-start sm:items-center gap-x-3 gap-y-2">
        <div
          className={`p-2 rounded-lg shrink-0 self-start sm:self-center ${
            alarmed ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          {alarmed ? (
            <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden />
          ) : (
            <CalendarClock className="w-5 h-5 text-primary" aria-hidden />
          )}
        </div>

        <div className="flex-1 basis-0 min-w-0">
          <p className="text-xs text-muted-foreground">{headline.timing}</p>
          <p className="text-sm font-medium break-words">{headline.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{scopeLine}</p>

          {/* What was missed is said in words, beside the icon and the border. */}
          {alarmed && (
            <StatusMark status="danger" className="text-xs mt-1 items-baseline">
              <Link
                href="/governance/obligations"
                className="underline hover:no-underline"
              >
                {t("next.overdueCount", { count: overdueCount })}
              </Link>
            </StatusMark>
          )}

          {/* Duties already in force: one quiet line, never the headline. */}
          {inForceCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              <Link
                href="/governance/obligations#group-past"
                className="underline hover:no-underline"
              >
                {t("next.inForceCount", { count: inForceCount })}
              </Link>
            </p>
          )}

          {!data.jurisdictionsDeclared && (
            <StatusMark status="warning" className="text-xs mt-1 items-baseline">
              {t("jurisdictionsUndeclared")}{" "}
              <Link
                href="/governance/settings"
                className="underline hover:no-underline"
              >
                {t("declareJurisdictions")}
              </Link>
            </StatusMark>
          )}
        </div>

        {/* Mini-rail: the next three, colour-coded by tone. A pointer shows a
            dot's title on hover; a phone has no hover, and a dot with no word
            beside it says nothing, so the rail is left out below `sm`. */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
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

        {/* On a phone the link takes its own line, indented under the text. */}
        <Link
          href={`/governance/obligations#${next.id}`}
          className="shrink-0 basis-full sm:basis-auto pl-12 sm:pl-0"
        >
          <span className="text-xs text-primary hover:underline flex items-center gap-1">
            {t("next.viewAll")}
            <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
