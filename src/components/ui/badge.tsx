// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * The marker a status chip carries so its meaning survives without hue: a
 * filled dot before the label, in the status colour, which clears 3:1 against
 * the chip fill (proved in src/config/status-palette.test.ts).
 */
const statusDot =
  "before:content-[''] before:size-1.5 before:rounded-full before:shrink-0"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        // Status chips keep the body text colour and carry the status in a
        // marker dot and a border, never in the hue of the label. See the
        // alpha contract in src/config/status-palette.ts.
        warning:
          "bg-warning/20 text-foreground border-warning [a&]:hover:bg-warning/30 before:bg-warning " +
          statusDot,
        success:
          "bg-success/20 text-foreground border-success [a&]:hover:bg-success/30 before:bg-success " +
          statusDot,
        info:
          "bg-info/20 text-foreground border-info [a&]:hover:bg-info/30 before:bg-info " +
          statusDot,
        outline:
          "border-border text-foreground [a&]:hover:bg-accent/15 [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent/15 [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
