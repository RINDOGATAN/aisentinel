"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Search,
  Loader2,
  Globe,
  Calendar,
  User,
  Building2,
  FileText,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Cpu,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DISCOVERED: "border-warning text-warning",
  UNDER_REVIEW: "border-info text-info",
  APPROVED: "border-success text-success",
  PROHIBITED: "border-destructive text-destructive",
  REGISTERED: "border-primary text-primary",
};

const statusLabels: Record<string, string> = {
  DISCOVERED: "Discovered",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  PROHIBITED: "Prohibited",
  REGISTERED: "Registered",
};

const riskIndicatorLabels: Record<string, string> = {
  PROCESSES_PERSONAL_DATA: "Processes Personal Data",
  TRAINS_ON_INPUT: "Trains on Input",
  CLOUD_HOSTED: "Cloud Hosted",
  ON_PREMISE_AVAILABLE: "On-Premise Available",
  SOC2_CERTIFIED: "SOC 2 Certified",
  GDPR_COMPLIANT: "GDPR Compliant",
  REQUIRES_API_KEY: "Requires API Key",
};

const riskIndicatorColors: Record<string, string> = {
  PROCESSES_PERSONAL_DATA: "bg-destructive/20 text-destructive",
  TRAINS_ON_INPUT: "bg-destructive/20 text-destructive",
  CLOUD_HOSTED: "bg-warning/20 text-warning",
  ON_PREMISE_AVAILABLE: "bg-success/20 text-success",
  SOC2_CERTIFIED: "bg-success/20 text-success",
  GDPR_COMPLIANT: "bg-success/20 text-success",
  REQUIRES_API_KEY: "bg-info/20 text-info",
};

export default function ShadowAIDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { organization } = useOrganization();
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState("");

  const utils = trpc.useUtils();

  const { data: report, isLoading } = trpc.shadowAi.getReportById.useQuery(
    { organizationId: organization?.id ?? "", id },
    { enabled: !!organization?.id && !!id }
  );

  const { data: systemsData } = trpc.aiSystem.list.useQuery(
    { organizationId: organization?.id ?? "", limit: 100 },
    { enabled: !!organization?.id && registerDialogOpen }
  );

  const systems = systemsData?.items ?? [];

  const updateReport = trpc.shadowAi.updateReport.useMutation({
    onSuccess: () => {
      toast.success("Report updated");
      utils.shadowAi.getReportById.invalidate({
        organizationId: organization?.id ?? "",
        id,
      });
      utils.shadowAi.listReports.invalidate();
      utils.shadowAi.getStats.invalidate();
      setRegisterDialogOpen(false);
      setSelectedSystemId("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update report");
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (!organization?.id) return;

    if (newStatus === "REGISTERED") {
      setRegisterDialogOpen(true);
      return;
    }

    updateReport.mutate({
      organizationId: organization.id,
      id,
      status: newStatus,
    });
  };

  const handleRegister = () => {
    if (!organization?.id || !selectedSystemId) return;

    updateReport.mutate({
      organizationId: organization.id,
      id,
      status: "REGISTERED",
      registeredSystemId: selectedSystemId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Report not found</p>
        <Link href="/governance/shadow-ai">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shadow AI
          </Button>
        </Link>
      </div>
    );
  }

  // Determine available transitions
  const transitions: { label: string; status: string; variant: "default" | "outline" | "destructive" }[] = [];
  if (report.status === "DISCOVERED") {
    transitions.push({ label: "Start Review", status: "UNDER_REVIEW", variant: "default" });
  } else if (report.status === "UNDER_REVIEW") {
    transitions.push({ label: "Approve", status: "APPROVED", variant: "default" });
    transitions.push({ label: "Prohibit", status: "PROHIBITED", variant: "destructive" });
  } else if (report.status === "APPROVED") {
    transitions.push({ label: "Register as AI System", status: "REGISTERED", variant: "default" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/governance/shadow-ai">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center shrink-0">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">
                {report.toolName}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={statusColors[report.status] || ""}
                >
                  {statusLabels[report.status] || report.status}
                </Badge>
                {report.tool?.category && (
                  <Badge variant="secondary">
                    {report.tool.category.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Transition Buttons */}
        {transitions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {transitions.map((t) => (
              <Button
                key={t.status}
                variant={t.variant}
                size="sm"
                onClick={() => handleStatusChange(t.status)}
                disabled={updateReport.isPending}
              >
                {updateReport.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {t.status === "UNDER_REVIEW" && <Eye className="w-4 h-4 mr-2" />}
                {t.status === "APPROVED" && <CheckCircle className="w-4 h-4 mr-2" />}
                {t.status === "PROHIBITED" && <XCircle className="w-4 h-4 mr-2" />}
                {t.status === "REGISTERED" && <Cpu className="w-4 h-4 mr-2" />}
                {t.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.usageDescription && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Usage Description</p>
                <p className="text-sm">{report.usageDescription}</p>
              </div>
            )}

            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  {report.department || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reported By</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <User className="w-3 h-3 text-muted-foreground" />
                  {report.reportedBy || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reported</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {formatDate(report.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium text-sm">
                  {formatRelativeTime(report.updatedAt)}
                </p>
              </div>
            </div>

            {/* Registered System Link */}
            {report.status === "REGISTERED" && report.registeredSystemId && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-3 p-3 bg-muted/50">
                  <Cpu className="w-4 h-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Registered AI System</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {report.registeredSystemId}
                    </p>
                  </div>
                  <Link
                    href={`/governance/ai-registry/${report.registeredSystemId}`}
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tool Info */}
        <Card>
          <CardHeader>
            <CardTitle>Tool Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.tool ? (
              <>
                {report.tool.vendor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-medium text-sm">{report.tool.vendor}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium text-sm">
                    {report.tool.category.replace(/_/g, " ")}
                  </p>
                </div>
                {report.tool.website && (
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a
                      href={
                        report.tool.website.startsWith("http")
                          ? report.tool.website
                          : `https://${report.tool.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      {report.tool.website}
                    </a>
                  </div>
                )}
                {report.tool.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{report.tool.description}</p>
                  </div>
                )}
                {report.tool.riskIndicators &&
                  report.tool.riskIndicators.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Risk Indicators
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.tool.riskIndicators.map((indicator) => (
                          <Badge
                            key={indicator}
                            className={`text-xs ${riskIndicatorColors[indicator] || "bg-muted text-muted-foreground"}`}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {riskIndicatorLabels[indicator] || indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Custom tool</p>
                <p className="text-xs">Not in catalog</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Register Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register as AI System</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Link this shadow AI tool to an existing AI system in your registry.
              This will mark the report as registered.
            </p>
            <div className="space-y-2">
              <Label htmlFor="systemSelect">AI System *</Label>
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
                      {system.name} ({system.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRegisterDialogOpen(false);
                setSelectedSystemId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!selectedSystemId || updateReport.isPending}
            >
              {updateReport.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
