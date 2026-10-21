"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The mark beside a card whose answers save as they are chosen: "Saves as you
 * choose" before anything happens, then "Saving", "Saved", or "Not saved" with
 * a way to try again. Announced politely to screen readers.
 */

import { Check, Loader2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SaveStatus as Status } from "@/lib/save-queue";
import { cn } from "@/lib/utils";
import { CardAction } from "@/components/ui/card";

export function SaveStatus({
  status,
  onRetry,
  className,
  testId,
}: {
  status: Status;
  onRetry?: () => void;
  className?: string;
  testId?: string;
}) {
  const t = useTranslations("autosave");
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid={testId}
      data-status={status}
      className={cn("inline-flex items-center gap-1.5 text-sm whitespace-nowrap", className)}
    >
      {status === "idle" && <span className="text-muted-foreground">{t("idle")}</span>}
      {status === "saving" && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          {t("saving")}
        </span>
      )}
      {status === "saved" && (
        <span className="inline-flex items-center gap-1.5 font-medium text-success">
          <Check className="size-4" aria-hidden="true" />
          {t("saved")}
        </span>
      )}
      {status === "error" && (
        <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          {t("error")}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 underline underline-offset-2 hover:no-underline"
            >
              {t("retry")}
            </button>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * `<SaveStatus>` placed in a card header: beside the title from the small
 * breakpoint up, on its own line under the title on a phone, so the title is
 * never squeezed into a narrow column. Give that header
 * `className={CARD_HEADER_WITH_STATUS}` so it drops to one column there.
 */
export function CardSaveStatus(props: React.ComponentProps<typeof SaveStatus>) {
  return (
    <CardAction className="max-sm:col-start-auto max-sm:row-start-auto max-sm:row-span-1 max-sm:justify-self-start">
      <SaveStatus {...props} />
    </CardAction>
  );
}

/** The card header class that lets `<CardSaveStatus>` stack on a phone. */
export const CARD_HEADER_WITH_STATUS = "max-sm:has-data-[slot=card-action]:grid-cols-1";
