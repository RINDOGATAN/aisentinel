"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  assessmentCoverage,
  citationText,
  readQuestionMeta,
} from "@/lib/assessment-metadata";
import { overlayLabel } from "@/config/overlay-labels";
import { useOrganization } from "@/lib/organization-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Send, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { AiDraftPanel } from "@/components/ai/AiDraftPanel";
import { AssessmentVersionHistory } from "@/components/governance/assessment-version-history";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400",
  IN_PROGRESS: "bg-info/20 text-info",
  UNDER_REVIEW: "bg-warning/20 text-warning",
  APPROVED: "bg-success/20 text-success",
  REJECTED: "bg-red-500/20 text-red-400",
};

export default function AssessmentDetailPage() {
  const t = useTranslations("assessmentDetail");
  const locale = useLocale();
  const utils = trpc.useUtils();
  const params = useParams();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const id = params.id as string;

  const { data: assessment, isLoading, refetch } = trpc.assessment.getById.useQuery(
    { organizationId: orgId, id },
    { enabled: !!orgId && !!id }
  );

  const { data: session } = useSession();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selfReviewAcknowledged, setSelfReviewAcknowledged] = useState(false);

  if (assessment && !initialized) {
    setResponses((assessment.responses as Record<string, string>) ?? {});
    setInitialized(true);
  }

  const onError = (error: { message: string }) => setActionError(error.message);
  const updateMutation = trpc.assessment.update.useMutation({ onSuccess: () => refetch(), onError });
  const submitMutation = trpc.assessment.submit.useMutation({ onSuccess: () => refetch(), onError });
  const approveMutation = trpc.assessment.processApproval.useMutation({ onSuccess: () => refetch(), onError });
  const generateDraft = trpc.assessment.generateAiDraft.useMutation();

  // What answering this would do to the compliance register.
  const { data: registerPlan } = trpc.unified.previewRegisterUpdate.useQuery(
    { organizationId: orgId, assessmentId: id },
    { enabled: !!orgId && !!id },
  );
  const applyToRegister = trpc.unified.applyToRegister.useMutation({
    onSuccess: (res) => {
      toast.success(t("registerApplied", { count: res.applied }));
      void utils.unified.previewRegisterUpdate.invalidate();
      void utils.compliance.getMatrix.invalidate();
      void utils.compliance.getSystemScorecard.invalidate();
    },
    onError: (err) => setActionError(err.message),
  });

  // Every hook above the early returns, so the number of hooks cannot change
  // between the loading render and the loaded one (React throws "rendered more
  // hooks than during the previous render" when it does).
  if (isLoading || !orgId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assessment) {
    return <div className="text-muted-foreground">{t("notFound")}</div>;
  }

  const template = assessment.template;
  const sections = (template?.sections as Array<{ id: string; title: string; questions: Array<{ id: string; text: string; type: string; required: boolean; helpText?: string; options?: string[] }> }>) ?? [];
  const canEdit = ["DRAFT", "IN_PROGRESS"].includes(assessment.status);
  const canSubmit = assessment.status === "IN_PROGRESS" || assessment.status === "DRAFT";
  const canApprove = assessment.status === "UNDER_REVIEW";

  const allQuestions = sections.flatMap((s) => s.questions || []);
  const totalQuestions = allQuestions.length;
  const answeredQuestions = allQuestions.filter((q) => responses[q.id]?.toString().trim()).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  // The unified template carries, per question, why it is asked and what the
  // answer evidences. Older templates carry none of it and render unchanged.
  const coverage = assessmentCoverage(sections, responses);
  const contentLocale = locale === "es" ? "es" : "en";

  // Mirrors the server's completeness gate (assessment.submit) so an
  // incomplete assessment is visibly blocked rather than rejected after the
  // fact. `required` defaults to true when a template omits the flag.
  const missingRequired = allQuestions.filter(
    (q) => q.required !== false && !responses[q.id]?.toString().trim()
  );
  const isComplete = missingRequired.length === 0;

  // Approving your own submission stays possible — a sole practitioner has no
  // one else — but it is called out and recorded rather than passing silently.
  const submitter = assessment.submittedBy ?? assessment.createdBy;
  const isSelfReview = !!session?.user?.id && submitter === session.user.id;

  const handleSave = () => {
    setActionError(null);
    updateMutation.mutate({ organizationId: orgId, id: assessment.id, responses });
  };

  // Persist the answers on screen before submitting: the server gates on what
  // is stored, so submitting unsaved edits would fail on answers the user can
  // plainly see in front of them.
  const handleSubmit = async () => {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({ organizationId: orgId, id: assessment.id, responses });
      await submitMutation.mutateAsync({ organizationId: orgId, id: assessment.id });
    } catch {
      // onError already surfaced the message.
    }
  };

  const handleDecision = (decision: "APPROVED" | "REJECTED") => {
    setActionError(null);
    approveMutation.mutate({
      organizationId: orgId,
      id: assessment.id,
      decision,
      acknowledgeSelfReview: selfReviewAcknowledged,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/governance/assessments">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{assessment.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{assessment.type}</Badge>
              <Badge className={statusColors[assessment.status]}>{assessment.status.replace("_", " ")}</Badge>
              {assessment.aiSystem && (
                <span className="text-sm text-muted-foreground">
                  for <Link href={`/governance/ai-registry/${assessment.aiSystem.id}`} className="text-primary hover:underline">{assessment.aiSystem.name}</Link>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {t("saveButton")}
            </Button>
          )}
          {canSubmit && (
            <Button
              variant="outline"
              onClick={handleSubmit}
              disabled={submitMutation.isPending || updateMutation.isPending || !isComplete}
              title={isComplete ? undefined : t("completeBeforeSubmit", { count: missingRequired.length })}
            >
              <Send className="w-4 h-4 mr-2" />{t("submitForReview")}
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 flex items-start gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm">{actionError}</span>
          </CardContent>
        </Card>
      )}

      {canEdit && totalQuestions > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t("progressCount", { answered: answeredQuestions, total: totalQuestions })}
            </span>
          </div>
          {!isComplete && (
            <p className="text-xs text-muted-foreground">
              {t("completeBeforeSubmit", { count: missingRequired.length })}
            </p>
          )}
        </div>
      )}

      {canApprove && (
        <Card className="border-primary/50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium">{t("awaitingReview")}</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDecision("APPROVED")}
                  disabled={approveMutation.isPending || (isSelfReview && !selfReviewAcknowledged)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />{t("approve")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDecision("REJECTED")}
                  disabled={approveMutation.isPending || (isSelfReview && !selfReviewAcknowledged)}
                >
                  <XCircle className="w-4 h-4 mr-2" />{t("reject")}
                </Button>
              </div>
            </div>
            {isSelfReview && (
              <div className="flex items-start gap-2 border-t border-border pt-4">
                <Checkbox
                  id="self-review"
                  checked={selfReviewAcknowledged}
                  onCheckedChange={(checked) => setSelfReviewAcknowledged(checked === true)}
                />
                <label htmlFor="self-review" className="text-sm text-muted-foreground">
                  {t("selfReviewWarning")}
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {assessment.approvedBy && (
        <Card className="border-success/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span>{t("approvedOn", { date: formatDate(assessment.approvedAt) })}</span>
            </div>
            {assessment.approvedBy === submitter && (
              <p className="text-xs text-muted-foreground mt-1">{t("selfApprovedNote")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* What this assessment evidences. Shown only for templates that carry
          the unified metadata; the seeded FRIA and conformity templates do not,
          and render exactly as they always have. */}
      {coverage.hasMetadata && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("coverageTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {t("coverageSummary", {
                evidenced: coverage.evidencedObligations,
                total: coverage.totalObligations,
                frameworks: coverage.byFramework.length,
              })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {coverage.byFramework.map((f) => (
                <Badge
                  key={f.framework}
                  variant="outline"
                  className={
                    f.evidenced === f.total
                      ? "text-xs border-success/50 text-success"
                      : "text-xs"
                  }
                >
                  {f.framework.replace(/_/g, " ")} {f.evidenced}/{f.total}
                </Badge>
              ))}
            </div>
            {coverage.reasons.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1.5">{t("coverageRegimes")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {coverage.reasons.map((reason) => (
                    <Badge key={reason} variant="secondary" className="text-[10px]">
                      {overlayLabel(reason, contentLocale)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">
              {t("coverageHint")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Answering closes obligations in the register, not just in this form.
          Explicit rather than automatic on save: the count is shown first, and
          the restraints are stated, because this writes into the compliance
          record. */}
      {coverage.hasMetadata && registerPlan && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("registerTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("registerBody")}</p>
            {registerPlan.counts.evidenced > 0 ? (
              <p className="text-sm">
                {t("registerReady", {
                  evidenced: registerPlan.counts.evidenced,
                  lifted: registerPlan.counts.lifted,
                })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("registerNothing")}</p>
            )}
            {registerPlan.counts.alreadyPresent > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("registerAlready", { count: registerPlan.counts.alreadyPresent })}
              </p>
            )}
            {registerPlan.unmapped.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("registerUnmapped", { count: registerPlan.unmapped.length })}
              </p>
            )}
            {canEdit && registerPlan.counts.evidenced > 0 && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={applyToRegister.isPending}
                  onClick={() =>
                    applyToRegister.mutate({ organizationId: orgId, assessmentId: id })
                  }
                >
                  {applyToRegister.isPending && (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  )}
                  {t("registerApply")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.questions.map((question) => (
              <div key={question.id} className="space-y-2">
                {(() => {
                  const meta = readQuestionMeta(question);
                  if (!meta.reason) return null;
                  return (
                    <p className="text-[11px] text-muted-foreground">
                      {meta.reason === "core"
                        ? t("whyCore")
                        : t("whyOverlay", { regime: overlayLabel(meta.reason, contentLocale) })}
                    </p>
                  );
                })()}
                <label className="text-sm font-medium">
                  {question.text}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {question.helpText && (
                  <p className="text-xs text-muted-foreground">{question.helpText}</p>
                )}
                {question.type === "select" && question.options ? (
                  <Select
                    value={responses[question.id] ?? ""}
                    onValueChange={(value) => setResponses({ ...responses, [question.id]: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Textarea
                      value={responses[question.id] ?? ""}
                      onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
                      disabled={!canEdit}
                      placeholder={t("textareaPlaceholder")}
                      rows={3}
                    />
                    {/* Optional AI assist: drafts from registry facts; Insert
                        puts the text in the editable field above — saving still
                        flows through the normal save/submit/approve workflow. */}
                    {canEdit && (
                      <AiDraftPanel
                        organizationId={orgId}
                        onGenerate={() =>
                          generateDraft.mutateAsync({
                            organizationId: orgId,
                            id: assessment.id,
                            questionId: question.id,
                          })
                        }
                        onInsert={(content) =>
                          setResponses((prev) => ({ ...prev, [question.id]: content }))
                        }
                      />
                    )}
                  </>
                )}
                {/* What answering this closes, and where the answer travels.
                    This is the payoff of the shared core: one answer standing
                    as evidence in several registers at once. */}
                {(() => {
                  const meta = readQuestionMeta(question);
                  if (meta.satisfies.length === 0 && meta.feeds.length === 0) return null;
                  const answered = !!responses[question.id]?.toString().trim();
                  const feedLabel = (target: string) =>
                    target === "notice"
                      ? t("feedsNotice")
                      : target === "protocol"
                        ? t("feedsProtocol")
                        : t("feedsAssessment");
                  return (
                    <div className="pt-1 space-y-1.5">
                      {meta.satisfies.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">
                            {t("evidences")}
                          </span>
                          {meta.satisfies.map((citation) => (
                            <Badge
                              key={`${citation.framework}-${citation.code}`}
                              variant="outline"
                              className={
                                answered
                                  ? "text-[10px] border-success/50 text-success"
                                  : "text-[10px] text-muted-foreground"
                              }
                            >
                              {citationText(citation)}
                            </Badge>
                          ))}
                          {answered && (
                            <span className="text-[10px] text-success">{t("answeredMark")}</span>
                          )}
                        </div>
                      )}
                      {meta.feeds.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {t("feedsInto")}{" "}
                          {meta.feeds.map((f) => feedLabel(f)).join(", ")}.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* The dated record of what this assessment said, and when. */}
      <AssessmentVersionHistory organizationId={orgId} assessmentId={id} />
    </div>
  );
}
