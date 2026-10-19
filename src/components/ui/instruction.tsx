// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A line that tells the reader what to do next ("Say where the organisation
 * operates to see the laws that depend on a place").
 *
 * Instructions are set in normal-size body text with a marker, so they never
 * read as a footnote. Small grey text (`text-xs text-muted-foreground`) is kept
 * for field hints only: what a field means, its format, its source.
 *
 * - `tone="plain"` (default): a line with an arrow marker, for inside a card.
 * - `tone="box"`: a bordered panel, for an offer or a step that must not be
 *   missed (for example, "We can fill in 2 fields from the vendor catalogue").
 * - `tone="attention"`: the same panel in the warning colour, for something
 *   still to do that changes the result.
 */

import * as React from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "plain" | "box" | "attention";

export function Instruction({
  tone = "plain",
  icon,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  tone?: Tone;
  /** Replaces the default marker; pass `null` for none. */
  icon?: React.ReactNode;
}) {
  const marker =
    icon !== undefined ? (
      icon
    ) : tone === "attention" ? (
      <AlertTriangle className="size-4 text-warning" />
    ) : (
      <ArrowRight className="size-4 text-primary" />
    );
  return (
    <div
      data-slot="instruction"
      data-tone={tone}
      className={cn(
        "flex items-start gap-2 text-sm leading-relaxed text-foreground",
        tone === "box" && "rounded-md border border-primary/50 bg-primary/5 p-3",
        tone === "attention" && "rounded-md border border-warning bg-warning/10 p-3",
        className,
      )}
      {...props}
    >
      {marker && (
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {marker}
        </span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
