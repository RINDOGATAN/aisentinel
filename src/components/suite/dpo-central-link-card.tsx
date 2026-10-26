// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

"use client";

/**
 * "Start from DPO Central" (src/server/services/suite/dpc-link.ts): before a
 * link exists, the offer to pick a DPO Central organisation; once linked, its
 * state, what came in, and the way to undo it. The link itself is made in DPO
 * Central, where the person's organisations there are known.
 */
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { brand } from "@/config/brand";
import { trpc } from "@/lib/trpc";
import { useFormatDate } from "@/lib/use-format-date";

/** The DPO Central page that makes the link, with the way back here. */
export function dpoCentralLinkUrl(base: string, organizationId: string, returnTo: string): string {
  const url = new URL("/privacy/suite/ai-sentinel", base);
  url.searchParams.set("aisOrg", organizationId);
  url.searchParams.set("return", returnTo);
  return url.toString();
}

/**
 * Whether the dashboard shows the offer: an owner or administrator, no link
 * yet (a removed one counts as a choice made), DPO Central knows the person,
 * and nobody has set it aside for this organisation.
 */
export function showDashboardOffer(
  data: { link: unknown; canManage: boolean; dpcFound?: boolean; offerDismissed?: boolean } | undefined,
): boolean {
  return !!data && !data.link && data.canManage && data.dpcFound === true && data.offerDismissed !== true;
}

export function DpoCentralLinkCard({
  organizationId,
  returnPath = "/governance/quickstart",
  placement = "page",
}: {
  organizationId: string;
  returnPath?: string;
  /** "dashboard": only the offer, only for a person DPO Central knows, with a way to set it aside. */
  placement?: "page" | "dashboard";
}) {
  const onDashboard = placement === "dashboard";
  const t = useTranslations("suiteLink");
  const tc = useTranslations("common");
  const { formatDate } = useFormatDate();
  const utils = trpc.useUtils();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data } = trpc.suiteLink.get.useQuery(
    { organizationId, ...(onDashboard ? { peer: true } : {}) },
    { enabled: !!organizationId },
  );
  const dismiss = trpc.suiteLink.dismissOffer.useMutation({
    onSuccess: () => void utils.suiteLink.get.invalidate(),
    onError: (err) => toast.error(err.message),
  });
  const unlink = trpc.suiteLink.unlink.useMutation({
    onSuccess: () => {
      toast.success(t("unlinked"));
      setConfirmOpen(false);
      void utils.suiteLink.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!data || !brand.dpoCentralUrl) return null;
  if (onDashboard && !showDashboardOffer(data)) return null;
  const link = data.link;
  const startHref = () =>
    dpoCentralLinkUrl(
      brand.dpoCentralUrl,
      organizationId,
      typeof window === "undefined" ? returnPath : `${window.location.origin}${returnPath}`,
    );

  if (!link || !link.active) {
    if (!data.canManage) return null;
    return (
      <Card data-testid="dpc-link-offer">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            {t("startTitle")}
          </p>
          {link && !link.active && link.unlinkedAt ? (
            <p className="text-sm text-muted-foreground">
              {t("unlinkedState", { name: link.dpcOrganizationName, date: formatDate(link.unlinkedAt) })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("startBody")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("startNote")}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={startHref()}>{link ? t("relinkButton") : t("startButton")}</a>
            </Button>
            {onDashboard && (
              <Button
                size="sm"
                variant="ghost"
                disabled={dismiss.isPending}
                onClick={() => dismiss.mutate({ organizationId })}
                data-testid="dpc-link-offer-dismiss"
              >
                {t("notNow")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="dpc-link-state">
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          {t("linkedTitle")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("linkedBody", { name: link.dpcOrganizationName, date: formatDate(link.linkedAt) })}
        </p>
        <p className="text-sm">
          {t("linkedCounts", {
            systems: data.importedSystems,
            vendors: data.importedVendors,
            toConfirm: data.toConfirm,
          })}
        </p>
        {link.lastSyncAt && (
          <p className="text-xs text-muted-foreground">{t("lastSync", { date: formatDate(link.lastSyncAt) })}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {data.toConfirm > 0 && (
            <Button asChild size="sm" variant="outline">
              <Link href="/governance/ai-registry">{t("reviewDrafts")}</Link>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <a href={brand.dpoCentralUrl} target="_blank" rel="noopener noreferrer">
              {t("openDpoCentral")}
            </a>
          </Button>
          {data.canManage && (
            <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(true)}>
              {t("unlink")}
            </Button>
          )}
        </div>
      </CardContent>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("unlink")}</DialogTitle>
            <DialogDescription>{t("unlinkConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={unlink.isPending}
              onClick={() => unlink.mutate({ organizationId })}
            >
              {t("unlink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
