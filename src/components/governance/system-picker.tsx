"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one way to choose an AI system in a form: a search box over the names
 * of all the organization's systems (search.systems, the same server-side name
 * search and scope as the top-bar search), not a first page of them loaded
 * into a select.
 *
 * Keyboard: Down opens the list and moves through it, Up moves back, Enter
 * chooses, Escape closes and keeps the current choice. The input is a
 * role="combobox" with aria-activedescendant on the highlighted option.
 *
 * `value` is the selected system's id. When the page starts with an id (from
 * its address) the name is fetched by id (search.system), so it shows before
 * any search.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { useEnumLabels } from "@/lib/enum-labels";
import { cn } from "@/lib/utils";
import type { SystemPick } from "@/server/routers/governance/search";

export interface SystemPickerProps {
  /** The selected system's id, or "" / null for none. */
  value: string | null;
  onChange: (system: SystemPick | null) => void;
  /** Id for the input, so a <Label htmlFor> names it. */
  id?: string;
  /** Accessible name when there is no <Label htmlFor>. */
  ariaLabel?: string;
  placeholder?: string;
  /** Leave out the systems already linked to this vendor. */
  withoutVendorId?: string;
  /** Offer a button that clears the choice (an optional link). */
  clearable?: boolean;
  /** Shown instead of the box when the organization has no system to offer. */
  empty?: ReactNode;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function SystemPicker({
  value,
  onChange,
  id,
  ariaLabel,
  placeholder,
  withoutVendorId,
  clearable = false,
  empty,
  autoFocus,
  disabled,
  className,
  "data-testid": testId = "system-picker",
}: SystemPickerProps) {
  const t = useTranslations("systemPicker");
  const { statusLabel } = useEnumLabels();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const listId = useId();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<SystemPick | null>(null);

  const term = useDebounce(q.trim(), 250);
  const { data, isFetching } = trpc.search.systems.useQuery(
    { organizationId: orgId, q: term, withoutVendorId },
    { enabled: !!orgId && (open || !!empty), staleTime: 30_000 }
  );
  const items = data?.items ?? [];

  // A selection that arrives as an id only (from the address) gets its name.
  const needName = !!value && picked?.id !== value;
  const { data: byId } = trpc.search.system.useQuery(
    { organizationId: orgId, id: value ?? "" },
    { enabled: !!orgId && needName }
  );
  const selected = value ? (picked?.id === value ? picked : byId ?? null) : null;

  // Close on a click outside.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(system: SystemPick | null) {
    setPicked(system);
    setOpen(false);
    setQ("");
    onChange(system);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (open) e.preventDefault();
      setOpen(false);
      setQ("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      if (items.length) setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length) setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      const hit = items[active];
      if (hit) choose(hit);
    }
  }

  // The organization has nothing to offer: say so where the box would be.
  if (empty && data && !term && items.length === 0 && !value) {
    return <div data-testid={`${testId}-empty`}>{empty}</div>;
  }

  const waiting = q.trim() !== term || isFetching;
  const activeId = open && items[active] ? `${listId}-${active}` : undefined;

  return (
    <div ref={boxRef} className={cn("relative w-full", className)} data-testid={testId}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-label={ariaLabel}
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={100}
        value={open ? q : selected?.name ?? ""}
        placeholder={open && selected ? selected.name : placeholder ?? t("placeholder")}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background pl-3 text-sm placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          clearable && selected ? "pr-16" : "pr-9"
        )}
        data-testid={`${testId}-input`}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {clearable && selected && !disabled && (
          <button
            type="button"
            onClick={() => choose(null)}
            className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("clear")}
            data-testid={`${testId}-clear`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        {open && waiting ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
        )}
      </span>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("results")}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          data-testid={`${testId}-results`}
        >
          {items.map((s, index) => (
            <li
              key={s.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
              className={cn(
                "flex min-h-9 cursor-pointer items-baseline justify-between gap-3 rounded px-3 py-2 text-sm",
                index === active ? "bg-muted" : "hover:bg-muted/60",
                s.id === value && "font-medium"
              )}
            >
              <span className="min-w-0 break-words">{s.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{statusLabel(s.status)}</span>
            </li>
          ))}
          {!waiting && items.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
              {t("noResults")}
            </li>
          )}
          {data?.more && (
            <li role="presentation" className="mt-1 border-t border-border px-3 pt-1.5 pb-1 text-xs text-muted-foreground">
              {t("more", { count: items.length })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
