"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";
import { ListPageSkeleton } from "@/components/skeletons/list-page-skeleton";
import { formatDate } from "@/lib/utils";

const riskLevelColors: Record<string, string> = {
  UNACCEPTABLE: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  LIMITED: "bg-warning/20 text-warning",
  MINIMAL: "bg-success/20 text-success",
};

const riskLevelDescriptions: Record<string, string> = {
  UNACCEPTABLE:
    "Prohibited AI practices (Art. 5): social scoring, real-time biometric identification, manipulation.",
  HIGH:
    "High-risk AI systems (Art. 6, Annex III): biometrics, critical infrastructure, education, employment, law enforcement.",
  LIMITED:
    "Limited risk requiring transparency obligations (Art. 50): chatbots, deepfakes, emotion recognition.",
  MINIMAL:
    "Minimal risk with no specific regulatory obligations beyond voluntary codes of conduct.",
};

const annexIIICategories = [
  { value: "biometrics", label: "1. Biometrics" },
  { value: "critical_infrastructure", label: "2. Critical Infrastructure" },
  { value: "education", label: "3. Education & Vocational Training" },
  { value: "employment", label: "4. Employment & Workers Management" },
  { value: "essential_services", label: "5. Essential Private/Public Services" },
  { value: "law_enforcement", label: "6. Law Enforcement" },
  { value: "migration", label: "7. Migration, Asylum & Border Control" },
  { value: "justice", label: "8. Administration of Justice" },
];

export default function RiskClassificationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
  const [classifyForm, setClassifyForm] = useState<Record<string, {
    riskLevel: string;
    rationale: string;
    annexIIICategory: string;
  }>>({});
  const debouncedSearch = useDebounce(searchQuery);
  const router = useRouter();
  const { organization } = useOrganization();
  const t = useTranslations("riskClassification");
  const tc = useTranslations("common");

  const { data: stats, isLoading: statsLoading } = trpc.riskClassification.getStats.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id }
  );

  const { data: systems, isLoading: systemsLoading } = trpc.riskClassification.list.useQuery(
    {
      organizationId: organization?.id ?? "",
      search: debouncedSearch || undefined,
    },
    { enabled: !!organization?.id, placeholderData: keepPreviousData }
  );

  const utils = trpc.useUtils();

  const classifyMutation = trpc.riskClassification.classify.useMutation({
    onSuccess: (data) => {
      const mappingsMsg = data.complianceMappingsCreated
        ? ` — ${data.complianceMappingsCreated} compliance requirements initialized`
        : "";
      toast.success(`${data.aiSystem.name} classified as ${data.riskLevel}${mappingsMsg}`, {
        action: {
          label: t("viewCompliance"),
          onClick: () => router.push(`/governance/compliance?systemId=${data.aiSystemId}`),
        },
      });
      utils.riskClassification.list.invalidate();
      utils.riskClassification.getStats.invalidate();
      setExpandedSystem(null);
      setClassifyForm((prev) => {
        const next = { ...prev };
        delete next[data.aiSystemId];
        return next;
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to classify risk");
    },
  });

  const handleClassify = (aiSystemId: string) => {
    const form = classifyForm[aiSystemId];
    if (!organization?.id || !form?.riskLevel || !form?.rationale) return;

    classifyMutation.mutate({
      organizationId: organization.id,
      aiSystemId,
      riskLevel: form.riskLevel as "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL",
      rationale: form.rationale,
      annexIIICategory: form.annexIIICategory || undefined,
    });
  };

  const getFormForSystem = (systemId: string) => {
    return classifyForm[systemId] || { riskLevel: "", rationale: "", annexIIICategory: "" };
  };

  const updateFormForSystem = (
    systemId: string,
    updates: Partial<{ riskLevel: string; rationale: string; annexIIICategory: string }>
  ) => {
    setClassifyForm((prev) => ({
      ...prev,
      [systemId]: { ...getFormForSystem(systemId), ...updates },
    }));
  };

  const riskStats = stats ?? { unacceptable: 0, high: 0, limited: 0, minimal: 0, unclassified: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <Card className="border-destructive/30">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-destructive">
              {riskStats.unacceptable}
            </div>
            <p className="text-xs text-muted-foreground">{tc("riskUnacceptable")}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-destructive/80">
              {riskStats.high}
            </div>
            <p className="text-xs text-muted-foreground">{tc("riskHigh")}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-warning">
              {riskStats.limited}
            </div>
            <p className="text-xs text-muted-foreground">{tc("riskLimited")}</p>
          </CardContent>
        </Card>
        <Card className="border-success/30">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-success">
              {riskStats.minimal}
            </div>
            <p className="text-xs text-muted-foreground">{tc("riskMinimal")}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-muted-foreground">
              {riskStats.unclassified}
            </div>
            <p className="text-xs text-muted-foreground">{t("unclassified")}</p>
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

      {/* Systems List */}
      {systemsLoading && !systems ? (
        <ListPageSkeleton />
      ) : systems && systems.length > 0 ? (
        <div className="space-y-3">
          {systems.map((system) => {
            const isExpanded = expandedSystem === system.id;
            const currentLevel = system.riskClassification?.riskLevel;
            const form = getFormForSystem(system.id);

            return (
              <Card key={system.id}>
                <CardContent className="p-4">
                  {/* System Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-primary/10 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/governance/ai-registry/${system.id}`}
                          className="font-medium text-sm hover:text-primary truncate block"
                        >
                          {system.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {system.technique.replace("_", " ")} &middot; {system.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {currentLevel ? (
                        <Badge className={`text-xs ${riskLevelColors[currentLevel] || ""}`}>
                          {currentLevel}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t("unclassified")}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedSystem(isExpanded ? null : system.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Classification Form */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Current Classification Info */}
                      {system.riskClassification && (
                        <div className="p-3 bg-muted/50 space-y-2">
                          <p className="text-xs font-medium">{t("currentClassification")}</p>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-xs ${
                                riskLevelColors[system.riskClassification.riskLevel] || ""
                              }`}
                            >
                              {system.riskClassification.riskLevel}
                            </Badge>
                            {system.riskClassification.annexIIICategory && (
                              <Badge variant="outline" className="text-xs">
                                Annex III: {system.riskClassification.annexIIICategory}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {system.riskClassification.rationale}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Classified {formatDate(system.riskClassification.classifiedAt)}
                          </p>
                        </div>
                      )}

                      {/* Classification Form */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t("riskLevelLabel")} *</Label>
                          <Select
                            value={form.riskLevel}
                            onValueChange={(value) =>
                              updateFormForSystem(system.id, { riskLevel: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("riskLevelPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNACCEPTABLE">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-destructive" />
                                  {tc("riskUnacceptable")}
                                </div>
                              </SelectItem>
                              <SelectItem value="HIGH">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-destructive/80" />
                                  {tc("riskHigh")}
                                </div>
                              </SelectItem>
                              <SelectItem value="LIMITED">
                                <div className="flex items-center gap-2">
                                  <ShieldQuestion className="w-4 h-4 text-warning" />
                                  {tc("riskLimited")}
                                </div>
                              </SelectItem>
                              <SelectItem value="MINIMAL">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-success" />
                                  {tc("riskMinimal")}
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {form.riskLevel && (
                            <p className="text-xs text-muted-foreground">
                              {({
                                UNACCEPTABLE: t("riskDescriptionUnacceptable"),
                                HIGH: t("riskDescriptionHigh"),
                                LIMITED: t("riskDescriptionLimited"),
                                MINIMAL: t("riskDescriptionMinimal"),
                              } as Record<string, string>)[form.riskLevel]}
                            </p>
                          )}
                        </div>

                        {(form.riskLevel === "HIGH" || form.riskLevel === "UNACCEPTABLE") && (
                          <div className="space-y-2">
                            <Label>{t("annexIIICategoryLabel")}</Label>
                            <Select
                              value={form.annexIIICategory}
                              onValueChange={(value) =>
                                updateFormForSystem(system.id, { annexIIICategory: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("annexIIICategoryPlaceholder")} />
                              </SelectTrigger>
                              <SelectContent>
                                {annexIIICategories.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>{t("rationaleLabel")} *</Label>
                          <Textarea
                            placeholder={t("rationalePlaceholder")}
                            rows={3}
                            value={form.rationale}
                            onChange={(e) =>
                              updateFormForSystem(system.id, { rationale: e.target.value })
                            }
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedSystem(null)}
                          >
                            {tc("cancel")}
                          </Button>
                          <Button
                            size="sm"
                            disabled={
                              !form.riskLevel ||
                              !form.rationale ||
                              classifyMutation.isPending
                            }
                            onClick={() => handleClassify(system.id)}
                          >
                            {classifyMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t("classifying")}
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                {currentLevel ? t("reclassify") : t("classify")}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("emptyTitle")}</p>
            <p className="text-sm mb-4">
              {searchQuery
                ? t("emptySearchHint")
                : t("emptyDefaultHint")}
            </p>
            {!searchQuery && (
              <Link href="/governance/ai-registry/new">
                <Button>{t("registerAiSystem")}</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
