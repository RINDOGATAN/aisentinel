"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Grouped jurisdiction multi-select, shared by the settings card and the
 * quickstart question so the two can never drift apart.
 *
 * Selection is a plain controlled value: the component never persists anything
 * itself, because "I'm not sure yet" (an empty selection) has to stay
 * distinguishable from a positive declaration at the point of saving.
 */

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import {
  JURISDICTION_GROUPS,
  jurisdictionsInGroup,
  type JurisdictionId,
} from "@/config/jurisdictions";

export function JurisdictionPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: JurisdictionId[];
  onChange: (next: JurisdictionId[]) => void;
  disabled?: boolean;
  /** Tighter spacing for the wizard step. */
  compact?: boolean;
}) {
  const t = useTranslations("jurisdictions");
  const selected = new Set(value);

  const toggle = (id: JurisdictionId) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <div className={compact ? "grid gap-3 sm:grid-cols-3" : "space-y-4"}>
      {JURISDICTION_GROUPS.map((group) => (
        <div key={group} className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t(`group.${group}`)}
          </p>
          <div
            className={
              compact
                ? "flex flex-col gap-1"
                : "grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5"
            }
          >
            {jurisdictionsInGroup(group).map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-2 text-sm ${
                  disabled ? "opacity-60" : "cursor-pointer"
                }`}
              >
                <Checkbox
                  checked={selected.has(option.id)}
                  disabled={disabled}
                  onCheckedChange={() => toggle(option.id)}
                />
                <span>{t(`option.${option.labelKey}`)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
