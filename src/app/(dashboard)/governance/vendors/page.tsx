"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  Mail,
  User,
  Cpu,
  FileSearch,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatRelativeTime, formatDate } from "@/lib/utils";

const riskLevelColors: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  MEDIUM: "bg-yellow-500/20 text-yellow-500",
  LOW: "bg-green-500/20 text-green-500",
};

const statusColors: Record<string, string> = {
  ACTIVE: "border-green-500 text-green-500",
  UNDER_REVIEW: "border-yellow-500 text-yellow-500",
  APPROVED: "border-blue-500 text-blue-500",
  SUSPENDED: "border-orange-500 text-orange-500",
  TERMINATED: "border-muted-foreground text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

const tabToStatus: Record<string, string | undefined> = {
  all: undefined,
  active: "ACTIVE",
  under_review: "UNDER_REVIEW",
  approved: "APPROVED",
  suspended: "SUSPENDED",
  terminated: "TERMINATED",
};

function getDaysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function VendorRiskPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const debouncedSearch = useDebounce(searchQuery);
  const { organization } = useOrganization();

  const statusFilter = tabToStatus[activeTab];

  const { data: statsData, isLoading: statsLoading } = trpc.vendor.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const {
    data: vendorsPages,
    isLoading: vendorsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.vendor.list.useInfiniteQuery(
    {
      organizationId: organization?.id ?? "",
      search: debouncedSearch || undefined,
      status: statusFilter,
      limit: 20,
    },
    {
      enabled: !!organization?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const vendors = vendorsPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? { total: 0, critical: 0, highRisk: 0, expiringSoon: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Vendor Risk</h1>
          <p className="text-sm text-muted-foreground">
            Manage third-party AI vendor risk and assessments
          </p>
        </div>
        <Link href="/governance/vendors/new" className="flex-none">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Vendor</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Critical Risk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive/80">{stats.highRisk}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">High Risk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-yellow-500">{stats.expiringSoon}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Expiring Soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
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
          <TabsTrigger value="active" className="text-xs sm:text-sm">
            Active
          </TabsTrigger>
          <TabsTrigger value="under_review" className="text-xs sm:text-sm">
            Under Review
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs sm:text-sm hidden sm:inline-flex">
            Approved
          </TabsTrigger>
          <TabsTrigger value="suspended" className="text-xs sm:text-sm hidden sm:inline-flex">
            Suspended
          </TabsTrigger>
          <TabsTrigger value="terminated" className="text-xs sm:text-sm">
            Terminated
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {vendorsLoading ? (
            <ListPageSkeleton />
          ) : vendors.length > 0 ? (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {vendors.map((vendor) => {
                  const daysUntilExpiry = getDaysUntil(vendor.contractExpiryDate);
                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 90;

                  return (
                    <Link key={vendor.id} href={`/governance/vendors/${vendor.id}`}>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="pb-3 p-4 sm:p-6 sm:pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusColors[vendor.status] || ""}`}
                              >
                                {statusLabels[vendor.status] || vendor.status}
                              </Badge>
                              {vendor.riskLevel && (
                                <Badge
                                  className={`text-xs ${riskLevelColors[vendor.riskLevel] || ""}`}
                                >
                                  {vendor.riskLevel}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardTitle className="mt-3 text-base sm:text-lg line-clamp-1">
                            {vendor.name}
                          </CardTitle>
                          {vendor.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {vendor.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                          <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
                            {vendor.contactName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {vendor.contactName}
                              </span>
                            )}
                            {vendor.contactEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {vendor.contactEmail}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3" />
                              {vendor._count?.systems ?? 0} systems
                            </span>
                            <span className="flex items-center gap-1">
                              <FileSearch className="w-3 h-3" />
                              {vendor._count?.assessments ?? 0} assessments
                            </span>
                          </div>
                          {isExpiringSoon && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-yellow-500">
                              <AlertTriangle className="w-3 h-3" />
                              Contract expires in {daysUntilExpiry} days
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Updated {formatRelativeTime(vendor.updatedAt)}
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
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No vendors found</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Start by adding your first AI vendor"}
                </p>
                {!searchQuery && (
                  <Link href="/governance/vendors/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vendor
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
