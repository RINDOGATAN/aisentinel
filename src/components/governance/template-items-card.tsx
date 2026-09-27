"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Remove all template items": clears the systems, vendors and starter
 * assessments an industry template or the quickstart created silently, but only
 * the ones nobody has edited. It shows how many will go and how many stay, and
 * asks once before acting. Mirrors the worked-example removal card.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LayoutTemplate, Trash2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TemplateItemsCard({ organizationId }: { organizationId: string }) {
  const t = useTranslations("settings");
  const { userRole } = useOrganization();
  const utils = trpc.useUtils();
  const [confirming, setConfirming] = useState(false);

  const { data: plan } = trpc.organization.templateItemsPlan.useQuery(
    { organizationId },
    { staleTime: 30 * 1000 },
  );

  const remove = trpc.organization.removeTemplateItems.useMutation({
    onSuccess: async (res) => {
      setConfirming(false);
      await Promise.all([
        utils.organization.templateItemsPlan.invalidate(),
        utils.organization.getDashboardStats.invalidate(),
      ]);
      toast.success(t("templateItemsRemoved", { count: res.total }));
    },
    onError: (err) => {
      setConfirming(false);
      toast.error(err.message);
    },
  });

  // Nothing to offer if no unedited template items remain.
  if (!plan || plan.totalRemove === 0) return null;

  const canAct = userRole !== null && ["OWNER", "ADMIN", "AI_OFFICER"].includes(userRole);

  return (
    <Card data-testid="template-items-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-primary" />
          {t("templateItemsTitle")}
        </CardTitle>
        <CardDescription>{t("templateItemsLead")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">
          {t("templateItemsCount", { remove: plan.totalRemove, keep: plan.totalKeep })}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {[
            `${plan.systems.remove} ${t("templateItemsSystems")}`,
            `${plan.vendors.remove} ${t("templateItemsVendors")}`,
            `${plan.assessments.remove} ${t("templateItemsAssessments")}`,
          ].join(" · ")}
        </p>
        {canAct && (
          confirming ? (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ organizationId })}
              >
                {remove.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                {t("templateItemsConfirm", { count: plan.totalRemove })}
              </Button>
              <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => setConfirming(false)}>
                {t("templateItemsCancel")}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {t("templateItemsButton")}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
