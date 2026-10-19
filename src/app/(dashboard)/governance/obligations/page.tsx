"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Regulatory obligations calendar — every deadline that applies to this
 * organisation, plotted against its own AI inventory.
 *
 * The thing a generic countdown site cannot do is say which of *your* systems
 * a deadline touches, so scope is the spine of this page: in-scope,
 * undetermined and out-of-scope are always three distinct answers.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarClock, Sparkles, MapPin, ChevronDown, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { ObligationsTimeline } from "@/components/governance/obligations/ObligationsTimeline";
import { ObligationCard } from "@/components/governance/obligations/ObligationCard";
import { EmptyStep } from "@/components/guided/empty-step";
import { useProgramPathQuery } from "@/components/guided/use-program-path";
import { PlacesCard } from "@/components/governance/places-card";
import { ApplicabilityCard } from "@/components/governance/applicability-check";
import { CaliforniaScreeningCard } from "@/components/governance/california-screening-card";
import { RegimeScreeningCard } from "@/components/governance/regime-screening-card";
import { AppliesPanel } from "@/components/governance/obligations/applies-panel";
import {
  aheadCount,
  filterByJurisdiction,
  groupObligations,
  jurisdictionsIn,
  timelineRows,
} from "@/lib/obligations-grouping";

/** Where step 1.2's questions sit on this page (the band and the menu link here). */
const PLACES_ANCHOR = "places";
const QUESTIONS_ANCHOR = "questions";

export default function ObligationsPage() {
  const { organization, canWrite } = useOrganization();
  const t = useTranslations("obligations");
  const tjur = useTranslations("jurisdictions");
  const tg = useTranslations("guided");
  const locale = useLocale();
  const orgId = organization?.id ?? "";
  const contentLocale = locale === "es" ? "es" : "en";
  // The step is "started" while places are declared but a screening shown
  // to the organisation is unanswered: say so here, with the way to answer.
  const { steps: pathSteps, screeningQuestionsOpen } = useProgramPathQuery();
  const screeningMissing = pathSteps?.obligations === "started";
  const stepDone = pathSteps?.obligations === "done";

  // Deep links from the dashboard strip and the mini-rail land on
  // #<milestoneId>. Read once at mount rather than in an effect: the first
  // paint is the loading spinner either way, so there is nothing to mismatch.
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.location.hash.replace("#", "") || null,
  );

  // Step 1.2's questions: open until the step is done, then folded behind
  // "Change the places and answers". A link to them opens them.
  const [questionsOpen, setQuestionsOpen] = useState<boolean | null>(() =>
    selectedId === PLACES_ANCHOR || selectedId === QUESTIONS_ANCHOR ? true : null,
  );
  // Folded or not is decided by the state the page opened with, so the
  // questions do not fold away under the cursor when the last one is saved.
  const [openedDone, setOpenedDone] = useState<boolean | null>(null);
  if (pathSteps && openedDone === null) setOpenedDone(stepDone);
  const showQuestions = questionsOpen ?? !openedDone;

  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null);
  // The dashboard's "duties already apply to you" line lands on #group-past,
  // a group that is folded by default, so the link opens it.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    selectedId?.startsWith("group-")
      ? { [selectedId.slice("group-".length)]: true }
      : {},
  );

  const { data, isLoading } = trpc.obligations.getObligations.useQuery(
    { organizationId: orgId, locale: contentLocale },
    { enabled: !!orgId },
  );

  useEffect(() => {
    if (!selectedId || !data) return;
    document.getElementById(selectedId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [selectedId, data]);

  // Derived before the loading return so the hook order never changes.
  // `data?.rows ?? []` builds a fresh array on every render, which would make
  // every memo below recompute; memoising it keeps them honest.
  const allRows = useMemo(() => data?.rows ?? [], [data]);
  const filtered = useMemo(
    () => filterByJurisdiction(allRows, jurisdictionFilter),
    [allRows, jurisdictionFilter],
  );
  const groups = useMemo(() => groupObligations(filtered), [filtered]);
  const plotted = useMemo(() => timelineRows(filtered), [filtered]);
  const availableJurisdictions = useMemo(
    () => jurisdictionsIn(allRows, data?.assumedJurisdictions),
    [allRows, data],
  );
  const ahead = aheadCount(filtered);

  if (!orgId || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasInventory = allRows.some(
    (r) => r.inScope.length > 0 || r.undetermined.length > 0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" />
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Step 1.2 is done here: the places and the screening questions,
          the same answers as in Settings. */}
      {pathSteps && (
        <section aria-labelledby="step-questions-title" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 id="step-questions-title" className="text-base font-semibold">
                {t("questions.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {stepDone ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    {t("questions.allAnswered")}
                  </span>
                ) : (
                  t("questions.lead")
                )}
              </p>
            </div>
            {stepDone && (
              <Button
                variant="outline"
                size="sm"
                className="self-start sm:self-auto"
                aria-expanded={showQuestions}
                aria-controls="step-questions"
                onClick={() => setQuestionsOpen(!showQuestions)}
              >
                {showQuestions ? t("questions.hide") : t("questions.show")}
                <ChevronDown
                  className={["w-4 h-4 ml-1.5 motion-safe:transition-transform", showQuestions ? "rotate-180" : ""].join(" ")}
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>
          {showQuestions && orgId && (
            <div id="step-questions" className="space-y-4">
              <div id={PLACES_ANCHOR} className="scroll-mt-24">
                <PlacesCard organizationId={orgId} canWrite={canWrite} />
              </div>
              <div id={QUESTIONS_ANCHOR} className="scroll-mt-24 space-y-4">
                <ApplicabilityCard
                  organizationId={orgId}
                  canWrite={canWrite}
                  showResult={false}
                  idPrefix="applicability-step"
                />
                <CaliforniaScreeningCard organizationId={orgId} canWrite={canWrite} />
                <RegimeScreeningCard organizationId={orgId} canWrite={canWrite} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* The highlight of the step: what applies, why, and when. */}
      {orgId && <AppliesPanel organizationId={orgId} />}

      {/* Scope banner: declared jurisdictions, or an honest admission that we
          cannot scope US obligations until someone answers. */}
      {data && !data.jurisdictionsDeclared ? (
        <Card className="border-warning bg-warning/10 text-foreground">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <MapPin className="w-5 h-5 text-warning shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              {t("jurisdictionsUndeclared")}
            </p>
            <a href={`#${PLACES_ANCHOR}`} onClick={() => setQuestionsOpen(true)}>
              <Button size="sm">
                {t("declareJurisdictions")}
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : data && data.assumedJurisdictions.length > 0 ? (
        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {t("assumedJurisdictions", {
            jurisdictions: data.assumedJurisdictions
              .map((j) => tjur(`option.${j}`))
              .join(" · "),
          })}
          <a
            href={`#${PLACES_ANCHOR}`}
            onClick={() => setQuestionsOpen(true)}
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {t("changePlaces")}
          </a>
        </p>
      ) : null}

      {data?.jurisdictionsDeclared && screeningMissing && (
        <Card className="border-warning bg-warning/10 text-foreground" data-testid="obligations-screening-prompt">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">{t("screeningMissing")}</p>
            <a href={`#${QUESTIONS_ANCHOR}`} onClick={() => setQuestionsOpen(true)}>
              <Button size="sm">
                {screeningQuestionsOpen > 0
                  ? t("answerQuestions", { count: screeningQuestionsOpen })
                  : t("answerScreening")}
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {allRows.length === 0 ? (
        // The banner above already offers the way to declare jurisdictions
        // when none are declared; the button here only when it does not.
        <EmptyStep
          action={
            data?.jurisdictionsDeclared && (
              <a href={`#${PLACES_ANCHOR}`} onClick={() => setQuestionsOpen(true)}>
                <Button>
                  <MapPin className="w-4 h-4 mr-2" />
                  {tg("emptyStep.obligationsAction")}
                </Button>
              </a>
            )
          }
        >
          {tg("emptyStep.obligations")}
        </EmptyStep>
      ) : allRows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* The timeline plots only what is ahead and reaches this
              organisation. Spending the horizontal room on a passed date, or
              on a rule that does not apply, buys the reader nothing. */}
          {plotted.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground" data-testid="timeline-lead">
                <span className="hidden md:inline">{t("timelineLead")}</span>
                <span className="md:hidden">{t("timelineLeadVertical")}</span>
              </p>
              {data?.jurisdictionsDeclared && data.assumedJurisdictions.length === 1 && (
                <p className="text-sm text-muted-foreground">
                  {t("singlePlace", { place: tjur(`option.${data.assumedJurisdictions[0]}`) })}
                </p>
              )}
            </div>
          )}
          {plotted.length > 0 && (
            <ObligationsTimeline
              rows={plotted}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
            />
          )}

          {/* Jurisdiction filter, offered only where there is something to
              narrow. */}
          {availableJurisdictions.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{t("filterLabel")}</span>
              <button
                type="button"
                onClick={() => setJurisdictionFilter(null)}
                className={[
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  jurisdictionFilter === null
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40",
                ].join(" ")}
              >
                {t("filterAll")}
              </button>
              {availableJurisdictions.map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setJurisdictionFilter(j === jurisdictionFilter ? null : j)}
                  className={[
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    jurisdictionFilter === j
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  ].join(" ")}
                >
                  {tjur(`option.${j}`)}
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-auto">
                {t("showingCount", { shown: filtered.length, total: allRows.length })}
              </span>
            </div>
          )}

          {/* Inventory is what makes the calendar specific rather than generic */}
          {!hasInventory && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <Sparkles className="w-6 h-6 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {t("emptyInventoryTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("emptyInventoryBody")}
                  </p>
                </div>
                <Link href="/governance/quickstart">
                  <Button size="sm">{t("emptyInventoryCta")}</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {ahead === 0 && (
            <Card className="border-border">
              <CardContent className="p-4 text-sm text-muted-foreground">
                {t("nothingAhead")}
              </CardContent>
            </Card>
          )}

          {/* Grouped by what the reader can act on. The two archival groups
              stay in the page but folded, because "we checked this and it does
              not reach you" is an answer, not noise to delete. */}
          {groups.map((group) => {
            const isOpen = openGroups[group.id] ?? !group.collapsedByDefault;
            const hint =
              group.id === "past"
                ? t("groupPastHint")
                : group.id === "notApplicable"
                  ? t("groupNotApplicableHint")
                  : null;
            return (
              <div
                key={group.id}
                id={`group-${group.id}`}
                className="space-y-2 scroll-mt-24"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t(
                      group.id === "overdue"
                        ? "groupOverdue"
                        : group.id === "imminent"
                          ? "groupImminent"
                          : group.id === "upcoming"
                            ? "groupUpcoming"
                            : group.id === "future"
                              ? "groupFuture"
                              : group.id === "past"
                                ? "groupPast"
                                : "groupNotApplicable",
                    )}{" "}
                    <span className="text-muted-foreground/60">({group.rows.length})</span>
                  </h2>
                  {group.collapsedByDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setOpenGroups((prev) => ({ ...prev, [group.id]: !isOpen }))
                      }
                    >
                      {isOpen ? t("hideGroup") : t("showGroup", { count: group.rows.length })}
                    </Button>
                  )}
                </div>
                {hint && isOpen && (
                  <p className="text-xs text-muted-foreground">{hint}</p>
                )}
                {isOpen &&
                  group.rows.map((row) => (
                    <ObligationCard
                      key={row.id}
                      row={row}
                      expanded={selectedId === row.id}
                      onToggle={() =>
                        setSelectedId(selectedId === row.id ? null : row.id)
                      }
                    />
                  ))}
              </div>
            );
          })}

          {data && (
            <p className="text-xs text-muted-foreground border-t border-border pt-4">
              {data.reviewMarker}
            </p>
          )}
        </>
      )}
    </div>
  );
}
