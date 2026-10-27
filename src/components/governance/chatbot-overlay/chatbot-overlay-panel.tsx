"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The customer-facing chatbot rules for one system: the four questions, the
 * eight controls with the laws for the declared places (in force or
 * upcoming), what to keep as evidence, the watch list and the features that
 * need review by counsel. Rendered only while the overlay is switched on.
 */

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Loader2, MessageSquare, Scale, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { STATUS_CHIP, StatusNote } from "@/components/ui/status-note";
import { trpc } from "@/lib/trpc";
import { refreshAfterScopeChange } from "@/lib/scope-refresh";
import { useFormatDate } from "@/lib/use-format-date";
import {
  COUNSEL_FLAG,
  COUNSEL_ITEMS,
  EMPTY_CHATBOT_FACTS,
  type ChatbotAnswer,
  type ChatbotFacts,
  type ChatbotQuestion,
} from "@/config/chatbot-overlay";
import { ChatbotQuestions } from "./chatbot-questions";

export function ChatbotOverlayPanel({
  organizationId,
  aiSystemId,
  canDecide,
  canWrite,
  onOpenEvidence,
}: {
  organizationId: string;
  aiSystemId: string;
  /** Owners, admins and AI officers answer the questions. */
  canDecide: boolean;
  canWrite: boolean;
  onOpenEvidence?: () => void;
}) {
  const t = useTranslations("chatbotOverlay");
  const tj = useTranslations("jurisdictions");
  const tc = useTranslations("common");
  const lang = useLocale() === "es" ? "es" : "en";
  const { formatDate, formatDateTime } = useFormatDate();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.chatbotOverlay.getForSystem.useQuery({ organizationId, aiSystemId });
  const [edits, setEdits] = useState<Partial<ChatbotFacts>>({});
  const [counselEdits, setCounselEdits] = useState<string[] | null>(null);

  const saveFacts = trpc.chatbotOverlay.setFacts.useMutation({
    onSuccess: () => {
      setEdits({});
      toast.success(t("saved"));
      refreshAfterScopeChange(utils);
    },
    onError: (err) => toast.error(err.message),
  });
  const saveCounsel = trpc.chatbotOverlay.setCounsel.useMutation({
    onSuccess: () => {
      setCounselEdits(null);
      toast.success(t("counsel.saved"));
      void utils.chatbotOverlay.getForSystem.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data.enabled) return null;

  const facts: ChatbotFacts = { ...EMPTY_CHATBOT_FACTS, ...data.facts, ...edits };
  const dirty = Object.keys(edits).length > 0;
  const counselSelected = counselEdits ?? data.counsel.items;
  const counselDirty = counselEdits !== null;
  const showControls = data.state !== "DOES_NOT_APPLY";
  const inForce = data.controls.reduce((n, c) => n + c.inForce, 0);
  const upcoming = data.controls.reduce((n, c) => n + c.upcoming, 0);

  const placeLabel = (id: string) => tj(`option.${id}`);
  // An ISO date is a calendar day: read it as local midnight, so a day never
  // shifts back by one in a timezone west of UTC.
  const day = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const timingLabel = (timing: "IN_FORCE" | "UPCOMING", appliesFrom: string | null) => {
    if (!appliesFrom) return t("timing.inForce");
    return timing === "IN_FORCE"
      ? t("timing.inForceSince", { date: formatDate(day(appliesFrom)) })
      : t("timing.upcoming", { date: formatDate(day(appliesFrom)) });
  };

  return (
    <div className="space-y-6">
      {/* ── The four questions ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("intro")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChatbotQuestions
            value={facts}
            disabled={!canDecide || saveFacts.isPending}
            onChange={(q: ChatbotQuestion, a: ChatbotAnswer) => setEdits((prev) => ({ ...prev, [q]: a }))}
          />
          {!canDecide && <p className="text-xs text-muted-foreground">{t("whoAnswers")}</p>}
          {canDecide && (
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!dirty || saveFacts.isPending}
                onClick={() => saveFacts.mutate({ organizationId, aiSystemId, ...facts })}
              >
                {saveFacts.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                {tc("save")}
              </Button>
            </div>
          )}

          {data.state === "APPLIES" && (
            <StatusNote status="note">{t("state.applies", { inForce, upcoming })}</StatusNote>
          )}
          {data.state === "UNDETERMINED" && <StatusNote status="warning">{t("state.undetermined")}</StatusNote>}
          {data.state === "DOES_NOT_APPLY" && (
            <p className="text-sm text-muted-foreground">{t("state.doesNotApply")}</p>
          )}
          {!data.placesDeclared && showControls && (
            <StatusNote status="warning">
              {t("declarePlaces")}{" "}
              <Link href="/governance/settings" className="underline hover:no-underline">
                {t("declarePlacesLink")}
              </Link>
            </StatusNote>
          )}
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            {!data.signedOff && (
              <Badge className={`${STATUS_CHIP.warning} text-[11px]`}>{t("signoffPending")}</Badge>
            )}
            <span>{data.reviewMarker[lang]}</span>
          </p>
        </CardContent>
      </Card>

      {/* ── The eight controls ─────────────────────────────────────── */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              {t("controlsTitle")}
            </CardTitle>
            <CardDescription>
              {data.places.length > 0
                ? t("controlsIntro", { places: data.places.map(placeLabel).join(", ") })
                : t("controlsIntroNoPlaces")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.controls.map((c) => (
              <section key={c.id} className="rounded-md border border-border p-4 space-y-3" aria-labelledby={`cb-${c.id}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 id={`cb-${c.id}`} className="text-sm font-semibold">
                    {c.number}. {c.title[lang]}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {!data.signedOff && <Badge className={STATUS_CHIP.warning}>{t("signoffPending")}</Badge>}
                    {c.status && <Badge variant="outline">{t(`status.${c.status}`)}</Badge>}
                    <Badge variant="outline">{t("counts", { inForce: c.inForce, upcoming: c.upcoming })}</Badge>
                  </div>
                </div>
                <p className="text-sm">{c.duty[lang]}</p>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("keeps")}</p>
                  <ul className="mt-1 list-disc pl-5 text-xs space-y-0.5">
                    {c.keeps.map((k) => (
                      <li key={k.en}>{k[lang]}</li>
                    ))}
                  </ul>
                  {c.requirementId && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("evidenceCount", { count: c.evidenceCount })}
                    </p>
                  )}
                </div>
                {c.laws.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("noLawsForPlaces")}</p>
                ) : (
                  <ul className="space-y-2">
                    {c.laws.map((l) => (
                      <li key={`${l.lawId}-${l.citation}`} className="rounded border border-border/60 p-2.5 space-y-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-xs font-medium">
                            {l.name[lang]} <code className="text-[11px] text-muted-foreground">{l.citation}</code>
                          </p>
                          <Badge
                            className={`text-[11px] ${l.timing === "UPCOMING" ? STATUS_CHIP.note : STATUS_CHIP.good}`}
                          >
                            {timingLabel(l.timing, l.appliesFrom)}
                          </Badge>
                        </div>
                        <p className="text-xs">{l.adds[lang]}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t("place")}: {l.places.map(placeLabel).join(", ")} · {t("reaches")}: {l.reaches[lang]}
                        </p>
                        <a
                          href={l.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary underline hover:no-underline"
                        >
                          {t("source")}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            {data.state === "APPLIES" && onOpenEvidence && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={onOpenEvidence}>
                  {t("openEvidence")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Watch list ─────────────────────────────────────────────── */}
      {showControls && data.watchList.length > 0 && (
        <StatusNote status="note">
          <span className="font-medium">{t("watchListTitle")}</span>{" "}
          {data.watchList.map((w) => w.text[lang]).join(" ")}
        </StatusNote>
      )}

      {/* ── Needs review by counsel ────────────────────────────────── */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              {t("counsel.title")}
            </CardTitle>
            <CardDescription>{t("counsel.intro")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {COUNSEL_ITEMS.map((item) => {
              const checked = counselSelected.includes(item.id);
              return (
                <div key={item.id} className="space-y-1">
                  <label className={`flex items-start gap-2 text-sm ${canWrite ? "cursor-pointer" : ""}`}>
                    <Checkbox
                      checked={checked}
                      disabled={!canWrite || saveCounsel.isPending}
                      onCheckedChange={(v) =>
                        setCounselEdits(
                          v
                            ? [...counselSelected.filter((x) => x !== item.id), item.id]
                            : counselSelected.filter((x) => x !== item.id),
                        )
                      }
                    />
                    <span>{item.label[lang]}</span>
                  </label>
                  {checked && (
                    <p className="ml-6 text-xs flex flex-wrap items-center gap-2">
                      <Badge className={`${STATUS_CHIP.warning} text-[11px]`}>{COUNSEL_FLAG[lang]}</Badge>
                      <span className="text-muted-foreground">{item.why[lang]}</span>
                    </p>
                  )}
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {data.counsel.seenAt ? t("counsel.seenAt", { date: formatDateTime(data.counsel.seenAt) }) : t("counsel.notSeen")}
              </p>
              {canWrite && (
                <Button
                  size="sm"
                  disabled={!counselDirty || saveCounsel.isPending}
                  onClick={() => saveCounsel.mutate({ organizationId, aiSystemId, items: counselSelected })}
                >
                  {saveCounsel.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  {t("counsel.save")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
