"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "You see only: HR, IT". Shown to a member limited to departments, on every
 * page, because every view that lists AI systems (and everything hanging off
 * them) is narrowed for them by the server. Nothing for anyone else.
 */

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { departmentNames } from "@/lib/department-tree";
import { cn } from "@/lib/utils";

export function ScopeNotice({ className }: { className?: string }) {
  const t = useTranslations("views.scopeNotice");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const { data } = trpc.businessUnit.listForScope.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId, staleTime: 60_000 },
  );
  const mine = data?.myBusinessUnitIds;
  if (!data || !mine) return null;
  const names = departmentNames(data.departments, mine);

  return (
    <div
      role="note"
      data-testid="scope-notice"
      className={cn("mb-4 flex items-start gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2", className)}
    >
      <Building2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium break-words">{t("line", { departments: names.join(", ") })}</p>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
    </div>
  );
}
