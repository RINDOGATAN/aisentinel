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
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { useTranslations } from "next-intl";

const assessmentTypeKeys: Record<string, string> = {
  FRIA: "typeFria",
  CONFORMITY: "typeConformity",
  AI_RISK: "typeAiRisk",
  BIAS_FAIRNESS: "typeBiasFairness",
  CUSTOM: "typeCustom",
};

const assessmentTypeColors: Record<string, string> = {
  FRIA: "border-info text-info",
  CONFORMITY: "border-purple-500 text-purple-500",
  AI_RISK: "border-warning text-warning",
  BIAS_FAIRNESS: "border-pink-500 text-pink-500",
  CUSTOM: "border-muted-foreground text-muted-foreground",
};

const statusKeys: Record<string, string> = {
  DRAFT: "statsDraft",
  IN_PROGRESS: "statsInProgress",
  UNDER_REVIEW: "statsUnderReview",
  APPROVED: "statsApproved",
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
  const t = useTranslations("assessments");
  const tc = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const debouncedSearch = useDebounce(searchQuery);
  const { organization, canWrite } = useOrganization();

  const typeFilter = activeTab === "all" ? undefined : activeTab.toUpperCase() as "FRIA" | "CONFORMITY" | "AI_RISK" | "BIAS_FAIRNESS" | "CUSTOM";

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
      placeholderData: keepPreviousData,
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
          <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        {canWrite && (
          <Link href="/governance/assessments/new" className="flex-none">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("newAssessment")}</span>
              <span className="sm:hidden">{tc("create")}</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsTotal")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-muted-foreground">{stats.draft}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsDraft")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-info">{stats.inProgress}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsInProgress")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-warning">{stats.underReview}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsUnderReview")}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.approved}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsApproved")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
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
            {t("typeFria")}
          </TabsTrigger>
          <TabsTrigger value="conformity" className="text-xs sm:text-sm">
            <span>{t("typeConformity")}</span>
            {isPremiumLocked("CONFORMITY") && (
              <Lock className="w-3 h-3 ml-1 text-warning" />
            )}
          </TabsTrigger>
          <TabsTrigger value="ai_risk" className="text-xs sm:text-sm">
            {t("typeAiRisk")}
          </TabsTrigger>
          <TabsTrigger value="bias_fairness" className="text-xs sm:text-sm">
            <span>{t("typeBiasFairness")}</span>
            {isPremiumLocked("BIAS_FAIRNESS") && (
              <Lock className="w-3 h-3 ml-1 text-warning" />
            )}
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm">
            {t("typeCustom")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {assessmentsLoading && !assessmentsPages ? (
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
                              {assessmentTypeKeys[assessment.type] ? t(assessmentTypeKeys[assessment.type]) : assessment.type}
                              {premiumTypes.includes(assessment.type) && (
                                <Lock className="w-3 h-3 ml-1" />
                              )}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusColors[assessment.status] || ""}`}
                            >
                              {statusKeys[assessment.status] ? t(statusKeys[assessment.status]) : assessment.status}
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
                    {tc("loadMore")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t("emptyTitle")}</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? t("emptySearchHint")
                    : t("emptyHint")}
                </p>
                {!searchQuery && canWrite && (
                  <Link href="/governance/assessments/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("newAssessment")}
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
