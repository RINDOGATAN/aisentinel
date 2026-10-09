"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// The registry's filter bar: a control for each dimension the consultant asked
// for (department, owner, region, registration, risk, role, assessment), plus
// the saved views a person keeps. Stage is the tab strip above the list, and
// search and sort sit next to it, so they are not repeated here. Everything is
// driven by the URL through useSystemViewFilters in the page, so a filtered view
// is shareable and bookmarkable.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useEnumLabels } from "@/lib/enum-labels";
import { useDebounce } from "@/hooks/use-debounce";
import { JURISDICTIONS } from "@/config/jurisdictions";
import {
  ASSESSMENT_FILTER_OPTIONS,
  REGISTRATION_FILTER_OPTIONS,
  RISK_LEVEL_OPTIONS,
  SYSTEM_ROLE_OPTIONS,
  UNASSIGNED_DEPARTMENT,
  activeFilterCount,
  isEmptyFilterSet,
  type SystemViewFilters,
} from "@/lib/system-views";

// Radix Select forbids an empty string value, so "Any" carries a sentinel.
const ANY = "__any__";

export function SystemFilterBar({
  organizationId,
  filters,
  onSetFilter,
  onApplyAll,
  onClear,
}: {
  organizationId: string;
  filters: SystemViewFilters;
  onSetFilter: <K extends keyof SystemViewFilters>(key: K, value: SystemViewFilters[K]) => void;
  onApplyAll: (next: SystemViewFilters) => void;
  onClear: () => void;
}) {
  const t = useTranslations("views");
  const tj = useTranslations("jurisdictions");
  const { riskLabel, roleLabel } = useEnumLabels();

  const { data: deptData } = trpc.businessUnit.listForScope.useQuery({ organizationId });
  const departments = deptData?.departments ?? [];
  const hasDepartments = departments.length > 0;

  const activeCount = activeFilterCount(filters);
  const anyActive = !isEmptyFilterSet(filters);

  return (
    <div className="space-y-3">
      <SavedViews
        organizationId={organizationId}
        filters={filters}
        onApplyAll={onApplyAll}
      />

      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        {hasDepartments && (
          <FilterField label={t("filter.department")}>
            <Select
              value={filters.businessUnitId ?? ANY}
              onValueChange={(v) => onSetFilter("businessUnitId", v === ANY ? undefined : v)}
            >
              <SelectTrigger className="w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("filter.any")}</SelectItem>
                <SelectItem value={UNASSIGNED_DEPARTMENT}>{t("filter.unassigned")}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        )}

        <OwnerFilter
          value={filters.owner ?? ""}
          onChange={(v) => onSetFilter("owner", v || undefined)}
          label={t("filter.owner")}
          placeholder={t("filter.ownerPlaceholder")}
        />

        <FilterField label={t("filter.region")}>
          <Select
            value={filters.region ?? ANY}
            onValueChange={(v) => onSetFilter("region", v === ANY ? undefined : (v as SystemViewFilters["region"]))}
          >
            <SelectTrigger className="w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("filter.any")}</SelectItem>
              {JURISDICTIONS.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {tj(`option.${j.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label={t("filter.role")}>
          <Select
            value={filters.role ?? ANY}
            onValueChange={(v) => onSetFilter("role", v === ANY ? undefined : (v as SystemViewFilters["role"]))}
          >
            <SelectTrigger className="w-[9rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("filter.any")}</SelectItem>
              {SYSTEM_ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {roleLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label={t("filter.risk")}>
          <Select
            value={filters.risk ?? ANY}
            onValueChange={(v) => onSetFilter("risk", v === ANY ? undefined : (v as SystemViewFilters["risk"]))}
          >
            <SelectTrigger className="w-[9rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("filter.any")}</SelectItem>
              {RISK_LEVEL_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {riskLabel(r)}
                </SelectItem>
              ))}
              <SelectItem value="none">{t("filter.riskNone")}</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label={t("filter.registration")}>
          <Select
            value={filters.registration ?? ANY}
            onValueChange={(v) =>
              onSetFilter("registration", v === ANY ? undefined : (v as SystemViewFilters["registration"]))
            }
          >
            <SelectTrigger className="w-[9rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("filter.any")}</SelectItem>
              {REGISTRATION_FILTER_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`filter.registration_${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label={t("filter.assessment")}>
          <Select
            value={filters.assessment ?? ANY}
            onValueChange={(v) =>
              onSetFilter("assessment", v === ANY ? undefined : (v as SystemViewFilters["assessment"]))
            }
          >
            <SelectTrigger className="w-[9rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("filter.any")}</SelectItem>
              {ASSESSMENT_FILTER_OPTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {t(`filter.assessment_${a}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        {anyActive && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
            <X className="mr-1 h-4 w-4" />
            {t("filter.clear", { count: activeCount })}
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function OwnerFilter({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  const [local, setLocal] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const debounced = useDebounce(local);
  // Keep the input in step when the URL changes from outside (a saved view, or
  // "clear"). Adjusted during render rather than in an effect, so no extra
  // render pass is scheduled.
  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(value);
  }
  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <FilterField label={label}>
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-[10rem]"
      />
    </FilterField>
  );
}

/**
 * The saved views a person keeps for this organization, as chips. Clicking a
 * chip applies its filter set; the current filters can be saved under a name.
 */
function SavedViews({
  organizationId,
  filters,
  onApplyAll,
}: {
  organizationId: string;
  filters: SystemViewFilters;
  onApplyAll: (next: SystemViewFilters) => void;
}) {
  const t = useTranslations("views");
  const utils = trpc.useUtils();
  const { data: views } = trpc.savedView.list.useQuery({ organizationId });
  const create = trpc.savedView.create.useMutation({
    onSuccess: () => {
      void utils.savedView.list.invalidate({ organizationId });
      toast.success(t("saved.created"));
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.savedView.remove.useMutation({
    onSuccess: () => void utils.savedView.list.invalidate({ organizationId }),
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const canSave = !isEmptyFilterSet(filters) || filters.sort != null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Bookmark className="h-3.5 w-3.5" />
        {t("saved.label")}
      </span>
      {(views ?? []).map((v) => (
        <span
          key={v.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card pl-3 pr-1 py-0.5 text-xs"
        >
          <button
            type="button"
            className="max-w-[10rem] truncate outline-none hover:text-primary focus-visible:text-primary"
            onClick={() => onApplyAll(v.filters as SystemViewFilters)}
          >
            {v.name}
          </button>
          <button
            type="button"
            aria-label={t("saved.remove", { name: v.name })}
            className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
            onClick={() => remove.mutate({ organizationId, id: v.id })}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        disabled={!canSave}
        onClick={() => {
          setName("");
          setDialogOpen(true);
        }}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {t("saved.save")}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saved.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="saved-view-name">{t("saved.nameLabel")}</Label>
            <Input
              id="saved-view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("saved.namePlaceholder")}
              maxLength={80}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("saved.cancel")}
            </Button>
            <Button
              disabled={!name.trim() || create.isPending}
              onClick={() =>
                create.mutate(
                  { organizationId, name: name.trim(), filters },
                  { onSuccess: () => setDialogOpen(false) },
                )
              }
            >
              {t("saved.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
