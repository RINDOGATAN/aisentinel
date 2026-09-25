"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AIUC-1 testing: the list of AI agents.
 *
 * One card per agent: whether it is ready for the audit, the overall bar, and
 * one line per domain ("B Security · 7 of 12 tested, 1 fail"). The rules are
 * in src/config/aiuc1-evidence.ts.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bot, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/governance/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { ReadinessBadge, TallyLine } from "@/components/governance/aiuc1-readiness";
import { ProgressBar } from "@/components/guided/progress-ring";

export default function AgentTestingPage() {
  const t = useTranslations("agentTesting");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";

  const { data, isLoading } = trpc.aiuc1.agents.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <PageHeader icon={Bot} title={t("title")} description={t("subtitle")} />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-1 text-sm">
          <p>{t("howItWorks")}</p>
          <p className="text-muted-foreground">{t("readyRule")}</p>
        </CardContent>
      </Card>

      {data && !data.seeded && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{t("notSeeded")}</CardContent>
        </Card>
      )}

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label={t("loading")} />
        </div>
      ) : data.agents.length === 0 ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="text-sm">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
            <Button asChild variant="outline">
              <Link href="/governance/ai-registry">{t("openRegistry")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {data.agents.map((a) => (
            <li key={a.id}>
              <Link
                href={`/governance/agent-testing/${a.id}`}
                className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words font-medium">{a.name}</span>
                      <ReadinessBadge ready={a.overall.readyForAudit} />
                    </div>
                    <div className="space-y-1">
                      <ProgressBar value={a.overall.ready} total={a.overall.applicable} />
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {t("overallLine", {
                          ready: a.overall.ready,
                          total: a.overall.applicable,
                        })}
                      </p>
                    </div>
                    <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                      {a.domains.map((d) => (
                        <li key={d.code} className="text-xs">
                          <TallyLine code={d.code} tally={d} />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
