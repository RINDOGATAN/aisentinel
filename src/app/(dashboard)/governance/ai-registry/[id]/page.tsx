"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function AISystemDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { organization } = useOrganization();

  const { data: system, isLoading } = trpc.aiSystem.getById.useQuery(
    { organizationId: organization?.id ?? "", id },
    { enabled: !!organization?.id && !!id }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                {riskLevel && (
                  <Badge className={riskLevelColors[riskLevel] || ""}>
                    {riskLevel} Risk
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="self-start sm:self-auto">
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
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
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI Models</CardTitle>
                <CardDescription>Models and algorithms used by this system</CardDescription>
              </div>
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
      </Tabs>
    </div>
  );
}
