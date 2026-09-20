"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Statutory clocks for one incident.
 *
 * Reporting deadlines run from the moment of awareness, not from the moment
 * somebody opens the form. The card computes them from the facts recorded,
 * shows the provision each comes from, and says plainly what it assumed, so a
 * wrong assumption is corrected rather than relied on.
 */

import { useTranslations, useLocale } from "next-intl";
import { AlarmClock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { deadlineState } from "@/config/incident-deadlines";
import type { StatusKey } from "@/config/status-palette";
import { StatusMark, StatusNote } from "@/components/ui/status-note";
import { useNow } from "@/lib/use-now";

/**
 * The state of a clock is shown by the border of the date chip and by a word
 * beside it, never by tinting the date. A date is a fact, not a severity.
 */
const STATE_STYLE: Record<string, string> = {
  overdue: "border-destructive text-foreground",
  "due-soon": "border-warning text-foreground",
  open: "text-muted-foreground",
  immediate: "border-warning text-foreground",
};

/**
 * The states that need a word of their own. "Immediate" already reads as a
 * word inside its own chip, so it is not repeated.
 */
const STATE_STATUS: Record<string, StatusKey | undefined> = {
  overdue: "danger",
  "due-soon": "warning",
  immediate: undefined,
  open: undefined,
};

export function IncidentDeadlinesCard({
  organizationId,
  incidentId,
  canWrite,
}: {
  organizationId: string;
  incidentId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("incidentDeadlines");
  const locale = useLocale();
  const lang = locale === "es" ? "es" : "en";
  const utils = trpc.useUtils();

  // Read after mount so the same deadline never renders two ways.
  const now = useNow();

  const { data, isLoading } = trpc.incident.getStatutoryDeadlines.useQuery(
    { organizationId, id: incidentId },
    { enabled: !!organizationId && !!incidentId },
  );

  const setFacts = trpc.incident.setStatutoryFacts.useMutation({
    onSuccess: () =>
      utils.incident.getStatutoryDeadlines.invalidate({ organizationId, id: incidentId }),
  });

  if (isLoading || !data) {
    return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  }


  const facts = data.facts;

  const toggles: Array<{ key: keyof typeof facts; label: string; hint?: string }> = [
    { key: "personalDataBreach", label: t("factBreach"), hint: facts.breachLikely ? t("breachLikely") : undefined },
    { key: "highRiskToIndividuals", label: t("factHighRisk") },
    { key: "deathOccurred", label: t("factDeath") },
    { key: "widespreadOrCriticalInfrastructure", label: t("factWidespread") },
    { key: "aiOfficeCompetent", label: t("factAiOffice") },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlarmClock className="w-4 h-4 text-primary" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("intro")}</p>

        <div className="space-y-2">
          <p className="text-xs font-medium">{t("factsTitle")}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {toggles.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={!!facts[f.key]}
                  disabled={!canWrite}
                  onCheckedChange={(checked) =>
                    setFacts.mutate({
                      organizationId,
                      id: incidentId,
                      [f.key]: checked === true,
                    } as never)
                  }
                />
                {f.label}
                {f.hint && <span className="text-muted-foreground">({f.hint})</span>}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {facts.usedReportedAt ? t("awareFromReported") : t("awareRecorded")}{" "}
            {new Date(facts.awareAt).toLocaleString()}
          </p>
        </div>

        {!facts.jurisdictionsDeclared ? (
          <StatusNote status="warning" title={t("noJurisdictions")} />
        ) : data.deadlines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <div className="space-y-2">
            {data.deadlines.map((d) => {
              const state = now
                ? deadlineState({ ...d, dueAt: d.dueAt ? new Date(d.dueAt) : null }, now)
                : "open";
              return (
                <div key={d.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{d.label[lang]}</span>
                    <Badge variant="outline" className={`text-[10px] ${STATE_STYLE[state]}`}>
                      {d.dueAt ? new Date(d.dueAt).toLocaleString() : t("immediate")}
                    </Badge>
                    {STATE_STATUS[state] && (
                      <StatusMark status={STATE_STATUS[state]!} className="text-[11px]">
                        {state === "overdue" ? t("overdue") : t("dueSoon")}
                      </StatusMark>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.recipient[lang]}</p>
                  <p className="text-[11px] text-muted-foreground">{d.basis[lang]}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">{d.citation}</p>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">{t("marker")}</p>
      </CardContent>
    </Card>
  );
}
