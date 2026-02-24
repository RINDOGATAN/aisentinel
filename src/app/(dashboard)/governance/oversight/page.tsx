"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Plus,
  Search,
  Loader2,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatRelativeTime, formatDate } from "@/lib/utils";

const gateTypeLabels: Record<string, string> = {
  PRE_DEPLOYMENT: "Pre-Deployment",
  POST_DEPLOYMENT: "Post-Deployment",
  PERIODIC_REVIEW: "Periodic Review",
  INCIDENT_TRIGGERED: "Incident Triggered",
  MATERIAL_CHANGE: "Material Change",
};

const gateStatusColors: Record<string, string> = {
  PENDING: "border-warning text-warning",
  IN_REVIEW: "border-info text-info",
  PASSED: "border-success text-success",
  FAILED: "border-destructive text-destructive",
  DEFERRED: "border-muted-foreground text-muted-foreground",
};

export default function OversightPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const debouncedSearch = useDebounce(searchQuery);
  const { organization } = useOrganization();

  const gateTypeFilter = activeTab === "all" ? undefined : activeTab;

  const { data: statsData, isLoading: statsLoading } = trpc.oversight.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const {
    data: gatesPages,
    isLoading: gatesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.oversight.list.useInfiniteQuery(
    {
      organizationId: organization?.id ?? "",
      search: debouncedSearch || undefined,
      gateType: gateTypeFilter,
      limit: 20,
    },
    {
      enabled: !!organization?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const gates = gatesPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? { pending: 0, inReview: 0, passed: 0, failed: 0, overdue: 0, total: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Human Oversight</h1>
          <p className="text-sm text-muted-foreground">
            Approval gates, decision logging &amp; Art. 14 compliance
          </p>
        </div>
        <Link href="/governance/oversight/new" className="flex-none">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Gate</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-info">{stats.inReview}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">In Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.passed}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Passed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.overdue}</div>
            <p className="text-xs sm:text-sm text-destructive">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search oversight gates..."
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
          <TabsTrigger value="PRE_DEPLOYMENT" className="text-xs sm:text-sm">
            Pre-Deploy
          </TabsTrigger>
          <TabsTrigger value="POST_DEPLOYMENT" className="text-xs sm:text-sm">
            Post-Deploy
          </TabsTrigger>
          <TabsTrigger value="PERIODIC_REVIEW" className="text-xs sm:text-sm">
            Periodic
          </TabsTrigger>
          <TabsTrigger value="INCIDENT_TRIGGERED" className="text-xs sm:text-sm">
            Incident
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {gatesLoading ? (
            <ListPageSkeleton />
          ) : gates.length > 0 ? (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {gates.map((gate) => (
                  <Link key={gate.id} href={`/governance/oversight/${gate.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-3 p-4 sm:p-6 sm:pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 flex items-center justify-center shrink-0">
                            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <Badge
                              variant="outline"
                              className={`text-xs ${gateStatusColors[gate.status] || ""}`}
                            >
                              {gate.status.replace("_", " ")}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {gateTypeLabels[gate.gateType] || gate.gateType}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="mt-3 text-base sm:text-lg line-clamp-1">
                          {gate.aiSystem?.name ?? "Unknown System"}
                        </CardTitle>
                        {gate.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {gate.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="space-y-1.5">
                          {gate.assignedTo && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {gate.assignedTo}
                              </span>
                            </div>
                          )}
                          {gate.nextReviewDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Next review: {formatDate(gate.nextReviewDate)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {gate._count?.decisions ?? 0} decisions
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated {formatRelativeTime(gate.updatedAt)}
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
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No oversight gates found</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Start by creating your first oversight gate"}
                </p>
                {!searchQuery && (
                  <Link href="/governance/oversight/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Gate
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
