"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One threat model: the board.
 *
 * Four pictures at the top answer what the system can reach, which scenarios
 * matter, where the controls sit and how much has been tested. Below, the
 * scenarios in priority order, each with its controls and the tests recorded
 * against them, and a list of what the library would still propose.
 *
 * Recording a test takes two fields and a result. That is deliberate: a test
 * nobody records is a test nobody did.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
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
import {
  CONTROL_LAYER_LABELS,
  controlState,
  type ControlLayer,
} from "@/config/threat-model";
import {
  CapabilityMap,
  ControlCoverage,
  EvidenceRing,
  PriorityMatrix,
} from "@/components/governance/threat-model-visuals";

const PRIORITY_STYLE: Record<string, string> = {
  ACT_NOW: "border-destructive/50 text-destructive",
  PLAN: "border-warning/50 text-warning",
  WATCH: "text-muted-foreground",
};

const STATE_STYLE: Record<string, string> = {
  proven: "border-success/50 text-success",
  failing: "border-destructive/50 text-destructive",
  stale: "border-warning/50 text-warning",
  untested: "text-muted-foreground",
};

export default function ThreatModelDetailPage() {
  const t = useTranslations("threatModel");
  const locale = useLocale();
  const lang = locale === "es" ? "es" : "en";
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";
  const utils = trpc.useUtils();
  const now = useNow();

  const [testFor, setTestFor] = useState<string | null>(null);
  const [method, setMethod] = useState("");
  const [result, setResult] = useState<"PASS" | "PARTIAL" | "FAIL">("PASS");
  const [notes, setNotes] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = trpc.threatModel.getById.useQuery(
    { organizationId: orgId, id },
    { enabled: !!orgId && !!id },
  );

  const invalidate = () => {
    void utils.threatModel.getById.invalidate({ organizationId: orgId, id });
    void utils.threatModel.list.invalidate();
  };

  const recordTest = trpc.threatModel.recordTest.useMutation({
    onSuccess: () => {
      toast.success(t("testRecorded"));
      setTestFor(null);
      setMethod("");
      setNotes("");
      setEvidenceRef("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateScenario = trpc.threatModel.updateScenario.useMutation({
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const updateControl = trpc.threatModel.updateControl.useMutation({
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const markReviewed = trpc.threatModel.update.useMutation({
    onSuccess: () => {
      toast.success(t("reviewedSaved"));
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.threatModel.delete.useMutation({
    onSuccess: () => {
      toast.success(t("deleted"));
      router.push("/governance/threat-model");
    },
    onError: (e) => toast.error(e.message),
  });

  const addFromLibrary = trpc.threatModel.addFromLibrary.useMutation({
    onSuccess: (r) => {
      toast.success(t("added", { count: r.added }));
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const controls = data.scenarios.flatMap((s) => s.controls);
    const clock = now ?? new Date(0);
    const byLayer: Record<string, { total: number; proven: number }> = {};
    let proven = 0;
    for (const c of controls) {
      const last = c.tests[0];
      const state = now
        ? controlState(last?.result ?? null, last?.testedAt ?? null, clock)
        : "untested";
      byLayer[c.layer] = byLayer[c.layer] ?? { total: 0, proven: 0 };
      byLayer[c.layer].total += 1;
      if (state === "proven") {
        byLayer[c.layer].proven += 1;
        proven += 1;
      }
    }
    return { controls, byLayer, proven, total: controls.length };
  }, [data, now]);

  if (isLoading || !data || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const actNow = data.scenarios.filter((s) => s.priority === "ACT_NOW" && s.status === "OPEN");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/governance/threat-model">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">{data.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {data.aiSystem ? data.aiSystem.name : t("noSystemLinked")}
            {data.reviewedAt
              ? ` · ${t("reviewedOn", { date: new Date(data.reviewedAt).toLocaleDateString() })}`
              : ""}
          </p>
          {data.systemSummary && <p className="text-sm mt-2">{data.systemSummary}</p>}
        </div>
      </div>

      {/* ── The four pictures */}
      <Card>
        <CardContent className="p-4">
          <CapabilityMap capabilities={data.capabilities} lang={lang} title={data.name} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("matrixTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <PriorityMatrix
              points={data.scenarios.map((s) => ({
                id: s.id,
                title: s.title,
                impact: s.impact,
                likelihood: s.likelihood,
                blastRadius: s.blastRadius,
                status: s.status,
              }))}
              labels={{
                impact: t("impact"),
                likelihood: t("likelihood"),
                low: t("level.LOW"),
                high: t("level.HIGH"),
                severe: t("blast.SEVERE"),
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <EvidenceRing
                proven={stats.proven}
                total={stats.total}
                label={t("evidenceTitle")}
                caption={t("evidenceCaption")}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("coverageTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ControlCoverage byLayer={stats.byLayer} lang={lang} emptyLabel={t("none")} />
              <p className="text-[11px] text-muted-foreground mt-3">{t("coverageHint")}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {actNow.length > 0 && (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">
              {t("actNowHeadline", { count: actNow.length })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("actNowHint")}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Scenarios */}
      <div className="space-y-3">
        {data.scenarios.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLE[s.priority]}`}>
                  {t(`priority.${s.priority}`)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {t(`category.${s.category}`)}
                </Badge>
                <span className="text-sm font-medium">{s.title}</span>
                {canWrite && (
                  <Select
                    value={s.status}
                    onValueChange={(v) =>
                      updateScenario.mutate({
                        organizationId: orgId,
                        id: s.id,
                        status: v as "OPEN" | "MITIGATED" | "ACCEPTED" | "OUT_OF_SCOPE",
                      })
                    }
                  >
                    <SelectTrigger className="h-7 w-auto ml-auto text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["OPEN", "MITIGATED", "ACCEPTED", "OUT_OF_SCOPE"] as const).map((x) => (
                        <SelectItem key={x} value={x}>
                          {t(`status.${x}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}

              <div className="space-y-2">
                {s.controls.map((c) => {
                  const last = c.tests[0];
                  const state = now
                    ? controlState(last?.result ?? null, last?.testedAt ?? null, now)
                    : "untested";
                  return (
                    <div key={c.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {CONTROL_LAYER_LABELS[c.layer.toLowerCase() as ControlLayer][lang]}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${STATE_STYLE[state]}`}>
                          {t(`controlState.${state}`)}
                        </Badge>
                        {canWrite && (
                          <button
                            type="button"
                            className="text-[11px] text-muted-foreground hover:text-primary ml-auto"
                            onClick={() =>
                              updateControl.mutate({
                                organizationId: orgId,
                                id: c.id,
                                implemented: !c.implemented,
                              })
                            }
                          >
                            {c.implemented ? (
                              <span className="flex items-center gap-1 text-success">
                                <Check className="w-3 h-3" />
                                {t("implemented")}
                              </span>
                            ) : (
                              t("markImplemented")
                            )}
                          </button>
                        )}
                      </div>

                      <p className="text-xs">{c.description}</p>

                      {c.howToTest && (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium">{t("howToTest")}: </span>
                          {c.howToTest}
                        </p>
                      )}

                      {c.tests.length > 0 && (
                        <div className="space-y-1">
                          {c.tests.slice(0, 3).map((test) => (
                            <p key={test.id} className="text-[11px] text-muted-foreground">
                              {new Date(test.testedAt).toLocaleDateString()} ·{" "}
                              <span
                                className={
                                  test.result === "PASS"
                                    ? "text-success"
                                    : test.result === "FAIL"
                                      ? "text-destructive"
                                      : "text-warning"
                                }
                              >
                                {t(`result.${test.result}`)}
                              </span>{" "}
                              · {test.method.slice(0, 90)}
                              {test.evidenceRef ? ` · ${test.evidenceRef}` : ""}
                            </p>
                          ))}
                        </div>
                      )}

                      {canWrite &&
                        (testFor === c.id ? (
                          <div className="space-y-2 pt-1">
                            <Textarea
                              rows={2}
                              placeholder={t("methodPlaceholder")}
                              value={method}
                              onChange={(e) => setMethod(e.target.value)}
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs">{t("resultLabel")}</Label>
                                <Select
                                  value={result}
                                  onValueChange={(v) =>
                                    setResult(v as "PASS" | "PARTIAL" | "FAIL")
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(["PASS", "PARTIAL", "FAIL"] as const).map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {t(`result.${r}`)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">{t("evidenceLabel")}</Label>
                                <Input
                                  value={evidenceRef}
                                  onChange={(e) => setEvidenceRef(e.target.value)}
                                  placeholder={t("evidencePlaceholder")}
                                />
                              </div>
                            </div>
                            <Textarea
                              rows={2}
                              placeholder={t("notesPlaceholder")}
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={!method.trim() || recordTest.isPending}
                                onClick={() =>
                                  recordTest.mutate({
                                    organizationId: orgId,
                                    controlId: c.id,
                                    method: method.trim(),
                                    result,
                                    notes: notes || undefined,
                                    evidenceRef: evidenceRef || undefined,
                                  })
                                }
                              >
                                {recordTest.isPending && (
                                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                )}
                                {t("saveTest")}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setTestFor(null)}>
                                {t("cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setTestFor(c.id);
                              setMethod(c.howToTest ?? "");
                            }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                            {t("recordTest")}
                          </Button>
                        ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── What has not been considered */}
      {data.proposed.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("notConsideredTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("notConsideredHint")}</p>
            {data.proposed.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2">
                <span className="text-sm">{s.title[lang]}</span>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      addFromLibrary.mutate({
                        organizationId: orgId,
                        threatModelId: id,
                        libraryIds: [s.id],
                      })
                    }
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {t("add")}
                  </Button>
                )}
              </div>
            ))}
            {canWrite && data.proposed.length > 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  addFromLibrary.mutate({
                    organizationId: orgId,
                    threatModelId: id,
                    libraryIds: data.proposed.map((s) => s.id),
                  })
                }
              >
                {t("addAll", { count: data.proposed.length })}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={`/api/export/threat-model?organizationId=${orgId}&id=${id}&locale=${lang}`}>
            {t("download")}
          </a>
        </Button>
        {canWrite && (
          <Button
            variant="ghost"
            disabled={markReviewed.isPending}
            onClick={() => markReviewed.mutate({ organizationId: orgId, id, markReviewed: true })}
          >
            {markReviewed.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {t("markReviewed")}
          </Button>
        )}
        {canWrite && (
          <Button
            variant={confirmDelete ? "destructive" : "ghost"}
            disabled={remove.isPending}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              remove.mutate({ organizationId: orgId, id });
            }}
          >
            {remove.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1.5" />
            )}
            {confirmDelete ? t("deleteConfirm") : t("delete")}
          </Button>
        )}
      </div>
    </div>
  );
}
