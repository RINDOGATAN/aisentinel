"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Cpu,
  Edit,
  Loader2,
  Brain,
  Database,
  Shield,
  FileSearch,
  ExternalLink,
  User,
  Calendar,
  Building2,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  ScrollText,
  Eye,
  Gavel,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  DEVELOPMENT: "border-info text-info",
  TESTING: "border-warning text-warning",
  DEPLOYED: "border-success text-success",
  RETIRED: "border-muted-foreground/50 text-muted-foreground/50",
};

const riskLevelColors: Record<string, string> = {
  UNACCEPTABLE: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  LIMITED: "bg-warning/20 text-warning",
  MINIMAL: "bg-success/20 text-success",
};

const techniqueLabels: Record<string, string> = {
  MACHINE_LEARNING: "Machine Learning",
  DEEP_LEARNING: "Deep Learning",
  GENERATIVE_AI: "Generative AI",
  AGENTIC_AI: "Agentic AI",
  NLP: "Natural Language Processing",
  COMPUTER_VISION: "Computer Vision",
  SPEECH_RECOGNITION: "Speech Recognition",
  ROBOTICS: "Robotics",
  RULE_BASED: "Rule-Based",
  EXPERT_SYSTEM: "Expert System",
  STATISTICAL: "Statistical",
  OTHER: "Other",
};

const roleLabels: Record<string, string> = {
  PROVIDER: "Provider",
  DEPLOYER: "Deployer",
  IMPORTER: "Importer",
  DISTRIBUTOR: "Distributor",
  USER: "User",
};

const dataSourceTypeLabels: Record<string, string> = {
  TRAINING: "Training",
  FINE_TUNING: "Fine-Tuning",
  VALIDATION: "Validation",
  INPUT: "Input",
  OUTPUT: "Output",
};

const dataSourceTypeColors: Record<string, string> = {
  TRAINING: "border-info text-info",
  FINE_TUNING: "border-purple-500 text-purple-500",
  VALIDATION: "border-warning text-warning",
  INPUT: "border-success text-success",
  OUTPUT: "border-warning text-warning",
};

const assessmentStatusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  IN_PROGRESS: "border-info text-info",
  UNDER_REVIEW: "border-warning text-warning",
  APPROVED: "border-success text-success",
  REJECTED: "border-destructive text-destructive",
};

const gateTypeColors: Record<string, string> = {
  PRE_DEPLOYMENT: "border-info text-info",
  POST_DEPLOYMENT: "border-success text-success",
  PERIODIC_REVIEW: "border-warning text-warning",
  INCIDENT_TRIGGERED: "border-destructive text-destructive",
  MATERIAL_CHANGE: "border-purple-500 text-purple-500",
};

const gateStatusColors: Record<string, string> = {
  PENDING: "border-muted-foreground text-muted-foreground",
  IN_REVIEW: "border-info text-info",
  PASSED: "border-success text-success",
  FAILED: "border-destructive text-destructive",
  DEFERRED: "border-warning text-warning",
};

const severityColors: Record<string, string> = {
  CRITICAL: "bg-destructive/20 text-destructive",
  HIGH: "bg-destructive/15 text-destructive",
  MEDIUM: "bg-warning/20 text-warning",
  LOW: "bg-muted text-muted-foreground",
};

const incidentStatusColors: Record<string, string> = {
  REPORTED: "border-muted-foreground text-muted-foreground",
  INVESTIGATING: "border-info text-info",
  MITIGATING: "border-warning text-warning",
  RESOLVED: "border-success text-success",
  CLOSED: "border-muted-foreground/50 text-muted-foreground/50",
};

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

const policyStatusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  UNDER_REVIEW: "border-warning text-warning",
  APPROVED: "border-success text-success",
  PUBLISHED: "border-info text-info",
  ARCHIVED: "border-muted-foreground/50 text-muted-foreground/50",
};

const techniques = [
  "MACHINE_LEARNING", "DEEP_LEARNING", "GENERATIVE_AI", "AGENTIC_AI", "NLP",
  "COMPUTER_VISION", "SPEECH_RECOGNITION", "ROBOTICS", "RULE_BASED",
  "EXPERT_SYSTEM", "STATISTICAL", "OTHER",
] as const;

const roles = ["PROVIDER", "DEPLOYER", "IMPORTER", "DISTRIBUTOR", "USER"] as const;

const sourceTypes = ["TRAINING", "FINE_TUNING", "VALIDATION", "INPUT", "OUTPUT"] as const;

type EditForm = {
  name: string;
  description: string;
  technique: string;
  role: string;
  purpose: string;
  businessOwner: string;
  technicalOwner: string;
  processesPersonalData: boolean;
  vendorId: string | null;
};

type ModelForm = {
  id?: string;
  name: string;
  provider: string;
  modelType: string;
  version: string;
  trainingDataSummary: string;
  knownLimitations: string;
};

type DataSourceForm = {
  id?: string;
  name: string;
  sourceType: string;
  description: string;
  containsPersonalData: boolean;
};

const emptyModelForm: ModelForm = {
  name: "",
  provider: "",
  modelType: "",
  version: "",
  trainingDataSummary: "",
  knownLimitations: "",
};

const emptyDataSourceForm: DataSourceForm = {
  name: "",
  sourceType: "TRAINING",
  description: "",
  containsPersonalData: false,
};

export default function AISystemDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { organization, canWrite } = useOrganization();
  const utils = trpc.useUtils();
  const organizationId = organization?.id ?? "";

  // --- Edit dialog state ---
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    description: "",
    technique: "MACHINE_LEARNING",
    role: "DEPLOYER",
    purpose: "",
    businessOwner: "",
    technicalOwner: "",
    processesPersonalData: false,
    vendorId: null,
  });

  // --- Model dialog state ---
  const [modelOpen, setModelOpen] = useState(false);
  const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm);

  // --- Data Source dialog state ---
  const [dataSourceOpen, setDataSourceOpen] = useState(false);
  const [dataSourceForm, setDataSourceForm] = useState<DataSourceForm>(emptyDataSourceForm);

  // --- Queries ---
  const { data: system, isLoading } = trpc.aiSystem.getById.useQuery(
    { organizationId, id },
    { enabled: !!organization?.id && !!id }
  );

  const { data: scorecard } = trpc.compliance.getSystemScorecard.useQuery(
    { organizationId, aiSystemId: id },
    { enabled: !!organization?.id && !!id }
  );

  const { data: vendorData } = trpc.vendor.list.useQuery(
    { organizationId, limit: 100 },
    { enabled: !!organization?.id && editOpen }
  );

  // --- Mutations ---
  const updateSystem = trpc.aiSystem.update.useMutation({
    onSuccess: () => {
      utils.aiSystem.getById.invalidate({ organizationId, id });
      toast.success("AI system updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const addModel = trpc.aiSystem.addModel.useMutation({
    onSuccess: () => {
      utils.aiSystem.getById.invalidate({ organizationId, id });
      setModelOpen(false);
      toast.success("Model added");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateModel = trpc.aiSystem.updateModel.useMutation({
    onSuccess: () => {
      utils.aiSystem.getById.invalidate({ organizationId, id });
      setModelOpen(false);
      toast.success("Model updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteModel = trpc.aiSystem.deleteModel.useMutation({
    onSuccess: () => {
      utils.aiSystem.getById.invalidate({ organizationId, id });
      toast.success("Model deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const addDataSource = trpc.aiSystem.addDataSource.useMutation({
    onSuccess: () => {
      utils.aiSystem.getById.invalidate({ organizationId, id });
      setDataSourceOpen(false);
      toast.success("Data source added");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateDataSource = trpc.aiSystem.updateDataSource.useMutation({
    onSuccess: () => {
      utils.aiSystem.getById.invalidate({ organizationId, id });
      setDataSourceOpen(false);
      toast.success("Data source updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteDataSource = trpc.aiSystem.deleteDataSource.useMutation({
    onSuccess: () => {
      utils.aiSystem.getById.invalidate({ organizationId, id });
      toast.success("Data source deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  // --- Loading / Not Found ---
  if (isLoading || !organization?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!system) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">AI system not found</p>
        <Link href="/governance/ai-registry">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Registry
          </Button>
        </Link>
      </div>
    );
  }

  const riskLevel = system.riskClassification?.riskLevel;
  const hasDpoCentralLinks =
    system.dpoCentralVendorId || (system.dpoCentralAssetIds && system.dpoCentralAssetIds.length > 0);

  // --- Edit helpers ---
  const openEditDialog = () => {
    setEditForm({
      name: system.name,
      description: system.description ?? "",
      technique: system.technique,
      role: system.role,
      purpose: system.purpose ?? "",
      businessOwner: system.businessOwner ?? "",
      technicalOwner: system.technicalOwner ?? "",
      processesPersonalData: system.processesPersonalData,
      vendorId: system.vendor?.id ?? null,
    });
    setEditOpen(true);
  };

  const submitEdit = () => {
    updateSystem.mutate({
      organizationId,
      id,
      name: editForm.name,
      description: editForm.description || undefined,
      technique: editForm.technique as typeof techniques[number],
      role: editForm.role as typeof roles[number],
      purpose: editForm.purpose || undefined,
      businessOwner: editForm.businessOwner || undefined,
      technicalOwner: editForm.technicalOwner || undefined,
      processesPersonalData: editForm.processesPersonalData,
      vendorId: editForm.vendorId || null,
    });
    setEditOpen(false);
  };

  // --- Model helpers ---
  const openAddModel = () => {
    setModelForm({ ...emptyModelForm });
    setModelOpen(true);
  };

  const openEditModel = (model: NonNullable<typeof system.models>[number]) => {
    setModelForm({
      id: model.id,
      name: model.name,
      provider: model.provider ?? "",
      modelType: model.modelType ?? "",
      version: model.version ?? "",
      trainingDataSummary: model.trainingDataSummary ?? "",
      knownLimitations: model.knownLimitations ?? "",
    });
    setModelOpen(true);
  };

  const submitModel = () => {
    if (modelForm.id) {
      updateModel.mutate({
        organizationId,
        modelId: modelForm.id,
        name: modelForm.name,
        provider: modelForm.provider || undefined,
        modelType: modelForm.modelType || undefined,
        version: modelForm.version || undefined,
        trainingDataSummary: modelForm.trainingDataSummary || undefined,
        knownLimitations: modelForm.knownLimitations || undefined,
      });
    } else {
      addModel.mutate({
        organizationId,
        aiSystemId: id,
        name: modelForm.name,
        provider: modelForm.provider || undefined,
        modelType: modelForm.modelType || undefined,
        version: modelForm.version || undefined,
        trainingDataSummary: modelForm.trainingDataSummary || undefined,
        knownLimitations: modelForm.knownLimitations || undefined,
      });
    }
  };

  // --- Data Source helpers ---
  const openAddDataSource = () => {
    setDataSourceForm({ ...emptyDataSourceForm });
    setDataSourceOpen(true);
  };

  const openEditDataSource = (ds: NonNullable<typeof system.dataSources>[number]) => {
    setDataSourceForm({
      id: ds.id,
      name: ds.name,
      sourceType: ds.sourceType,
      description: ds.description ?? "",
      containsPersonalData: ds.containsPersonalData,
    });
    setDataSourceOpen(true);
  };

  const submitDataSource = () => {
    if (dataSourceForm.id) {
      updateDataSource.mutate({
        organizationId,
        dataSourceId: dataSourceForm.id,
        name: dataSourceForm.name,
        sourceType: dataSourceForm.sourceType as typeof sourceTypes[number],
        description: dataSourceForm.description || undefined,
        containsPersonalData: dataSourceForm.containsPersonalData,
      });
    } else {
      addDataSource.mutate({
        organizationId,
        aiSystemId: id,
        name: dataSourceForm.name,
        sourceType: dataSourceForm.sourceType as typeof sourceTypes[number],
        description: dataSourceForm.description || undefined,
        containsPersonalData: dataSourceForm.containsPersonalData,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/governance/ai-registry">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">{system.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={statusColors[system.status] || ""}
                >
                  {system.status}
                </Badge>
                {canWrite && (
                  <Select
                    value={system.status}
                    onValueChange={(val) =>
                      updateSystem.mutate({ organizationId, id, status: val as "DRAFT" | "DEVELOPMENT" | "TESTING" | "DEPLOYED" | "RETIRED" })
                    }
                  >
                    <SelectTrigger className="w-[160px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["DRAFT", "DEVELOPMENT", "TESTING", "DEPLOYED", "RETIRED"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {riskLevel && (
                  <Badge className={riskLevelColors[riskLevel] || ""}>
                    {riskLevel} Risk
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        {canWrite && (
          <Button
            variant="outline"
            size="sm"
            className="self-start sm:self-auto"
            onClick={openEditDialog}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {system.description && (
              <p className="text-muted-foreground">{system.description}</p>
            )}
            {system.purpose && (
              <div>
                <p className="text-sm font-medium mb-1">Intended Purpose</p>
                <p className="text-sm text-muted-foreground">{system.purpose}</p>
              </div>
            )}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Technique</p>
                <p className="font-medium text-sm">
                  {techniqueLabels[system.technique] || system.technique}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium text-sm">
                  {roleLabels[system.role] || system.role}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Personal Data</p>
                <p className="font-medium text-sm">
                  {system.processesPersonalData ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Owner</p>
                <p className="font-medium text-sm">{system.businessOwner || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Technical Owner</p>
                <p className="font-medium text-sm">{system.technicalOwner || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deployment Date</p>
                <p className="font-medium text-sm">{formatDate(system.deploymentDate)}</p>
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
              <p className="text-3xl font-bold text-primary">{system.models?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Models</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{system.dataSources?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Data Sources</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{system.assessments?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Assessments</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{system._count?.complianceMappings ?? 0}</p>
              <p className="text-sm text-muted-foreground">Compliance Mappings</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium text-sm">{formatRelativeTime(system.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Scorecard */}
      {scorecard && scorecard.total > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Compliance Scorecard
                </CardTitle>
                <CardDescription className="mt-1">
                  {scorecard.total} requirements across {scorecard.frameworks.length} framework{scorecard.frameworks.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Link href="/governance/compliance" className="self-start">
                <Button variant="outline" size="sm">
                  View Matrix
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall compliance */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-2xl sm:text-3xl font-bold text-primary shrink-0">
                {scorecard.compliancePercent}%
              </div>
              <div className="flex-1 min-w-0">
                <Progress value={scorecard.compliancePercent} className="h-3" />
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  <span>{scorecard.totalCompliant} compliant</span>
                  <span>{scorecard.totalPartial} partial</span>
                  <span>{scorecard.totalNonCompliant} non-compliant</span>
                  <span>{scorecard.total - scorecard.assessed - scorecard.totalNotApplicable} not assessed</span>
                </div>
              </div>
            </div>

            {/* Per-framework breakdown */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              {scorecard.frameworks.map((fw) => {
                const applicable = fw.compliant + fw.partial + fw.nonCompliant + fw.notAssessed;
                const fwPercent =
                  applicable > 0
                    ? Math.round(((fw.compliant + fw.partial) / applicable) * 100)
                    : 0;
                return (
                  <div key={fw.frameworkId} className="rounded-xl border border-border p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{fw.frameworkCode}</p>
                      <span className="text-sm font-bold text-primary">{fwPercent}%</span>
                    </div>
                    <Progress value={fwPercent} className="h-2" />
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        {fw.compliant}
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-yellow-400" />
                        {fw.partial}
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-400" />
                        {fw.nonCompliant}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top gaps */}
            {scorecard.frameworks.some((fw) => fw.gaps.length > 0) && (
              <div>
                <p className="text-sm font-medium mb-3">Top Gaps</p>
                <div className="space-y-2">
                  {scorecard.frameworks
                    .flatMap((fw) =>
                      fw.gaps.map((g) => ({ ...g, frameworkCode: fw.frameworkCode }))
                    )
                    .sort((a, b) => {
                      if (a.status === "NON_COMPLIANT" && b.status !== "NON_COMPLIANT") return -1;
                      if (a.status !== "NON_COMPLIANT" && b.status === "NON_COMPLIANT") return 1;
                      return 0;
                    })
                    .slice(0, 5)
                    .map((gap) => (
                      <div
                        key={`${gap.frameworkCode}-${gap.code}`}
                        className="rounded-lg bg-muted/50 p-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {gap.status === "NON_COMPLIANT" ? (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <Badge variant="outline" className="text-xs shrink-0">
                            {gap.frameworkCode}
                          </Badge>
                          <span className="font-medium shrink-0">{gap.code}</span>
                          <Badge
                            className={`text-xs shrink-0 ml-auto ${
                              gap.status === "NON_COMPLIANT"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {gap.status === "NON_COMPLIANT" ? "Non-Compliant" : "Not Assessed"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1 ml-6 line-clamp-1">
                          {gap.title}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DPO Central Links */}
      {hasDpoCentralLinks && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              DPO Central Links
            </CardTitle>
            <CardDescription>
              Linked records in DPO Central privacy management platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {system.dpoCentralVendorId && (
              <div className="flex items-center gap-3 p-3 bg-muted/50">
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Vendor Record</p>
                  <p className="text-xs text-muted-foreground truncate">
                    ID: {system.dpoCentralVendorId}
                  </p>
                </div>
                <a
                  href={`https://dpocentral.todo.law/privacy/vendors/${system.dpoCentralVendorId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            )}
            {system.dpoCentralAssetIds?.map((assetId) => (
              <div key={assetId} className="flex items-center gap-3 p-3 bg-muted/50">
                <Database className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Data Asset</p>
                  <p className="text-xs text-muted-foreground truncate">
                    ID: {assetId}
                  </p>
                </div>
                <a
                  href={`https://dpocentral.todo.law/privacy/data-inventory/${assetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Linked Vendor */}
      {system.vendor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Linked Vendor
            </CardTitle>
            <CardDescription>
              Third-party AI vendor associated with this system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/governance/vendors/${system.vendor.id}`}>
              <div className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">{system.vendor.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {system.vendor.riskLevel && (
                        <Badge className={`text-xs ${
                          system.vendor.riskLevel === "CRITICAL" || system.vendor.riskLevel === "HIGH"
                            ? "bg-destructive/20 text-destructive"
                            : system.vendor.riskLevel === "MEDIUM"
                              ? "bg-warning/20 text-warning"
                              : "bg-success/20 text-success"
                        }`}>
                          {system.vendor.riskLevel} Risk
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {system.vendor.status}
                      </Badge>
                      {system.vendor.website && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {system.vendor.website}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="models">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="models" className="text-xs sm:text-sm">
            Models ({system.models?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="data-sources" className="text-xs sm:text-sm">
            Data Sources ({system.dataSources?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs sm:text-sm">
            Risk Classification
          </TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs sm:text-sm">
            Assessments ({system.assessments?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="oversight" className="text-xs sm:text-sm">
            Oversight ({system.oversightGates?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="policies" className="text-xs sm:text-sm">
            Policies ({system.policyLinks?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs sm:text-sm">
            Incidents ({system.incidents?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI Models</CardTitle>
                <CardDescription>Models and algorithms used by this system</CardDescription>
              </div>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={openAddModel}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Model
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {system.models && system.models.length > 0 ? (
                <div className="space-y-3">
                  {system.models.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-3 bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Brain className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{model.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {model.provider && <span>{model.provider}</span>}
                            {model.version && (
                              <>
                                <span>v{model.version}</span>
                              </>
                            )}
                            {model.modelType && <span>{model.modelType}</span>}
                          </div>
                        </div>
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditModel(model)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteModel.mutate({ organizationId, modelId: model.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No models registered yet</p>
                  <p className="text-sm">Add models to document the AI components of this system</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Sources Tab */}
        <TabsContent value="data-sources" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>Training, validation, and input data sources</CardDescription>
              </div>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={openAddDataSource}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Data Source
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {system.dataSources && system.dataSources.length > 0 ? (
                <div className="space-y-3">
                  {system.dataSources.map((ds) => (
                    <div
                      key={ds.id}
                      className="flex items-center justify-between p-3 bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Database className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{ds.name}</p>
                          {ds.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {ds.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs ${dataSourceTypeColors[ds.sourceType] || ""}`}
                        >
                          {dataSourceTypeLabels[ds.sourceType] || ds.sourceType}
                        </Badge>
                        {ds.containsPersonalData && (
                          <Badge variant="outline" className="text-xs border-warning text-warning">
                            Personal Data
                          </Badge>
                        )}
                        {canWrite && (
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDataSource(ds)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteDataSource.mutate({ organizationId, dataSourceId: ds.id })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No data sources documented yet</p>
                  <p className="text-sm">
                    Document training, validation, and input data sources
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Classification Tab */}
        <TabsContent value="risk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Risk Classification
              </CardTitle>
              <CardDescription>EU AI Act four-tier risk classification</CardDescription>
            </CardHeader>
            <CardContent>
              {system.riskClassification ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge
                      className={`text-sm px-3 py-1 ${
                        riskLevelColors[system.riskClassification.riskLevel] || ""
                      }`}
                    >
                      {system.riskClassification.riskLevel} Risk
                    </Badge>
                    {system.riskClassification.annexIIICategory && (
                      <Badge variant="outline" className="text-xs">
                        Annex III: {system.riskClassification.annexIIICategory}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Rationale</p>
                    <p className="text-sm text-muted-foreground">
                      {system.riskClassification.rationale}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Classified {formatDate(system.riskClassification.classifiedAt)}
                    </span>
                  </div>

                  {/* History */}
                  {system.riskClassification.history &&
                    system.riskClassification.history.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-3">Classification History</p>
                        <div className="space-y-2">
                          {system.riskClassification.history.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center gap-3 text-xs text-muted-foreground p-2 bg-muted/50"
                            >
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span className="font-medium">
                                {entry.previousLevel} &rarr; {entry.newLevel}
                              </span>
                              <span className="truncate">{entry.rationale}</span>
                              <span className="shrink-0 ml-auto">
                                {formatDate(entry.changedAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Not classified yet</p>
                  <p className="text-sm mb-4">
                    Classify this system under the EU AI Act risk framework
                  </p>
                  <Link href="/governance/risk-classification">
                    <Button variant="outline">
                      <Shield className="w-4 h-4 mr-2" />
                      Classify Risk
                    </Button>
                  </Link>
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
                <CardTitle>Assessments</CardTitle>
                <CardDescription>
                  FRIA, conformity, and other assessments for this system
                </CardDescription>
              </div>
              <Link href="/governance/assessments/new">
                <Button size="sm" variant="outline">
                  <FileSearch className="w-4 h-4 mr-2" />
                  New Assessment
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {system.assessments && system.assessments.length > 0 ? (
                <div className="space-y-3">
                  {system.assessments.map((assessment) => (
                    <Link
                      key={assessment.id}
                      href={`/governance/assessments/${assessment.id}`}
                    >
                      <div className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileSearch className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{assessment.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {assessment.template?.name || assessment.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {assessment.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${assessmentStatusColors[assessment.status] || ""}`}
                          >
                            {assessment.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No assessments yet</p>
                  <p className="text-sm mb-4">
                    Create a FRIA or other assessment for this AI system
                  </p>
                  <Link href="/governance/assessments/new">
                    <Button variant="outline">
                      <FileSearch className="w-4 h-4 mr-2" />
                      New Assessment
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oversight Gates Tab */}
        <TabsContent value="oversight" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Oversight Gates
                </CardTitle>
                <CardDescription>
                  Human oversight checkpoints for this AI system
                </CardDescription>
              </div>
              <Link href="/governance/oversight/new">
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  New Gate
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {system.oversightGates && system.oversightGates.length > 0 ? (
                <div className="space-y-3">
                  {system.oversightGates.map((gate) => (
                    <Link
                      key={gate.id}
                      href={`/governance/oversight/${gate.id}`}
                    >
                      <div className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <Eye className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs ${gateTypeColors[gate.gateType] || ""}`}
                              >
                                {gate.gateType.replace(/_/g, " ")}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${gateStatusColors[gate.status] || ""}`}
                              >
                                {gate.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {gate.assignedTo && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {gate.assignedTo}
                                </span>
                              )}
                              {gate.nextReviewDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Next review: {formatDate(gate.nextReviewDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No oversight gates</p>
                  <p className="text-sm mb-4">
                    Create human oversight checkpoints for this AI system
                  </p>
                  <Link href="/governance/oversight/new">
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      New Gate
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="w-5 h-5" />
                  Linked Policies
                </CardTitle>
                <CardDescription>
                  Governance policies linked to this AI system
                </CardDescription>
              </div>
              <Link href="/governance/policies/new">
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  New Policy
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {system.policyLinks && system.policyLinks.length > 0 ? (
                <div className="space-y-3">
                  {system.policyLinks.map((link) => (
                    <Link
                      key={link.policy.id}
                      href={`/governance/policies/${link.policy.id}`}
                    >
                      <div className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <ScrollText className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{link.policy.title}</p>
                            {link.policy.currentVersion && (
                              <p className="text-xs text-muted-foreground">
                                v{link.policy.currentVersion}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {policyTypeLabels[link.policy.type] || link.policy.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${policyStatusColors[link.policy.status] || ""}`}
                          >
                            {link.policy.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No linked policies</p>
                  <p className="text-sm">
                    Link governance policies to this AI system from the Policies module
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Incidents
                </CardTitle>
                <CardDescription>
                  AI incidents reported for this system
                </CardDescription>
              </div>
              <Link href="/governance/incidents/new">
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Report Incident
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {system.incidents && system.incidents.length > 0 ? (
                <div className="space-y-3">
                  {system.incidents.map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/governance/incidents/${incident.id}`}
                    >
                      <div className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{incident.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Reported {formatDate(incident.reportedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            className={`text-xs ${severityColors[incident.severity] || ""}`}
                          >
                            {incident.severity}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${incidentStatusColors[incident.status] || ""}`}
                          >
                            {incident.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No incidents reported</p>
                  <p className="text-sm mb-4">
                    Report and track AI incidents for this system
                  </p>
                  <Link href="/governance/incidents/new">
                    <Button variant="outline">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Report Incident
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========== DIALOGS ========== */}

      {/* Edit AI System Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AI System</DialogTitle>
            <DialogDescription>
              Update the details of this AI system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Technique</Label>
                <Select
                  value={editForm.technique}
                  onValueChange={(val) => setEditForm((f) => ({ ...f, technique: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {techniques.map((t) => (
                      <SelectItem key={t} value={t}>
                        {techniqueLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(val) => setEditForm((f) => ({ ...f, role: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabels[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-purpose">Purpose</Label>
              <Textarea
                id="edit-purpose"
                value={editForm.purpose}
                onChange={(e) => setEditForm((f) => ({ ...f, purpose: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-business-owner">Business Owner</Label>
                <Input
                  id="edit-business-owner"
                  value={editForm.businessOwner}
                  onChange={(e) => setEditForm((f) => ({ ...f, businessOwner: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-technical-owner">Technical Owner</Label>
                <Input
                  id="edit-technical-owner"
                  value={editForm.technicalOwner}
                  onChange={(e) => setEditForm((f) => ({ ...f, technicalOwner: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="edit-personal-data"
                checked={editForm.processesPersonalData}
                onCheckedChange={(checked) => setEditForm((f) => ({ ...f, processesPersonalData: checked }))}
              />
              <Label htmlFor="edit-personal-data">Processes Personal Data</Label>
            </div>
            <div className="space-y-2">
              <Label>Linked Vendor</Label>
              <Select
                value={editForm.vendorId ?? "none"}
                onValueChange={(val) => setEditForm((f) => ({ ...f, vendorId: val === "none" ? null : val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vendor</SelectItem>
                  {vendorData?.items?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitEdit}
              disabled={!editForm.name || updateSystem.isPending}
            >
              {updateSystem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Model Dialog */}
      <Dialog open={modelOpen} onOpenChange={setModelOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modelForm.id ? "Edit Model" : "Add Model"}</DialogTitle>
            <DialogDescription>
              {modelForm.id
                ? "Update the details of this AI model."
                : "Add a new model to this AI system."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="model-name">Name *</Label>
              <Input
                id="model-name"
                value={modelForm.name}
                onChange={(e) => setModelForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. GPT-4o, Claude 3.5 Sonnet"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model-provider">Provider</Label>
                <Input
                  id="model-provider"
                  value={modelForm.provider}
                  onChange={(e) => setModelForm((f) => ({ ...f, provider: e.target.value }))}
                  placeholder="e.g. OpenAI, Anthropic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-type">Model Type</Label>
                <Input
                  id="model-type"
                  value={modelForm.modelType}
                  onChange={(e) => setModelForm((f) => ({ ...f, modelType: e.target.value }))}
                  placeholder="e.g. LLM, Classifier"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-version">Version</Label>
              <Input
                id="model-version"
                value={modelForm.version}
                onChange={(e) => setModelForm((f) => ({ ...f, version: e.target.value }))}
                placeholder="e.g. 1.0, 2024-03"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-training">Training Data Summary</Label>
              <Textarea
                id="model-training"
                value={modelForm.trainingDataSummary}
                onChange={(e) => setModelForm((f) => ({ ...f, trainingDataSummary: e.target.value }))}
                rows={2}
                placeholder="Describe the training data used..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-limitations">Known Limitations</Label>
              <Textarea
                id="model-limitations"
                value={modelForm.knownLimitations}
                onChange={(e) => setModelForm((f) => ({ ...f, knownLimitations: e.target.value }))}
                rows={2}
                placeholder="Describe any known limitations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitModel}
              disabled={!modelForm.name || addModel.isPending || updateModel.isPending}
            >
              {(addModel.isPending || updateModel.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {modelForm.id ? "Save Changes" : "Add Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Data Source Dialog */}
      <Dialog open={dataSourceOpen} onOpenChange={setDataSourceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dataSourceForm.id ? "Edit Data Source" : "Add Data Source"}</DialogTitle>
            <DialogDescription>
              {dataSourceForm.id
                ? "Update the details of this data source."
                : "Add a new data source to this AI system."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ds-name">Name *</Label>
              <Input
                id="ds-name"
                value={dataSourceForm.name}
                onChange={(e) => setDataSourceForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Customer Support Tickets"
              />
            </div>
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select
                value={dataSourceForm.sourceType}
                onValueChange={(val) => setDataSourceForm((f) => ({ ...f, sourceType: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {dataSourceTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-description">Description</Label>
              <Textarea
                id="ds-description"
                value={dataSourceForm.description}
                onChange={(e) => setDataSourceForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe this data source..."
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="ds-personal-data"
                checked={dataSourceForm.containsPersonalData}
                onCheckedChange={(checked) => setDataSourceForm((f) => ({ ...f, containsPersonalData: checked }))}
              />
              <Label htmlFor="ds-personal-data">Contains Personal Data</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDataSourceOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitDataSource}
              disabled={!dataSourceForm.name || addDataSource.isPending || updateDataSource.isPending}
            >
              {(addDataSource.isPending || updateDataSource.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {dataSourceForm.id ? "Save Changes" : "Add Data Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
