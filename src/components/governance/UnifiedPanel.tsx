"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The cross-border workflow for one AI system, in the order a practitioner
 * works through it: see which regimes apply, answer what is still
 * undetermined, attach the requirements, generate the unified assessment, take
 * the three documents, and stress-test them against an autonomous agent.
 *
 * Everything here reads from one resolved scope, so the panel, the compliance
 * matrix and the generated documents can never disagree about which regimes
 * apply to this system.
 */

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  AlertTriangle,
  Bot,
  Download,
  FileText,
  Globe2,
  Layers,
  Loader2,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Answer = "NOT_ASSESSED" | "YES" | "NO";

type SystemFactKey =
  | "solelyAutomatedLegalEffect"
  | "processesSpecialCategoryData"
  | "materiallyInfluencesConsequentialDecision"
  | "isCompanionChatbot"
  | "usedInPriorAuthorization"
  | "interactsWithConsumers"
  | "handsOffToAutonomousAgent";

/**
 * Which declared jurisdictions make a question worth asking. The agentic
 * question has no jurisdiction: no statute keys off it yet, which is exactly
 * why it must be asked of everyone.
 */
const RELEVANT_TO: Record<SystemFactKey, string[] | null> = {
  solelyAutomatedLegalEffect: ["EU", "EEA", "UK"],
  processesSpecialCategoryData: ["EU", "EEA", "UK", "US_WA"],
  materiallyInfluencesConsequentialDecision: ["US_CO"],
  isCompanionChatbot: ["US_WA"],
  usedInPriorAuthorization: ["US_WA"],
  interactsWithConsumers: ["US_TX", "US_CO"],
  handsOffToAutonomousAgent: null,
};

const CITATIONS: Record<SystemFactKey, string> = {
  solelyAutomatedLegalEffect: "GDPR Art. 22",
  processesSpecialCategoryData: "GDPR Art. 9 · RCW 19.373",
  materiallyInfluencesConsequentialDecision: "SB 26-189",
  isCompanionChatbot: "HB 2225 (2026 c 168)",
  usedInPriorAuthorization: "RCW 48.43.830",
  interactsWithConsumers: "TRAIGA § 552.051(a)",
  handsOffToAutonomousAgent: "—",
};

const ORDER: SystemFactKey[] = [
  "solelyAutomatedLegalEffect",
  "processesSpecialCategoryData",
  "materiallyInfluencesConsequentialDecision",
  "interactsWithConsumers",
  "isCompanionChatbot",
  "usedInPriorAuthorization",
  "handsOffToAutonomousAgent",
];

const ARTIFACTS = [
  { kind: "assessment", labelKey: "downloadAssessment", icon: FileText },
  { kind: "notice", labelKey: "downloadNotice", icon: Globe2 },
  { kind: "protocol", labelKey: "downloadProtocol", icon: Layers },
  { kind: "agentic-addendum", labelKey: "downloadAddendum", icon: Bot },
] as const;

const SEVERITY_STYLE: Record<string, string> = {
  breaks: "bg-destructive/20 text-destructive",
  weakens: "bg-warning/20 text-warning",
  watch: "bg-muted text-muted-foreground",
};

export function UnifiedPanel({
  organizationId,
  aiSystemId,
  canWrite,
}: {
  organizationId: string;
  aiSystemId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("unified");
  const tr = useTranslations("regimes");
  const tc = useTranslations("common");
  const tp = useTranslations("premiumShowcase");
  const utils = trpc.useUtils();
  const [edits, setEdits] = useState<Partial<Record<SystemFactKey, Answer>>>({});

  const { data: scope, isLoading } = trpc.regimes.getScope.useQuery({ organizationId, aiSystemId });
  const { data: template } = trpc.unified.getTemplate.useQuery({ organizationId, aiSystemId });
  const { data: stress } = trpc.unified.stressTest.useQuery({ organizationId, aiSystemId });

  const invalidate = () => {
    void utils.regimes.getScope.invalidate();
    void utils.unified.getTemplate.invalidate();
    void utils.unified.stressTest.invalidate();
    void utils.compliance.getFrameworkCounts.invalidate();
  };

  const saveFacts = trpc.regimes.setSystemFacts.useMutation({
    onSuccess: () => {
      setEdits({});
      toast.success(tr("saved"));
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sync = trpc.regimes.syncMappings.useMutation({
    onSuccess: (res) => {
      toast.success(res.created > 0 ? tr("attachDone", { count: res.created }) : tr("attachNothing"));
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createAssessment = trpc.unified.createAssessment.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      void utils.assessment.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !scope) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const jurisdictions = template?.jurisdictions ?? [];
  const saved = (scope.systemFacts ?? {}) as Record<SystemFactKey, Answer>;
  const value = (key: SystemFactKey): Answer => edits[key] ?? saved[key] ?? "NOT_ASSESSED";
  const dirty = Object.keys(edits).length > 0;
  const options: Answer[] = ["YES", "NO", "NOT_ASSESSED"];
  const relevant = ORDER.filter((key) => {
    const needed = RELEVANT_TO[key];
    return needed === null || needed.some((j) => jurisdictions.includes(j as never));
  });

  const { data: showcase } = trpc.skills.showcaseStatus.useQuery(
    { organizationId },
    { enabled: !!organizationId, staleTime: 5 * 60 * 1000 },
  );

  const downloadUrl = (kind: string) =>
    `/api/export/unified-artifact?organizationId=${encodeURIComponent(organizationId)}&aiSystemId=${encodeURIComponent(aiSystemId)}&kind=${kind}`;

  return (
    <div className="space-y-6">
      {/* ── Which regimes apply ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-primary" />
            {t("scopeTitle")}
          </CardTitle>
          <CardDescription>{tr("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scope.jurisdictionsDeclared ? (
            <p className="text-sm text-warning">{tr("declareJurisdictionsFirst")}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {(template?.overlayTags ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noOverlays")}</p>
                ) : (
                  (template?.overlayTags ?? []).map((tag) => (
                    <Badge key={tag} className="bg-primary/15 text-primary text-xs">
                      {tag}
                    </Badge>
                  ))
                )}
              </div>
              {scope.scopes.filter((s) => s.state === "UNDETERMINED").length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/5 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-warning">{tr("stateUndetermined")}</p>
                  <ul className="space-y-1">
                    {scope.scopes
                      .filter((s) => s.state === "UNDETERMINED")
                      .map((s) => (
                        <li key={s.framework} className="text-xs text-muted-foreground">
                          <span className="font-medium">{s.framework.replace(/_/g, " ")}</span>
                          {s.openQuestions.length > 0 && ` — ${tr("openQuestions")}: ${s.openQuestions.join(", ")}`}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {canWrite && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {tr("attachedCount", { count: scope.attachedRequirementCount })}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sync.isPending}
                    onClick={() => sync.mutate({ organizationId, aiSystemId })}
                  >
                    {sync.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                    {tr("attachRequirements")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── System screening ────────────────────────────────────────── */}
      {relevant.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr("systemTitle")}</CardTitle>
            <CardDescription>{tr("systemDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {relevant.map((key) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="text-sm">{tr(`system.${key}.label`)}</p>
                  <code className="text-[11px] text-muted-foreground shrink-0">{CITATIONS[key]}</code>
                </div>
                <p className="text-xs text-muted-foreground">{tr(`system.${key}.help`)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={!canWrite || saveFacts.isPending}
                      onClick={() => setEdits((prev) => ({ ...prev, [key]: opt }))}
                      className={[
                        "rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
                        value(key) === opt
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      ].join(" ")}
                    >
                      {tr(`answer.${opt}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {canWrite && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!dirty || saveFacts.isPending}
                  onClick={() =>
                    saveFacts.mutate({
                      organizationId,
                      aiSystemId,
                      ...Object.fromEntries(relevant.map((k) => [k, value(k)])),
                    })
                  }
                >
                  {saveFacts.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  {tc("save")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── The unified assessment ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scope.jurisdictionsDeclared ? (
            <p className="text-sm text-warning">{t("declareFirst")}</p>
          ) : (
            <>
              {template && (
                <p className="text-sm text-muted-foreground">
                  {t("counts", {
                    total: template.counts.questions,
                    core: template.counts.core,
                    overlay: template.counts.overlay,
                  })}
                </p>
              )}
              {template && template.sections.length > 0 && (
                <div className="rounded-md border border-border/50 divide-y divide-border/50">
                  {template.sections.map((section) => (
                    <div key={section.id} className="px-3 py-2">
                      <p className="text-sm font-medium">{section.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {section.questions.length} ·{" "}
                        {[...new Set(section.questions.map((q) => q.reason))]
                          .map((r) => (r === "core" ? t("reasonCore") : r))
                          .join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {canWrite && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={createAssessment.isPending}
                    onClick={() => createAssessment.mutate({ organizationId, aiSystemId })}
                  >
                    {createAssessment.isPending ? (
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3 mr-2" />
                    )}
                    {t("create")}
                  </Button>
                  {createAssessment.data && (
                    <Link
                      href={`/governance/assessments/${createAssessment.data.assessmentId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {t("openAssessment")}
                    </Link>
                  )}
                </div>
              )}
              {template && (
                <p className="text-xs text-muted-foreground border-t border-border pt-3">
                  {template.reviewMarker}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── The documents ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            {t("artifactsTitle")}
          </CardTitle>
          <CardDescription>{t("artifactsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {ARTIFACTS.map(({ kind, labelKey, icon: Icon }) => {
              // The impact assessment is the paid deliverable on the hosted
              // instance; the notice and the protocol stay free, so the
              // generation itself can still be seen and judged.
              const locked =
                kind === "assessment" &&
                !!showcase?.locked.includes("impact-assessment-document");
              if (locked) {
                return (
                  <div
                    key={kind}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/10 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate text-muted-foreground">
                        {t(labelKey)}
                      </span>
                    </span>
                    <Link
                      href="/governance/skills"
                      className="text-xs text-primary shrink-0 hover:underline"
                    >
                      {tp("activate")}
                    </Link>
                  </div>
                );
              }
              return (
                <a
                  key={kind}
                  href={downloadUrl(kind)}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2.5 hover:border-primary/40 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{t(labelKey)}</span>
                  </span>
                  <span className="text-xs text-primary shrink-0">{t("download")}</span>
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── The agentic stress test ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            {t("stressTitle")}
          </CardTitle>
          <CardDescription>{t("stressDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stress?.declared ? (
            <p className="text-sm text-muted-foreground">{t("stressNotDeclared")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("stressCounts", {
                  breaks: stress.counts.breaks,
                  weakens: stress.counts.weakens,
                  watch: stress.counts.watch,
                })}
              </p>
              <div className="space-y-3">
                {stress.findings.map((f) => (
                  <div key={f.id} className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                        {f.title}
                      </p>
                      <Badge className={`text-[10px] shrink-0 ${SEVERITY_STYLE[f.severity] ?? ""}`}>
                        {t(
                          f.severity === "breaks"
                            ? "severityBreaks"
                            : f.severity === "weakens"
                              ? "severityWeakens"
                              : "severityWatch",
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t("assumption")}:</span> {f.assumption}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t("breakage")}:</span> {f.breakage}
                    </p>
                    <p className="text-xs">
                      <span className="font-medium">{t("provision")}:</span> {f.provision}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">{t("affects")}:</span>
                      {f.artifacts.map((a) => (
                        <Badge key={a} variant="outline" className="text-[10px]">
                          {a}
                        </Badge>
                      ))}
                      <code className="text-[10px] text-muted-foreground ml-1">
                        {f.citations.join(" · ")}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
