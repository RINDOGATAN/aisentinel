"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cpu,
  Rocket,
  AlertTriangle,
  ClipboardCheck,
  ArrowRight,
  Plus,
  ShieldCheck,
  FileSearch,
  Clock,
  Loader2,
  Building2,
  ChevronDown,
  Eye,
  ScrollText,
  Search,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatRelativeTime } from "@/lib/utils";
import { DeploymentExpertCta } from "@/components/governance/deployment-expert-cta";

export default function GovernanceDashboardPage() {
  const { organization, organizations, setOrganization, canWrite } = useOrganization();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  const { data: stats, isLoading } = trpc.organization.getDashboardStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const recentActivity = stats?.recentAuditLogs ?? [];
  const riskPosture = stats?.riskPosture ?? { unacceptable: 0, high: 0, limited: 0, minimal: 0 };
  const incidents = stats?.incidents ?? { total: 0, critical: 0, open: 0 };
  const oversight = stats?.oversight ?? { pending: 0, overdue: 0 };
  const pipeline = stats?.assessmentPipeline ?? { draft: 0, inProgress: 0, underReview: 0, approved: 0 };
  const compliance = stats?.complianceSummary ?? { compliant: 0, partial: 0, nonCompliant: 0, notAssessed: 0 };

  const riskTotal = riskPosture.unacceptable + riskPosture.high + riskPosture.limited + riskPosture.minimal;
  const complianceTotal = compliance.compliant + compliance.partial + compliance.nonCompliant + compliance.notAssessed;

  const actionLabels: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    APPROVE: "Approved",
    REJECT: "Rejected",
    PUBLISH: "Published",
    SUBMIT_FOR_REVIEW: "Submitted",
    BULK_UPDATE: "Bulk updated",
  };

  const entityLabels: Record<string, string> = {
    AISystem: "AI System",
    RiskClassification: "Risk Classification",
    AIAssessment: "Assessment",
    ComplianceMapping: "Compliance Mapping",
    Organization: "Organization",
    OversightGate: "Oversight Gate",
    OversightDecision: "Oversight Decision",
    AIIncident: "Incident",
    AIVendor: "Vendor",
    AIPolicy: "Policy",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            {organization?.name || "AI Governance"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {organizations.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Switch</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setOrganization(org)}
                  className={org.id === organization?.id ? "bg-primary/10" : ""}
                >
                  {org.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Quickstart prompt — show when org has few systems */}
      {(stats?.totalSystems ?? 0) <= 3 && (stats?.deployedSystems ?? 0) === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base">
                {(stats?.importedVendorCount ?? 0) > 0
                  ? t("quickstartHeadingVendors", { count: stats?.importedVendorCount ?? 0 })
                  : t("quickstartHeadingDefault")}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {(stats?.importedVendorCount ?? 0) > 0
                  ? t("quickstartDescriptionVendors")
                  : t("quickstartDescriptionDefault")}
              </p>
            </div>
            <Link href="/governance/quickstart">
              <Button size="sm" className="shrink-0">
                {t("quickStart")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <DeploymentExpertCta />

      {/* KPI Row - 6 cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{stats?.totalSystems ?? 0}</div>
            <p className="text-xs text-muted-foreground">{t("totalSystems")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats?.deployedSystems ?? 0}</div>
            <p className="text-xs text-muted-foreground">{t("deployed")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`text-xl sm:text-2xl font-bold ${(stats?.highRiskSystems ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {stats?.highRiskSystems ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("highRisk")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`text-xl sm:text-2xl font-bold ${incidents.open > 0 ? "text-warning" : "text-muted-foreground"}`}>
              {incidents.open}
            </div>
            <p className="text-xs text-muted-foreground">{t("openIncidents")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`text-xl sm:text-2xl font-bold ${oversight.pending > 0 ? "text-warning" : "text-muted-foreground"}`}>
              {oversight.pending}
            </div>
            <p className="text-xs text-muted-foreground">{t("pendingGates")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{stats?.activeAssessments ?? 0}</div>
            <p className="text-xs text-muted-foreground">{t("activeAssessments")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Risk Posture */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-base sm:text-lg">{t("riskPosture")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("riskPostureDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-3">
            {riskTotal > 0 ? (
              <>
                {/* Stacked bar */}
                <div className="h-6 flex overflow-hidden rounded-sm">
                  {riskPosture.unacceptable > 0 && (
                    <div
                      className="bg-destructive flex items-center justify-center text-[10px] text-destructive-foreground font-medium"
                      style={{ width: `${(riskPosture.unacceptable / riskTotal) * 100}%` }}
                    >
                      {riskPosture.unacceptable}
                    </div>
                  )}
                  {riskPosture.high > 0 && (
                    <div
                      className="bg-destructive/70 flex items-center justify-center text-[10px] text-destructive-foreground font-medium"
                      style={{ width: `${(riskPosture.high / riskTotal) * 100}%` }}
                    >
                      {riskPosture.high}
                    </div>
                  )}
                  {riskPosture.limited > 0 && (
                    <div
                      className="bg-warning/40 flex items-center justify-center text-[10px] text-warning font-medium"
                      style={{ width: `${(riskPosture.limited / riskTotal) * 100}%` }}
                    >
                      {riskPosture.limited}
                    </div>
                  )}
                  {riskPosture.minimal > 0 && (
                    <div
                      className="bg-success/30 flex items-center justify-center text-[10px] text-success font-medium"
                      style={{ width: `${(riskPosture.minimal / riskTotal) * 100}%` }}
                    >
                      {riskPosture.minimal}
                    </div>
                  )}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-destructive" />
                    {tc("riskUnacceptable")} ({riskPosture.unacceptable})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-destructive/70" />
                    {tc("riskHigh")} ({riskPosture.high})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-warning/40" />
                    {tc("riskLimited")} ({riskPosture.limited})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-success/30" />
                    {tc("riskMinimal")} ({riskPosture.minimal})
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noRiskClassificationsYet")}</p>
            )}
          </CardContent>
        </Card>

        {/* Incident Summary */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-base sm:text-lg">{t("incidentSummary")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("incidentSummaryDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${incidents.critical > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {incidents.critical}
                </div>
                <p className="text-xs text-muted-foreground">{t("critical")}</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${incidents.open > 0 ? "text-warning" : "text-muted-foreground"}`}>
                  {incidents.open}
                </div>
                <p className="text-xs text-muted-foreground">{t("open")}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{incidents.total}</div>
                <p className="text-xs text-muted-foreground">{t("total")}</p>
              </div>
            </div>
            {incidents.total > 0 && (
              <Link href="/governance/incidents" className="block mt-3">
                <Button variant="outline" size="sm" className="w-full">
                  {t("viewIncidents")} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Oversight Pipeline */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-base sm:text-lg">{t("oversightPipeline")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("oversightPipelineDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className={`text-2xl font-bold ${oversight.pending > 0 ? "text-warning" : "text-muted-foreground"}`}>
                  {oversight.pending}
                </div>
                <p className="text-xs text-muted-foreground">{t("pending")}</p>
              </div>
              <div>
                <div className={`text-2xl font-bold ${oversight.overdue > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {oversight.overdue}
                </div>
                <p className="text-xs text-muted-foreground">
                  {oversight.overdue > 0 ? (
                    <span className="bg-destructive/20 text-foreground px-1.5 py-0.5">{t("overdue")}</span>
                  ) : (
                    t("overdue")
                  )}
                </p>
              </div>
            </div>
            <Link href="/governance/oversight">
              <Button variant="outline" size="sm" className="w-full">
                {t("viewOversight")} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Assessment Pipeline */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-base sm:text-lg">{t("assessmentPipeline")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("assessmentPipelineDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-muted-foreground">{pipeline.draft}</div>
                <p className="text-[10px] text-muted-foreground">{tc("statusDraft")}</p>
              </div>
              <div>
                <div className="text-lg font-bold text-info">{pipeline.inProgress}</div>
                <p className="text-[10px] text-muted-foreground">In Progress</p>
              </div>
              <div>
                <div className="text-lg font-bold text-warning">{pipeline.underReview}</div>
                <p className="text-[10px] text-muted-foreground">Review</p>
              </div>
              <div>
                <div className="text-lg font-bold text-success">{pipeline.approved}</div>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
            </div>
            {/* Progress bar */}
            {(pipeline.draft + pipeline.inProgress + pipeline.underReview + pipeline.approved) > 0 && (
              <div className="h-2 flex overflow-hidden rounded-sm mt-3">
                {pipeline.draft > 0 && (
                  <div className="bg-muted-foreground/30" style={{ flex: pipeline.draft }} />
                )}
                {pipeline.inProgress > 0 && (
                  <div className="bg-info/50" style={{ flex: pipeline.inProgress }} />
                )}
                {pipeline.underReview > 0 && (
                  <div className="bg-warning/50" style={{ flex: pipeline.underReview }} />
                )}
                {pipeline.approved > 0 && (
                  <div className="bg-success/50" style={{ flex: pipeline.approved }} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Progress */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-base sm:text-lg">{t("complianceProgress")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("complianceProgressDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-3">
            {complianceTotal > 0 ? (
              <>
                <div className="h-4 flex overflow-hidden rounded-sm">
                  {compliance.compliant > 0 && (
                    <div className="bg-success/60" style={{ width: `${(compliance.compliant / complianceTotal) * 100}%` }} />
                  )}
                  {compliance.partial > 0 && (
                    <div className="bg-warning/50" style={{ width: `${(compliance.partial / complianceTotal) * 100}%` }} />
                  )}
                  {compliance.nonCompliant > 0 && (
                    <div className="bg-destructive/50" style={{ width: `${(compliance.nonCompliant / complianceTotal) * 100}%` }} />
                  )}
                  {compliance.notAssessed > 0 && (
                    <div className="bg-muted" style={{ width: `${(compliance.notAssessed / complianceTotal) * 100}%` }} />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-success/60" />
                    Compliant ({compliance.compliant})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-warning/50" />
                    Partial ({compliance.partial})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-destructive/50" />
                    Non-Compliant ({compliance.nonCompliant})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-muted" />
                    Not Assessed ({compliance.notAssessed})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(((compliance.compliant + compliance.partial) / complianceTotal) * 100)}% assessed as compliant or partially compliant
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No compliance mappings yet</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {canWrite && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">{t("quickActions")}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("quickActionsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4 pt-0 sm:p-6 sm:pt-0">
              <Link href="/governance/ai-registry/new">
                <Button variant="outline" className="w-full justify-start h-11">
                  <Plus className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("registerAiSystem")}</span>
                </Button>
              </Link>
              <Link href="/governance/oversight/new">
                <Button variant="outline" className="w-full justify-start h-11">
                  <Eye className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("createGate")}</span>
                </Button>
              </Link>
              <Link href="/governance/incidents/new">
                <Button variant="outline" className="w-full justify-start h-11">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("reportIncident")}</span>
                </Button>
              </Link>
              <Link href="/governance/assessments/new">
                <Button variant="outline" className="w-full justify-start h-11">
                  <FileSearch className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("newAssessment")}</span>
                </Button>
              </Link>
              <Link href="/governance/vendors/new">
                <Button variant="outline" className="w-full justify-start h-11">
                  <Building2 className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("addVendor")}</span>
                </Button>
              </Link>
              <Link href="/governance/vendors/new?catalog=true">
                <Button variant="outline" className="w-full justify-start h-11">
                  <ShieldCheck className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("vendorFromCatalog")}</span>
                </Button>
              </Link>
              <Link href="/governance/shadow-ai/new">
                <Button variant="outline" className="w-full justify-start h-11">
                  <Search className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("reportShadowAi")}</span>
                </Button>
              </Link>
              <Link href="/governance/policies/new">
                <Button variant="outline" className="w-full justify-start h-11">
                  <ScrollText className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("createPolicy")}</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">{t("recentActivity")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("recentActivityDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 border border-muted-foreground text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm truncate">
                      <span className="font-medium">
                        {actionLabels[activity.action] || activity.action}
                      </span>
                      {" "}
                      {entityLabels[activity.entityType] || activity.entityType}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {activity.user?.name || activity.user?.email || "System"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noRecentActivity")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
