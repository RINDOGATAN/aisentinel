"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A download that is part of a paid module, shown honestly.
 *
 * On a deployment where everything is included, this is an ordinary button and
 * nothing else appears. On the hosted instance, where a few finished documents
 * stay behind the licence, it shows the lock, says what unlocks it, and offers
 * the two real routes: activate a licence, or self-host, where everything is
 * included. No dark patterns, no teasing a button that then fails.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Download, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { ShowcaseFeature } from "@/config/premium-showcase";
import { useExportDownload } from "@/components/governance/use-export-download";

export function PremiumDeliverable({
  organizationId,
  feature,
  href,
  label,
  variant = "outline",
}: {
  organizationId: string;
  feature: ShowcaseFeature;
  href: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const t = useTranslations("premiumShowcase");
  const { download, isPending } = useExportDownload();

  const { data } = trpc.skills.showcaseStatus.useQuery(
    { organizationId },
    { enabled: !!organizationId, staleTime: 5 * 60 * 1000 },
  );

  const locked = !!data?.locked.includes(feature);

  if (!locked) {
    return (
      <Button variant={variant} disabled={isPending(href)} onClick={() => void download(href)}>
        {isPending(href) ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-1.5" />
        )}
        {label}
      </Button>
    );
  }

  // A locked action never wears the primary colour: it would read as a live
  // button that then refuses, which is the pattern this product should not use.
  return (
    <div className="inline-flex flex-col gap-1.5">
      <Button variant="outline" disabled className="opacity-70">
        <Lock className="w-4 h-4 mr-1.5" />
        {label}
      </Button>
      <span className="text-[11px] text-muted-foreground max-w-xs">
        {t("lockedHint")}{" "}
        <Link href="/governance/skills" className="text-primary hover:underline">
          {t("activate")}
        </Link>
        {" · "}
        <a
          href={data?.purchaseUrl ?? "https://todo.law/skills"}
          className="text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {t("buy")}
        </a>
      </span>
    </div>
  );
}
