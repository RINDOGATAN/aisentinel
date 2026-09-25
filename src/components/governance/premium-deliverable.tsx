"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Downloads that are part of a paid module, shown honestly and in order.
 *
 * On a deployment where everything is included, the "Download" menu holds
 * ordinary downloads and nothing else appears. On the hosted instance, where a
 * few finished documents stay behind the licence, a locked item keeps its
 * place and size with a lock, and the page says ONCE, in one quiet line under
 * its header, what unlocks it: activate a licence, or see the modules. No dark
 * patterns, no teasing a download that then fails, and no note stacked under
 * each button.
 */

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Download, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { PREMIUM_KIT_PRICE_PER_YEAR, formatPrice } from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import type { ShowcaseFeature } from "@/config/premium-showcase";
import { useExportDownload } from "@/components/governance/use-export-download";

export interface Deliverable {
  feature: ShowcaseFeature;
  href: string;
  label: string;
}

/** Which of this organisation's deliverables are locked here, and where to buy. */
export function useShowcaseLocks(organizationId: string) {
  const { data } = trpc.skills.showcaseStatus.useQuery(
    { organizationId },
    { enabled: !!organizationId, staleTime: 5 * 60 * 1000 },
  );
  return {
    isLocked: (feature: ShowcaseFeature) => !!data?.locked.includes(feature),
    purchaseUrl: data?.purchaseUrl ?? "https://todo.law/skills",
  };
}

/**
 * The page's downloads as one "Download" button that opens a menu. A locked
 * item stays in the menu at its normal size, with a lock, and cannot be
 * chosen; the reason is the page's single licence line (`LicenceNote`).
 */
export function DeliverablesMenu({
  organizationId,
  items,
  label,
}: {
  organizationId: string;
  items: Deliverable[];
  label: string;
}) {
  const { download, isPending } = useExportDownload();
  const { isLocked } = useShowcaseLocks(organizationId);
  const busy = items.some((item) => isPending(item.href));
  // The page's main action, so it wears the primary colour, unless every item
  // is locked: a locked action never does (it would read as live, then refuse).
  const allLocked = items.every((item) => isLocked(item.feature));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={allLocked ? "outline" : "default"} disabled={busy}>
          {busy ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-4 h-4 mr-1.5" aria-hidden="true" />
          )}
          {label}
          <ChevronDown className="w-4 h-4 ml-1.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        {items.map((item) => {
          const locked = isLocked(item.feature);
          return (
            <DropdownMenuItem
              key={item.feature}
              disabled={locked}
              onClick={() => {
                if (!locked) void download(item.href);
              }}
              className="flex items-center gap-2"
            >
              {locked ? (
                <Lock className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4" aria-hidden="true" />
              )}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The one quiet line under a page header when any of its downloads is
 * locked, with the same two links the lock always offered. Nothing when none
 * is.
 */
export function LicenceNote({
  organizationId,
  features,
}: {
  organizationId: string;
  features: ShowcaseFeature[];
}) {
  const t = useTranslations("premiumShowcase");
  const locale = useLocale();
  const currency = useCurrency();
  const { isLocked, purchaseUrl } = useShowcaseLocks(organizationId);

  if (!features.some(isLocked)) return null;
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Lock className="mt-0.5 w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        {t("lockedHint", { price: formatPrice(PREMIUM_KIT_PRICE_PER_YEAR, currency, locale) })}{" "}
        <Link href="/governance/skills" className="text-primary hover:underline">
          {t("activate")}
        </Link>
        {" · "}
        <a href={purchaseUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
          {t("buy")}
        </a>
      </span>
    </p>
  );
}
