"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/governance/page-header";
import { DeleteRecordButton } from "@/components/governance/delete-record-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ScrollText,
  Loader2,
  Send,
  CheckCircle,
  Upload,
  Archive,
  RotateCcw,
  Edit,
  Cpu,
  Link2,
  Unlink,
  Plus,
  History,
  FileText,
  Calendar,
  User,
  Copy,
  Download,
  ChevronDown,
  Building2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { useEnumLabels } from "@/lib/enum-labels";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatRelativeTime } from "@/lib/utils";
import { useFormatDate } from "@/lib/use-format-date";
import { STATUS_OUTLINE } from "@/components/ui/status-note";
import { SystemPicker } from "@/components/governance/system-picker";
import { Input } from "@/components/ui/input";
import { StatusNote } from "@/components/ui/status-note";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportDownload } from "@/components/governance/use-export-download";
import { AiDraftPanel } from "@/components/ai/AiDraftPanel";
import { features } from "@/config/features";
import { isUnreviewedTemplateDraft, policyReference } from "@/lib/policy-meta";
import {
  PolicyAssignmentFields,
  PolicyLifecycle,
  ReviewIntervalSelect,
  assignmentPayload,
  type PolicyAssignmentValue,
} from "@/components/governance/policy/policy-fields";

// Translation keys in the `common` namespace.
const policyTypeLabelKeys: Record<string, string> = {
  AI_USAGE: "policyTypeAiUsage",
  AI_GOVERNANCE: "policyTypeAiGovernance",
  AI_ETHICS: "policyTypeAiEthics",
  AI_RISK_MANAGEMENT: "policyTypeRiskManagement",
  AI_DATA_GOVERNANCE: "policyTypeDataGovernance",
  AI_PROCUREMENT: "policyTypeProcurement",
  AI_INCIDENT_RESPONSE: "policyTypeIncidentResponse",
  AI_TRANSPARENCY: "policyTypeTransparency",
  CUSTOM: "policyTypeCustom",
};

const statusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  UNDER_REVIEW: STATUS_OUTLINE.warning,
  APPROVED: STATUS_OUTLINE.note,
  PUBLISHED: STATUS_OUTLINE.good,
  ARCHIVED: "border-muted-foreground/50 text-muted-foreground/50",
};

const systemStatusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  DEVELOPMENT: STATUS_OUTLINE.note,
  TESTING: STATUS_OUTLINE.warning,
  DEPLOYED: STATUS_OUTLINE.good,
  RETIRED: "border-muted-foreground/50 text-muted-foreground/50",
};

export default function PolicyDetailPage() {
  const t = useTranslations("policyDetail");
  const { formatDate } = useFormatDate();
  const { statusLabel } = useEnumLabels();
  const locale = useLocale();
  const tc = useTranslations("common");
  const params = useParams();
  const id = params.id as string;
  const { organization, canWrite, canDecide, canDelete } = useOrganization();
  const router = useRouter();
  const tDelete = useTranslations("deleteRecord");
  const orgId = organization?.id ?? "";

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [editContentDialogOpen, setEditContentDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [linkSystemDialogOpen, setLinkSystemDialogOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<{
    assignment: PolicyAssignmentValue;
    reviewIntervalMonths: number | null;
    effectiveDate: string;
    reviewDate: string;
    description: string;
  }>({
    assignment: { ownerMemberId: "", ownerName: "", departmentId: "" },
    reviewIntervalMonths: null,
    effectiveDate: "",
    reviewDate: "",
    description: "",
  });
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const { download, isPending: downloadPending } = useExportDownload();

  const utils = trpc.useUtils();

  const { data: policy, isLoading, refetch } = trpc.policy.getById.useQuery(
    { organizationId: orgId, id },
    { enabled: !!orgId && !!id }
  );
  const { data: stats } = trpc.policy.getStats.useQuery({ organizationId: orgId }, { enabled: !!orgId });
  const { data: aiStatus } = trpc.ai.getStatus.useQuery(
    { organizationId: orgId },
    { enabled: features.aiAssistEnabled && !!orgId, staleTime: 60_000 }
  );
  const aiOn = !!aiStatus && aiStatus.posture !== "off" && aiStatus.configured;

  const duplicateMutation = trpc.policy.duplicate.useMutation({
    onSuccess: (copy) => {
      toast.success(t("toastDuplicated"));
      void utils.policy.invalidate();
      router.push(`/governance/policies/${copy.id}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const suggestEdits = trpc.policy.suggestEdits.useMutation();

  const updateMutation = trpc.policy.update.useMutation({
    onSuccess: () => {
      toast.success(t("toastPolicyUpdated"));
      refetch();
      utils.policy.list.invalidate();
      utils.policy.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("toastPolicyUpdateError"));
    },
  });

  const deleteMutation = trpc.policy.delete.useMutation({
    onSuccess: () => {
      toast.success(tDelete("policy.deleted"));
      router.push("/governance/policies");
      void utils.policy.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const approveMutation = trpc.policy.approve.useMutation({
    onSuccess: () => {
      toast.success(t("toastPolicyApproved"));
      refetch();
      utils.policy.list.invalidate();
      utils.policy.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("toastPolicyApproveError"));
    },
  });

  const publishMutation = trpc.policy.publishVersion.useMutation({
    onSuccess: () => {
      toast.success(t("toastPolicyPublished"));
      setPublishDialogOpen(false);
      setChangeNotes("");
      refetch();
      utils.policy.list.invalidate();
      utils.policy.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("toastPolicyPublishError"));
    },
  });

  const linkSystemMutation = trpc.policy.linkSystem.useMutation({
    onSuccess: () => {
      toast.success(t("toastSystemLinked"));
      setLinkSystemDialogOpen(false);
      setSelectedSystemId("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t("toastSystemLinkError"));
    },
  });

  const unlinkSystemMutation = trpc.policy.unlinkSystem.useMutation({
    onSuccess: () => {
      toast.success(t("toastSystemUnlinked"));
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || t("toastSystemUnlinkError"));
    },
  });

  if (isLoading || !orgId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Link href="/governance/policies">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToPolicies")}
          </Button>
        </Link>
      </div>
    );
  }

  const handleSubmitForReview = () => {
    updateMutation.mutate({
      organizationId: orgId,
      id: policy.id,
      status: "UNDER_REVIEW",
    });
  };

  const handleApprove = () => {
    approveMutation.mutate({
      organizationId: orgId,
      id: policy.id,
    });
  };

  const handlePublish = () => {
    publishMutation.mutate({
      organizationId: orgId,
      id: policy.id,
      changeNotes,
    });
  };

  const handleArchive = () => {
    if (policy.systemLinks && policy.systemLinks.length > 0) {
      setArchiveConfirmOpen(true);
      return;
    }
    updateMutation.mutate({
      organizationId: orgId,
      id: policy.id,
      status: "ARCHIVED",
    });
  };

  const handleArchiveConfirmed = () => {
    updateMutation.mutate({
      organizationId: orgId,
      id: policy.id,
      status: "ARCHIVED",
    });
    setArchiveConfirmOpen(false);
  };

  const handleRevise = () => {
    updateMutation.mutate({
      organizationId: orgId,
      id: policy.id,
      status: "DRAFT",
    });
  };

  const handleEditContent = () => {
    setEditedContent(policy.content || "");
    setEditContentDialogOpen(true);
  };

  const handleSaveContent = () => {
    updateMutation.mutate({
      organizationId: orgId,
      id: policy.id,
      content: editedContent,
    });
    setEditContentDialogOpen(false);
    setSuggestions(null);
  };

  const openDetails = () => {
    setDetails({
      assignment: {
        ownerMemberId: policy.ownerMemberId ?? "",
        ownerName: policy.ownerName ?? "",
        departmentId: policy.departmentId ?? "",
      },
      reviewIntervalMonths: policy.reviewIntervalMonths ?? null,
      effectiveDate: policy.effectiveDate ? new Date(policy.effectiveDate).toISOString().slice(0, 10) : "",
      reviewDate: policy.reviewDate ? new Date(policy.reviewDate).toISOString().slice(0, 10) : "",
      description: policy.description ?? "",
    });
    setDetailsOpen(true);
  };

  const handleSaveDetails = () => {
    updateMutation.mutate(
      {
        organizationId: orgId,
        id: policy.id,
        ...assignmentPayload(details.assignment),
        reviewIntervalMonths: details.reviewIntervalMonths,
        effectiveDate: details.effectiveDate || null,
        reviewDate: details.reviewDate || null,
        ...(details.description !== (policy.description ?? "") && { description: details.description || null }),
      },
      { onSuccess: () => setDetailsOpen(false) },
    );
  };

  const exportHref = (format: "pdf" | "docx") =>
    `/api/export/policy?organizationId=${encodeURIComponent(orgId)}&id=${encodeURIComponent(policy.id)}&format=${format}`;
  const reference = policyReference(policy.number);
  const templateDraft = isUnreviewedTemplateDraft(policy);
  const draftsToReview = stats?.draft ?? 0;

  const handleLinkSystem = () => {
    if (!selectedSystemId) return;
    linkSystemMutation.mutate({
      organizationId: orgId,
      policyId: policy.id,
      aiSystemId: selectedSystemId,
    });
  };

  const handleUnlinkSystem = (aiSystemId: string) => {
    unlinkSystemMutation.mutate({
      organizationId: orgId,
      policyId: policy.id,
      aiSystemId,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/governance/policies", label: tc("back") }}
        icon={ScrollText}
        title={policy.title}
        meta={
          <>
            <Badge variant="outline" className="text-xs">
              {policyTypeLabelKeys[policy.type] ? tc(policyTypeLabelKeys[policy.type]) : policy.type}
            </Badge>
            <Badge variant="outline" className={`text-xs ${statusColors[policy.status] || ""}`}>
              {statusLabel(policy.status)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              v{policy.currentVersion}
            </Badge>
            {reference && (
              <Badge variant="outline" className="text-xs">
                {reference}
              </Badge>
            )}
          </>
        }
        actions={
          <>
            {/* Only the actions the status allows; always in this one row. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" title={t("download")} aria-label={t("download")} disabled={downloadPending(exportHref("pdf")) || downloadPending(exportHref("docx"))}>
                  {downloadPending(exportHref("pdf")) || downloadPending(exportHref("docx")) ? (
                    <Loader2 className="w-4 h-4 sm:mr-1.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4 sm:mr-1.5" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">{t("download")}</span>
                  <ChevronDown className="hidden sm:inline w-4 h-4 ml-1 opacity-70" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void download(exportHref("pdf"))}>
                  <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
                  {t("downloadPdf")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void download(exportHref("docx"))}>
                  <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
                  {t("downloadWord")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canWrite && (
              <Button
                variant="outline"
                title={t("duplicate")}
                aria-label={t("duplicate")}
                disabled={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate({ organizationId: orgId, id: policy.id })}
              >
                {duplicateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 sm:mr-1.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4 sm:mr-1.5" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">{t("duplicate")}</span>
              </Button>
            )}
            {canDelete && (
              <DeleteRecordButton
                record="policy"
                pending={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate({ organizationId: orgId, id })}
              />
            )}
            {policy.status === "DRAFT" && canWrite && (
              <Button variant="outline" onClick={handleSubmitForReview} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {t("submitForReview")}
              </Button>
            )}
            {policy.status === "UNDER_REVIEW" && canDecide && (
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {t("approve")}
              </Button>
            )}
            {policy.status === "APPROVED" && canDecide && (
              <Button onClick={() => setPublishDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                {t("publish")}
              </Button>
            )}
            {policy.status === "PUBLISHED" && canWrite && (
              <>
                <Button variant="outline" onClick={handleArchive} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Archive className="w-4 h-4 mr-2" />
                  )}
                  {t("archive")}
                </Button>
                <Button variant="outline" onClick={handleRevise} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  {t("revise")}
                </Button>
              </>
            )}
            {policy.status === "ARCHIVED" && canWrite && (
              <Button variant="outline" onClick={handleRevise} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                {t("unarchive")}
              </Button>
            )}
          </>
        }
      />

      {/* The way back, with what is waiting there */}
      <Link
        href="/governance/policies"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        {draftsToReview > 0 ? t("backWithDrafts", { count: draftsToReview }) : t("backToPolicies")}
      </Link>

      <PolicyLifecycle status={policy.status} />

      {templateDraft && (
        <StatusNote status="warning" title={t("templateDraftTitle")}>
          {t("templateDraftBody")}
        </StatusNote>
      )}

      {/* Overview: the document heading, as on the PDF and Word downloads */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground" data-testid="policy-org-heading">
                {policy.organizationName}
              </p>
              <CardTitle className="mt-1">{policy.title}</CardTitle>
            </div>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={openDetails}>
                <Pencil className="w-4 h-4 mr-2" />
                {t("editDetails")}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {policy.description && (
              <p className="text-muted-foreground">{policy.description}</p>
            )}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t("labelReference")}</p>
                <p className="font-medium text-sm">{reference ?? t("notSet")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelVersion")}</p>
                <p className="font-medium text-sm">v{policy.currentVersion}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelStatus")}</p>
                <p className="font-medium text-sm">{statusLabel(policy.status)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="w-3.5 h-3.5" aria-hidden="true" />{t("labelOwner")}</p>
                <p className="font-medium text-sm">{policy.ownerName ?? t("notSet")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5" aria-hidden="true" />{t("labelDepartment")}</p>
                <p className="font-medium text-sm">{policy.departmentName ?? t("notSet")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><Cpu className="w-3.5 h-3.5" aria-hidden="true" />{t("labelSystems")}</p>
                <p className="font-medium text-sm">
                  {policy.systemLinks.length > 0
                    ? policy.systemLinks.map((l) => l.aiSystem.name).join(", ")
                    : t("notSet")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelEffectiveDate")}</p>
                <p className="font-medium text-sm">{formatDate(policy.effectiveDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelReviewDate")}</p>
                <p className="font-medium text-sm">{formatDate(policy.reviewDate)}</p>
                {policy.reviewIntervalMonths && (
                  <p className="text-xs text-muted-foreground">{t("reviewEvery", { months: policy.reviewIntervalMonths })}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelApprovedAt")}</p>
                <p className="font-medium text-sm">{policy.approvedAt ? formatDate(policy.approvedAt) : t("notYetApproved")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelApprovedBy")}</p>
                <p className="font-medium text-sm">
                  {policy.approvedBy ? policy.approvedByName ?? t("unknown") : t("notYetApproved")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelCreatedBy")}</p>
                <p className="font-medium text-sm">{policy.createdByName ?? t("unknown")}</p>
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
              <p className="text-3xl font-bold text-primary">{policy.versions?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t("versionsCount")}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{policy.systemLinks?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t("linkedSystemsCount")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("labelCreatedAt")}</p>
              <p className="font-medium text-sm">{formatDate(policy.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("labelLastUpdated")}</p>
              <p className="font-medium text-sm">{formatRelativeTime(policy.updatedAt, locale)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="content" className="text-xs sm:text-sm">
            {t("tabContent")}
          </TabsTrigger>
          <TabsTrigger value="versions" className="text-xs sm:text-sm">
            {t("tabVersionHistory", { count: policy.versions?.length ?? 0 })}
          </TabsTrigger>
          <TabsTrigger value="systems" className="text-xs sm:text-sm">
            {t("tabLinkedSystems", { count: policy.systemLinks?.length ?? 0 })}
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("policyContentTitle")}</CardTitle>
                <CardDescription>{t("policyContentDescription")}</CardDescription>
              </div>
              {canWrite && (
                <Button variant="outline" size="sm" onClick={handleEditContent}>
                  <Edit className="w-4 h-4 mr-2" />
                  {t("editContent")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {aiOn && canWrite && policy.content && (
                <div className="space-y-1">
                  <p className="text-sm">{t("suggestLead")}</p>
                  <AiDraftPanel
                    organizationId={orgId}
                    onGenerate={() => suggestEdits.mutateAsync({ organizationId: orgId, id: policy.id })}
                    onInsert={(content) => {
                      setSuggestions(content);
                      handleEditContent();
                    }}
                    generateKey="panel.suggestEdits"
                    insertKey="panel.reviewInEditor"
                    insertedKey="panel.reviewOpened"
                  />
                </div>
              )}
              {policy.content ? (
                <div className="bg-muted/50 p-4 rounded-md">
                  <div className="whitespace-pre-wrap text-sm text-foreground">
                    {policy.content}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("emptyContentTitle")}</p>
                  <p className="text-sm mb-4">{t("emptyContentHint")}</p>
                  <Button variant="outline" onClick={handleEditContent}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t("addContent")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Version History Tab */}
        <TabsContent value="versions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                {t("versionHistoryTitle")}
              </CardTitle>
              <CardDescription>{t("versionHistoryDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {policy.versions && policy.versions.length > 0 ? (
                <div className="space-y-3">
                  {[...policy.versions]
                    .sort((a, b) => b.version - a.version)
                    .map((version) => (
                      <div
                        key={version.id}
                        className="p-3 bg-muted/50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              v{version.version}
                            </Badge>
                            {version.changeNotes && (
                              <span className="text-sm text-muted-foreground">
                                {version.changeNotes}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {version.createdByName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {version.createdByName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(version.createdAt)}
                            </span>
                          </div>
                        </div>
                        {version.content && (
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {version.content.slice(0, 200)}
                            {version.content.length > 200 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("emptyVersionsTitle")}</p>
                  <p className="text-sm">
                    {t("emptyVersionsHint")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Systems Tab */}
        <TabsContent value="systems" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("linkedSystemsTitle")}</CardTitle>
                <CardDescription>
                  {t("linkedSystemsDescription")}
                </CardDescription>
              </div>
              {canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLinkSystemDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("linkSystem")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {policy.systemLinks && policy.systemLinks.length > 0 ? (
                <div className="space-y-3">
                  {policy.systemLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 bg-muted/50"
                    >
                      <Link
                        href={`/governance/ai-registry/${link.aiSystem.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0 hover:text-primary transition-colors"
                      >
                        <Cpu className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {link.aiSystem.name}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${systemStatusColors[link.aiSystem.status] || ""}`}
                        >
                          {statusLabel(link.aiSystem.status)}
                        </Badge>
                      </Link>
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkSystem(link.aiSystem.id)}
                          disabled={unlinkSystemMutation.isPending}
                          className="shrink-0 ml-2"
                        >
                          <Unlink className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("emptyLinkedSystemsTitle")}</p>
                  <p className="text-sm mb-4">
                    {t("emptyLinkedSystemsHint")}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setLinkSystemDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("linkSystem")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("publishDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("publishDialogDescription", { version: policy.currentVersion + 1 })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="changeNotes">{t("labelChangeNotes")}</Label>
              <Textarea
                id="changeNotes"
                placeholder={t("placeholderChangeNotes")}
                rows={3}
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tc("saving")}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {t("publish")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog */}
      <Dialog open={editContentDialogOpen} onOpenChange={setEditContentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("editContentDialogTitle")}</DialogTitle>
          </DialogHeader>
          {suggestions && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("suggestionsTitle")}</p>
              <div className="max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                {suggestions}
              </div>
              <p className="text-xs text-muted-foreground">{t("suggestionsHint")}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="policy-content">{t("contentLabel")}</Label>
            <Textarea
              id="policy-content"
              placeholder={t("placeholderPolicyContent")}
              rows={12}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              aria-describedby="policy-content-help"
            />
            <p id="policy-content-help" className="text-xs text-muted-foreground">
              {t("contentHelp")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContentDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleSaveContent}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tc("saving")}
                </>
              ) : (
                tc("saveChanges")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog: owner, department, dates, review interval */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("detailsDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="details-description">{t("labelDescription")}</Label>
              <Textarea
                id="details-description"
                rows={3}
                value={details.description}
                onChange={(e) => setDetails({ ...details, description: e.target.value })}
              />
            </div>
            <PolicyAssignmentFields
              organizationId={orgId}
              idPrefix="details"
              value={details.assignment}
              onChange={(assignment) => setDetails({ ...details, assignment })}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="details-effective">{t("labelEffectiveDate")}</Label>
                <Input
                  id="details-effective"
                  type="date"
                  value={details.effectiveDate}
                  onChange={(e) => setDetails({ ...details, effectiveDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="details-interval">{t("labelInterval")}</Label>
                <ReviewIntervalSelect
                  id="details-interval"
                  value={details.reviewIntervalMonths}
                  onChange={(months) => setDetails({ ...details, reviewIntervalMonths: months })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="details-review">{t("labelReviewDate")}</Label>
                <Input
                  id="details-review"
                  type="date"
                  value={details.reviewDate}
                  onChange={(e) => setDetails({ ...details, reviewDate: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("intervalHint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSaveDetails} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tc("saving")}
                </>
              ) : (
                tc("saveChanges")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link System Dialog */}
      <Dialog open={linkSystemDialogOpen} onOpenChange={setLinkSystemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("linkSystemDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("linkSystemDialogDescription")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="policy-link-system">{t("labelAiSystem")}</Label>
              <SystemPicker
                id="policy-link-system"
                value={selectedSystemId}
                onChange={(system) => setSelectedSystemId(system?.id ?? "")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkSystemDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleLinkSystem}
              disabled={!selectedSystemId || linkSystemMutation.isPending}
            >
              {linkSystemMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tc("saving")}
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  {t("linkSystem")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("archiveDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("archiveDialogDescription", { count: policy.systemLinks?.length ?? 0 })}
            </p>
            <div className="space-y-1.5">
              {policy.systemLinks?.map((link) => (
                <div key={link.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md">
                  <Cpu className="w-4 h-4 text-primary shrink-0" />
                  {link.aiSystem.name}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchiveConfirmed}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("archiving")}
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  {t("archiveAnyway")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
