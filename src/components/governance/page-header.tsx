// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one page header of the dashboard (both layouts).
 *
 * - Left: the title and a one-line description.
 * - Right: ONE row of actions of the same height. Places to go come first,
 *   then what the page makes; with more than three actions, the downloads
 *   share one "Download" menu button (`DeliverablesMenu`).
 * - Under it, at most one quiet line (`note`), e.g. the licence line when a
 *   download is locked. Never a note under each button.
 * - On a phone: the title, then the actions as one full-width row. The last
 *   action (the main one) takes the width left; the others show as icons.
 *   The row never wraps, so buttons never stack.
 *
 * Every action is a `Button` of the default or icon size (both 36 px tall),
 * or a Link around one: the row relies on it for the equal heights. Tested
 * by a source scan in src/components/governance/page-header.test.ts.
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const PAGE_HEADER_ACTIONS =
  "flex w-full min-w-0 flex-nowrap items-center gap-2 sm:w-auto sm:shrink-0 [&>*]:shrink-0 [&>*:last-child]:min-w-0 [&>*:last-child]:flex-1 [&>*:last-child]:shrink sm:[&>*:last-child]:flex-none [&>*:last-child_button]:w-full sm:[&>*:last-child_button]:w-auto";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  note,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold break-words sm:text-2xl">
            {Icon && <Icon className="w-6 h-6 shrink-0 text-primary" aria-hidden="true" />}
            <span className="min-w-0">{title}</span>
          </h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className={PAGE_HEADER_ACTIONS}>{actions}</div>}
      </div>
      {note}
    </div>
  );
}
