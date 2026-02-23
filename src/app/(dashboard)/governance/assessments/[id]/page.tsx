"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400",
  IN_PROGRESS: "bg-blue-500/20 text-blue-400",
  UNDER_REVIEW: "bg-yellow-500/20 text-yellow-400",
  APPROVED: "bg-green-500/20 text-green-400",
  REJECTED: "bg-red-500/20 text-red-400",
};

export default function AssessmentDetailPage() {
  const params = useParams();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const id = params.id as string;

  const { data: assessment, isLoading, refetch } = trpc.assessment.getById.useQuery(
    { organizationId: orgId, id },
    { enabled: !!orgId && !!id }
  );

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  if (assessment && !initialized) {
    setResponses((assessment.responses as Record<string, string>) ?? {});
    setInitialized(true);
  }

  const updateMutation = trpc.assessment.update.useMutation({ onSuccess: () => refetch() });
  const submitMutation = trpc.assessment.submit.useMutation({ onSuccess: () => refetch() });
  const approveMutation = trpc.assessment.processApproval.useMutation({ onSuccess: () => refetch() });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading assessment...</div>;
  }

  if (!assessment) {
    return <div className="text-muted-foreground">Assessment not found.</div>;
  }

  const template = assessment.template;
  const sections = (template?.sections as Array<{ id: string; title: string; questions: Array<{ id: string; text: string; type: string; required: boolean; helpText?: string }> }>) ?? [];
  const canEdit = ["DRAFT", "IN_PROGRESS"].includes(assessment.status);
  const canSubmit = assessment.status === "IN_PROGRESS" || assessment.status === "DRAFT";
  const canApprove = assessment.status === "UNDER_REVIEW";

  const handleSave = () => {
    updateMutation.mutate({
      organizationId: orgId,
      id: assessment.id,
      responses,
      status: assessment.status === "DRAFT" ? "IN_PROGRESS" : undefined,
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
              Save
            </Button>
          )}
          {canSubmit && (
            <Button variant="outline" onClick={() => submitMutation.mutate({ organizationId: orgId, id: assessment.id })} disabled={submitMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />Submit for Review
            </Button>
          )}
        </div>
      </div>

      {canApprove && (
        <Card className="border-primary/50">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium">This assessment is awaiting your review.</span>
            <div className="flex gap-2">
              <Button onClick={() => approveMutation.mutate({ organizationId: orgId, id: assessment.id, decision: "APPROVED" })} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />Approve
              </Button>
              <Button variant="destructive" onClick={() => approveMutation.mutate({ organizationId: orgId, id: assessment.id, decision: "REJECTED" })}>
                <XCircle className="w-4 h-4 mr-2" />Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {assessment.approvedBy && (
        <Card className="border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>Approved on {formatDate(assessment.approvedAt)}</span>
            </div>
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
                <Textarea
                  value={responses[question.id] ?? ""}
                  onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
                  disabled={!canEdit}
                  placeholder="Enter your response..."
                  rows={3}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
