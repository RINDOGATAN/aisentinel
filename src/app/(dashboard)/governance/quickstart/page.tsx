"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Search,
  ShoppingCart,
  Cloud,
  Heart,
  Landmark,
  Briefcase,
  Building2,
  Factory,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Brain,
  ShieldAlert,
  Eye,
  ScrollText,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

// ============================================================
// ICON MAP
// ============================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Cloud,
  Heart,
  Landmark,
  Briefcase,
  Factory,
};

// ============================================================
// TYPES
// ============================================================

type WizardStep = "choose" | "vendors" | "industry" | "review" | "success";

// ============================================================
// RISK LEVEL BADGES
// ============================================================

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    UNACCEPTABLE: "bg-destructive/20 text-destructive border-destructive/30",
    HIGH: "bg-destructive/15 text-destructive border-destructive/20",
    LIMITED: "bg-warning/15 text-warning border-warning/20",
    MINIMAL: "bg-success/15 text-success border-success/20",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${styles[level] ?? ""}`}>
      {level}
    </Badge>
  );
}

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function QuickstartPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";

  // Wizard state
  const [step, setStep] = useState<WizardStep>("choose");
  const [useVendors, setUseVendors] = useState(false);
  const [useIndustry, setUseIndustry] = useState(false);

  // Vendor selection
  const [vendorSearch, setVendorSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  // Industry selection
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [expandedSystems, setExpandedSystems] = useState(false);

  // Skip lists
  const [skipSystemNames, setSkipSystemNames] = useState<string[]>([]);
  const [skipPolicyTitles, setSkipPolicyTitles] = useState<string[]>([]);

  // Result data from execute mutation
  const [executionResult, setExecutionResult] = useState<{
    vendors: number;
    systems: number;
    riskClassifications: number;
    oversightGates: number;
    policies: number;
  } | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setVendorSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // ─── QUERIES ──────────────────────────────────────

  const { data: catalogResults, isLoading: catalogLoading } =
    trpc.vendorCatalog.search.useQuery(
      { organizationId: orgId, query: debouncedSearch, limit: 20 },
      { enabled: !!orgId && debouncedSearch.length >= 2 && step === "vendors" },
    );

  const { data: templates } = trpc.quickstart.listTemplates.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );

  const { data: vendorPreview } = trpc.quickstart.previewVendorImport.useQuery(
    { organizationId: orgId, vendorSlugs: selectedSlugs },
    {
      enabled:
        !!orgId &&
        selectedSlugs.length > 0 &&
        (step === "vendors" || step === "review"),
    },
  );

  const { data: industryPreview } =
    trpc.quickstart.previewIndustryTemplate.useQuery(
      { organizationId: orgId, industryId: selectedIndustryId ?? "" },
      { enabled: !!orgId && !!selectedIndustryId },
    );

  const executeMutation = trpc.quickstart.execute.useMutation({
    onSuccess: (data) => {
      setExecutionResult(data);
      const total = data.systems + data.vendors + data.policies;
      if (total === 0) {
        toast.info("All records already exist — nothing new to create");
      } else {
        const parts = [];
        if (data.vendors > 0)
          parts.push(
            `${data.vendors} vendor${data.vendors !== 1 ? "s" : ""}`,
          );
        if (data.systems > 0)
          parts.push(
            `${data.systems} system${data.systems !== 1 ? "s" : ""}`,
          );
        if (data.policies > 0)
          parts.push(
            `${data.policies} polic${data.policies !== 1 ? "ies" : "y"}`,
          );
        toast.success(`Created ${parts.join(", ")}`);
      }
      setStep("success");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // ─── HANDLERS ─────────────────────────────────────

  const toggleVendorSlug = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const removeVendorSlug = (slug: string) => {
    setSelectedSlugs((prev) => prev.filter((s) => s !== slug));
  };

  const handleProceedFromChoose = () => {
    if (useVendors && !useIndustry) setStep("vendors");
    else if (useIndustry && !useVendors) setStep("industry");
    else if (useVendors) setStep("vendors");
    else toast.error("Select at least one option");
  };

  const handleProceedFromVendors = () => {
    if (selectedSlugs.length === 0) {
      toast.error("Select at least one vendor");
      return;
    }
    if (useIndustry) setStep("industry");
    else setStep("review");
  };

  const handleProceedFromIndustry = () => {
    if (!selectedIndustryId) {
      toast.error("Select an industry template");
      return;
    }
    setStep("review");
  };

  const handleExecute = () => {
    executeMutation.mutate({
      organizationId: orgId,
      vendorSlugs: useVendors ? selectedSlugs : [],
      industryId: useIndustry ? selectedIndustryId ?? undefined : undefined,
      skipSystemNames,
      skipPolicyTitles,
    });
  };

  // Calculate totals for review step
  const reviewTotals = {
    vendors: vendorPreview?.totals.vendors ?? 0,
    systems:
      (vendorPreview?.totals.systems ?? 0) +
      (industryPreview?.totals.systems ?? 0),
    riskClassifications:
      (vendorPreview?.totals.riskClassifications ?? 0) +
      (industryPreview?.totals.riskClassifications ?? 0),
    oversightGates:
      (vendorPreview?.totals.oversightGates ?? 0) +
      (industryPreview?.totals.oversightGates ?? 0),
    policies: industryPreview?.totals.policies ?? 0,
  };

  // ─── RENDER ───────────────────────────────────────

  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            AI Governance Quick Start
          </h1>
          <p className="text-sm text-muted-foreground">
            Bootstrap your AI governance program in minutes
          </p>
        </div>
      </div>

      {/* Step indicator */}
      {step !== "success" && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {[
            { key: "choose", label: "Choose Path" },
            ...(useVendors
              ? [{ key: "vendors", label: "Select Vendors" }]
              : []),
            ...(useIndustry
              ? [{ key: "industry", label: "Industry Template" }]
              : []),
            { key: "review", label: "Review & Build" },
          ].map((s, i, arr) => (
            <span key={s.key} className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  step === s.key
                    ? "bg-primary text-primary-foreground"
                    : arr.findIndex((x) => x.key === step) > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={
                  step === s.key ? "font-medium" : "text-muted-foreground"
                }
              >
                {s.label}
              </span>
              {i < arr.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              )}
            </span>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          STEP 1: Choose Path
          ════════════════════════════════════════════════ */}
      {step === "choose" && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Choose how you want to bootstrap your AI governance program. You can
            use both options together.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Vendor Import Card */}
            <Card
              className={`cursor-pointer transition-all ${
                useVendors
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setUseVendors(!useVendors)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Building2 className="w-8 h-8 text-primary" />
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600/50"
                    >
                      5 Free
                    </Badge>
                    {useVendors && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">
                  Import from AI Vendor Catalog
                </CardTitle>
                <CardDescription>
                  Select AI vendors you use and auto-generate AI systems, risk
                  classifications, and oversight gates from their known
                  profiles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">AI Systems</Badge>
                  <Badge variant="secondary">Risk Classifications</Badge>
                  <Badge variant="secondary">Oversight Gates</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Industry Template Card */}
            <Card
              className={`cursor-pointer transition-all ${
                useIndustry
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setUseIndustry(!useIndustry)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600/50"
                    >
                      Free
                    </Badge>
                    {useIndustry && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">
                  Start from Industry Template
                </CardTitle>
                <CardDescription>
                  Pick your industry and get a pre-built AI governance program
                  with common AI systems, risk classifications, and policies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">AI Systems</Badge>
                  <Badge variant="secondary">Risk Classifications</Badge>
                  <Badge variant="secondary">Oversight Gates</Badge>
                  <Badge variant="secondary">Policies</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleProceedFromChoose}
              disabled={!useVendors && !useIndustry}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          STEP 2A: Vendor Selection
          ════════════════════════════════════════════════ */}
      {step === "vendors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Select AI Vendors</h2>
              <p className="text-sm text-muted-foreground">
                Search the vendor catalog and select the AI tools your
                organization uses.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("choose")}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>

          {/* Selected vendors */}
          {selectedSlugs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSlugs.map((slug) => {
                const vendor = vendorPreview?.previews.find(
                  (p) => p.vendorSlug === slug,
                );
                return (
                  <Badge
                    key={slug}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-1"
                  >
                    {vendor?.vendorName ?? slug}
                    <button
                      onClick={() => removeVendorSlug(slug)}
                      className="ml-1 hover:bg-muted rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
              <span className="text-xs text-muted-foreground self-center">
                {selectedSlugs.length} selected
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search AI vendors (e.g. OpenAI, Anthropic, AWS...)"
              value={vendorSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Catalog results */}
          {debouncedSearch.length >= 2 && (
            <div className="space-y-2">
              {catalogLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : catalogResults && catalogResults.length > 0 ? (
                catalogResults.map((vendor) => {
                  const isSelected = selectedSlugs.includes(vendor.slug);
                  return (
                    <Card
                      key={vendor.slug}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "hover:border-muted-foreground/30"
                      }`}
                      onClick={() => toggleVendorSlug(vendor.slug)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {vendor.name}
                            </span>
                            {vendor.isVerified && (
                              <Badge
                                variant="outline"
                                className="text-xs border-primary/50 text-primary"
                              >
                                Verified
                              </Badge>
                            )}
                            {vendor.euAiActCompliant && (
                              <Badge
                                variant="outline"
                                className="text-xs border-blue-500/50 text-blue-500"
                              >
                                EU AI Act
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {vendor.category}
                            {vendor.subcategory
                              ? ` > ${vendor.subcategory}`
                              : ""}
                            {vendor.description
                              ? ` — ${vendor.description}`
                              : ""}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No vendors found for &quot;{debouncedSearch}&quot;
                </p>
              )}
            </div>
          )}

          {/* Preview totals */}
          {vendorPreview && selectedSlugs.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Import Preview</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold">
                      {vendorPreview.totals.vendors}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Vendors</p>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {vendorPreview.totals.systems}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      AI Systems
                    </p>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {vendorPreview.totals.riskClassifications}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Risk Classifications
                    </p>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {vendorPreview.totals.oversightGates}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Oversight Gates
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleProceedFromVendors}
              disabled={selectedSlugs.length === 0}
            >
              {useIndustry ? "Next: Industry Template" : "Review & Build"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          STEP 2B: Industry Template Selection
          ════════════════════════════════════════════════ */}
      {step === "industry" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Select Industry Template
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose your industry for a pre-built AI governance program.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setStep(useVendors ? "vendors" : "choose")
              }
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>

          {/* Template grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates?.map((t) => {
              const Icon = ICON_MAP[t.icon] ?? Sparkles;
              const isSelected = selectedIndustryId === t.id;
              return (
                <Card
                  key={t.id}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedIndustryId(t.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-6 h-6 text-primary" />
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.description}
                    </p>
                    <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                      <span>{t.systemCount} systems</span>
                      <span>&middot;</span>
                      <span>{t.policyCount} policies</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Industry preview */}
          {industryPreview && (
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Template Preview</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedSystems(!expandedSystems)}
                  >
                    {expandedSystems ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold">
                      {industryPreview.totals.systems}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      AI Systems
                    </p>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {industryPreview.totals.riskClassifications}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Risk Classifications
                    </p>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {industryPreview.totals.oversightGates}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Oversight Gates
                    </p>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {industryPreview.totals.policies}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Policies
                    </p>
                  </div>
                </div>

                {expandedSystems && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground">
                      AI Systems
                    </p>
                    {industryPreview.systems.map((s) => (
                      <div
                        key={s.name}
                        className={`flex items-center justify-between p-2 rounded border text-sm ${
                          s.alreadyExists ? "opacity-50 border-dashed" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Brain className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <RiskBadge level={s.riskLevel} />
                          {s.gateType && (
                            <Badge variant="outline" className="text-[10px]">
                              Gate
                            </Badge>
                          )}
                          {s.alreadyExists && (
                            <Badge variant="secondary" className="text-[10px]">
                              Exists
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="text-xs font-medium text-muted-foreground pt-2">
                      Policies
                    </p>
                    {industryPreview.policies.map((p) => (
                      <div
                        key={p.title}
                        className={`flex items-center justify-between p-2 rounded border text-sm ${
                          p.alreadyExists ? "opacity-50 border-dashed" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ScrollText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{p.title}</span>
                        </div>
                        {p.alreadyExists && (
                          <Badge variant="secondary" className="text-[10px]">
                            Exists
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleProceedFromIndustry}
              disabled={!selectedIndustryId}
            >
              Review & Build
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          STEP 3: Review & Build
          ════════════════════════════════════════════════ */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review & Build</h2>
              <p className="text-sm text-muted-foreground">
                Review what will be created and build your AI governance program.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setStep(
                  useIndustry
                    ? "industry"
                    : useVendors
                    ? "vendors"
                    : "choose",
                )
              }
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{reviewTotals.vendors}</div>
                <p className="text-[10px] text-muted-foreground">Vendors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{reviewTotals.systems}</div>
                <p className="text-[10px] text-muted-foreground">AI Systems</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {reviewTotals.riskClassifications}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Risk Classifications
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {reviewTotals.oversightGates}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Oversight Gates
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {reviewTotals.policies}
                </div>
                <p className="text-[10px] text-muted-foreground">Policies</p>
              </CardContent>
            </Card>
          </div>

          {/* Vendor imports detail */}
          {useVendors && vendorPreview && vendorPreview.previews.length > 0 && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Vendor Imports</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {vendorPreview.previews.map((p) => {
                  const isExisting =
                    vendorPreview.existingVendorNames.includes(p.vendorName);
                  const isSkipped = skipSystemNames.includes(p.systemName);
                  return (
                    <div
                      key={p.vendorSlug}
                      className={`flex items-center justify-between p-2 rounded border ${
                        isExisting
                          ? "opacity-50 border-dashed"
                          : isSkipped
                          ? "opacity-40"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={!isSkipped && !isExisting}
                          disabled={isExisting}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSkipSystemNames((prev) =>
                                prev.filter((n) => n !== p.systemName),
                              );
                            } else {
                              setSkipSystemNames((prev) => [
                                ...prev,
                                p.systemName,
                              ]);
                            }
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {p.vendorName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.systemName} — {p.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <RiskBadge level={p.riskLevel} />
                        {p.requiresOversightGate && (
                          <Badge variant="outline" className="text-[10px]">
                            Gate
                          </Badge>
                        )}
                        {isExisting && (
                          <Badge variant="secondary" className="text-[10px]">
                            Exists
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Industry template detail */}
          {useIndustry && industryPreview && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">
                  Industry Template: {industryPreview.template.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {/* Systems */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    AI Systems
                  </p>
                  {industryPreview.systems.map((s) => {
                    const isSkipped = skipSystemNames.includes(s.name);
                    return (
                      <div
                        key={s.name}
                        className={`flex items-center justify-between p-2 rounded border ${
                          s.alreadyExists
                            ? "opacity-50 border-dashed"
                            : isSkipped
                            ? "opacity-40"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={!isSkipped && !s.alreadyExists}
                            disabled={s.alreadyExists}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSkipSystemNames((prev) =>
                                  prev.filter((n) => n !== s.name),
                                );
                              } else {
                                setSkipSystemNames((prev) => [
                                  ...prev,
                                  s.name,
                                ]);
                              }
                            }}
                          />
                          <span className="text-sm truncate">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <RiskBadge level={s.riskLevel} />
                          {s.gateType && (
                            <Badge variant="outline" className="text-[10px]">
                              Gate
                            </Badge>
                          )}
                          {s.alreadyExists && (
                            <Badge variant="secondary" className="text-[10px]">
                              Exists
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Policies */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Policies
                  </p>
                  {industryPreview.policies.map((p) => {
                    const isSkipped = skipPolicyTitles.includes(p.title);
                    return (
                      <div
                        key={p.title}
                        className={`flex items-center justify-between p-2 rounded border ${
                          p.alreadyExists
                            ? "opacity-50 border-dashed"
                            : isSkipped
                            ? "opacity-40"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={!isSkipped && !p.alreadyExists}
                            disabled={p.alreadyExists}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSkipPolicyTitles((prev) =>
                                  prev.filter((t) => t !== p.title),
                                );
                              } else {
                                setSkipPolicyTitles((prev) => [
                                  ...prev,
                                  p.title,
                                ]);
                              }
                            }}
                          />
                          <div className="min-w-0">
                            <span className="text-sm truncate block">
                              {p.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {p.type.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        {p.alreadyExists && (
                          <Badge variant="secondary" className="text-[10px]">
                            Exists
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Build button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleExecute}
              disabled={executeMutation.isPending}
            >
              {executeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Building...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Build AI Governance Program
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          STEP 4: Success
          ════════════════════════════════════════════════ */}
      {step === "success" && executionResult && (
        <div className="space-y-6">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-primary/10">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">
                AI Governance Program Created!
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your AI governance program has been bootstrapped. You can now
                explore and customize each module.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-xl mx-auto pt-4">
                {executionResult.vendors > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {executionResult.vendors}
                    </div>
                    <p className="text-xs text-muted-foreground">Vendors</p>
                  </div>
                )}
                {executionResult.systems > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {executionResult.systems}
                    </div>
                    <p className="text-xs text-muted-foreground">AI Systems</p>
                  </div>
                )}
                {executionResult.riskClassifications > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {executionResult.riskClassifications}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Risk Classifications
                    </p>
                  </div>
                )}
                {executionResult.oversightGates > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {executionResult.oversightGates}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Oversight Gates
                    </p>
                  </div>
                )}
                {executionResult.policies > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {executionResult.policies}
                    </div>
                    <p className="text-xs text-muted-foreground">Policies</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick nav cards */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Link href="/governance/ai-registry">
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <Brain className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">AI Registry</p>
                    <p className="text-xs text-muted-foreground">
                      View systems
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/governance/risk-classification">
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Risk Classification</p>
                    <p className="text-xs text-muted-foreground">Review risks</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/governance/oversight">
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Oversight</p>
                    <p className="text-xs text-muted-foreground">
                      Review gates
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/governance/policies">
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <ScrollText className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Policies</p>
                    <p className="text-xs text-muted-foreground">
                      Edit policies
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/governance">
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Dashboard</p>
                    <p className="text-xs text-muted-foreground">
                      View overview
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
