// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one alert and banner primitive, and the one status mark.
 *
 * Both obey the rules in `src/config/status-palette.ts`:
 *  - the text is the body text colour, never the status hue, so it always
 *    clears 4.5:1 on the fill it sits on;
 *  - the status is carried by a word (the caller's title or label), by an icon
 *    and by a border, so a reader who cannot tell the hues apart reads the
 *    same thing from the same screen;
 *  - the fill is the 10 per cent tint and the border is full opacity, the two
 *    values the contrast test proves.
 */

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { StatusKey } from "@/config/status-palette";
import { cn } from "@/lib/utils";

const ICON: Record<StatusKey, React.ComponentType<{ className?: string }>> = {
  danger: XCircle,
  warning: AlertTriangle,
  good: CheckCircle2,
  note: Info,
};

/** Full-opacity border and the 10 per cent fill, per the alpha contract. */
const BOX: Record<StatusKey, string> = {
  danger: "border-destructive bg-destructive/10",
  warning: "border-warning bg-warning/10",
  good: "border-success bg-success/10",
  note: "border-info bg-info/10",
};

/** The icon colour, a non-text mark, which clears 3:1 on the fill. */
const MARK: Record<StatusKey, string> = {
  danger: "text-destructive",
  warning: "text-warning",
  good: "text-success",
  note: "text-info",
};

/**
 * A chip or pill carrying a status: the label keeps the body text colour and
 * the status is carried by the label's own word, by a marker dot and by a
 * border. The dot clears 3:1 on the 20 per cent fill, and the fill keeps the
 * body text above 4.5:1; both are proved in the palette test.
 */
const chipDot =
  "inline-flex items-center gap-1.5 before:content-[''] before:size-1.5 before:rounded-full before:shrink-0";

/**
 * The same chip drawn without a fill: an outline chip on a plain surface. The
 * border and the dot carry the status, the label keeps the body text colour.
 */
export const STATUS_OUTLINE: Record<StatusKey, string> = {
  danger: `border-destructive text-foreground before:bg-destructive ${chipDot}`,
  warning: `border-warning text-foreground before:bg-warning ${chipDot}`,
  good: `border-success text-foreground before:bg-success ${chipDot}`,
  note: `border-info text-foreground before:bg-info ${chipDot}`,
};

export const STATUS_CHIP: Record<StatusKey, string> = {
  danger: `bg-destructive/20 text-foreground border border-destructive before:bg-destructive ${chipDot}`,
  warning: `bg-warning/20 text-foreground border border-warning before:bg-warning ${chipDot}`,
  good: `bg-success/20 text-foreground border border-success before:bg-success ${chipDot}`,
  note: `bg-info/20 text-foreground border border-info before:bg-info ${chipDot}`,
};

/**
 * An alert or banner. `title` is the word that names the severity; it is set
 * in the body text colour and the icon beside it carries the shape.
 */
export function StatusNote({
  status,
  title,
  children,
  className,
}: {
  status: StatusKey;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = ICON[status];
  return (
    <div
      role={status === "danger" || status === "warning" ? "alert" : undefined}
      className={cn("flex gap-3 rounded-lg border p-3", BOX[status], className)}
    >
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", MARK[status])} aria-hidden />
      <div className="min-w-0 space-y-1 text-sm text-foreground">
        {title ? <p className="font-medium">{title}</p> : null}
        {/* With a title above it the body is secondary; on its own it is the message. */}
        {children ? <div className={title ? "text-muted-foreground" : undefined}>{children}</div> : null}
      </div>
    </div>
  );
}

/**
 * An inline status mark: the icon and the word, side by side, with the word in
 * the body text colour. Use it wherever a single tinted word used to stand in
 * for a status.
 */
export function StatusMark({
  status,
  children,
  className,
}: {
  status: StatusKey;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = ICON[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-foreground", className)}>
      <Icon className={cn("h-3 w-3 shrink-0", MARK[status])} aria-hidden />
      {children}
    </span>
  );
}
