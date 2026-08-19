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

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarClock, Sparkles, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { ObligationsTimeline } from "@/components/governance/obligations/ObligationsTimeline";
import { ObligationCard } from "@/components/governance/obligations/ObligationCard";

export default function ObligationsPage() {
  const { organization } = useOrganization();
  const t = useTranslations("obligations");
  const tjur = useTranslations("jurisdictions");
  const locale = useLocale();
  const orgId = organization?.id ?? "";
  const contentLocale = locale === "es" ? "es" : "en";

  // Deep links from the dashboard strip and the mini-rail land on
  // #<milestoneId>. Read once at mount rather than in an effect: the first
  // paint is the loading spinner either way, so there is nothing to mismatch.
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.location.hash.replace("#", "") || null,
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

  if (!orgId || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const rows = data?.rows ?? [];
  const hasInventory = rows.some(
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

      {/* Scope banner: declared jurisdictions, or an honest admission that we
          cannot scope US obligations until someone answers. */}
      {data && !data.jurisdictionsDeclared ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <MapPin className="w-5 h-5 text-warning shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              {t("jurisdictionsUndeclared")}
            </p>
            <Link href="/governance/settings">
              <Button size="sm" variant="outline">
                {t("declareJurisdictions")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : data && data.assumedJurisdictions.length > 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {t("assumedJurisdictions", {
            jurisdictions: data.assumedJurisdictions
              .map((j) => tjur(`option.${j}`))
              .join(" · "),
          })}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <>
          <ObligationsTimeline
            rows={rows}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          />

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

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("allMilestones")}
            </h2>
            {rows.map((row) => (
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
