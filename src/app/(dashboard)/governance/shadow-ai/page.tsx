"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Loader2,
  Lock,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
} from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { EnableFeatureModal } from "@/components/premium/enable-feature-modal";
import { formatRelativeTime } from "@/lib/utils";

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

const tabToStatus: Record<string, string | undefined> = {
  all: undefined,
  discovered: "DISCOVERED",
  under_review: "UNDER_REVIEW",
  approved: "APPROVED",
  prohibited: "PROHIBITED",
  registered: "REGISTERED",
};

export default function ShadowAIPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const debouncedSearch = useDebounce(searchQuery);
  const { organization, canWrite } = useOrganization();

  const statusFilter = tabToStatus[activeTab];

  const { data: hasAccess, isLoading: accessLoading } =
    trpc.shadowAi.checkAccess.useQuery(
      { organizationId: organization?.id ?? "" },
      { enabled: !!organization?.id }
    );

  const { data: statsData } = trpc.shadowAi.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id && hasAccess === true }
  );

  const {
    data: reportsPages,
    isLoading: reportsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.shadowAi.listReports.useInfiniteQuery(
    {
      organizationId: organization?.id ?? "",
      search: debouncedSearch || undefined,
      status: statusFilter,
      limit: 20,
    },
    {
      enabled: !!organization?.id && hasAccess === true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }
  );

  const reports = reportsPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? {
    total: 0,
    discovered: 0,
    underReview: 0,
    approved: 0,
    prohibited: 0,
    registered: 0,
  };

  // Loading state
  if (accessLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Premium gate
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />
              Shadow AI Discovery
              <Badge className="bg-primary/20 text-primary">Premium</Badge>
            </h1>
            <p className="text-muted-foreground">
              Discover unauthorized AI tools, self-reporting portal & policy
              engine
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto rounded-lg">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Premium Feature</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Shadow AI Discovery helps you identify unauthorized AI tools
              across your organization with automated scanning, a self-reporting
              portal, and policy enforcement.
            </p>
            <Button onClick={() => setShowModal(true)} className="mt-4">
              <Lock className="w-4 h-4 mr-2" />
              Enable Shadow AI Discovery
            </Button>
          </CardContent>
        </Card>

        {showModal && organization && (
          <EnableFeatureModal
            open={showModal}
            onClose={() => setShowModal(false)}
            organizationId={organization.id}
            skillPackageId="com.todolaw.aisentinel.shadow-ai"
            skillName="Shadow AI Discovery"
            skillDescription="Discover unauthorized AI tools, manage an AI tool catalog, and enforce AI usage policies across your organization."
          />
        )}
      </div>
    );
  }

  // Full page
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            Shadow AI Discovery
          </h1>
          <p className="text-sm text-muted-foreground">
            Discover and manage unauthorized AI tool usage
          </p>
        </div>
        {canWrite && (
          <Link href="/governance/shadow-ai/new" className="flex-none">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Report AI Tool</span>
              <span className="sm:hidden">Report</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {stats.total}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Total Reports
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-warning">
              {stats.discovered}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Discovered
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-info">
              {stats.underReview}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Under Review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive">
              {stats.prohibited}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Prohibited
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
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
          <TabsTrigger value="discovered" className="text-xs sm:text-sm">
            Discovered
          </TabsTrigger>
          <TabsTrigger value="under_review" className="text-xs sm:text-sm">
            Under Review
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="text-xs sm:text-sm"
          >
            Approved
          </TabsTrigger>
          <TabsTrigger
            value="prohibited"
            className="text-xs sm:text-sm"
          >
            Prohibited
          </TabsTrigger>
          <TabsTrigger value="registered" className="text-xs sm:text-sm">
            Registered
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {reportsLoading && !reportsPages ? (
            <ListPageSkeleton />
          ) : reports.length > 0 ? (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {reports.map((report) => {
                  const StatusIcon =
                    report.status === "DISCOVERED"
                      ? AlertTriangle
                      : report.status === "UNDER_REVIEW"
                        ? Eye
                        : report.status === "APPROVED"
                          ? CheckCircle
                          : report.status === "PROHIBITED"
                            ? XCircle
                            : Cpu;

                  return (
                    <Link
                      key={report.id}
                      href={`/governance/shadow-ai/${report.id}`}
                    >
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 flex items-center justify-center shrink-0">
                              <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusColors[report.status] || ""}`}
                              >
                                {statusLabels[report.status] || report.status}
                              </Badge>
                              {report.tool?.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {report.tool.category.replace(/_/g, " ")}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <h3 className="font-semibold text-base sm:text-lg line-clamp-1 mb-1">
                            {report.toolName}
                          </h3>
                          {report.department && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {report.department}
                            </p>
                          )}
                          {report.usageDescription && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                              {report.usageDescription}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Reported {formatRelativeTime(report.createdAt)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
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
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reports found</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Start by reporting an AI tool in use"}
                </p>
                {!searchQuery && canWrite && (
                  <Link href="/governance/shadow-ai/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Report AI Tool
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
