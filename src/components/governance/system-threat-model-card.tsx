"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The threat model for this system, seen from the register.
 *
 * The register answers "what is this and what rules apply". The threat model
 * answers "what could go wrong and does the control hold". Both are about the
 * same system, so each should be one click from the other; without this card,
 * the two halves of the product never meet on screen.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Crosshair, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export function SystemThreatModelCard({
  organizationId,
  aiSystemId,
  canWrite,
}: {
  organizationId: string;
  aiSystemId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("threatModel");
  const { data, isLoading } = trpc.threatModel.list.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const model = (data ?? []).find((m) => m.aiSystem?.id === aiSystemId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("systemCardHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : !model ? (
          <>
            <p className="text-sm text-muted-foreground">{t("systemCardNone")}</p>
            {canWrite && (
              <Button asChild size="sm" variant="outline">
                <Link href="/governance/threat-model/new">{t("start")}</Link>
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{model.name}</span>
              {model.counts.actNow > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-destructive/50 text-destructive"
                >
                  {t("actNowCount", { count: model.counts.actNow })}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {t("scenarioCount", { count: model.counts.scenarios })}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-sm bg-muted/40 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${
                      model.counts.controls === 0
                        ? 0
                        : (model.counts.proven / model.counts.controls) * 100
                    }%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {model.counts.controls === 0
                  ? t("noControls")
                  : t("provenOf", {
                      proven: model.counts.proven,
                      total: model.counts.controls,
                    })}
              </span>
            </div>

            <Button asChild size="sm" variant="outline">
              <Link href={`/governance/threat-model/${model.id}`}>{t("systemCardOpen")}</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
