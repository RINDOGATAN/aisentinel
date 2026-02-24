"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileSearch,
  Plus,
  Search,
  Loader2,
  Lock,
  ClipboardCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatRelativeTime } from "@/lib/utils";

const assessmentTypeLabels: Record<string, string> = {
  FRIA: "FRIA",
  CONFORMITY: "Conformity",
  AI_RISK: "AI Risk",
  BIAS_FAIRNESS: "Bias & Fairness",
  CUSTOM: "Custom",
};

const assessmentTypeColors: Record<string, string> = {
  FRIA: "border-info text-info",
  CONFORMITY: "border-purple-500 text-purple-500",
  AI_RISK: "border-warning text-warning",
  BIAS_FAIRNESS: "border-pink-500 text-pink-500",
  CUSTOM: "border-muted-foreground text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const statusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  IN_PROGRESS: "border-info text-info",
  UNDER_REVIEW: "border-warning text-warning",
  APPROVED: "border-success text-success",
  REJECTED: "border-destructive text-destructive",
};

const premiumTypes = ["CONFORMITY", "BIAS_FAIRNESS"];

export default function AssessmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const debouncedSearch = useDebounce(searchQuery);
  const { organization } = useOrganization();

  const typeFilter = activeTab === "all" ? undefined : activeTab.toUpperCase();

  const { data: statsData, isLoading: statsLoading } = trpc.assessment.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const { data: entitledTypes } = trpc.assessment.getEntitledTypes.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const {
    data: assessmentsPages,
    isLoading: assessmentsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.assessment.list.useInfiniteQuery(
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

  const assessments = assessmentsPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? { total: 0, draft: 0, inProgress: 0, underReview: 0, approved: 0 };
  const entitledTypesList = entitledTypes ?? [];

  const isPremiumLocked = (type: string) => {
    return premiumTypes.includes(type) && !entitledTypesList.includes(type as never);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Assessments</h1>
          <p className="text-sm text-muted-foreground">
            FRIA, conformity, and risk assessments for AI systems
          </p>
        </div>
        <Link href="/governance/assessments/new" className="flex-none">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">New Assessment</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-muted-foreground">{stats.draft}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-info">{stats.inProgress}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-warning">{stats.underReview}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Under Review</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.approved}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assessments..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="fria" className="text-xs sm:text-sm">
            FRIA
          </TabsTrigger>
          <TabsTrigger value="conformity" className="text-xs sm:text-sm">
            <span>Conformity</span>
            {isPremiumLocked("CONFORMITY") && (
              <Lock className="w-3 h-3 ml-1 text-warning" />
            )}
          </TabsTrigger>
          <TabsTrigger value="ai_risk" className="text-xs sm:text-sm">
            AI Risk
          </TabsTrigger>
          <TabsTrigger value="bias_fairness" className="text-xs sm:text-sm">
            <span>Bias/Fairness</span>
            {isPremiumLocked("BIAS_FAIRNESS") && (
              <Lock className="w-3 h-3 ml-1 text-warning" />
            )}
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm">
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {assessmentsLoading ? (
            <ListPageSkeleton />
          ) : assessments.length > 0 ? (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {assessments.map((assessment) => (
                  <Link
                    key={assessment.id}
                    href={`/governance/assessments/${assessment.id}`}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-3 p-4 sm:p-6 sm:pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 flex items-center justify-center shrink-0">
                            <FileSearch className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <Badge
                              variant="outline"
                              className={`text-xs ${assessmentTypeColors[assessment.type] || ""}`}
                            >
                              {assessmentTypeLabels[assessment.type] || assessment.type}
                              {premiumTypes.includes(assessment.type) && (
                                <Lock className="w-3 h-3 ml-1" />
                              )}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusColors[assessment.status] || ""}`}
                            >
                              {statusLabels[assessment.status] || assessment.status}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="mt-3 text-base sm:text-lg line-clamp-1">
                          {assessment.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        {assessment.aiSystem && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <ClipboardCheck className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              {assessment.aiSystem.name}
                            </span>
                          </div>
                        )}
                        {assessment.template && (
                          <p className="text-xs text-muted-foreground mb-2 truncate">
                            Template: {assessment.template.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Updated {formatRelativeTime(assessment.updatedAt)}
                        </p>
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
                <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No assessments found</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Start by creating your first assessment"}
                </p>
                {!searchQuery && (
                  <Link href="/governance/assessments/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Assessment
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
