"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Program history: the immutable snapshots of the program (captured on every
 * program PDF export, by the wizard, or by hand) and what changed between
 * each and the one before it. A figure shared with a board can always be
 * traced to the snapshot it came from and to the rule-pack versions behind it.
 */

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Camera, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

function signed(n: number | null): string {
  if (n === null) return "";
  return n > 0 ? `+${n}` : `${n}`;
}

export default function ProgramHistoryPage() {
  const t = useTranslations("snapshots");
  const tp = useTranslations("program.page");
  const locale = useLocale() === "es" ? "es" : "en";
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";
  const utils = trpc.useUtils();
  const [label, setLabel] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: snapshots, isLoading } = trpc.program.listSnapshots.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );
  const { data: diff, isLoading: diffLoading } = trpc.program.getSnapshotDiff.useQuery(
    { organizationId: orgId, id: openId ?? "" },
    { enabled: !!orgId && !!openId },
  );

  const capture = trpc.program.captureSnapshot.useMutation({
    onSuccess: async () => {
      toast.success(t("captured"));
      setLabel("");
      await utils.program.listSnapshots.invalidate();
    },
    onError: () => toast.error(t("captureFailed")),
  });

  const fmt = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "es" ? "es-ES" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-3">
        <Link href="/governance/program">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {canWrite && (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <Input
              value={label}
              maxLength={120}
              placeholder={t("capturePlaceholder")}
              aria-label={t("captureLabel")}
              onChange={(e) => setLabel(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button
              disabled={capture.isPending}
              onClick={() =>
                capture.mutate({ organizationId: orgId, locale, label: label.trim() || undefined })
              }
            >
              {capture.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              {t("capture")}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !snapshots || snapshots.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t("empty")}</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {snapshots.map((s) => (
            <Card key={s.id} className={openId === s.id ? "border-primary/50" : ""}>
              <CardContent className="p-3">
                <button
                  type="button"
                  className="w-full text-left flex flex-wrap items-center gap-x-4 gap-y-1"
                  onClick={() => setOpenId(openId === s.id ? null : s.id)}
                >
                  <span className="text-sm font-medium">{fmt(s.createdAt)}</span>
                  <span className="text-sm">{s.label ?? t(`reason.${s.reason}`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("columnOverall")}: {s.overall} · {t("columnSystems")}: {s.systemCount}
                    {s.confirmedPct !== null && ` · ${t("columnConfirmed")}: ${s.confirmedPct}%`}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono ml-auto">
                    {s.payloadHash.slice(0, 10)}
                  </span>
                </button>

                {openId === s.id && (
                  <div className="mt-3 border-t border-border pt-3 text-sm space-y-2">
                    <p className="font-medium">{t("diffTitle")}</p>
                    {diffLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : !diff?.diff || !diff.previous ? (
                      <p className="text-muted-foreground">{t("diffNoPrevious")}</p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">
                          {t("diffAgainst", { date: fmt(diff.previous.createdAt) })}
                        </p>
                        <p>
                          {t("diffOverall")}: {diff.diff.overall.from} → {diff.diff.overall.to}{" "}
                          <span className="text-muted-foreground">({signed(diff.diff.overall.delta)})</span>
                        </p>
                        <p>
                          {t("diffAssurance")}:{" "}
                          {diff.diff.assurance.delta === null
                            ? t("diffAssuranceUnknown")
                            : `${diff.diff.assurance.from}% → ${diff.diff.assurance.to}% (${signed(diff.diff.assurance.delta)})`}
                        </p>
                        {diff.diff.systemsAdded.length > 0 && (
                          <p>
                            {t("diffSystemsAdded")}: {diff.diff.systemsAdded.map((x) => x.name).join(", ")}
                          </p>
                        )}
                        {diff.diff.systemsRemoved.length > 0 && (
                          <p>
                            {t("diffSystemsRemoved")}: {diff.diff.systemsRemoved.map((x) => x.name).join(", ")}
                          </p>
                        )}
                        {diff.diff.gapsClosed.length > 0 && (
                          <p>{t("diffGapsClosed")}: {diff.diff.gapsClosed.length}</p>
                        )}
                        {diff.diff.gapsOpened.length > 0 && (
                          <p>{t("diffGapsOpened")}: {diff.diff.gapsOpened.length}</p>
                        )}
                        {diff.diff.rulePackChanges.length > 0 && (
                          <div>
                            <p>{t("diffRulePacks")}</p>
                            <p className="text-xs text-muted-foreground">{t("diffRulePacksHint")}</p>
                            <ul className="text-xs text-muted-foreground list-disc pl-5">
                              {diff.diff.rulePackChanges.map((c) => (
                                <li key={c.pack}>
                                  {c.pack}: {c.from ?? "—"} → {c.to ?? "—"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{tp("historyFootnote")}</p>
    </div>
  );
}
