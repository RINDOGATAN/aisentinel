"use client";

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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { formatRelativeTime } from "@/lib/utils";

export default function GovernanceDashboardPage() {
  const { organization, organizations, setOrganization } = useOrganization();

  const { data: stats, isLoading } = trpc.organization.getDashboardStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const dashboardStats = {
    totalSystems: stats?.totalSystems ?? 0,
    deployedSystems: stats?.deployedSystems ?? 0,
    highRiskSystems: stats?.highRiskSystems ?? 0,
    activeAssessments: stats?.activeAssessments ?? 0,
  };

  const recentActivity = stats?.recentAuditLogs ?? [];

  const actionLabels: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
  };

  const entityLabels: Record<string, string> = {
    AISystem: "AI System",
    RiskClassification: "Risk Classification",
    AIAssessment: "Assessment",
    ComplianceMapping: "Compliance Mapping",
    Organization: "Organization",
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
            AI Governance Dashboard
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

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total AI Systems</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {dashboardStats.totalSystems}
            </div>
            <p className="text-xs text-muted-foreground">Registered systems</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Deployed</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {dashboardStats.deployedSystems}
            </div>
            <p className="text-xs text-muted-foreground">In production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {dashboardStats.highRiskSystems}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.highRiskSystems > 0 ? (
                <span className="bg-destructive/20 text-foreground px-1.5 py-0.5">
                  Requires attention
                </span>
              ) : (
                "No high-risk systems"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Assessments</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {dashboardStats.activeAssessments}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Common governance tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 grid-cols-1 sm:grid-cols-2 p-4 pt-0 sm:p-6 sm:pt-0">
            <Link href="/governance/ai-registry/new">
              <Button variant="outline" className="w-full justify-start h-11">
                <Plus className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">Register AI System</span>
              </Button>
            </Link>
            <Link href="/governance/risk-classification">
              <Button variant="outline" className="w-full justify-start h-11">
                <ShieldCheck className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">Classify Risk</span>
              </Button>
            </Link>
            <Link href="/governance/assessments/new">
              <Button variant="outline" className="w-full justify-start h-11">
                <FileSearch className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">New Assessment</span>
              </Button>
            </Link>
            <Link href="/governance/compliance">
              <Button variant="outline" className="w-full justify-start h-11">
                <ClipboardCheck className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">View Compliance</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Latest updates across your AI governance program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 6).map((activity) => (
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
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>

        {/* Module Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Governance Modules</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Navigate to specific governance areas
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4 pt-0 sm:p-6 sm:pt-0">
            <Link href="/governance/ai-registry">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">AI Registry</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {dashboardStats.totalSystems} systems registered
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/governance/risk-classification">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Risk Classification</p>
                    <p className="text-xs text-muted-foreground truncate">
                      EU AI Act four-tier system
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/governance/assessments">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0">
                    <FileSearch className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Assessments</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {dashboardStats.activeAssessments} active
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/governance/compliance">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Compliance</p>
                    <p className="text-xs text-muted-foreground truncate">
                      EU AI Act, NIST, ISO 42001
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/governance/oversight">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Human Oversight</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Approval gates & decisions
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">Soon</Badge>
                </CardContent>
              </Card>
            </Link>

            <Link href="/governance/incidents">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">AI Incidents</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Report & track incidents
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">Soon</Badge>
                </CardContent>
              </Card>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
