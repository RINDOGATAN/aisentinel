"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AIUC-1 testing for one AI agent.
 *
 * Readiness first (overall and per domain), then the six domains as sections,
 * each requirement with its state and its evidence. From a requirement a
 * person records a test (what was done, the result, what was observed, where
 * the evidence lives, who and when), accepts a partial result, or marks the
 * requirement not applicable with the reason. Tests are appended, never
 * edited. The rules are in src/config/aiuc1-evidence.ts.
 */

import { use, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bot, ExternalLink, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/governance/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useExportDownload } from "@/components/governance/use-export-download";
import { ReadinessBadge, StateBadge, TallyLine } from "@/components/governance/aiuc1-readiness";
import { ProgressBar } from "@/components/guided/progress-ring";
import { AIUC1_FRAMEWORK } from "@/config/aiuc1-requirements";
import { AIUC1_TEST_RESULTS, retestDue, type Aiuc1TestResult } from "@/config/aiuc1-evidence";

const DECISION_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

type DialogState =
  | { kind: "test"; code: string; title: string }
  | { kind: "accept"; code: string; title: string; testId: string }
  | { kind: "notApplicable"; code: string; title: string }
  | null;

/** Today in the browser's calendar, as the date input wants it. */
function todayValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AgentTestingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("agentTesting");
  const tc = useTranslations("common");
  const locale = useLocale();
  const lang = locale === "es" ? "es" : "en";
  const { organization, canWrite, userRole } = useOrganization();
  const orgId = organization?.id ?? "";
  const canDecide = !!userRole && DECISION_ROLES.includes(userRole);
  const utils = trpc.useUtils();
  const { download, isPending: downloadPending } = useExportDownload();

  const { data, isLoading } = trpc.aiuc1.agent.useQuery(
    { organizationId: orgId, aiSystemId: id },
    { enabled: !!orgId },
  );

  const [dialog, setDialog] = useState<DialogState>(null);
  const [method, setMethod] = useState("");
  const [result, setResult] = useState<Aiuc1TestResult>("PASS");
  const [observed, setObserved] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [testedOn, setTestedOn] = useState(todayValue);
  const [reason, setReason] = useState("");

  const open = (next: DialogState) => {
    setMethod("");
    setResult("PASS");
    setObserved("");
    setEvidenceRef("");
    setPerformedBy("");
    setTestedOn(todayValue());
    setReason("");
    setDialog(next);
  };

  const done = (message: string) => {
    toast.success(message);
    setDialog(null);
    void utils.aiuc1.agent.invalidate();
    void utils.aiuc1.agents.invalidate();
  };

  const recordTest = trpc.aiuc1.recordTest.useMutation({
    onSuccess: () => done(t("toast.recorded")),
    onError: (e) => toast.error(e.message),
  });
  const acceptPartial = trpc.aiuc1.acceptPartial.useMutation({
    onSuccess: () => done(t("toast.accepted")),
    onError: (e) => toast.error(e.message),
  });
  const setApplicability = trpc.aiuc1.setApplicability.useMutation({
    onSuccess: (_r, v) => done(v.applicable ? t("toast.applicableAgain") : t("toast.notApplicable")),
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label={t("loading")} />
      </div>
    );
  }

  const person = (userId: string) => data.people[userId] ?? t("formerMember");
  const day = (d: Date | string) => new Date(d).toLocaleDateString(locale);
  const pending = recordTest.isPending || acceptPartial.isPending || setApplicability.isPending;
  const minText = 10;

  const submit = () => {
    if (!dialog) return;
    if (dialog.kind === "test") {
      const [y, m, d] = testedOn.split("-").map(Number);
      recordTest.mutate({
        organizationId: orgId,
        aiSystemId: id,
        code: dialog.code,
        method,
        result,
        observed: observed.trim() || undefined,
        evidenceRef: evidenceRef.trim() || undefined,
        performedBy: performedBy.trim() || undefined,
        // Local midnight of the chosen day: never in the future.
        testedAt: y && m && d ? new Date(y, m - 1, d) : undefined,
      });
    } else if (dialog.kind === "accept") {
      acceptPartial.mutate({
        organizationId: orgId,
        aiSystemId: id,
        code: dialog.code,
        testId: dialog.testId,
        reason,
      });
    } else {
      setApplicability.mutate({
        organizationId: orgId,
        aiSystemId: id,
        code: dialog.code,
        applicable: false,
        reason,
      });
    }
  };

  const submitDisabled =
    pending ||
    (dialog?.kind === "test" ? method.trim().length < minText : reason.trim().length < minText);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <PageHeader
        back={{ href: "/governance/agent-testing", label: tc("back") }}
        icon={Bot}
        title={data.agent.name}
        description={
          <>
            {t("detailSubtitle")}{" "}
            <Link href={`/governance/ai-registry/${data.agent.id}`} className="text-primary hover:underline">
              {t("openSystem")}
            </Link>
          </>
        }
        meta={<ReadinessBadge ready={data.overall.readyForAudit} />}
        actions={
          <Button
            variant="outline"
            disabled={downloadPending() || !data.isAgent}
            onClick={() =>
              void download(
                `/api/export/aiuc1-evidence?organizationId=${orgId}&aiSystemId=${id}&locale=${lang}`,
              )
            }
          >
            {t("download")}
          </Button>
        }
      />

      {!data.isAgent && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{t("notAnAgent")}</CardContent>
        </Card>
      )}
      {!data.seeded && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{t("notSeeded")}</CardContent>
        </Card>
      )}

      {/* Readiness: overall, then one bar per domain. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("readinessTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <ProgressBar value={data.overall.ready} total={data.overall.applicable} />
            <p className="text-sm tabular-nums">
              {t("overallLine", { ready: data.overall.ready, total: data.overall.applicable })}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.overall.readyForAudit ? t("readyExplained") : t("readyRule")}
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.domains.map((d) => (
              <li key={d.code} className="space-y-1 text-sm">
                <a
                  href={`#domain-${d.code}`}
                  className="block rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <TallyLine code={d.code} tally={d} />
                </a>
                <ProgressBar value={d.ready} total={d.applicable} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* The six domains. */}
      {data.domains.map((d) => (
        <section key={d.code} id={`domain-${d.code}`} aria-labelledby={`domain-${d.code}-title`} className="scroll-mt-20">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle id={`domain-${d.code}-title`} className="text-base">
                {d.code}. {t(`domains.${d.code}`)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t(`domainAbout.${d.code}`)}</p>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {d.requirements.map((r) => {
                  const latest = r.latest;
                  const canAccept =
                    canDecide && latest?.result === "PARTIAL" && !r.acceptance && r.applicable;
                  return (
                    <li key={r.code} className="px-4 py-3 space-y-2">
                      <div className="flex flex-wrap items-start gap-2">
                        <span className="min-w-0 flex-1 break-words text-sm">
                          <span className="font-mono text-xs text-muted-foreground">{r.code}</span>{" "}
                          <span className="font-medium">{r.title}</span>
                        </span>
                        <StateBadge state={r.state} accepted={!!r.acceptance} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {r.application === "supplemental" && (
                          <Badge variant="outline" className="text-[10px]">{t("supplemental")}</Badge>
                        )}
                        <span>{t("capabilities", { list: r.capabilities.join(", ") })}</span>
                        <a
                          href={`${AIUC1_FRAMEWORK.sourceUrl}${r.path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-6 items-center gap-1 text-primary hover:underline"
                        >
                          {t("readStandard")}
                          <ExternalLink className="size-3" aria-hidden="true" />
                          <span className="sr-only">{t("newTab")}</span>
                        </a>
                      </div>

                      {lang === "en" && <p className="text-xs text-muted-foreground">{r.paraphrase}</p>}

                      {r.reasonMissing && <p className="text-xs">{t("reasonMissing")}</p>}
                      {r.notApplicableReason && (
                        <p className="text-xs">
                          <span className="font-medium">{t("notApplicableReason")}:</span> {r.notApplicableReason}
                        </p>
                      )}

                      {latest && (
                        <div className="rounded-md border border-border p-2 text-xs space-y-1">
                          <p className="font-medium">
                            {t("latestLine", {
                              result: t(`result.${latest.result}`),
                              date: day(latest.testedAt),
                              person: person(latest.recordedBy),
                            })}
                          </p>
                          {r.state === "pass" && (
                            <p className="text-muted-foreground">
                              {t("retestBy", { date: day(retestDue(new Date(latest.testedAt))) })}
                            </p>
                          )}
                          <p className="break-words">
                            <span className="text-muted-foreground">{t("field.method")}:</span> {latest.method}
                          </p>
                          {latest.observed && (
                            <p className="break-words">
                              <span className="text-muted-foreground">{t("field.observed")}:</span> {latest.observed}
                            </p>
                          )}
                          {latest.evidenceRef && (
                            <p className="break-all">
                              <span className="text-muted-foreground">{t("field.evidenceRef")}:</span>{" "}
                              {/^https?:\/\//i.test(latest.evidenceRef) ? (
                                <a href={latest.evidenceRef} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                  {latest.evidenceRef}
                                </a>
                              ) : (
                                latest.evidenceRef
                              )}
                            </p>
                          )}
                          {latest.performedBy && (
                            <p className="break-words">
                              <span className="text-muted-foreground">{t("field.performedBy")}:</span> {latest.performedBy}
                            </p>
                          )}
                          {r.acceptance && (
                            <p className="break-words">
                              {t("acceptedLine", {
                                person: person(r.acceptance.acceptedBy),
                                date: day(r.acceptance.acceptedAt),
                              })}{" "}
                              {r.acceptance.reason}
                            </p>
                          )}
                        </div>
                      )}

                      {(r.tests.length > 1 || r.otherEvidence.length > 0) && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary min-h-6">
                            {t("history", { count: r.tests.length - 1 + r.otherEvidence.length })}
                          </summary>
                          <ul className="mt-1 space-y-1 pl-4 list-disc">
                            {r.tests.slice(1).map((x) => (
                              <li key={x.id} className="break-words">
                                {day(x.testedAt)} · {t(`result.${x.result}`)} · {x.method}
                              </li>
                            ))}
                            {r.otherEvidence.map((e) => (
                              <li key={e.id} className="break-words">
                                {day(e.addedAt)} · {e.url ? (
                                  <a href={e.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    {e.title}
                                  </a>
                                ) : (
                                  e.title
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {data.isAgent && data.seeded && (canWrite || canDecide) && (
                        <div className="flex flex-wrap gap-2">
                          {canWrite && r.applicable && (
                            <Button size="sm" variant="outline" onClick={() => open({ kind: "test", code: r.code, title: r.title })}>
                              {t("recordTest")}
                            </Button>
                          )}
                          {canAccept && latest && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => open({ kind: "accept", code: r.code, title: r.title, testId: latest.id })}
                            >
                              {t("acceptPartial")}
                            </Button>
                          )}
                          {canDecide && r.state !== "not-applicable" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => open({ kind: "notApplicable", code: r.code, title: r.title })}
                            >
                              {t("markNotApplicable")}
                            </Button>
                          )}
                          {canDecide && r.state === "not-applicable" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={pending}
                              onClick={() =>
                                setApplicability.mutate({
                                  organizationId: orgId,
                                  aiSystemId: id,
                                  code: r.code,
                                  applicable: true,
                                })
                              }
                            >
                              {t("applicableAgain")}
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>
      ))}

      <p className="text-xs text-muted-foreground">{t("notACertificate")}</p>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "test"
                ? t("dialog.testTitle")
                : dialog?.kind === "accept"
                  ? t("dialog.acceptTitle")
                  : t("dialog.notApplicableTitle")}
            </DialogTitle>
            <DialogDescription className="break-words">
              {dialog ? `${dialog.code} ${dialog.title}` : ""}
            </DialogDescription>
          </DialogHeader>

          {dialog?.kind === "test" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("dialog.appendOnly")}</p>
              <div className="space-y-1.5">
                <Label htmlFor="aiuc1-method">{t("field.method")}</Label>
                <Textarea
                  id="aiuc1-method"
                  rows={3}
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder={t("placeholder.method")}
                  aria-describedby="aiuc1-method-help"
                />
                <p id="aiuc1-method-help" className="text-xs text-muted-foreground">
                  {t("help.method")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="aiuc1-result">{t("field.result")}</Label>
                  <Select value={result} onValueChange={(v) => setResult(v as Aiuc1TestResult)}>
                    <SelectTrigger id="aiuc1-result" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AIUC1_TEST_RESULTS.map((x) => (
                        <SelectItem key={x} value={x}>
                          {t(`result.${x}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aiuc1-date">{t("field.testedOn")}</Label>
                  <Input
                    id="aiuc1-date"
                    type="date"
                    value={testedOn}
                    max={todayValue()}
                    onChange={(e) => setTestedOn(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aiuc1-observed">{t("field.observed")}</Label>
                <Textarea
                  id="aiuc1-observed"
                  rows={3}
                  value={observed}
                  onChange={(e) => setObserved(e.target.value)}
                  placeholder={t("placeholder.observed")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aiuc1-ref">{t("field.evidenceRef")}</Label>
                <Input
                  id="aiuc1-ref"
                  value={evidenceRef}
                  onChange={(e) => setEvidenceRef(e.target.value)}
                  placeholder={t("placeholder.evidenceRef")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aiuc1-by">{t("field.performedBy")}</Label>
                <Input
                  id="aiuc1-by"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder={t("placeholder.performedBy")}
                  aria-describedby="aiuc1-by-help"
                />
                <p id="aiuc1-by-help" className="text-xs text-muted-foreground">
                  {t("help.performedBy")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {dialog?.kind === "accept" ? t("dialog.acceptHelp") : t("dialog.notApplicableHelp")}
              </p>
              <Label htmlFor="aiuc1-reason">{t("field.reason")}</Label>
              <Textarea id="aiuc1-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              {tc("cancel")}
            </Button>
            <Button onClick={submit} disabled={submitDisabled}>
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {dialog?.kind === "test"
                ? t("dialog.saveTest")
                : dialog?.kind === "accept"
                  ? t("dialog.accept")
                  : t("dialog.markNotApplicable")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
