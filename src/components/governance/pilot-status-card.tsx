"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Where this organisation stands on the hosted pilot: the day counter, each
 * ceiling as "X of Y", and, once read-only, the two ways out. Renders
 * nothing off the pilot, so the settings page mounts it unconditionally.
 */

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FlaskConical, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PILOT_CEILING_LABELS, PILOT_RUN_URL, PILOT_SENTENCE, PILOT_TERMS } from "@/config/pilot";

export function PilotStatusCard({ organizationId }: { organizationId: string }) {
  const t = useTranslations("pilot");
  const locale = useLocale() === "es" ? "es" : "en";
  const { data } = trpc.pilot.status.useQuery({ organizationId }, { staleTime: 60 * 1000 });

  if (!data?.active) return null;

  const systems = data.ceilings.find((c) => c.key === "systems");
  const sentence = PILOT_SENTENCE[locale];
  // "18 December 2026" / "18 de diciembre de 2026", read the same everywhere.
  const endsOn = new Date(data.endsAt).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <Card data-testid="pilot-status-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {sentence.before}
          <a href={PILOT_RUN_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {sentence.link}
          </a>
          {sentence.after}
          <span className="block mt-1">{PILOT_TERMS[locale]}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* The headline counter: "Pilot: N days left, X of Y systems". */}
        <p className="font-medium">
          {t("summary", {
            days: data.daysLeft,
            used: systems?.used ?? 0,
            max: systems?.max ?? 0,
          })}
        </p>

        {data.readOnly ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
            <Lock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs">{t("readOnlyBody")}</p>
              <WaysOut exportUrl={data.exportUrl} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("editsUntil", { date: endsOn })}</p>
        )}

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t("ceilingsTitle")}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {data.ceilings.map((c) => {
              const reached = c.used >= c.max;
              return (
                <li key={c.key} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{PILOT_CEILING_LABELS[c.key][locale]}</span>
                  <span className={reached ? "text-warning font-medium" : ""}>
                    {t("counter", { used: c.used, max: c.max })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {data.ceilings.some((c) => c.used >= c.max) && !data.readOnly && (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3 space-y-2">
            <p className="text-xs">{t("ceilingReachedBody")}</p>
            <WaysOut exportUrl={data.exportUrl} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** The two ways out, always both, always in this order. */
function WaysOut({ exportUrl }: { exportUrl: string }) {
  const t = useTranslations("pilot");
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
        <a href={PILOT_RUN_URL} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          {t("runOwn")}
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
        <a href={exportUrl}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {t("exportAll")}
        </a>
      </Button>
    </div>
  );
}
