"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// "Viewing": a switch at the top of the menu, shown only when the organization
// has departments and only to a person who sees the whole organization. The
// department chosen filters the AI systems list, Needs action and Incomplete
// (src/lib/use-view-department.ts). A member limited to departments is not
// offered it: the server already narrows everything they see, and the notice
// "You see only" says so.

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDepartmentScope } from "@/lib/use-department-scope";
import { departmentTree } from "@/lib/department-tree";

const ALL = "__all__";

export function DepartmentSwitch() {
  const t = useTranslations("views");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const { data } = trpc.businessUnit.listForScope.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );
  const { departmentId, setDepartmentId } = useDepartmentScope(orgId || undefined);

  // Limited members are narrowed by the server; the switch is not theirs.
  if (!data || data.myBusinessUnitIds) return null;
  const departments = departmentTree(data.departments);
  if (departments.length === 0) return null;

  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        {t("departmentSwitch.label")}
      </span>
      <Select value={departmentId ?? ALL} onValueChange={(v) => setDepartmentId(v === ALL ? null : v)}>
        <SelectTrigger className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("departmentSwitch.wholeOrg")}</SelectItem>
          {departments.map(({ department: d, depth }) => (
            <SelectItem key={d.id} value={d.id}>
              {depth === 1 ? `· ${d.name}` : d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
