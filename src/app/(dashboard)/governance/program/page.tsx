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
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { History, Loader2, Sparkles, Network, ShieldCheck } from "lucide-react";
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
import { useSkin } from "@/components/guided/skin-context";
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
  const guided = useSkin().skin === "guided";

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
          lock, and the reason is said once, under the header. In Guided the
          review queue is a step of the menu, so it is not repeated here. */}
      <PageHeader
        icon={Network}
        title={t("title")}
        description={t("subtitle")}
        actions={
          !isEmpty && (
            <>
              {!guided && (
                <Link href="/governance/review">
                  <Button variant="outline" size="icon" aria-label={t("reviewLink")} className="sm:size-auto sm:px-4 sm:py-2">
                    <ShieldCheck className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t("reviewLink")}</span>
                  </Button>
                </Link>
              )}
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

              {/* 90-day plan */}
              <section className="space-y-3">
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
