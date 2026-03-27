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
  Database,
  Lock,
} from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { EnableFeatureModal } from "@/components/premium/enable-feature-modal";
import { formatRelativeTime, formatDate, getDaysUntil } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";

const riskLevelColors: Record<string, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  MEDIUM: "bg-warning/20 text-warning",
  LOW: "bg-success/20 text-success",
};

const statusColors: Record<string, string> = {
  ACTIVE: "border-success text-success",
  UNDER_REVIEW: "border-warning text-warning",
  APPROVED: "border-info text-info",
  SUSPENDED: "border-warning text-warning",
  TERMINATED: "border-muted-foreground text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

type VendorStatusFilter = "ACTIVE" | "UNDER_REVIEW" | "APPROVED" | "SUSPENDED" | "TERMINATED";

const tabToStatus: Record<string, VendorStatusFilter | undefined> = {
  all: undefined,
  active: "ACTIVE",
  under_review: "UNDER_REVIEW",
  approved: "APPROVED",
  suspended: "SUSPENDED",
  terminated: "TERMINATED",
};

export default function VendorRiskPage() {
  const t = useTranslations("vendors");
  const tc = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const debouncedSearch = useDebounce(searchQuery);
  const { organization, canWrite } = useOrganization();

  const statusFilter = tabToStatus[activeTab];

  const { data: catalogAccess } = trpc.vendorCatalog.checkAccess.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

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
      placeholderData: keepPreviousData,
    }
  );

  const vendors = vendorsPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? { total: 0, critical: 0, highRisk: 0, expiringSoon: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {canWrite && (
          <Link href="/governance/vendors/new" className="flex-none">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("addVendor")}</span>
              <span className="sm:hidden">{tc("add")}</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsTotalVendors")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsCriticalRisk")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive/80">{stats.highRisk}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsHighRisk")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-warning">{stats.expiringSoon}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsExpiringSoon")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* AI Vendor Catalog — Premium Feature Card */}
      {catalogAccess?.hasAccess ? (
        <Card className="border-primary/50">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base">{t("catalogCardTitle")}</h3>
                  <Badge className="bg-success/20 text-success text-xs">Active</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("catalogCardDescription")}
                </p>
              </div>
            </div>
            <Link href="/governance/vendors/new?catalog=true" className="flex-none">
              <Button size="sm" className="w-full sm:w-auto">
                <Database className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("addFromCatalog")}</span>
                <span className="sm:hidden">Catalog</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-amber-500/50">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base">{t("catalogCardTitle")}</h3>
                  <Badge className="bg-amber-500/20 text-amber-500 text-xs">{formatPrice(9)}/mo</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("catalogCardDescription")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="flex-none w-full sm:w-auto border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
              onClick={() => setUpgradeModalOpen(true)}
            >
              <Lock className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("enableCatalog")}</span>
              <span className="sm:hidden">{t("enableCatalog")}</span>
            </Button>
          </CardContent>
        </Card>
      )}

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
          <TabsTrigger value="approved" className="text-xs sm:text-sm">
            Approved
          </TabsTrigger>
          <TabsTrigger value="suspended" className="text-xs sm:text-sm">
            Suspended
          </TabsTrigger>
          <TabsTrigger value="terminated" className="text-xs sm:text-sm">
            Terminated
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {vendorsLoading && !vendorsPages ? (
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
                            <div className="flex items-center gap-1 mt-2 text-xs text-warning">
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
                    {tc("loadMore")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t("emptyTitle")}</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? t("emptySearchHint")
                    : t("emptyHint")}
                </p>
                {!searchQuery && canWrite && (
                  <Link href="/governance/vendors/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("addVendor")}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {upgradeModalOpen && organization && (
        <EnableFeatureModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          organizationId={organization.id}
          skillPackageId="com.todolaw.aisentinel.vendor-catalog"
          skillName="AI Vendor Catalog"
          skillDescription="Search pre-audited AI vendors from the Vendor.Watch database and auto-fill your local vendor records with compliance data."
        />
      )}
    </div>
  );
}
