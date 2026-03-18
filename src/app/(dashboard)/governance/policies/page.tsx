"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ScrollText,
  Plus,
  Search,
  Loader2,
  Calendar,
  Link2,
} from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatRelativeTime, formatDate } from "@/lib/utils";

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

const statusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  UNDER_REVIEW: "border-warning text-warning",
  APPROVED: "border-info text-info",
  PUBLISHED: "border-success text-success",
  ARCHIVED: "border-muted-foreground/50 text-muted-foreground/50",
};

type PolicyTypeFilter = "AI_USAGE" | "AI_GOVERNANCE" | "AI_ETHICS" | "AI_RISK_MANAGEMENT" | "AI_DATA_GOVERNANCE" | "AI_PROCUREMENT" | "AI_INCIDENT_RESPONSE" | "AI_TRANSPARENCY" | "CUSTOM";

const tabTypeMap: Record<string, PolicyTypeFilter | undefined> = {
  all: undefined,
  usage: "AI_USAGE",
  governance: "AI_GOVERNANCE",
  ethics: "AI_ETHICS",
  risk: "AI_RISK_MANAGEMENT",
};

export default function PoliciesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const debouncedSearch = useDebounce(searchQuery);
  const { organization, canWrite } = useOrganization();

  const typeFilter = tabTypeMap[activeTab];

  const { data: statsData } = trpc.policy.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const {
    data: policiesPages,
    isLoading: policiesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.policy.list.useInfiniteQuery(
    {
      organizationId: organization?.id ?? "",
      search: debouncedSearch || undefined,
      type: typeFilter,
      limit: 20,
    },
    {
      enabled: !!organization?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }
  );

  const policies = policiesPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? { total: 0, draft: 0, published: 0, reviewDue: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Policies</h1>
          <p className="text-sm text-muted-foreground">
            AI governance policies and standards
          </p>
        </div>
        {canWrite && (
          <Link href="/governance/policies/new" className="flex-none">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Policy</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.published}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className={`text-xl sm:text-2xl font-bold ${stats.reviewDue > 0 ? "text-warning" : "text-muted-foreground"}`}>
              {stats.reviewDue}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Review Due</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
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
          <TabsTrigger value="usage" className="text-xs sm:text-sm">
            Usage
          </TabsTrigger>
          <TabsTrigger value="governance" className="text-xs sm:text-sm">
            Governance
          </TabsTrigger>
          <TabsTrigger value="ethics" className="text-xs sm:text-sm">
            Ethics
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs sm:text-sm">
            Risk Mgmt
          </TabsTrigger>
          <TabsTrigger value="other" className="text-xs sm:text-sm">
            Other
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {policiesLoading && !policiesPages ? (
            <ListPageSkeleton />
          ) : policies.length > 0 ? (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {policies.map((policy) => (
                  <Link key={policy.id} href={`/governance/policies/${policy.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-3 p-4 sm:p-6 sm:pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 flex items-center justify-center shrink-0">
                            <ScrollText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {policyTypeLabels[policy.type] || policy.type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusColors[policy.status] || ""}`}
                            >
                              {policy.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="mt-3 text-base sm:text-lg line-clamp-1">
                          {policy.title}
                        </CardTitle>
                        {policy.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {policy.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <Badge variant="outline" className="text-xs">
                            v{policy.currentVersion}
                          </Badge>
                          {(policy._count?.systemLinks ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Link2 className="w-3 h-3 mr-1" />
                              {policy._count.systemLinks} system{policy._count.systemLinks !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {policy.effectiveDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Effective {formatDate(policy.effectiveDate)}
                            </span>
                          )}
                          {policy.reviewDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Review {formatDate(policy.reviewDate)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated {formatRelativeTime(policy.updatedAt)}
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
                <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No policies found</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Start by creating your first policy"}
                </p>
                {!searchQuery && canWrite && (
                  <Link href="/governance/policies/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Policy
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
