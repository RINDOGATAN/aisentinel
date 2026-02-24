"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Plus,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatRelativeTime } from "@/lib/utils";

const severityColors: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  MEDIUM: "bg-warning/20 text-warning",
  LOW: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  REPORTED: "border-warning text-warning",
  INVESTIGATING: "border-info text-info",
  MITIGATING: "border-warning text-warning",
  RESOLVED: "border-success text-success",
  CLOSED: "border-muted-foreground text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  HALLUCINATION: "Hallucination",
  BIAS_DISCRIMINATION: "Bias/Discrimination",
  MODEL_DRIFT: "Model Drift",
  ADVERSARIAL_ATTACK: "Adversarial Attack",
  PROMPT_INJECTION: "Prompt Injection",
  UNAUTHORIZED_ACCESS: "Unauthorized Access",
  SAFETY_FAILURE: "Safety Failure",
  PERFORMANCE_DEGRADATION: "Performance Degradation",
  DATA_POISONING: "Data Poisoning",
  PRIVACY_VIOLATION: "Privacy Violation",
  OTHER: "Other",
};

const tabTypeMap: Record<string, string | undefined> = {
  all: undefined,
  hallucination: "HALLUCINATION",
  bias: "BIAS_DISCRIMINATION",
  drift: "MODEL_DRIFT",
  prompt_injection: "PROMPT_INJECTION",
};

export default function IncidentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const debouncedSearch = useDebounce(searchQuery);
  const { organization } = useOrganization();

  const typeFilter = tabTypeMap[activeTab];

  const { data: statsData, isLoading: statsLoading } = trpc.incident.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const {
    data: incidentPages,
    isLoading: incidentsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.incident.list.useInfiniteQuery(
    {
      organizationId: organization?.id ?? "",
      search: debouncedSearch || undefined,
      type: typeFilter,
      limit: 20,
    },
    {
      enabled: !!organization?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const incidents = incidentPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? { total: 0, critical: 0, open: 0, resolved: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">AI Incidents</h1>
          <p className="text-sm text-muted-foreground">
            Track AI-specific failures, severity, timeline & Art. 62 notifications
          </p>
        </div>
        <Link href="/governance/incidents/new" className="flex-none">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Report Incident</span>
            <span className="sm:hidden">Report</span>
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Incidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-warning">{stats.open}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.resolved}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="hallucination" className="text-xs sm:text-sm">
            Hallucination
          </TabsTrigger>
          <TabsTrigger value="bias" className="text-xs sm:text-sm">
            Bias
          </TabsTrigger>
          <TabsTrigger value="drift" className="text-xs sm:text-sm hidden sm:inline-flex">
            Drift
          </TabsTrigger>
          <TabsTrigger value="prompt_injection" className="text-xs sm:text-sm hidden sm:inline-flex">
            Prompt Injection
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {incidentsLoading ? (
            <ListPageSkeleton />
          ) : incidents.length > 0 ? (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {incidents.map((incident) => (
                  <Link key={incident.id} href={`/governance/incidents/${incident.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-3 p-4 sm:p-6 sm:pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <Badge
                              className={`text-xs ${severityColors[incident.severity] || ""}`}
                            >
                              {incident.severity}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusColors[incident.status] || ""}`}
                            >
                              {incident.status}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="mt-3 text-base sm:text-lg line-clamp-1">
                          {incident.title}
                        </CardTitle>
                        {incident.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {incident.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[incident.type] || incident.type}
                          </Badge>
                          {incident.aiSystem && (
                            <Badge variant="outline" className="text-xs">
                              {incident.aiSystem.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(incident.reportedAt)}
                          </span>
                          <span>{incident._count?.tasks ?? 0} tasks</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              {hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No incidents found</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "No AI incidents have been reported yet"}
                </p>
                {!searchQuery && (
                  <Link href="/governance/incidents/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Report Incident
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
