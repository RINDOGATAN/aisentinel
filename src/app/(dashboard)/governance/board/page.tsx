"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Board reporting.
 *
 * What was reported, when, to whom, and what came back. Each record freezes a
 * program snapshot at the moment of reporting, so the figures the board saw can
 * be reproduced rather than recalculated from a database that has moved on.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Landmark, Loader2, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

const AUDIENCES = [
  "BOARD",
  "AUDIT_COMMITTEE",
  "RISK_COMMITTEE",
  "EXECUTIVE",
  "REGULATOR",
  "OTHER",
] as const;

export default function BoardReportingPage() {
  const t = useTranslations("boardReports");
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("BOARD");
  const [reportedAt, setReportedAt] = useState("");
  const [presenter, setPresenter] = useState("");
  const [summary, setSummary] = useState("");
  const [requested, setRequested] = useState("");
  const [taken, setTaken] = useState("");
  const [actions, setActions] = useState("");
  const [nextDue, setNextDue] = useState("");

  const { data, isLoading } = trpc.boardReports.list.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );

  const create = trpc.boardReports.create.useMutation({
    onSuccess: () => {
      toast.success(t("recorded"));
      setOpen(false);
      setTitle("");
      setPeriod("");
      setReportedAt("");
      setPresenter("");
      setSummary("");
      setRequested("");
      setTaken("");
      setActions("");
      setNextDue("");
      void utils.boardReports.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("subtitle")}</p>
        </div>
        {canWrite && !open && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t("record")}
          </Button>
        )}
      </div>

      {data && (
        <Card>
          <CardContent className="p-4 text-sm space-y-1">
            <p>
              {data.cadence.count === 0
                ? t("noneYet")
                : t("cadence", {
                    count: data.cadence.count,
                    last: data.cadence.lastReportedAt
                      ? new Date(data.cadence.lastReportedAt).toLocaleDateString()
                      : "—",
                  })}
            </p>
            {data.cadence.nextDue && (
              <p className="text-xs text-muted-foreground">
                {t("nextDue", { date: new Date(data.cadence.nextDue).toLocaleDateString() })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {open && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("titleLabel")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("periodLabel")}</Label>
                <Input
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder={t("periodPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("audienceLabel")}</Label>
                <Select
                  value={audience}
                  onValueChange={(v) => setAudience(v as (typeof AUDIENCES)[number])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {t(`audience.${a}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("reportedAtLabel")}</Label>
                <Input
                  type="date"
                  value={reportedAt}
                  onChange={(e) => setReportedAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("presenterLabel")}</Label>
                <Input value={presenter} onChange={(e) => setPresenter(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("nextDueLabel")}</Label>
                <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("summaryLabel")}</Label>
              <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("requestedLabel")}</Label>
                <Textarea
                  rows={2}
                  value={requested}
                  onChange={(e) => setRequested(e.target.value)}
                  placeholder={t("requestedPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("takenLabel")}</Label>
                <Textarea rows={2} value={taken} onChange={(e) => setTaken(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("actionsLabel")}</Label>
              <Textarea rows={2} value={actions} onChange={(e) => setActions(e.target.value)} />
            </div>

            <p className="text-[11px] text-muted-foreground">{t("snapshotNote")}</p>

            <div className="flex gap-2">
              <Button
                disabled={!title.trim() || !reportedAt || create.isPending}
                onClick={() =>
                  create.mutate({
                    organizationId: orgId,
                    title: title.trim(),
                    period: period || undefined,
                    audience,
                    reportedAt: new Date(reportedAt),
                    presenter: presenter || undefined,
                    summary: summary || undefined,
                    decisionsRequested: requested || undefined,
                    decisionsTaken: taken || undefined,
                    actionsAgreed: actions || undefined,
                    nextReportDue: nextDue ? new Date(nextDue) : undefined,
                  })
                }
              >
                {create.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {t("save")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-2">
          {(data?.reports ?? []).map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {t(`audience.${r.audience}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.reportedAt).toLocaleDateString()}
                    {r.period ? ` · ${r.period}` : ""}
                    {r.presenter ? ` · ${r.presenter}` : ""}
                  </span>
                </div>
                {r.summary && <p className="text-xs text-muted-foreground">{r.summary}</p>}
                {r.decisionsRequested && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">{t("requestedLabel")}: </span>
                    {r.decisionsRequested}
                  </p>
                )}
                {r.decisionsTaken ? (
                  <p className="text-xs">
                    <span className="text-muted-foreground">{t("takenLabel")}: </span>
                    {r.decisionsTaken}
                  </p>
                ) : (
                  r.decisionsRequested && (
                    <p className="text-xs text-warning">{t("noDecisionRecorded")}</p>
                  )
                )}
                {r.snapshot ? (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {t("snapshotLine", {
                      score: r.snapshot.overall,
                      hash: r.snapshot.payloadHash.slice(0, 12),
                    })}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{t("noSnapshot")}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
