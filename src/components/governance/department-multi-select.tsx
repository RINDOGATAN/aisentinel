"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Pick the departments a person works in. Nothing chosen means the whole
 * organization, which is the first entry; departments follow in hierarchy
 * order, children indented under their parent.
 */

import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { departmentNames, departmentTree, type TreeDepartment } from "@/lib/department-tree";

export function DepartmentMultiSelect({
  departments,
  value,
  onChange,
  disabled,
  ariaLabel,
  className,
  testId,
}: {
  departments: readonly TreeDepartment[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  testId?: string;
}) {
  const t = useTranslations("departments.access");
  const names = departmentNames(departments, value);
  const summary =
    names.length === 0 ? t("wholeOrg") : names.length <= 2 ? names.join(", ") : t("selected", { count: names.length });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={testId}
        className={cn(
          "border-input bg-input/30 hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[14rem] max-h-80 overflow-y-auto">
        <DropdownMenuCheckboxItem
          checked={value.length === 0}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onChange([])}
        >
          {t("wholeOrg")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {departmentTree(departments).map(({ department, depth }) => {
          const checked = value.includes(department.id);
          return (
            <DropdownMenuCheckboxItem
              key={department.id}
              checked={checked}
              className={depth === 1 ? "pl-12" : undefined}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(next) =>
                onChange(next ? [...value, department.id] : value.filter((id) => id !== department.id))
              }
            >
              {department.name}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
