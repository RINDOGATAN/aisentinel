"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The path's first step while no framework is chosen: the frameworks that
 * shape the program (src/config/applicability.ts, CHOOSABLE_FRAMEWORKS).
 * The same question is in the quick start, on step 1.2's page and in Settings.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/lib/organization-context";
import { FrameworksCard } from "@/components/governance/applicability-check";
import { trpc } from "@/lib/trpc";

export default function FrameworksPage() {
  const { organization, canWrite } = useOrganization();
  const t = useTranslations("guided");
  const tc = useTranslations("common");
  const orgId = organization?.id ?? "";
  const { data } = trpc.regimes.getApplicability.useQuery({ organizationId: orgId }, { enabled: !!orgId });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <ListChecks className="w-6 h-6 text-primary" aria-hidden="true" />
          {t("steps.frameworks.label")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("steps.frameworks.why")}</p>
      </div>
      {orgId && <FrameworksCard organizationId={orgId} canWrite={canWrite} />}
      {data && data.frameworks.length > 0 && (
        <Link href="/governance/quickstart" className="inline-block">
          <Button className="gap-2">
            {tc("continue")}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Link>
      )}
    </div>
  );
}
