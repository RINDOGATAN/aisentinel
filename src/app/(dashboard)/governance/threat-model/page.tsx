"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Threat models: the list.
 *
 * One card per system, showing the two numbers that matter: how many scenarios
 * are waiting to be acted on, and how much of what the team claims has actually
 * been tested. A model with ten controls and no tests is shown as such.
 */

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { LoopStrip } from "@/components/governance/threat-model-visuals";
import { CAPABILITIES } from "@/config/threat-model";

export default function ThreatModelListPage() {
  const t = useTranslations("threatModel");
  const locale = useLocale();
  const lang = locale === "es" ? "es" : "en";
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";

  const { data: models, isLoading } = trpc.threatModel.list.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );

  const steps = [t("loop.map"), t("loop.imagine"), t("loop.prioritise"), t("loop.control"), t("loop.test")];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("subtitle")}</p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/governance/threat-model/new">
              <Plus className="w-4 h-4 mr-1.5" />
              {t("start")}
            </Link>
          </Button>
        )}
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <LoopStrip steps={steps} />
          <p className="text-xs text-muted-foreground">{t("loopHint")}</p>
        </CardContent>
      </Card>

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : !models || models.length === 0 ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="text-sm">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
            {canWrite && (
              <Button asChild variant="outline">
                <Link href="/governance/threat-model/new">{t("start")}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {models.map((m) => {
            const capLabels = m.capabilities
              .map((id) => CAPABILITIES.find((c) => c.id === id)?.label[lang])
              .filter(Boolean) as string[];
            return (
              <Link key={m.id} href={`/governance/threat-model/${m.id}`}>
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{m.name}</span>
                      {m.aiSystem && (
                        <span className="text-xs text-muted-foreground">{m.aiSystem.name}</span>
                      )}
                      {m.counts.actNow > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-destructive/50 text-destructive"
                        >
                          {t("actNowCount", { count: m.counts.actNow })}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {t("scenarioCount", { count: m.counts.scenarios })}
                      </Badge>
                    </div>

                    {capLabels.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {capLabels.slice(0, 6).join(" · ")}
                        {capLabels.length > 6 ? ` +${capLabels.length - 6}` : ""}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-sm bg-muted/40 overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${m.counts.controls === 0 ? 0 : (m.counts.proven / m.counts.controls) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {m.counts.controls === 0
                          ? t("noControls")
                          : t("provenOf", {
                              proven: m.counts.proven,
                              total: m.counts.controls,
                            })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
