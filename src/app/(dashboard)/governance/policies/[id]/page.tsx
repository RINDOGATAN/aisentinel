"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const policyTypeLabels: Record<string, string> = {
  AI_USAGE: "AI Usage",
  AI_GOVERNANCE: "AI Governance",
  AI_ETHICS: "AI Ethics",
  AI_RISK_MANAGEMENT: "Risk Management",
  AI_DATA_GOVERNANCE: "Data Governance",
  AI_PROCUREMENT: "Procurement",
  AI_INCIDENT_RESPONSE: "Incident Response",
  AI_TRANSPARENCY: "Transparency",
  CUSTOM: "Custom",
};

const statusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  UNDER_REVIEW: "border-warning text-warning",
  APPROVED: "border-info text-info",
  PUBLISHED: "border-success text-success",
  ARCHIVED: "border-muted-foreground/50 text-muted-foreground/50",
};

const systemStatusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  DEVELOPMENT: "border-info text-info",
  TESTING: "border-warning text-warning",
  DEPLOYED: "border-success text-success",
  RETIRED: "border-muted-foreground/50 text-muted-foreground/50",
};

export default function PolicyDetailPage() {
  const t = useTranslations("policyDetail");
  const tc = useTranslations("common");
  const params = useParams();
  const id = params.id as string;
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [editContentDialogOpen, setEditContentDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [linkSystemDialogOpen, setLinkSystemDialogOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: policy, isLoading, refetch } = trpc.policy.getById.useQuery(
    { organizationId: orgId, id },
    { enabled: !!orgId && !!id }
  );

  const { data: systemsData } = trpc.aiSystem.list.useQuery(
    { organizationId: orgId, limit: 100 },
    { enabled: !!orgId && linkSystemDialogOpen }
  );

  const updateMutation = trpc.policy.update.useMutation({
    onSuccess: () => {
      toast.success("Policy updated");
      refetch();
      utils.policy.list.invalidate();
      utils.policy.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update policy");
    },
  });

  const approveMutation = trpc.policy.approve.useMutation({
    onSuccess: () => {
      toast.success("Policy approved");
      refetch();
      utils.policy.list.invalidate();
      utils.policy.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve policy");
    },
  });

  const publishMutation = trpc.policy.publishVersion.useMutation({
    onSuccess: () => {
      toast.success("Policy published");
      setPublishDialogOpen(false);
      setChangeNotes("");
      refetch();
      utils.policy.list.invalidate();
      utils.policy.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish policy");
    },
  });

  const linkSystemMutation = trpc.policy.linkSystem.useMutation({
    onSuccess: () => {
      toast.success("System linked");
      setLinkSystemDialogOpen(false);
      setSelectedSystemId("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to link system");
    },
  });

  const unlinkSystemMutation = trpc.policy.unlinkSystem.useMutation({
    onSuccess: () => {
      toast.success("System unlinked");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unlink system");
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
  };

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

  const systems = systemsData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/governance/policies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center shrink-0">
              <ScrollText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">{policy.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {policyTypeLabels[policy.type] || policy.type}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${statusColors[policy.status] || ""}`}
                >
                  {policy.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  v{policy.currentVersion}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 self-start sm:self-auto">
          {policy.status === "DRAFT" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSubmitForReview}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {t("submitForReview")}
            </Button>
          )}
          {policy.status === "UNDER_REVIEW" && (
            <Button
              size="sm"
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
          {policy.status === "APPROVED" && (
            <Button
              size="sm"
              onClick={() => setPublishDialogOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("publish")}
            </Button>
          )}
          {policy.status === "PUBLISHED" && canWrite && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevise}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                {t("revise")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Archive className="w-4 h-4 mr-2" />
                )}
                {t("archive")}
              </Button>
            </>
          )}
          {policy.status === "ARCHIVED" && canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevise}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {t("unarchive")}
            </Button>
          )}
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("overviewTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {policy.description && (
              <p className="text-muted-foreground">{policy.description}</p>
            )}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t("labelEffectiveDate")}</p>
                <p className="font-medium text-sm">{formatDate(policy.effectiveDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelReviewDate")}</p>
                <p className="font-medium text-sm">{formatDate(policy.reviewDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelApprovedBy")}</p>
                <p className="font-medium text-sm">{policy.approvedBy || "Not yet approved"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved At</p>
                <p className="font-medium text-sm">{formatDate(policy.approvedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelCreatedBy")}</p>
                <p className="font-medium text-sm">{policy.createdBy || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium text-sm">{formatDate(policy.createdAt)}</p>
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
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium text-sm">{formatRelativeTime(policy.updatedAt)}</p>
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
              <Button variant="outline" size="sm" onClick={handleEditContent}>
                <Edit className="w-4 h-4 mr-2" />
                {t("editContent")}
              </Button>
            </CardHeader>
            <CardContent>
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
                  <p className="text-sm mb-4">Add content to define this policy</p>
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
              <CardDescription>Published versions of this policy</CardDescription>
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
                            {version.createdBy && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {version.createdBy}
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
                  <p>No versions published yet</p>
                  <p className="text-sm">
                    Versions are created when a policy is published
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
                  AI systems governed by this policy
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLinkSystemDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("linkSystem")}
              </Button>
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
                          {link.aiSystem.status}
                        </Badge>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkSystem(link.aiSystem.id)}
                        disabled={unlinkSystemMutation.isPending}
                        className="shrink-0 ml-2"
                      >
                        <Unlink className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No linked systems</p>
                  <p className="text-sm mb-4">
                    Link AI systems that are governed by this policy
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
              Publishing will create version v{policy.currentVersion + 1} of this policy.
            </p>
            <div className="space-y-2">
              <Label htmlFor="changeNotes">{t("labelChangeNotes")}</Label>
              <Textarea
                id="changeNotes"
                placeholder="Describe what changed in this version..."
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
          <div className="space-y-4">
            <Textarea
              placeholder="Write your policy content here..."
              rows={12}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
            />
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

      {/* Link System Dialog */}
      <Dialog open={linkSystemDialogOpen} onOpenChange={setLinkSystemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("linkSystemDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select an AI system to link to this policy.
            </p>
            <div className="space-y-2">
              <Label>AI System</Label>
              <Select
                value={selectedSystemId}
                onValueChange={setSelectedSystemId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an AI system" />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              This policy has {policy.systemLinks?.length ?? 0} linked AI system{(policy.systemLinks?.length ?? 0) !== 1 ? "s" : ""}. Archiving it may affect their governance coverage.
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
                  Archiving...
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
