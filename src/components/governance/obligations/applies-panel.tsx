"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "These apply to the organisation": the laws and standards the
 * applicability check says apply, each with why in one line and its next
 * date (src/lib/applies-panel.ts). Shown on step 1.2's page and on the
 * dashboard, where the dashboard version links to the step.
 *
 * It reads the same two queries as the step page (the applicability answers
 * and the obligations calendar), so the page and the panel never disagree.
 */

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { evaluateApplicability } from "@/config/applicability";
import type { JurisdictionId } from "@/config/jurisdictions";
import { appliesLines, type LineDate } from "@/lib/applies-panel";

/** The same date style as the dashboard's deadlines. */
function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export function AppliesPanel({
  organizationId,
  onDashboard = false,
}: {
  organizationId: string;
  /** On the dashboard: a link to the step page instead of the lead line. */
  onDashboard?: boolean;
}) {
  const t = useTranslations("obligations");
  const ta = useTranslations("applicability");
  const locale = useLocale();
  const contentLocale = locale === "es" ? "es" : "en";
  const { data: applicability } = trpc.regimes.getApplicability.useQuery({ organizationId });
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });
  const { data: calendar } = trpc.obligations.getObligations.useQuery(
    { organizationId, locale: contentLocale },
    { enabled: !!organizationId },
  );

  if (!applicability || !calendar) return null;

  const jurisdictions =
    (org?.operatingJurisdictions as JurisdictionId[] | undefined) ?? applicability.jurisdictions;
  const items = evaluateApplicability(jurisdictions, applicability.answers, applicability.frameworks);
  const lines = appliesLines(items, calendar.rows);
  const maybe = items.filter((i) => i.state === "check");

  const dateText = (date: LineDate) =>
    date.kind === "next"
      ? t("applies.next", { date: formatDate(date.dateIso, locale) })
      : date.kind === "inForce"
        ? t("applies.inForce")
        : t("applies.noDate");

  return (
    <Card className="border-primary/40 bg-primary/5" data-testid="applies-panel">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
              <Landmark className="size-5 shrink-0 text-primary" aria-hidden="true" />
              {t("applies.title")}
            </h2>
            {!onDashboard && <p className="mt-1 text-sm text-muted-foreground">{t("applies.lead")}</p>}
          </div>
          {onDashboard && (
            <Link
              href="/governance/obligations"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t("applies.open")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(onDashboard ? "applies.empty" : "applies.emptyHere")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2">
            {lines.map(({ item, date }) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-primary/25 bg-background/60 p-3"
                data-testid={`applies-${item.id}`}
              >
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 break-words">
                  <span className="block text-sm font-semibold">{ta(`items.${item.id}`)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    <span className="sr-only">{ta("whyLabel")}: </span>
                    {item.reasons
                      // On step 1.2 itself, a reason that points to the screening says where it is on the page.
                      .map((r) => (!onDashboard && ta.has(`reasonsHere.${r}`) ? ta(`reasonsHere.${r}`) : ta(`reasons.${r}`)))
                      .join(" ")}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-foreground tabular-nums">
                    {dateText(date)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {maybe.length > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="applies-maybe">
            <span className="font-medium text-foreground">{ta("checkTitle")}:</span>{" "}
            {maybe.map((i) => ta(`items.${i.id}`)).join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
