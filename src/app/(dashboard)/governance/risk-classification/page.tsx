"use client";

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
          label: "View Compliance",
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
        <h1 className="text-xl sm:text-2xl font-semibold">Risk Classification</h1>
        <p className="text-sm text-muted-foreground">
          EU AI Act four-tier risk classification for your AI systems
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <Card className="border-destructive/30">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-destructive">
              {riskStats.unacceptable}
            </div>
            <p className="text-xs text-muted-foreground">Unacceptable</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-destructive/80">
              {riskStats.high}
            </div>
            <p className="text-xs text-muted-foreground">High</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-warning">
              {riskStats.limited}
            </div>
            <p className="text-xs text-muted-foreground">Limited</p>
          </CardContent>
        </Card>
        <Card className="border-success/30">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-success">
              {riskStats.minimal}
            </div>
            <p className="text-xs text-muted-foreground">Minimal</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-muted-foreground">
              {riskStats.unclassified}
            </div>
            <p className="text-xs text-muted-foreground">Unclassified</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search AI systems..."
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
                          Unclassified
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
                          <p className="text-xs font-medium">Current Classification</p>
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
                          <Label>Risk Level *</Label>
                          <Select
                            value={form.riskLevel}
                            onValueChange={(value) =>
                              updateFormForSystem(system.id, { riskLevel: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select risk level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNACCEPTABLE">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-destructive" />
                                  Unacceptable
                                </div>
                              </SelectItem>
                              <SelectItem value="HIGH">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-destructive/80" />
                                  High
                                </div>
                              </SelectItem>
                              <SelectItem value="LIMITED">
                                <div className="flex items-center gap-2">
                                  <ShieldQuestion className="w-4 h-4 text-warning" />
                                  Limited
                                </div>
                              </SelectItem>
                              <SelectItem value="MINIMAL">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-success" />
                                  Minimal
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {form.riskLevel && (
                            <p className="text-xs text-muted-foreground">
                              {riskLevelDescriptions[form.riskLevel]}
                            </p>
                          )}
                        </div>

                        {(form.riskLevel === "HIGH" || form.riskLevel === "UNACCEPTABLE") && (
                          <div className="space-y-2">
                            <Label>Annex III Category</Label>
                            <Select
                              value={form.annexIIICategory}
                              onValueChange={(value) =>
                                updateFormForSystem(system.id, { annexIIICategory: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category (optional)" />
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
                          <Label>Rationale *</Label>
                          <Textarea
                            placeholder="Explain why this risk level was assigned..."
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
                            Cancel
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
                                Classifying...
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                {currentLevel ? "Reclassify" : "Classify"}
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
            <p>No AI systems found</p>
            <p className="text-sm mb-4">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Register AI systems first to classify their risk levels"}
            </p>
            {!searchQuery && (
              <Link href="/governance/ai-registry/new">
                <Button>Register AI System</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
