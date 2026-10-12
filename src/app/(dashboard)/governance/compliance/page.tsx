"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The evidence step: a list of the AI systems, each opening its own page on
 * the Evidence tab, where the compliance matrix lives (one home per system,
 * src/components/governance/compliance-matrix.tsx). The old address with
 * `?systemId=` goes straight to that tab.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { keepPreviousData } from "@tanstack/react-query";
import { ChevronRight, Loader2, Scale, Search } from "lucide-react";
import { PageHeader } from "@/components/governance/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskTierBadge } from "@/components/governance/risk-tier-badge";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";

const PAGE = 50;

function systemEvidenceHref(id: string): string {
  return `/governance/ai-registry/${id}?tab=evidence`;
}

export default function CompliancePage() {
  const t = useTranslations("compliance");
  const router = useRouter();
  const legacySystem = useSearchParams().get("systemId");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);

  useEffect(() => {
    if (legacySystem) router.replace(systemEvidenceHref(legacySystem));
  }, [legacySystem, router]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.aiSystem.list.useInfiniteQuery(
      { organizationId: orgId, limit: PAGE, search: debounced || undefined },
      {
        enabled: !!orgId && !legacySystem,
        getNextPageParam: (last) => last.nextCursor,
        placeholderData: keepPreviousData,
      },
    );
  const systems = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader icon={Scale} title={t("title")} description={t("description")} />

      <p className="text-sm text-muted-foreground">{t("listIntro")}</p>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchSystems")}
          aria-label={t("searchSystems")}
          className="pl-8"
        />
      </div>

      {legacySystem || isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : systems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {search ? (
              t("noSystemsFound")
            ) : (
              <>
                {t("noSystemsPrompt")}{" "}
                <Link href="/governance/ai-registry/new" className="text-primary hover:underline">
                  {t("noSystemsLink")}
                </Link>
                .
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2" data-testid="evidence-systems">
          {systems.map((s) => (
            <li key={s.id}>
              <Link href={systemEvidenceHref(s.id)} className="block">
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <span className="min-w-0 break-words font-medium">{s.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {s.riskClassification ? (
                        <RiskTierBadge level={s.riskClassification.riskLevel} className="text-xs" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("notClassified")}</span>
                      )}
                      <span className="hidden sm:inline text-xs text-primary">{t("openEvidence")}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
