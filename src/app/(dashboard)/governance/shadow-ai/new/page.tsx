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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Search, PenLine, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useDebounce } from "@/hooks/use-debounce";

export default function NewShadowAIReportPage() {
  const t = useTranslations("shadowAiNew");
  const tc = useTranslations("common");
  const router = useRouter();
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [catalogSearch, setCatalogSearch] = useState("");
  const debouncedCatalogSearch = useDebounce(catalogSearch);
  const [selectedTool, setSelectedTool] = useState<{
    id: string;
    name: string;
    vendor: string | null;
    category: string;
  } | null>(null);
  const [customToolName, setCustomToolName] = useState("");
  const [department, setDepartment] = useState("");
  const [usageDescription, setUsageDescription] = useState("");

  const utils = trpc.useUtils();

  const { data: toolsData, isLoading: toolsLoading } =
    trpc.shadowAi.listTools.useQuery(
      {
        organizationId: organization?.id ?? "",
        search: debouncedCatalogSearch || undefined,
        limit: 50,
      },
      { enabled: !!organization?.id && mode === "catalog" }
    );

  const tools = toolsData?.items ?? [];

  const createReport = trpc.shadowAi.createReport.useMutation({
    onSuccess: (data) => {
      toast.success(t("toastSuccess"));
      utils.shadowAi.listReports.invalidate();
      utils.shadowAi.getStats.invalidate();
      router.push(`/governance/shadow-ai/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
      setIsSubmitting(false);
    },
  });

  const toolName =
    mode === "catalog" ? selectedTool?.name ?? "" : customToolName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !toolName) return;

    setIsSubmitting(true);

    createReport.mutate({
      organizationId: organization.id,
      toolId: mode === "catalog" ? selectedTool?.id : undefined,
      toolName,
      department: department || undefined,
      usageDescription: usageDescription || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance/shadow-ai">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Selection</CardTitle>
          <CardDescription>
            Search from the AI tool catalog or enter a custom tool name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "catalog" ? "default" : "outline"}
                onClick={() => {
                  setMode("catalog");
                  setCustomToolName("");
                }}
                className="flex-1"
              >
                <Search className="w-4 h-4 mr-2" />
                {t("searchCatalog")}
              </Button>
              <Button
                type="button"
                variant={mode === "custom" ? "default" : "outline"}
                onClick={() => {
                  setMode("custom");
                  setSelectedTool(null);
                }}
                className="flex-1"
              >
                <PenLine className="w-4 h-4 mr-2" />
                {t("enterCustomTool")}
              </Button>
            </div>

            {/* Catalog Mode */}
            {mode === "catalog" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("catalogSearchPlaceholder")}
                    className="pl-9"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-md">
                  {toolsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : tools.length > 0 ? (
                    <div className="divide-y">
                      {tools.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() =>
                            setSelectedTool({
                              id: tool.id,
                              name: tool.name,
                              vendor: tool.vendor,
                              category: tool.category,
                            })
                          }
                          className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 ${
                            selectedTool?.id === tool.id
                              ? "bg-primary/10 border-l-2 border-l-primary"
                              : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {tool.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tool.vendor && `${tool.vendor} · `}
                              {tool.category.replace(/_/g, " ")}
                            </p>
                          </div>
                          {selectedTool?.id === tool.id && (
                            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {catalogSearch
                        ? "No tools found — try a different search or enter a custom tool"
                        : "Type to search the AI tool catalog"}
                    </div>
                  )}
                </div>

                {selectedTool && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">
                      Selected: {selectedTool.name}
                    </span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {selectedTool.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Custom Mode */}
            {mode === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customToolName">{t("labelToolName")} *</Label>
                <Input
                  id="customToolName"
                  placeholder="e.g., Internal LLM, Custom AI Agent"
                  value={customToolName}
                  onChange={(e) => setCustomToolName(e.target.value)}
                  required={mode === "custom"}
                />
              </div>
            )}

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">{t("labelDepartment")}</Label>
              <Input
                id="department"
                placeholder="e.g., Marketing, Engineering, Legal"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            {/* Usage Description */}
            <div className="space-y-2">
              <Label htmlFor="usageDescription">{t("labelUsageDescription")}</Label>
              <Textarea
                id="usageDescription"
                placeholder="Describe how this tool is being used, by whom, and what data it processes..."
                rows={4}
                value={usageDescription}
                onChange={(e) => setUsageDescription(e.target.value)}
              />
            </div>

            {/* Error */}
            {createReport.error && (
              <div className="text-sm text-destructive">
                Error: {createReport.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/shadow-ai">
                <Button variant="outline" type="button">
                  {tc("cancel")}
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting || !toolName}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("reporting")}
                  </>
                ) : (
                  t("submitReportTool")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
