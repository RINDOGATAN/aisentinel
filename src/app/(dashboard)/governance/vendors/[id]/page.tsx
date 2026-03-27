"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Building2,
  Loader2,
  ExternalLink,
  Globe,
  User,
  Mail,
  Calendar,
  Cpu,
  FileSearch,
  Plus,
  CheckCircle,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatDate, formatRelativeTime, getDaysUntil } from "@/lib/utils";

const riskLevelColors: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  MEDIUM: "bg-warning/20 text-warning",
  LOW: "bg-success/20 text-success",
};

const statusColors: Record<string, string> = {
  ACTIVE: "border-success text-success",
  UNDER_REVIEW: "border-warning text-warning",
  APPROVED: "border-info text-info",
  SUSPENDED: "border-warning text-warning",
  TERMINATED: "border-muted-foreground text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

const systemStatusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  DEVELOPMENT: "border-info text-info",
  TESTING: "border-warning text-warning",
  DEPLOYED: "border-success text-success",
  RETIRED: "border-muted-foreground/50 text-muted-foreground/50",
};

const assessmentStatusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  IN_PROGRESS: "border-info text-info",
  COMPLETED: "border-success text-success",
  EXPIRED: "border-destructive text-destructive",
};

const assessmentStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
};

export default function VendorDetailPage() {
  const t = useTranslations("vendorDetail");
  const tc = useTranslations("common");
  const params = useParams();
  const id = params.id as string;
  const { organization } = useOrganization();
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({ title: "", findings: "" });
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);

  const utils = trpc.useUtils();

  const { data: vendor, isLoading } = trpc.vendor.getById.useQuery(
    { organizationId: organization?.id ?? "", id },
    { enabled: !!organization?.id && !!id }
  );

  const createAssessment = trpc.vendor.createAssessment.useMutation({
    onSuccess: () => {
      toast.success("Assessment created successfully");
      utils.vendor.getById.invalidate({ organizationId: organization?.id ?? "", id });
      setAssessmentDialogOpen(false);
      setAssessmentForm({ title: "", findings: "" });
      setIsCreatingAssessment(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create assessment");
      setIsCreatingAssessment(false);
    },
  });

  const updateAssessment = trpc.vendor.updateAssessment.useMutation({
    onSuccess: () => {
      toast.success("Assessment completed");
      utils.vendor.getById.invalidate({ organizationId: organization?.id ?? "", id });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update assessment");
    },
  });

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !assessmentForm.title) return;

    setIsCreatingAssessment(true);
    createAssessment.mutate({
      organizationId: organization.id,
      vendorId: id,
      title: assessmentForm.title,
      findings: assessmentForm.findings || undefined,
    });
  };

  const handleCompleteAssessment = (assessmentId: string) => {
    if (!organization?.id) return;

    updateAssessment.mutate({
      organizationId: organization.id,
      assessmentId,
      status: "COMPLETED",
    });
  };

  if (isLoading || !organization?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Link href="/governance/vendors">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToVendors")}
          </Button>
        </Link>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntil(vendor.contractExpiryDate);
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 90;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/governance/vendors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold">{vendor.name}</h1>
                {vendor.catalogSlug && (
                  <Badge variant="secondary" className="text-xs">
                    <Database className="w-3 h-3 mr-1" />
                    Catalog
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={statusColors[vendor.status] || ""}
                >
                  {statusLabels[vendor.status] || vendor.status}
                </Badge>
                {vendor.riskLevel && (
                  <Badge className={riskLevelColors[vendor.riskLevel] || ""}>
                    {vendor.riskLevel} Risk
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("overviewTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendor.description && (
              <p className="text-muted-foreground">{vendor.description}</p>
            )}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {vendor.website && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("labelWebsite")}</p>
                  <a
                    href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    {vendor.website}
                  </a>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{t("labelContactName")}</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <User className="w-3 h-3 text-muted-foreground" />
                  {vendor.contactName || tc("notSpecified")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelContactEmail")}</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  {vendor.contactEmail || tc("notSpecified")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelContractStart")}</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {formatDate(vendor.contractStartDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("labelContractExpiry")}</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {formatDate(vendor.contractExpiryDate)}
                </p>
              </div>
            </div>

            {/* DPO Central Link */}
            {vendor.dpoCentralVendorId && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-3 p-3 bg-muted/50">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">DPO Central Vendor Record</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {vendor.dpoCentralVendorId}
                    </p>
                  </div>
                  <a
                    href={`https://dpocentral.todo.law/privacy/vendors/${vendor.dpoCentralVendorId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {/* Catalog Origin */}
            {vendor.catalogEntry && (
              <div className="pt-2 border-t">
                <Link href={`/governance/vendor-catalog/${vendor.catalogEntry.slug}`}>
                  <div className="flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 transition-colors rounded-md cursor-pointer">
                    <Database className="w-4 h-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">From AI Vendor Catalog</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{vendor.catalogEntry.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {vendor.catalogEntry.category}
                        </Badge>
                        {vendor.catalogEntry.isVerified && (
                          <CheckCircle className="w-3 h-3 text-success" />
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              </div>
            )}

            {/* Notes */}
            {vendor.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground">{vendor.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("statisticsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-primary">{vendor.systems?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t("linkedSystems")}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{vendor.assessments?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t("assessments")}</p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">{t("contractStatus")}</p>
              {isExpired ? (
                <p className="font-medium text-sm text-destructive">
                  Expired {Math.abs(daysUntilExpiry!)} days ago
                </p>
              ) : isExpiringSoon ? (
                <p className="font-medium text-sm text-warning">
                  Expires in {daysUntilExpiry} days
                </p>
              ) : daysUntilExpiry !== null ? (
                <p className="font-medium text-sm text-success">
                  {daysUntilExpiry} days remaining
                </p>
              ) : (
                <p className="font-medium text-sm text-muted-foreground">
                  No expiry date set
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium text-sm">{formatRelativeTime(vendor.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="systems">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="systems" className="text-xs sm:text-sm">
            {t("tabLinkedSystems", { count: vendor.systems?.length ?? 0 })}
          </TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs sm:text-sm">
            {t("tabAssessments", { count: vendor.assessments?.length ?? 0 })}
          </TabsTrigger>
        </TabsList>

        {/* Linked Systems Tab */}
        <TabsContent value="systems" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("linkedSystemsTitle")}</CardTitle>
              <CardDescription>
                {t("linkedSystemsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendor.systems && vendor.systems.length > 0 ? (
                <div className="space-y-3">
                  {vendor.systems.map((system) => (
                    <Link
                      key={system.id}
                      href={`/governance/ai-registry/${system.id}`}
                    >
                      <div className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <Cpu className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{system.name}</p>
                            {system.technique && (
                              <p className="text-xs text-muted-foreground">
                                {system.technique.replace(/_/g, " ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${systemStatusColors[system.status] || ""}`}
                        >
                          {system.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cpu className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("emptySystemsTitle")}</p>
                  <p className="text-sm">
                    AI systems using this vendor will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("vendorAssessmentsTitle")}</CardTitle>
                <CardDescription>
                  {t("vendorAssessmentsDescription")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssessmentDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("newAssessment")}
              </Button>
            </CardHeader>
            <CardContent>
              {vendor.assessments && vendor.assessments.length > 0 ? (
                <div className="space-y-3">
                  {vendor.assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="flex items-center justify-between p-3 bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileSearch className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{assessment.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {assessment.riskScore !== null && assessment.riskScore !== undefined && (
                              <span>Risk Score: {assessment.riskScore}</span>
                            )}
                            {assessment.completedAt && (
                              <span>Completed: {formatDate(assessment.completedAt)}</span>
                            )}
                            {assessment.nextReviewDate && (
                              <span>Next Review: {formatDate(assessment.nextReviewDate)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs ${assessmentStatusColors[assessment.status] || ""}`}
                        >
                          {assessmentStatusLabels[assessment.status] || assessment.status}
                        </Badge>
                        {assessment.status !== "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCompleteAssessment(assessment.id)}
                            disabled={updateAssessment.isPending}
                          >
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("emptyAssessmentsTitle")}</p>
                  <p className="text-sm mb-4">
                    {t("emptyAssessmentsHint")}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setAssessmentDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("newAssessment")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Assessment Dialog */}
      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogNewAssessmentTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAssessment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assessmentTitle">{t("labelAssessmentTitle")} *</Label>
              <Input
                id="assessmentTitle"
                placeholder={t("placeholderAssessmentTitle")}
                value={assessmentForm.title}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessmentFindings">{t("labelFindings")}</Label>
              <Textarea
                id="assessmentFindings"
                placeholder="Document initial findings, observations, or scope..."
                rows={4}
                value={assessmentForm.findings}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, findings: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssessmentDialogOpen(false)}
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isCreatingAssessment || !assessmentForm.title}
              >
                {isCreatingAssessment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {tc("saving")}
                  </>
                ) : (
                  t("createAssessment")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
