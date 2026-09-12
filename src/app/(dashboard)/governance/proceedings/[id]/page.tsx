"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One proceeding: its status, the factual position taken, and its history.
 *
 * The position field is the point of the screen. Facts do not change between
 * forums; legal characterisation may. Writing the factual position down, in
 * each proceeding, is what makes an inconsistency visible to the defence team
 * before it is visible to anyone else.
 */

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useNow } from "@/lib/use-now";

const STATUSES = ["MONITORING", "OPEN", "RESPONDING", "DECIDED", "APPEALED", "CLOSED"] as const;
const EVENT_KINDS = [
  "RECEIVED",
  "SENT",
  "FILING",
  "DEADLINE",
  "DECISION",
  "MEETING",
  "NOTE",
] as const;

export default function ProceedingDetailPage() {
  const t = useTranslations("proceedings");
  const params = useParams();
  const id = params.id as string;
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.proceedings.getById.useQuery(
    { organizationId: orgId, id },
    { enabled: !!orgId && !!id },
  );

  const [position, setPosition] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);

  const [eventKind, setEventKind] = useState<(typeof EVENT_KINDS)[number]>("RECEIVED");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDetail, setEventDetail] = useState("");
  const [eventDue, setEventDue] = useState("");
  const [eventOccurred, setEventOccurred] = useState("");
  const [adding, setAdding] = useState(false);

  // Every hook above the early return; the clock is read after mount.
  const nowDate = useNow();
  const now = nowDate?.getTime() ?? null;

  const invalidate = () => {
    void utils.proceedings.getById.invalidate({ organizationId: orgId, id });
    void utils.proceedings.list.invalidate();
    void utils.proceedings.upcomingDeadlines.invalidate();
  };

  const update = trpc.proceedings.update.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addEvent = trpc.proceedings.addEvent.useMutation({
    onSuccess: () => {
      setEventTitle("");
      setEventDetail("");
      setEventDue("");
      setEventOccurred("");
      setAdding(false);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const completeEvent = trpc.proceedings.completeEvent.useMutation({
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/governance/proceedings">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">{data.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {data.authority}
            {data.jurisdiction ? ` · ${data.jurisdiction}` : ""}
            {data.reference ? ` · ${data.reference}` : ""}
            {data.externalCounsel ? ` · ${data.externalCounsel}` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("statusLabel")}</Label>
            <Select
              value={data.status}
              disabled={!canWrite}
              onValueChange={(v) =>
                update.mutate({
                  organizationId: orgId,
                  id,
                  status: v as (typeof STATUSES)[number],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="reference">
              {t("referenceLabel")}
            </Label>
            <Input
              id="reference"
              defaultValue={data.reference ?? ""}
              disabled={!canWrite}
              onBlur={(e) =>
                update.mutate({
                  organizationId: orgId,
                  id,
                  reference: e.target.value || null,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className={data.positionSummary ? undefined : "border-warning/50"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("positionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("positionHelp")}</p>
          <Textarea
            rows={4}
            disabled={!canWrite}
            value={position ?? data.positionSummary ?? ""}
            onChange={(e) => setPosition(e.target.value)}
            placeholder={t("positionPlaceholder")}
          />
          {canWrite && (
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  organizationId: orgId,
                  id,
                  positionSummary: position ?? data.positionSummary ?? "",
                })
              }
            >
              <Save className="w-4 h-4 mr-1.5" />
              {t("save")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("contextTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("summaryLabel")}</Label>
            <Textarea
              rows={3}
              disabled={!canWrite}
              value={summary ?? data.summary ?? ""}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={(e) =>
                update.mutate({ organizationId: orgId, id, summary: e.target.value || null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("originLabel")}</Label>
            <Textarea
              rows={2}
              disabled={!canWrite}
              value={origin ?? data.originNote ?? ""}
              onChange={(e) => setOrigin(e.target.value)}
              onBlur={(e) =>
                update.mutate({ organizationId: orgId, id, originNote: e.target.value || null })
              }
              placeholder={t("originPlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
            {canWrite && !adding && (
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                {t("addEvent")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.events.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
          )}

          {data.events.map((e) => {
            const overdue =
              now !== null && e.dueAt && !e.completedAt && new Date(e.dueAt).getTime() < now;
            return (
              <div key={e.id} className="border rounded-md p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t(`eventKind.${e.kind}`)}
                  </Badge>
                  <span className="text-sm">{e.title}</span>
                  {e.dueAt && (
                    <span
                      className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {t("due", { date: new Date(e.dueAt).toLocaleDateString() })}
                    </span>
                  )}
                  {e.occurredAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.occurredAt).toLocaleDateString()}
                    </span>
                  )}
                  {e.completedAt ? (
                    <Badge variant="outline" className="text-[10px] border-success/50 text-success">
                      {t("done")}
                    </Badge>
                  ) : (
                    e.dueAt &&
                    canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-7"
                        onClick={() => completeEvent.mutate({ organizationId: orgId, id: e.id })}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {t("markDone")}
                      </Button>
                    )
                  )}
                </div>
                {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                {e.reference && (
                  <p className="text-[11px] text-muted-foreground font-mono">{e.reference}</p>
                )}
              </div>
            );
          })}

          {adding && (
            <div className="border rounded-md p-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("eventKindLabel")}</Label>
                  <Select
                    value={eventKind}
                    onValueChange={(v) => setEventKind(v as (typeof EVENT_KINDS)[number])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`eventKind.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("eventTitleLabel")}</Label>
                  <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("occurredLabel")}</Label>
                  <Input
                    type="date"
                    value={eventOccurred}
                    onChange={(e) => setEventOccurred(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("dueLabel")}</Label>
                  <Input
                    type="date"
                    value={eventDue}
                    onChange={(e) => setEventDue(e.target.value)}
                  />
                </div>
              </div>
              <Textarea
                rows={2}
                value={eventDetail}
                onChange={(e) => setEventDetail(e.target.value)}
                placeholder={t("eventDetailPlaceholder")}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!eventTitle.trim() || addEvent.isPending}
                  onClick={() =>
                    addEvent.mutate({
                      organizationId: orgId,
                      proceedingId: id,
                      kind: eventKind,
                      title: eventTitle.trim(),
                      detail: eventDetail || undefined,
                      dueAt: eventDue ? new Date(eventDue) : undefined,
                      occurredAt: eventOccurred ? new Date(eventOccurred) : undefined,
                    })
                  }
                >
                  {addEvent.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  {t("save")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
