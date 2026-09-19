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
 */

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { downloadExport, pricingUrl } from "@/lib/export-download";

export function useExportDownload() {
  const t = useTranslations("premiumShowcase");
  const locale = useLocale();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const download = useCallback(
    async (url: string): Promise<void> => {
      setPendingUrl(url);
      try {
        const result = await downloadExport(url);
        if (result.ok) return;
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
    [t, locale],
  );

  return {
    download,
    /** True while the given URL (or, with no argument, any URL) is being fetched. */
    isPending: (url?: string) => (url ? pendingUrl === url : pendingUrl !== null),
  };
}
