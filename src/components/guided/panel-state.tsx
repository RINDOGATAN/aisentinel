"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What a dashboard panel shows when it has nothing to show: a plain line when
 * its reading failed (with a way to ask again), so a panel is never left as an
 * empty box or a loading shape that never ends.
 */

import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PanelPhase = "loading" | "failed" | "empty" | "ready";

/** One rule for every panel: a failure wins over loading, and loading over empty. */
export function panelPhase({ failed, loaded, empty }: { failed: boolean; loaded: boolean; empty: boolean }): PanelPhase {
  if (failed && !loaded) return "failed";
  if (!loaded) return "loading";
  return empty ? "empty" : "ready";
}

export function PanelFailed({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("guided.panel");
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2" role="status" data-testid="panel-failed">
      <p className="flex-1 text-sm text-muted-foreground">{t("failed")}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="gap-1.5 self-start sm:self-auto" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          {t("retry")}
        </Button>
      )}
    </div>
  );
}

export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground" data-testid="panel-empty">
      {children}
    </p>
  );
}
