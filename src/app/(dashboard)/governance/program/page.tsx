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
import { Download, Loader2, Sparkles, Network } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { ProgramMap } from "@/components/governance/program/ProgramMap";
import { NistRadar } from "@/components/governance/program/NistRadar";
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

  if (!orgId || graphLoading || scorecardLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = (scorecard?.snapshot.systems.total ?? 0) === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        {!isEmpty && (
          <Button
            onClick={() =>
              window.open(
                `/api/export/governance-program?organizationId=${orgId}&locale=${locale}`,
                "_blank",
              )
            }
          >
            <Download className="w-4 h-4 mr-2" />
            {t("exportPdf")}
          </Button>
        )}
      </div>

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
                <div className="grid gap-6 lg:grid-cols-2 items-center">
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
