"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The proceedings register.
 *
 * Every inquiry, enforcement action and claim in one place, with the next
 * deadline against each and a plain warning where a proceeding has no recorded
 * factual position. One incident becomes several proceedings; keeping one
 * factual position across all of them is the whole discipline.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, Gavel, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useNow } from "@/lib/use-now";

const TYPES = [
  "INQUIRY",
  "INVESTIGATION",
  "ENFORCEMENT",
  "CONSENT_ORDER",
  "MARKET_SURVEILLANCE",
  "CIVIL_LITIGATION",
  "CLASS_ACTION",
  "REPRESENTATIVE_ACTION",
  "SECURITIES_CLAIM",
  "DERIVATIVE_CLAIM",
  "OTHER",
] as const;

const STATUS_STYLE: Record<string, string> = {
  MONITORING: "text-muted-foreground",
  OPEN: "border-warning/50 text-warning",
  RESPONDING: "border-warning/50 text-warning",
  DECIDED: "border-destructive/50 text-destructive",
  APPEALED: "border-destructive/50 text-destructive",
  CLOSED: "text-muted-foreground",
};

export default function ProceedingsPage() {
  const t = useTranslations("proceedings");
  const router = useRouter();
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";

  const [title, setTitle] = useState("");
  const [authority, setAuthority] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("INQUIRY");

  const { data: rows, isLoading, refetch } = trpc.proceedings.list.useQuery(
    { organizationId: orgId, includeClosed: true },
    { enabled: !!orgId },
  );

  const { data: deadlines } = trpc.proceedings.upcomingDeadlines.useQuery(
    { organizationId: orgId, limit: 5 },
    { enabled: !!orgId },
  );

  const create = trpc.proceedings.create.useMutation({
    onSuccess: (row) => {
      setTitle("");
      setAuthority("");
      void refetch();
      router.push(`/governance/proceedings/${row.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  // Read after mount: a clock read during render makes the component impure.
  const nowDate = useNow();
  const now = nowDate?.getTime() ?? null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Gavel className="w-6 h-6 text-primary" />
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("subtitle")}</p>
      </div>

      {deadlines && deadlines.length > 0 && (
        <Card className="border-warning/40">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">{t("deadlinesTitle")}</p>
            {deadlines.map((d) => {
              const overdue =
                now !== null && d.dueAt ? new Date(d.dueAt).getTime() < now : false;
              return (
                <p key={d.id} className="text-xs">
                  <span className={overdue ? "text-destructive" : "text-muted-foreground"}>
                    {d.dueAt ? new Date(d.dueAt).toLocaleDateString() : "—"}
                  </span>{" "}
                  · {d.title} · {d.proceeding.authority}
                </p>
              );
            })}
          </CardContent>
        </Card>
      )}

      {canWrite && (
        <Card>
          <CardContent className="p-4 grid gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="p-title">
                {t("titleLabel")}
              </Label>
              <Input
                id="p-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="p-authority">
                {t("authorityLabel")}
              </Label>
              <Input
                id="p-authority"
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                placeholder={t("authorityPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("typeLabel")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as (typeof TYPES)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {t(`type.${x}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!title.trim() || !authority.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  organizationId: orgId,
                  title: title.trim(),
                  authority: authority.trim(),
                  type,
                })
              }
            >
              {create.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              {t("add")}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : !rows || rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("empty")}</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link key={r.id} href={`/governance/proceedings/${r.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[r.status]}`}>
                      {t(`status.${r.status}`)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {t(`type.${r.type}`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.authority}
                    {r.jurisdiction ? ` · ${r.jurisdiction}` : ""}
                    {r.reference ? ` · ${r.reference}` : ""}
                    {r.incident ? ` · ${r.incident.title}` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    {r.nextDeadline?.dueAt && (
                      <span
                        className={
                          now !== null && new Date(r.nextDeadline.dueAt).getTime() < now
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {t("nextDeadline", {
                          date: new Date(r.nextDeadline.dueAt).toLocaleDateString(),
                          what: r.nextDeadline.title,
                        })}
                      </span>
                    )}
                    {!r.hasPosition && (
                      <span className="text-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {t("noPosition")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
