"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The "Advanced" group at the foot of Settings: closed by default, so the
 * cards the path needs first are the page. It opens itself when the address
 * points to a card inside it (the pilot reminder e-mail, the offer to delete
 * after an export), so a link never lands on a hidden card.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { hashOpensAdvanced } from "@/lib/settings-anchors";
import { cn } from "@/lib/utils";

export function AdvancedSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const openForHash = () => {
      if (!hashOpensAdvanced(window.location.hash)) return;
      setOpen(true);
      // Scroll once the content is laid out.
      const id = decodeURIComponent(window.location.hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    };
    openForHash();
    window.addEventListener("hashchange", openForHash);
    return () => window.removeEventListener("hashchange", openForHash);
  }, []);

  return (
    <details
      ref={ref}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="group border-t border-border pt-4"
      data-testid="settings-advanced"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-md py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-base font-semibold">{title}</span>
          <span className="block text-sm text-muted-foreground">{description}</span>
        </span>
        <ChevronDown
          className={cn("mt-1 size-5 shrink-0 text-muted-foreground motion-safe:transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </summary>
      <div className="mt-4 space-y-4 sm:space-y-6">{children}</div>
    </details>
  );
}
