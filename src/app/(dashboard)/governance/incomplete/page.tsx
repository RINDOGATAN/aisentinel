"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Incomplete": systems whose registration is missing a required field, with
 * exactly what is missing and a link to fill it. The rule for "what is missing"
 * is the same one the registry's registration filter uses
 * (src/lib/registration-completeness.ts), so the two never disagree.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";

export default function IncompletePage() {
  const t = useTranslations("views");
  const tr = useTranslations("registration");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const dept = useSearchParams().get("dept") ?? undefined;

  const { data, isLoading } = trpc.views.incomplete.useQuery(
    { organizationId: orgId, businessUnitId: dept },
    { enabled: !!orgId },
  );
  const systems = data?.systems ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          {t("incomplete.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("incomplete.subtitle")}</p>
      </div>

      {isLoading ? (
        <ListPageSkeleton />
      ) : systems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-60" />
            <p>{t("incomplete.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {systems.map((s) => (
            <li key={s.id}>
              <Link href={`/governance/ai-registry/${s.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("incomplete.missingCount", { count: s.missing.length })}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.missing.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {tr(`field.${field}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
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
