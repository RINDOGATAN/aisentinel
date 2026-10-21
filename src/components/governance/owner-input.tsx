"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A system's business or technical owner: a free-text field that offers the
 * organization's members and the colleagues invited who have not joined yet,
 * so the owner is normally a person in the team, while a name from outside the
 * team can still be typed.
 */

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

/** The suggestions for the field: one per person, members first, no repeats. */
export function ownerSuggestions(
  people: readonly { kind: "member" | "invitation"; name: string; email: string }[],
): { value: string; pending: boolean }[] {
  const seen = new Set<string>();
  const out: { value: string; pending: boolean }[] = [];
  for (const p of [...people].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "member" ? -1 : 1))) {
    const value = (p.name || p.email).trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    out.push({ value, pending: p.kind === "invitation" });
  }
  return out;
}

export function OwnerInput({
  organizationId,
  id,
  value,
  onChange,
  placeholder,
}: {
  organizationId: string | undefined;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const t = useTranslations("departments");
  const listId = `${useId()}-people`;
  const { data } = trpc.team.people.useQuery(
    { organizationId: organizationId ?? "" },
    { enabled: !!organizationId, staleTime: 60_000 },
  );
  const options = ownerSuggestions(data ?? []);

  return (
    <>
      <Input
        id={id}
        list={options.length > 0 ? listId : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {options.length > 0 && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o.value} value={o.value} label={o.pending ? t("invitedName", { name: o.value }) : undefined} />
          ))}
        </datalist>
      )}
    </>
  );
}
