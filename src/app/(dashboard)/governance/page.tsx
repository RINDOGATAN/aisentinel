"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusMark } from "@/components/ui/status-note";
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
  Briefcase,
  Building2,
  ChevronDown,
  Eye,
  ScrollText,
  Search,
  Sparkles,
  Network,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserType } from "@/lib/use-user-type";
import {
  ADD_ORGANIZATION_HREF,
  CLIENTS_DASHBOARD_HREF,
  organizationSwitcherView,
} from "@/lib/account-mode";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc";
import { NextObligationStrip } from "@/components/governance/obligations/NextObligationStrip";
import { useOrganization } from "@/lib/organization-context";
import { formatRelativeTime } from "@/lib/utils";
import { DeploymentExpertCta } from "@/components/governance/deployment-expert-cta";
import { TierMarker } from "@/components/governance/risk-tier-badge";
import { WorkedExampleOffer } from "@/components/governance/worked-example-card";
import { TIER_BG_CLASS, type RiskTier } from "@/config/risk-tier-palette";
import { useSkin } from "@/components/guided/skin-context";
import { NextStepCard } from "@/components/guided/next-step-card";
import { PageHeader } from "@/components/governance/page-header";

export default function GovernanceDashboardPage() {
  const { organization, organizations, setOrganization, canWrite } = useOrganization();
  const { userType } = useUserType();
  const switcher = organizationSwitcherView(userType);
  const { skin } = useSkin();
  const guided = skin === "guided";
  const t = useTranslations("dashboard");
  const locale = useLocale();
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
  const transparency = stats?.transparency ?? { markingRequired: 0, markingOverdue: 0 };
  const pipeline = stats?.assessmentPipeline ?? { draft: 0, inProgress: 0, underReview: 0, approved: 0 };
  const compliance = stats?.complianceSummary ?? { compliant: 0, partial: 0, nonCompliant: 0, notAssessed: 0 };

  const riskTotal = riskPosture.unacceptable + riskPosture.high + riskPosture.limited + riskPosture.minimal;
  const postureRows: { level: Exclude<RiskTier, "UNCLASSIFIED">; count: number; label: string }[] = [
    { level: "UNACCEPTABLE", count: riskPosture.unacceptable, label: tc("riskUnacceptable") },
    { level: "HIGH", count: riskPosture.high, label: tc("riskHigh") },
    { level: "LIMITED", count: riskPosture.limited, label: tc("riskLimited") },
    { level: "MINIMAL", count: riskPosture.minimal, label: tc("riskMinimal") },
  ];
  const complianceTotal = compliance.compliant + compliance.partial + compliance.nonCompliant + compliance.notAssessed;

  const actionLabels: Record<string, string> = {
    CREATE: t("activityCreated"),
    UPDATE: t("activityUpdated"),
    DELETE: t("activityDeleted"),
    APPROVE: t("activityApproved"),
    REJECT: t("activityRejected"),
    PUBLISH: t("activityPublished"),
    SUBMIT_FOR_REVIEW: t("activitySubmitted"),
    BULK_UPDATE: t("activityBulkUpdated"),
  };

  const entityLabels: Record<string, string> = {
    AISystem: t("entityAISystem"),
    RiskClassification: t("entityRiskClassification"),
    AIAssessment: t("entityAIAssessment"),
    ComplianceMapping: t("entityComplianceMapping"),
    Organization: t("entityOrganization"),
    OversightGate: t("entityOversightGate"),
    OversightDecision: t("entityOversightDecision"),
    AIIncident: t("entityAIIncident"),
    AIVendor: t("entityAIVendor"),
    AIPolicy: t("entityAIPolicy"),
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* An organization name is entered by the customer and can be a single
          long word; the header breaks it (break-words) rather than let it push
          the switcher off. Own-organization mode shows no switcher; client
          mode always does, with the client dashboard and the add flow
          (src/lib/account-mode.ts). In Guided the menu carries the switcher,
          so the page shows none. */}
      <PageHeader
        title={organization?.name || "AI Governance"}
        description={t("subtitle")}
        actions={
        switcher.show && !guided && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Building2 className="w-4 h-4" />
                {t("switchOrganization")}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {switcher.listOrganizations &&
                organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => setOrganization(org)}
                    className={org.id === organization?.id ? "bg-primary/10" : ""}
                  >
                    {org.name}
                  </DropdownMenuItem>
                ))}
              {switcher.clientEntries && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={CLIENTS_DASHBOARD_HREF} className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      {t("switcherMyClients")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ADD_ORGANIZATION_HREF} className="flex items-center gap-2">
                      {t("switcherAddOrganization")}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
        }
      />

      {/* Guided layout only: the next step on the program path. The program
          map is in the menu's "Library and tools", so it is not repeated here
          (one place per action). */}
      {guided && organization && <NextStepCard />}

      {/* The first-run choice, so an empty dashboard offers a way to fill
          itself in rather than only empty tiles. Renders nothing once either
          answer has been given. Classic only: in Guided the choice is the
          quick start's first, optional one, and the dashboard keeps a single
          call (the next step), which leads there. */}
      {organization && !guided && <WorkedExampleOffer organizationId={organization.id} />}

      {/* Program CTA — once a quickstart profile is completed, the flagship
          deliverable is the Governance Program page. Classic only: Guided
          shows it as a link under the next step. */}
      {!guided && stats?.quickstartProfile && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 shrink-0">
              <Network className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base">
                {t("programCtaTitle")}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t("programCtaDescription")}
              </p>
            </div>
            <Link href="/governance/program">
              <Button size="sm" className="shrink-0">
                {t("programCtaButton")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quickstart prompt — show when org has few systems and no completed
          program profile. Classic only: in Guided the next-step card already
          leads to the quick start while it is not done. */}
      {!guided &&
        (stats?.totalSystems ?? 0) <= 3 &&
        (stats?.deployedSystems ?? 0) === 0 &&
        !stats?.quickstartProfile && (
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

      {/* Next regulatory deadline, bound to this org's own inventory */}
      <NextObligationStrip />

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
            <div className="text-xl sm:text-2xl font-bold text-foreground">{stats?.deployedSystems ?? 0}</div>
            <p className="text-xs text-muted-foreground">{t("deployed")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {stats?.highRiskSystems ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("highRisk")}</p>
            {(stats?.highRiskSystems ?? 0) > 0 && (
              <StatusMark status="danger" className="text-[11px] mt-1">
                {tc("needsAttention")}
              </StatusMark>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {incidents.open}
            </div>
            <p className="text-xs text-muted-foreground">{t("openIncidents")}</p>
            {incidents.open > 0 && (
              <StatusMark status="warning" className="text-[11px] mt-1">
                {tc("needsAttention")}
              </StatusMark>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {oversight.pending}
            </div>
            <p className="text-xs text-muted-foreground">{t("pendingGates")}</p>
            {oversight.pending > 0 && (
              <StatusMark status="warning" className="text-[11px] mt-1">
                {tc("needsAttention")}
              </StatusMark>
            )}
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
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
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
                {/* The segments carry no text (a count on a coloured fill cannot
                    keep text contrast); the legend below states every count. */}
                <div className="h-6 flex gap-px overflow-hidden rounded-sm">
                  {postureRows.map(({ level, count, label }) =>
                    count > 0 ? (
                      <div
                        key={level}
                        className={TIER_BG_CLASS[level]}
                        title={`${label} (${count})`}
                        style={{ width: `${(count / riskTotal) * 100}%` }}
                      />
                    ) : null
                  )}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
                  {postureRows.map(({ level, count, label }) => (
                    <span key={level} className="flex items-center gap-1.5">
                      <TierMarker level={level} shape="square" />
                      {label} ({count})
                    </span>
                  ))}
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
            {/* Two columns on a phone, three from sm: three columns of
                counters cannot hold the Spanish labels at 390 px. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {incidents.critical}
                </div>
                <p className="text-xs text-muted-foreground">{t("critical")}</p>
                {incidents.critical > 0 && (
                  <StatusMark status="danger" className="text-[11px] mt-1">
                    {tc("needsAttention")}
                  </StatusMark>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {incidents.open}
                </div>
                <p className="text-xs text-muted-foreground">{t("open")}</p>
                {incidents.open > 0 && (
                  <StatusMark status="warning" className="text-[11px] mt-1">
                    {tc("needsAttention")}
                  </StatusMark>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{incidents.total}</div>
                <p className="text-xs text-muted-foreground">{t("total")}</p>
              </div>
            </div>
            {/* In Guided the menu leads to each of these lists; not repeated here. */}
            {incidents.total > 0 && !guided && (
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
                <div className="text-2xl font-bold text-foreground">
                  {oversight.pending}
                </div>
                <p className="text-xs text-muted-foreground">{t("pending")}</p>
                {oversight.pending > 0 && (
                  <StatusMark status="warning" className="text-[11px] mt-1">
                    {tc("needsAttention")}
                  </StatusMark>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {oversight.overdue}
                </div>
                <p className="text-xs text-muted-foreground">{t("overdue")}</p>
                {oversight.overdue > 0 && (
                  <StatusMark status="danger" className="text-[11px] mt-1">
                    {tc("needsAttention")}
                  </StatusMark>
                )}
              </div>
            </div>
            {!guided && (
              <Link href="/governance/oversight">
                <Button variant="outline" size="sm" className="w-full">
                  {t("viewOversight")} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Art. 50 Transparency */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-base sm:text-lg">{t("transparencyTitle")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("transparencyDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {transparency.markingRequired}
                </div>
                <p className="text-xs text-muted-foreground">{t("markingRequired")}</p>
                {transparency.markingRequired > 0 && (
                  <StatusMark status="warning" className="text-[11px] mt-1">
                    {tc("needsAttention")}
                  </StatusMark>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {transparency.markingOverdue}
                </div>
                <p className="text-xs text-muted-foreground">{t("markingOverdue")}</p>
                {transparency.markingOverdue > 0 && (
                  <StatusMark status="danger" className="text-[11px] mt-1">
                    {tc("needsAttention")}
                  </StatusMark>
                )}
              </div>
            </div>
            {!guided && (
              <Link href="/governance/ai-registry">
                <Button variant="outline" size="sm" className="w-full">
                  {t("viewRegistry")} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
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
            {/* Two columns on a phone, four from sm. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-muted-foreground">{pipeline.draft}</div>
                <p className="text-[10px] text-muted-foreground">{tc("statusDraft")}</p>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{pipeline.inProgress}</div>
                <p className="text-[10px] text-muted-foreground">{tc("statusInProgress")}</p>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{pipeline.underReview}</div>
                <p className="text-[10px] text-muted-foreground">{tc("statusUnderReview")}</p>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{pipeline.approved}</div>
                <p className="text-[10px] text-muted-foreground">{tc("statusApproved")}</p>
              </div>
            </div>
            {/* Progress bar */}
            {(pipeline.draft + pipeline.inProgress + pipeline.underReview + pipeline.approved) > 0 && (
              // Full-opacity bands, each at least 3:1 against the card, and a
              // rule between adjacent bands so they separate without hue.
              <div className="h-2 flex overflow-hidden rounded-sm mt-3 [&>*+*]:border-l-2 [&>*+*]:border-card">
                {pipeline.draft > 0 && (
                  <div className="bg-muted-foreground" style={{ flex: pipeline.draft }} />
                )}
                {pipeline.inProgress > 0 && (
                  <div className="bg-info" style={{ flex: pipeline.inProgress }} />
                )}
                {pipeline.underReview > 0 && (
                  <div className="bg-warning" style={{ flex: pipeline.underReview }} />
                )}
                {pipeline.approved > 0 && (
                  <div className="bg-success" style={{ flex: pipeline.approved }} />
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
                <div className="h-4 flex overflow-hidden rounded-sm [&>*+*]:border-l-2 [&>*+*]:border-card">
                  {compliance.compliant > 0 && (
                    <div className="bg-success" style={{ width: `${(compliance.compliant / complianceTotal) * 100}%` }} />
                  )}
                  {compliance.partial > 0 && (
                    <div className="bg-warning" style={{ width: `${(compliance.partial / complianceTotal) * 100}%` }} />
                  )}
                  {compliance.nonCompliant > 0 && (
                    <div className="bg-destructive" style={{ width: `${(compliance.nonCompliant / complianceTotal) * 100}%` }} />
                  )}
                  {compliance.notAssessed > 0 && (
                    <div className="bg-muted-foreground" style={{ width: `${(compliance.notAssessed / complianceTotal) * 100}%` }} />
                  )}
                </div>
                {/* The legend names each band and gives its count, so the bar
                    can be read without telling the hues apart. */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-success" />
                    {tc("complianceCompliant")} ({compliance.compliant})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-warning" />
                    {tc("compliancePartial")} ({compliance.partial})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-destructive" />
                    {tc("complianceNonCompliant")} ({compliance.nonCompliant})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground" />
                    {tc("complianceNotAssessed")} ({compliance.notAssessed})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("complianceAssessedSummary", { percent: Math.round(((compliance.compliant + compliance.partial) / complianceTotal) * 100) })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noComplianceMappings")}</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions. In Guided each of these is the button on its own
            step's page, reached from the menu: one place per action. */}
        {canWrite && !guided && (
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
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      {/* An address has no spaces to break on, so it truncates
                          rather than deciding how wide the page is. */}
                      <span className="text-xs text-muted-foreground truncate">
                        {activity.user?.name || activity.user?.email || t("systemActor")}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(activity.createdAt, locale)}
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
