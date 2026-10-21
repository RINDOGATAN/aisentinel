"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/governance/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RecordCard, RecordGrid } from "@/components/governance/record-list";
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
  Copy,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { keepPreviousData } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { EnableFeatureModal } from "@/components/premium/enable-feature-modal";
import { formatRelativeTime } from "@/lib/utils";
import { STATUS_OUTLINE } from "@/components/ui/status-note";
import {
  TOOL_STAGES,
  TOOL_TABS,
  TOOL_TAB_STATUSES,
  toolTabCounts,
  type ToolTab,
} from "@/lib/ai-tool-triage";

const statusColors: Record<string, string> = {
  DISCOVERED: STATUS_OUTLINE.warning,
  UNDER_REVIEW: STATUS_OUTLINE.note,
  APPROVED: STATUS_OUTLINE.good,
  PROHIBITED: STATUS_OUTLINE.danger,
  REGISTERED: "border-primary text-primary",
};

const statusKey: Record<string, string> = {
  DISCOVERED: "statusDiscovered",
  UNDER_REVIEW: "statusUnderReview",
  APPROVED: "statusApproved",
  PROHIBITED: "statusProhibited",
  REGISTERED: "statusRegistered",
};

export default function ShadowAIPage() {
  const t = useTranslations("shadowAi");
  const tNew = useTranslations("shadowAiNew");
  const toolCategoryLabel = (category: string) =>
    tNew.has(`toolCategory.${category}`)
      ? tNew(`toolCategory.${category}`)
      : category.replace(/_/g, " ");
  const locale = useLocale();
  const tc = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("");
  // Opens on what is still to review: that is the work left on this step.
  const [activeTab, setActiveTab] = useState<ToolTab>("toReview");
  const [showModal, setShowModal] = useState(false);
  const debouncedSearch = useDebounce(searchQuery);
  const { organization, canWrite } = useOrganization();

  const statusFilter = [...TOOL_TAB_STATUSES[activeTab]];

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
      statuses: statusFilter,
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
  const tabCounts = toolTabCounts(stats);
  const tabLabel: Record<ToolTab, string> = {
    toReview: t("tabToReview", { count: tabCounts.toReview }),
    approved: t("tabApproved", { count: tabCounts.approved }),
    prohibited: t("tabProhibited", { count: tabCounts.prohibited }),
    registered: t("tabRegistered", { count: tabCounts.registered }),
  };
  const copySurvey = () => {
    void navigator.clipboard
      .writeText(t("survey.text"))
      .then(() => toast.success(t("survey.copied")))
      .catch(() => undefined);
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
              {t("title")}
              <Badge className="bg-primary/20 text-primary">{t("premiumBadge")}</Badge>
            </h1>
            <p className="text-muted-foreground">{t("gateSubtitle")}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto rounded-lg">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">{t("gateTitle")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">{t("gateBody")}</p>
            <Button onClick={() => setShowModal(true)} className="mt-4">
              <Lock className="w-4 h-4 mr-2" />
              {t("enableShadowAi")}
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
            skillDescription={t("gateSkillDescription")}
          />
        )}
      </div>
    );
  }

  // Full page
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canWrite && (
            <Link href="/governance/shadow-ai/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t("reportAiTool")}
              </Button>
            </Link>
          )
        }
      />

      {/* What an AI tool is, and that nothing here is detected automatically. */}
      <div className="space-y-2 text-sm">
        <p>
          {t("definition")}{" "}
          <Link href="/governance/ai-registry" className="text-primary underline hover:no-underline">
            {t("systemsLink")}
          </Link>
        </p>
        <p className="text-muted-foreground">{t("noDetection")}</p>
      </div>

      {/* The four stages a tool moves through. */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">{t("stages.title")}</p>
          <ol className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {TOOL_STAGES.map((stage, i) => (
              <li key={stage} className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1">
                    {t(`stages.${stage}.label`)}
                    {i < TOOL_STAGES.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden lg:inline" aria-hidden />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{t(`stages.${stage}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* How to find the tools people use: the page records, it does not detect. */}
      <details className="rounded-lg border border-border bg-card p-4 group">
        <summary className="cursor-pointer text-sm font-medium">{t("howToFind.title")}</summary>
        <div className="mt-3 space-y-3 text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("howToFind.survey")}</li>
            <li>{t("howToFind.expenses")}</li>
            <li>{t("howToFind.sso")}</li>
            <li>{t("howToFind.extensions")}</li>
          </ul>
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{t("survey.title")}</p>
              <Button type="button" variant="outline" size="sm" onClick={copySurvey}>
                <Copy className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                {t("survey.copy")}
              </Button>
            </div>
            <p className="whitespace-pre-line text-muted-foreground">{t("survey.text")}</p>
          </div>
        </div>
      </details>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["toReview", t("statsToReview"), "text-primary"],
            ["approved", t("statsApproved"), "text-foreground"],
            ["prohibited", t("statsProhibited"), "text-foreground"],
            ["registered", t("statsRegistered"), "text-foreground"],
          ] as const
        ).map(([tab, label, tone]) => (
          <Card key={tab}>
            <CardContent className="p-4 sm:pt-6">
              <div className={`text-xl sm:text-2xl font-bold ${tone}`}>{tabCounts[tab]}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ToolTab)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {TOOL_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-xs sm:text-sm">
              {tabLabel[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {reportsLoading && !reportsPages ? (
            <ListPageSkeleton />
          ) : reports.length > 0 ? (
            <>
              <RecordGrid>
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
                    <RecordCard
                      key={report.id}
                      href={`/governance/shadow-ai/${report.id}`}
                      icon={StatusIcon}
                      heading={report.tool?.category ? toolCategoryLabel(report.tool.category) : undefined}
                      title={report.toolName}
                      description={report.usageDescription}
                      badges={
                        <Badge variant="outline" className={`text-xs ${statusColors[report.status] || ""}`}>
                          {statusKey[report.status] ? t(statusKey[report.status]) : report.status}
                        </Badge>
                      }
                      tags={
                        report.department ? (
                          <Badge variant="outline" className="text-xs">
                            {report.department}
                          </Badge>
                        ) : undefined
                      }
                      footer={t("reportedWhen", { when: formatRelativeTime(report.createdAt, locale) })}
                    />
                  );
                })}
              </RecordGrid>
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
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{stats.total > 0 && !searchQuery ? t("emptyTab") : t("emptyTitle")}</p>
                <p className="text-sm mb-4">
                  {searchQuery
                    ? t("emptySearchHint")
                    : t("emptyHint")}
                </p>
                {!searchQuery && canWrite && (
                  <Link href="/governance/shadow-ai/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("reportAiTool")}
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
