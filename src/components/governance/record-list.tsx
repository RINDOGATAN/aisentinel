// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one list pattern for the record lists (AI systems, AI tools in use,
 * vendors, policies): a grid of boxes, each holding the record's heading line
 * (its reference or kind), its title, its status badges, and below them the
 * description, tags, details and any actions, all inside the same border.
 *
 * The whole box opens the record: the title is the link and stretches over
 * the box, so the box is still one tab stop and one click target. Actions
 * sit above that layer, so a button in a box is its own control and never
 * a link inside a link. Where a list also has a table view (policies), the
 * table uses RecordTable so both views share the same frame.
 */

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RecordGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2", className)} data-testid="record-grid">
      {children}
    </div>
  );
}

export interface RecordCardProps {
  href: string;
  title: ReactNode;
  /** The line above the title: the record's reference ("AIS-001") or its kind. */
  heading?: ReactNode;
  icon?: ElementType;
  /** Status and risk badges, top right. */
  badges?: ReactNode;
  description?: string | null;
  /** Outline tags: technique, role, type, category, department. */
  tags?: ReactNode;
  /** Small detail lines: counts, owner, contact, review date, warnings. */
  details?: ReactNode;
  /** The last line: when the record was last updated or reported. */
  footer?: ReactNode;
  /** Buttons or links of their own, kept inside the box. */
  actions?: ReactNode;
  "data-testid"?: string;
}

export function RecordCard({
  href,
  title,
  heading,
  icon: Icon,
  badges,
  description,
  tags,
  details,
  footer,
  actions,
  "data-testid": testId = "record-card",
}: RecordCardProps) {
  return (
    <Card
      className="relative h-full p-4 sm:p-5 flex flex-col gap-3 transition-colors hover:border-primary/50 focus-within:border-primary/50"
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
          )}
          {heading && (
            <p className="text-xs text-muted-foreground font-mono truncate" data-testid="record-heading">
              {heading}
            </p>
          )}
        </div>
        {badges && <div className="flex gap-1.5 flex-wrap justify-end">{badges}</div>}
      </div>
      {/* The page font, not the display face of the page headings. */}
      <h3 className="font-sans text-base sm:text-lg font-semibold leading-snug line-clamp-2 break-words -mb-1">
        <Link
          href={href}
          className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline underline-offset-4"
        >
          {title}
        </Link>
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 -mt-1">{description}</p>
      )}
      {tags && <div className="flex flex-wrap gap-1.5">{tags}</div>}
      {details && <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">{details}</div>}
      {(footer || actions) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
          {actions && <div className="relative z-10 flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
    </Card>
  );
}

/** The frame for a list's table view, the same border as the boxes. */
export function RecordTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-border rounded-md bg-card" data-testid="record-table">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
