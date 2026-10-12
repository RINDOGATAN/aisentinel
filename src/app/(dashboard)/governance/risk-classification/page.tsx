"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Cpu, Search, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { KeyTerms } from "@/components/help/key-terms";
import { useEnumLabels } from "@/lib/enum-labels";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { SortControl } from "@/components/governance/sort-control";
import { DEFAULT_LIST_SORT, type ListSort } from "@/lib/list-sort";
import { RiskTierBadge, TierMarker } from "@/components/governance/risk-tier-badge";

/** Annex III points 1 to 8; labels come from riskClassification.annexIII.<value>. */

/** The classification form lives on the system's page, on its Risk Classification tab. */
function classifyHref(id: string): string {
  return `/governance/ai-registry/${id}?tab=risk&classify=1`;
}

export default function RiskClassificationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<ListSort>(DEFAULT_LIST_SORT);
  // `?system=<id>` (the old Reclassify address) now goes to the system's own
  // page, where the form lives.
  const systemParam = useSearchParams().get("system");
  const debouncedSearch = useDebounce(searchQuery);
  const router = useRouter();
  useEffect(() => {
    if (systemParam) router.replace(classifyHref(systemParam));
  }, [systemParam, router]);
  const { organization, canWrite } = useOrganization();
  const t = useTranslations("riskClassification");
  const { statusLabel, techniqueLabel } = useEnumLabels();
  const tc = useTranslations("common");

  const { data: stats } = trpc.riskClassification.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const { data: systems, isLoading: systemsLoading } = trpc.riskClassification.list.useQuery(
    {
      organizationId: organization?.id ?? "",
      search: debouncedSearch || undefined,
      sort,
    },
    { enabled: !!organization?.id, placeholderData: keepPreviousData }
  );

  const riskStats = stats ?? { unacceptable: 0, high: 0, limited: 0, minimal: 0, unclassified: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
        <KeyTerms ids={["high-risk", "bias", "stakeholder"]} className="mt-2" />
      </div>

      {/* Stats Bar */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {(
          [
            ["UNACCEPTABLE", riskStats.unacceptable, tc("riskUnacceptable"), ""],
            ["HIGH", riskStats.high, tc("riskHigh"), ""],
            ["LIMITED", riskStats.limited, tc("riskLimited"), ""],
            ["MINIMAL", riskStats.minimal, tc("riskMinimal"), ""],
            [null, riskStats.unclassified, t("unclassified"), "col-span-2 sm:col-span-1"],
          ] as const
        ).map(([level, count, label, span]) => (
          <Card key={level ?? "UNCLASSIFIED"} className={span || undefined}>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-bold text-foreground">{count}</div>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <TierMarker level={level} />
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <SortControl value={sort} onChange={setSort} />
      </div>

      {/* Systems List */}
      {systemsLoading && !systems ? (
        <ListPageSkeleton />
      ) : systems && systems.length > 0 ? (
        <div className="space-y-3">
          {systems.map((system) => {
            const currentLevel = system.riskClassification?.riskLevel;

            return (
              <Card key={system.id} id={`system-${system.id}`} className="scroll-mt-24">
                <CardContent className="p-4">
                  {/* System Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-primary/10 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/governance/ai-registry/${system.id}`}
                          className="font-medium text-sm hover:text-primary truncate block"
                        >
                          {system.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {techniqueLabel(system.technique)} &middot; {statusLabel(system.status)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <RiskTierBadge level={currentLevel} className="text-xs" />
                      {/* The form behind it classifies (orgWriteProcedure): writers only. */}
                      {canWrite && (
                        <Link href={classifyHref(system.id)}>
                          <Button variant="ghost" size="sm">
                            {currentLevel ? t("reclassify") : t("classify")}
                            <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("emptyTitle")}</p>
            <p className="text-sm mb-4">
              {searchQuery
                ? t("emptySearchHint")
                : t("emptyDefaultHint")}
            </p>
            {!searchQuery && (
              <Link href="/governance/ai-registry/new">
                <Button>{t("registerAiSystem")}</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
