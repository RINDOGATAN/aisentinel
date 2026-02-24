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
  UNDER_REVIEW: "border-yellow-500 text-yellow-500",
  APPROVED: "border-blue-500 text-blue-500",
  PUBLISHED: "border-green-500 text-green-500",
  ARCHIVED: "border-muted-foreground/50 text-muted-foreground/50",
};

const systemStatusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  DEVELOPMENT: "border-blue-500 text-blue-500",
  TESTING: "border-yellow-500 text-yellow-500",
  DEPLOYED: "border-green-500 text-green-500",
  RETIRED: "border-muted-foreground/50 text-muted-foreground/50",
};

export default function PolicyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [editContentDialogOpen, setEditContentDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [linkSystemDialogOpen, setLinkSystemDialogOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState("");

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Policy not found</p>
        <Link href="/governance/policies">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Policies
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
    updateMutation.mutate({
      organizationId: orgId,
      id: policy.id,
      status: "ARCHIVED",
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
              Submit for Review
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
              Approve
            </Button>
          )}
          {policy.status === "APPROVED" && (
            <Button
              size="sm"
              onClick={() => setPublishDialogOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Publish
            </Button>
          )}
          {policy.status === "PUBLISHED" && (
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
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {policy.description && (
              <p className="text-muted-foreground">{policy.description}</p>
            )}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Effective Date</p>
                <p className="font-medium text-sm">{formatDate(policy.effectiveDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Review Date</p>
                <p className="font-medium text-sm">{formatDate(policy.reviewDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p className="font-medium text-sm">{policy.approvedBy || "Not yet approved"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved At</p>
                <p className="font-medium text-sm">{formatDate(policy.approvedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created By</p>
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
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-primary">{policy.versions?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Versions</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{policy.systemLinks?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Linked Systems</p>
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
            Content
          </TabsTrigger>
          <TabsTrigger value="versions" className="text-xs sm:text-sm">
            Version History ({policy.versions?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="systems" className="text-xs sm:text-sm">
            Linked Systems ({policy.systemLinks?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Policy Content</CardTitle>
                <CardDescription>The full text of this policy</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleEditContent}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Content
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
                  <p>No content yet</p>
                  <p className="text-sm mb-4">Add content to define this policy</p>
                  <Button variant="outline" onClick={handleEditContent}>
                    <Edit className="w-4 h-4 mr-2" />
                    Add Content
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
                Version History
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
                <CardTitle>Linked AI Systems</CardTitle>
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
                Link System
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
                    Link System
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
            <DialogTitle>Publish Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Publishing will create version v{policy.currentVersion + 1} of this policy.
            </p>
            <div className="space-y-2">
              <Label htmlFor="changeNotes">Change Notes</Label>
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
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publish
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
            <DialogTitle>Edit Policy Content</DialogTitle>
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
              Cancel
            </Button>
            <Button
              onClick={handleSaveContent}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Content"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link System Dialog */}
      <Dialog open={linkSystemDialogOpen} onOpenChange={setLinkSystemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link AI System</DialogTitle>
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
              Cancel
            </Button>
            <Button
              onClick={handleLinkSystem}
              disabled={!selectedSystemId || linkSystemMutation.isPending}
            >
              {linkSystemMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Link System
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
