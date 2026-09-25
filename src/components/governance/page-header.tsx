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
 * - A detail page (one system, one policy...) adds `back` (the list it
 *   belongs to, an icon link above the title) and `meta` (its status badges,
 *   under the title). Actions that depend on the status still go in the one
 *   row, never in a second one.
 * - On a phone: the title, then the actions as one full-width row. The last
 *   action (the main one) takes the width left; the others show as icons.
 *   The row never wraps, so buttons never stack.
 *
 * Every action is a `Button` of the default or icon size (both 36 px tall),
 * or a Link around one: the row relies on it for the equal heights. Tested
 * by a source scan in src/components/governance/page-header.test.ts.
 */

import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PAGE_HEADER_ACTIONS =
  "flex w-full min-w-0 flex-nowrap items-center gap-2 sm:w-auto sm:shrink-0 [&>*]:shrink-0 [&>*:last-child]:min-w-0 [&>*:last-child]:flex-1 [&>*:last-child]:shrink sm:[&>*:last-child]:flex-none [&>*:last-child_button]:w-full sm:[&>*:last-child_button]:w-auto";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  note,
  back,
  meta,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  note?: React.ReactNode;
  /** Detail pages: the list this record belongs to, and its accessible name. */
  back?: { href: string; label: string };
  /** Detail pages: the status badges, one wrapping line under the title. */
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {back && (
        <Link href={back.href} className="self-start">
          <Button variant="ghost" size="icon" className="-ml-2" title={back.label}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">{back.label}</span>
          </Button>
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold break-words sm:text-2xl">
            {Icon && <Icon className="w-6 h-6 shrink-0 text-primary" aria-hidden="true" />}
            <span className="min-w-0">{title}</span>
          </h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          {meta && <div className="mt-1.5 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className={PAGE_HEADER_ACTIONS}>{actions}</div>}
      </div>
      {note}
    </div>
  );
}
