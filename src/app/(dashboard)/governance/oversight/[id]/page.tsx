"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Plus,
  User,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  PauseCircle,
  FileText,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { useTranslations } from "next-intl";

const gateTypeKeys: Record<string, string> = {
  PRE_DEPLOYMENT: "gateTypePreDeployment",
  POST_DEPLOYMENT: "gateTypePostDeployment",
  PERIODIC_REVIEW: "gateTypePeriodicReview",
  INCIDENT_TRIGGERED: "gateTypeIncidentTriggered",
  MATERIAL_CHANGE: "gateTypeMaterialChange",
};

const gateStatusColors: Record<string, string> = {
  PENDING: "border-warning text-warning",
  IN_REVIEW: "border-info text-info",
  PASSED: "border-success text-success",
  FAILED: "border-destructive text-destructive",
  DEFERRED: "border-muted-foreground text-muted-foreground",
};

const decisionColors: Record<string, string> = {
  APPROVE: "bg-success/20 text-success",
  REJECT: "bg-destructive/20 text-destructive",
  DEFER: "bg-warning/20 text-warning",
};

const decisionIcons: Record<string, React.ElementType> = {
  APPROVE: CheckCircle,
  REJECT: XCircle,
  DEFER: PauseCircle,
};

export default function OversightGateDetailPage() {
  const t = useTranslations("oversightDetail");
  const to = useTranslations("oversight");
  const tc = useTranslations("common");
  const params = useParams();
  const id = params.id as string;
  const { organization, canWrite } = useOrganization();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    decision: "",
    rationale: "",
    evidenceReviewed: "",
  });

  const utils = trpc.useUtils();

  const { data: gate, isLoading } = trpc.oversight.getById.useQuery(
    { organizationId: organization?.id ?? "", id },
    { enabled: !!organization?.id && !!id }
  );

  const addDecision = trpc.oversight.addDecision.useMutation({
    onSuccess: () => {
      toast.success(t("toastSuccess"));
      utils.oversight.getById.invalidate({ organizationId: organization?.id ?? "", id });
      utils.oversight.list.invalidate();
      utils.oversight.getStats.invalidate();
      setDialogOpen(false);
      setDecisionForm({ decision: "", rationale: "", evidenceReviewed: "" });
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
    },
  });

  const reopenMutation = trpc.oversight.update.useMutation({
    onSuccess: () => {
      toast.success(t("toastReopenSuccess"));
      utils.oversight.getById.invalidate({ organizationId: organization?.id ?? "", id });
      utils.oversight.getStats.invalidate();
    },
  });

  const handleAddDecision = () => {
    if (!organization?.id || !decisionForm.decision || !decisionForm.rationale) return;

    const evidenceArray = decisionForm.evidenceReviewed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    addDecision.mutate({
      organizationId: organization.id,
      gateId: id,
      decision: decisionForm.decision as "APPROVE" | "REJECT" | "DEFER",
      rationale: decisionForm.rationale,
      evidenceReviewed: evidenceArray,
    });
  };

  if (isLoading || !organization?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!gate) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Link href="/governance/oversight">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToOversight")}
          </Button>
        </Link>
      </div>
    );
  }

  const decisions = gate.decisions ?? [];
  const lastDecision = decisions.length > 0 ? decisions[0] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/governance/oversight">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center shrink-0">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">
                {gate.aiSystem?.name ?? "Unknown System"} &mdash;{" "}
                {gateTypeKeys[gate.gateType] ? to(gateTypeKeys[gate.gateType]) : gate.gateType}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={gateStatusColors[gate.status] || ""}
                >
                  {gate.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {gateTypeKeys[gate.gateType] ? to(gateTypeKeys[gate.gateType]) : gate.gateType}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {(gate.status === "PASSED" || gate.status === "FAILED") && canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reopenMutation.mutate({ organizationId: organization!.id, id, status: "PENDING" })}
              disabled={reopenMutation.isPending}
            >
              {reopenMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {t("reopenForReview")}
            </Button>
          )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("addDecision")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("decisionLabel")} *</Label>
                <Select
                  value={decisionForm.decision}
                  onValueChange={(value) =>
                    setDecisionForm({ ...decisionForm, decision: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("decisionPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVE">{t("decisionApprove")}</SelectItem>
                    <SelectItem value="REJECT">{t("decisionReject")}</SelectItem>
                    <SelectItem value="DEFER">{t("decisionDefer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("rationaleLabel")} *</Label>
                <Textarea
                  placeholder={t("rationalePlaceholder")}
                  rows={4}
                  value={decisionForm.rationale}
                  onChange={(e) =>
                    setDecisionForm({ ...decisionForm, rationale: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("evidenceReviewedLabel")}</Label>
                <Input
                  placeholder={t("evidenceReviewedPlaceholder")}
                  value={decisionForm.evidenceReviewed}
                  onChange={(e) =>
                    setDecisionForm({ ...decisionForm, evidenceReviewed: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple items with commas
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                type="button"
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleAddDecision}
                disabled={
                  addDecision.isPending ||
                  !decisionForm.decision ||
                  !decisionForm.rationale
                }
              >
                {addDecision.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("recording")}
                  </>
                ) : (
                  t("recordDecision")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("overviewTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gate.description && (
              <p className="text-muted-foreground">{gate.description}</p>
            )}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t("assignedToLabel")}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="font-medium text-sm">{gate.assignedTo || t("notAssigned")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("reviewCadenceLabel")}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="font-medium text-sm">{gate.reviewCadence || t("notSet")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("nextReviewDateLabel")}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="font-medium text-sm">{formatDate(gate.nextReviewDate)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("aiSystemLabel")}</p>
                <p className="font-medium text-sm">
                  <Link
                    href={`/governance/ai-registry/${gate.aiSystem?.id}`}
                    className="text-primary hover:underline"
                  >
                    {gate.aiSystem?.name ?? "Unknown"}
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("createdLabel")}</p>
                <p className="font-medium text-sm">{formatDate(gate.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("statisticsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-primary">{decisions.length}</p>
              <p className="text-sm text-muted-foreground">{t("totalDecisions")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("lastDecision")}</p>
              <p className="font-medium text-sm">
                {lastDecision ? formatDate(lastDecision.decidedAt) : t("noDecisionsYet")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium text-sm">{formatRelativeTime(gate.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t("decisionHistory")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {decisions.length > 0 ? (
            <div className="space-y-4">
              {decisions.map((decision) => {
                const Icon = decisionIcons[decision.decision] || MessageSquare;
                return (
                  <div
                    key={decision.id}
                    className="flex gap-4 p-4 bg-muted/50"
                  >
                    <div className="shrink-0 mt-0.5">
                      <Icon className={`w-5 h-5 ${
                        decision.decision === "APPROVE"
                          ? "text-success"
                          : decision.decision === "REJECT"
                          ? "text-destructive"
                          : "text-warning"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${decisionColors[decision.decision] || ""}`}>
                          {decision.decision}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(decision.decidedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {decision.rationale}
                      </p>
                      {decision.evidenceReviewed && decision.evidenceReviewed.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Evidence Reviewed:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {decision.evidenceReviewed.map((evidence, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {evidence}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>Decided by: {decision.decidedBy}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("emptyDecisionsTitle")}</p>
              <p className="text-sm mb-4">
                {t("emptyDecisionsHint")}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("addDecision")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
