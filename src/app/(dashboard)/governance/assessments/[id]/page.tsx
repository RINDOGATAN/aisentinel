"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
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
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { AiDraftPanel } from "@/components/ai/AiDraftPanel";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400",
  IN_PROGRESS: "bg-info/20 text-info",
  UNDER_REVIEW: "bg-warning/20 text-warning",
  APPROVED: "bg-success/20 text-success",
  REJECTED: "bg-red-500/20 text-red-400",
};

export default function AssessmentDetailPage() {
  const t = useTranslations("assessmentDetail");
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

      {sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.questions.map((question) => (
              <div key={question.id} className="space-y-2">
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
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
