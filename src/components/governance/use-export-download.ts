"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one way a button downloads a generated document.
 *
 * Fetches first (src/lib/export-download.ts) and, when the server refuses,
 * stays on the page and says so in a toast: a licensed module offers the
 * pricing page, anything else offers a retry. A person never lands on a
 * JSON error body.
 *
 * On success on the hosted pilot, an owner is offered the way out in that
 * moment: the file is downloaded, so the account can now be emptied. One line,
 * and it leads to the Settings card rather than deleting anything itself
 * (src/lib/post-export-wipe.ts).
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { downloadExport, pricingUrl } from "@/lib/export-download";
import { shouldOfferWipe, WIPE_TARGET } from "@/lib/post-export-wipe";
import { useOrganization } from "@/lib/organization-context";
import { trpc } from "@/lib/trpc";

export function useExportDownload() {
  const t = useTranslations("premiumShowcase");
  const tp = useTranslations("pilot");
  const locale = useLocale();
  const router = useRouter();
  const { userRole } = useOrganization();
  const { data: pilotMode } = trpc.pilot.mode.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const offerWipe = shouldOfferWipe({ hostedPilot: pilotMode?.active ?? false, role: userRole });
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const download = useCallback(
    async (url: string): Promise<void> => {
      setPendingUrl(url);
      try {
        const result = await downloadExport(url);
        if (result.ok) {
          if (offerWipe) {
            toast(tp("afterExportBody"), {
              duration: 15_000,
              action: {
                label: tp("afterExportAction"),
                onClick: () => router.push(WIPE_TARGET),
              },
            });
          }
          return;
        }
        if (result.kind === "locked") {
          toast.info(t("exportLockedTitle"), {
            description: t("exportLockedBody"),
            duration: 12_000,
            action: {
              label: t("seePricing"),
              onClick: () => window.open(pricingUrl(locale), "_blank", "noopener"),
            },
          });
        } else {
          toast.error(t("exportFailedTitle"), {
            description: t("exportFailedBody"),
            duration: 12_000,
            action: { label: t("retry"), onClick: () => void download(url) },
          });
        }
      } finally {
        setPendingUrl(null);
      }
    },
    [t, tp, locale, offerWipe, router],
  );

  return {
    download,
    /** True while the given URL (or, with no argument, any URL) is being fetched. */
    isPending: (url?: string) => (url ? pendingUrl === url : pendingUrl !== null),
  };
}
