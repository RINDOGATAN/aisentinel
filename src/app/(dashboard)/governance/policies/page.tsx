"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/governance/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RecordCard, RecordGrid, RecordTable } from "@/components/governance/record-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ScrollText,
  Plus,
  Search,
  Loader2,
  Calendar,
  Link2,
  LayoutList,
  LayoutGrid,
  Trash2,
  User,
  Building2,
} from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { useEnumLabels } from "@/lib/enum-labels";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatRelativeTime, cn } from "@/lib/utils";
import { useFormatDate } from "@/lib/use-format-date";
import { STATUS_OUTLINE } from "@/components/ui/status-note";
import { POLICY_TYPES, isUnreviewedTemplateDraft, policyReference, type PolicyTypeValue } from "@/lib/policy-meta";
import { PolicyLifecycle, usePolicyTypeLabel } from "@/components/governance/policy/policy-fields";
import { PolicyTemplatesTab } from "@/components/governance/policy/policy-templates";

const statusColors: Record<string, string> = {
  DRAFT: "border-muted-foreground text-muted-foreground",
  UNDER_REVIEW: STATUS_OUTLINE.warning,
  APPROVED: STATUS_OUTLINE.note,
  PUBLISHED: STATUS_OUTLINE.good,
  ARCHIVED: "border-muted-foreground/50 text-muted-foreground/50",
};

type View = "table" | "cards";
const VIEW_KEY = "ais.policies.view";
const VIEW_EVENT = "aisentinel:policies-view";
const ALL = "all";

// The chosen view is a per-viewer convenience kept in localStorage (read as an
// external store); the page works the same without it, in the table view.
function subscribeView(onChange: () => void) {
  window.addEventListener(VIEW_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(VIEW_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "cards" ? "cards" : "table";
  } catch {
    return "table";
  }
}

export default function PoliciesPage() {
  const t = useTranslations("policies");
  const { formatDate } = useFormatDate();
  const locale = useLocale();
  const tc = useTranslations("common");
  const { statusLabel } = useEnumLabels();
  const typeLabel = usePolicyTypeLabel();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState(searchParams.get("tab") === "templates" ? "templates" : "policies");
  const [typeFilter, setTypeFilter] = useState<PolicyTypeValue | typeof ALL>(ALL);
  const [originFilter, setOriginFilter] = useState<"written" | "template" | typeof ALL>(ALL);
  const view = useSyncExternalStore(subscribeView, readView, () => "table" as View);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const debouncedSearch = useDebounce(searchQuery);
  const { organization, canWrite, userRole } = useOrganization();
  const orgId = organization?.id ?? "";
  const utils = trpc.useUtils();

  const chooseView = (next: View) => {
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* storage unavailable: the view stays as it is */
    }
    window.dispatchEvent(new Event(VIEW_EVENT));
  };

  const { data: statsData } = trpc.policy.getStats.useQuery({ organizationId: orgId }, { enabled: !!orgId });
  const { data: titles } = trpc.policy.titles.useQuery({ organizationId: orgId }, { enabled: !!orgId });
  const { data: removalPlan } = trpc.policy.templateDraftsPlan.useQuery({ organizationId: orgId }, { enabled: !!orgId });

  const {
    data: policiesPages,
    isLoading: policiesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.policy.list.useInfiniteQuery(
    {
      organizationId: orgId,
      search: debouncedSearch || undefined,
      type: typeFilter === ALL ? undefined : typeFilter,
      origin: originFilter === ALL ? undefined : originFilter,
      limit: 20,
    },
    {
      enabled: !!orgId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }
  );

  const removeDrafts = trpc.policy.removeTemplateDrafts.useMutation({
    onSuccess: (res) => {
      setConfirmingRemove(false);
      toast.success(t("templateDraftsRemoved", { count: res.removed }));
      void utils.policy.invalidate();
    },
    onError: (err) => {
      setConfirmingRemove(false);
      toast.error(err.message);
    },
  });

  const policies = policiesPages?.pages.flatMap((p) => p.items) ?? [];
  const stats = statsData ?? { total: 0, draft: 0, published: 0, reviewDue: 0, writtenHere: 0, fromTemplates: 0, toReview: 0 };
  const canRemoveDrafts = canWrite && userRole !== null && ["OWNER", "ADMIN", "AI_OFFICER"].includes(userRole);
  const filtered = !!searchQuery || typeFilter !== ALL || originFilter !== ALL;

  const templateMark = (policy: (typeof policies)[number]) =>
    isUnreviewedTemplateDraft(policy) ? (
      <Badge variant="outline" className={cn("text-xs", STATUS_OUTLINE.warning)}>
        {t("templateDraftMark")}
      </Badge>
    ) : null;

  const systemsLine = (policy: (typeof policies)[number]) => {
    const count = policy._count?.systemLinks ?? 0;
    if (count === 0) return <span className="text-muted-foreground">{t("noSystems")}</span>;
    const names = policy.systemLinks.map((l) => l.aiSystem.name);
    return (
      <span title={names.join(", ")}>
        {count <= names.length ? names.join(", ") : t("systemsMore", { names: names.join(", "), count: count - names.length })}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canWrite && (
            <Link href="/governance/policies/new">
              <Button>
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("createPolicy")}</span>
                <span className="sm:hidden">{tc("create")}</span>
              </Button>
            </Link>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="policies">{t("tabPolicies", { count: stats.total })}</TabsTrigger>
          <TabsTrigger value="templates">{t("tabTemplates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-4 space-y-4 sm:space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
                <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.published}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("statsPublished")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className={`text-xl sm:text-2xl font-bold ${stats.reviewDue > 0 ? "text-warning" : "text-muted-foreground"}`}>
                  {stats.reviewDue}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("statsReviewDue")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Where the policies came from, and the template drafts nobody has reviewed */}
          {stats.total > 0 && (
            <div className="space-y-2" data-testid="policy-origin">
              <p className="text-sm">
                {t("originCounts", { written: stats.writtenHere, templates: stats.fromTemplates })}
                {stats.toReview > 0 && <> {t("originToReview", { count: stats.toReview })}</>}
              </p>
              {canRemoveDrafts && (removalPlan?.remove ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {confirmingRemove ? (
                    <>
                      <span className="text-sm">{t("templateDraftsConfirmLead", { count: removalPlan!.remove })}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={removeDrafts.isPending}
                        onClick={() => removeDrafts.mutate({ organizationId: orgId })}
                      >
                        {removeDrafts.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {t("templateDraftsConfirm", { count: removalPlan!.remove })}
                      </Button>
                      <Button variant="ghost" size="sm" disabled={removeDrafts.isPending} onClick={() => setConfirmingRemove(false)}>
                        {tc("cancel")}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setConfirmingRemove(true)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      {t("templateDraftsRemove", { count: removalPlan!.remove })}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <PolicyLifecycle />

          {/* Search, filters and view */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as PolicyTypeValue | typeof ALL)}>
                <SelectTrigger aria-label={t("filterType")} className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filterAllTypes")}</SelectItem>
                  {POLICY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {typeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as "written" | "template" | typeof ALL)}>
                <SelectTrigger aria-label={t("filterOrigin")} className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filterAllOrigins")}</SelectItem>
                  <SelectItem value="written">{t("filterWritten")}</SelectItem>
                  <SelectItem value="template">{t("filterTemplate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1" role="group" aria-label={t("viewLabel")}>
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="icon"
                aria-pressed={view === "table"}
                title={t("viewTable")}
                aria-label={t("viewTable")}
                onClick={() => chooseView("table")}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                variant={view === "cards" ? "secondary" : "ghost"}
                size="icon"
                aria-pressed={view === "cards"}
                title={t("viewCards")}
                aria-label={t("viewCards")}
                onClick={() => chooseView("cards")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {policiesLoading && !policiesPages ? (
            <ListPageSkeleton />
          ) : policies.length > 0 ? (
            <>
              {view === "table" ? (
                <RecordTable>
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">{t("colTitle")}</th>
                        <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">{t("colType")}</th>
                        <th scope="col" className="px-3 py-2 font-medium">{t("colStatus")}</th>
                        <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">{t("colOwner")}</th>
                        <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">{t("colSystems")}</th>
                        <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">{t("colReview")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policies.map((policy) => (
                        <tr key={policy.id} className="border-t border-border align-top hover:bg-muted/30">
                          <td className="px-3 py-2.5">
                            <Link href={`/governance/policies/${policy.id}`} className="font-medium hover:text-primary hover:underline">
                              {policy.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {policyReference(policy.number) && <span>{policyReference(policy.number)}</span>}
                              <span>v{policy.currentVersion}</span>
                              {templateMark(policy)}
                              {policy.departmentName && <span>· {policy.departmentName}</span>}
                            </div>
                          </td>
                          <td className="hidden px-3 py-2.5 md:table-cell">{typeLabel(policy.type)}</td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className={`text-xs ${statusColors[policy.status] || ""}`}>
                              {statusLabel(policy.status)}
                            </Badge>
                          </td>
                          <td className="hidden px-3 py-2.5 lg:table-cell">
                            {policy.ownerName ?? <span className="text-muted-foreground">{t("noOwner")}</span>}
                          </td>
                          <td className="hidden px-3 py-2.5 lg:table-cell max-w-[16rem]">{systemsLine(policy)}</td>
                          <td className="hidden px-3 py-2.5 whitespace-nowrap sm:table-cell">
                            {policy.reviewDate ? formatDate(policy.reviewDate) : <span className="text-muted-foreground">{t("noReviewDate")}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                </RecordTable>
              ) : (
                <RecordGrid>
                  {policies.map((policy) => (
                    <RecordCard
                      key={policy.id}
                      href={`/governance/policies/${policy.id}`}
                      icon={ScrollText}
                      heading={[policyReference(policy.number), `v${policy.currentVersion}`].filter(Boolean).join(" · ")}
                      title={policy.title}
                      description={policy.description}
                      badges={
                        <>
                          <Badge variant="outline" className={`text-xs ${statusColors[policy.status] || ""}`}>
                            {statusLabel(policy.status)}
                          </Badge>
                          {templateMark(policy)}
                        </>
                      }
                      tags={
                        <>
                          <Badge variant="outline" className="text-xs">
                            {typeLabel(policy.type)}
                          </Badge>
                          {(policy._count?.systemLinks ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Link2 className="w-3 h-3 mr-1" />
                              {t("systemsCount", { count: policy._count.systemLinks })}
                            </Badge>
                          )}
                        </>
                      }
                      details={
                        policy.ownerName || policy.departmentName || policy.reviewDate ? (
                          <div className="flex flex-wrap gap-3">
                            {policy.ownerName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {policy.ownerName}
                              </span>
                            )}
                            {policy.departmentName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {policy.departmentName}
                              </span>
                            )}
                            {policy.reviewDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {t("reviewOn", { date: formatDate(policy.reviewDate) })}
                              </span>
                            )}
                          </div>
                        ) : undefined
                      }
                      footer={tc("updatedWhen", { when: formatRelativeTime(policy.updatedAt, locale) })}
                    />
                  ))}
                </RecordGrid>
              )}
              {hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {tc("loadMore")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t("emptyTitle")}</p>
                <p className="text-sm mb-4">{filtered ? t("emptySearchHint") : t("emptyHint")}</p>
                {!filtered && canWrite && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={() => setTab("templates")}>
                      {t("browseTemplates")}
                    </Button>
                    <Link href="/governance/policies/new">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("createPolicy")}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <PolicyTemplatesTab existingTitles={new Set(titles ?? [])} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
