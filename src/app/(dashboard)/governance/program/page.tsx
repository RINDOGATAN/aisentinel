"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AI Governance Program — the flagship deliverable page: interactive
 * governance map, maturity scorecard, 90-day plan, rollout guidance, and
 * (law firms) the professional-duties grid. One-click PDF export renders
 * the same visuals through the shared layout core.
 */

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { History, Loader2, Sparkles, Network } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { ProgramMap } from "@/components/governance/program/ProgramMap";
import { NistRadar } from "@/components/governance/program/NistRadar";
import {
  DeliverablesMenu,
  LicenceNote,
  type Deliverable,
} from "@/components/governance/premium-deliverable";
import { PageHeader } from "@/components/governance/page-header";
import { ProgramFigureCard } from "@/components/guided/program-figure";
import {
  ScorecardTiles,
  DimensionGrid,
  NinetyDayPlan,
  RolloutGuidance,
  DutiesGrid,
} from "@/components/governance/program/ScorecardSections";

export default function ProgramPage() {
  const { organization } = useOrganization();
  const t = useTranslations("program.page");
  const orgId = organization?.id ?? "";
  const locale = useLocale() === "es" ? "es" : "en";

  const { data: graph, isLoading: graphLoading } =
    trpc.program.getProgramGraph.useQuery(
      { organizationId: orgId, locale },
      { enabled: !!orgId },
    );
  const { data: scorecard, isLoading: scorecardLoading } =
    trpc.program.getProgramScorecard.useQuery(
      { organizationId: orgId, locale },
      { enabled: !!orgId },
    );

  // The section is rendered only once the data has loaded, so the browser's
  // own jump to #plan finds nothing; scroll there when it appears.
  const ready = !!orgId && !graphLoading && !scorecardLoading;
  useEffect(() => {
    if (!ready || window.location.hash !== "#plan") return;
    document.getElementById("plan")?.scrollIntoView({ block: "start" });
  }, [ready]);

  if (!orgId || graphLoading || scorecardLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = (scorecard?.snapshot.systems.total ?? 0) === 0;
  const deliverables: Deliverable[] = [
    {
      feature: "program-report",
      href: `/api/export/governance-program?organizationId=${orgId}&locale=${locale}`,
      label: t("exportPdf"),
    },
    {
      feature: "program-pack",
      href: `/api/export/program-pack?organizationId=${orgId}&locale=${locale}`,
      label: t("exportPack"),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header: places to go, then the downloads in one menu. Both downloads
          are premium deliverables where the showcase is open, and included on
          the kit and on the hosted pilot; a locked one keeps its place with a
          lock, and the reason is said once, under the header. The review queue
          is a step of the menu, so it is not repeated here. */}
      <PageHeader
        icon={Network}
        title={t("title")}
        description={t("subtitle")}
        actions={
          !isEmpty && (
            <>
              <Link href="/governance/program/history">
                <Button variant="outline" size="icon" aria-label={t("historyLink")} className="sm:size-auto sm:px-4 sm:py-2">
                  <History className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("historyLink")}</span>
                </Button>
              </Link>
              <DeliverablesMenu organizationId={orgId} items={deliverables} label={t("download")} />
            </>
          )
        }
        note={
          !isEmpty && (
            <LicenceNote organizationId={orgId} features={deliverables.map((d) => d.feature)} />
          )
        }
      />

      {/* The one program figure, the headline here as on the dashboard, the
          menu and All clients. The scorecard below is the detail. */}
      <ProgramFigureCard />

      {/* Empty state */}
      {isEmpty ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-primary/10">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("emptyBody")}
            </p>
            <Link href="/governance/quickstart" className="inline-block">
              <Button>
                <Sparkles className="w-4 h-4 mr-2" />
                {t("emptyCta")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Governance map — the primary visual */}
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{t("mapTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("mapSubtitle")}</p>
            </div>
            {graph && <ProgramMap graph={graph} />}
          </section>

          {/* Scorecard */}
          {scorecard && (
            <>
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{t("scorecardTitle")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("scorecardSubtitle")}
                  </p>
                </div>
                {scorecard.draftsExcluded > 0 && (
                  <p className="text-sm text-muted-foreground" data-testid="drafts-excluded">
                    {t("draftsExcluded", { count: scorecard.draftsExcluded })}{" "}
                    <Link href="/governance/review" className="text-primary underline-offset-4 hover:underline">
                      {t("draftsExcludedLink")}
                    </Link>
                  </p>
                )}
                <ScorecardTiles tiles={scorecard.tiles} />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-center">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm font-medium mb-2">{t("nistTitle")}</p>
                      <NistRadar axes={scorecard.maturity.nist} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm font-medium mb-4">
                        {t("dimensionsTitle")}
                      </p>
                      <DimensionGrid dimensions={scorecard.maturity.dimensions} />
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* The 30/60/90-day plan. "Open" on the Dashboard's documents
                  list lands here (#plan). */}
              <section id="plan" className="space-y-3 scroll-mt-20">
                <div>
                  <h2 className="text-lg font-semibold">{t("planTitle")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("planSubtitle")}
                  </p>
                </div>
                <NinetyDayPlan plan={scorecard.plan} />
              </section>

              {/* Rollout guidance (lawfirm categories present) */}
              {scorecard.rollout.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold">{t("rolloutTitle")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("rolloutSubtitle")}
                    </p>
                  </div>
                  <RolloutGuidance rollout={scorecard.rollout} />
                </section>
              )}

              {/* Professional duties grid (lawfirm) */}
              {scorecard.duties && (
                <section className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold">{t("dutiesTitle")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("dutiesSubtitle")}
                    </p>
                  </div>
                  <DutiesGrid duties={scorecard.duties} />
                </section>
              )}

              {/* Method / review footer */}
              <p className="text-xs text-muted-foreground border-t border-border pt-4">
                {scorecard.reviewMarker}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
