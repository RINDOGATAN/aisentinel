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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useTranslations } from "next-intl";

type AIIncidentType = "HALLUCINATION" | "BIAS_DISCRIMINATION" | "MODEL_DRIFT" | "ADVERSARIAL_ATTACK" | "PROMPT_INJECTION" | "UNAUTHORIZED_ACCESS" | "SAFETY_FAILURE" | "PERFORMANCE_DEGRADATION" | "DATA_POISONING" | "PRIVACY_VIOLATION" | "OTHER";
type AIIncidentSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const incidentTypeValues: AIIncidentType[] = [
  "HALLUCINATION",
  "BIAS_DISCRIMINATION",
  "MODEL_DRIFT",
  "ADVERSARIAL_ATTACK",
  "PROMPT_INJECTION",
  "UNAUTHORIZED_ACCESS",
  "SAFETY_FAILURE",
  "PERFORMANCE_DEGRADATION",
  "DATA_POISONING",
  "PRIVACY_VIOLATION",
  "OTHER",
];

const incidentTypeKeys: Record<string, string> = {
  HALLUCINATION: "typeHallucination",
  BIAS_DISCRIMINATION: "typeBias",
  MODEL_DRIFT: "typeModelDrift",
  ADVERSARIAL_ATTACK: "typeAdversarialAttack",
  PROMPT_INJECTION: "typePromptInjection",
  UNAUTHORIZED_ACCESS: "typeUnauthorizedAccess",
  SAFETY_FAILURE: "typeSafetyFailure",
  PERFORMANCE_DEGRADATION: "typePerformanceDegradation",
  DATA_POISONING: "typeDataPoisoning",
  PRIVACY_VIOLATION: "typePrivacyViolation",
  OTHER: "typeOther",
};

const severityValues: AIIncidentSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const severityKeys: Record<string, string> = {
  CRITICAL: "riskCritical",
  HIGH: "riskHigh",
  MEDIUM: "riskMedium",
  LOW: "riskLow",
};

export default function NewIncidentPage() {
  const t = useTranslations("incidentsNew");
  const ti = useTranslations("incidents");
  const tc = useTranslations("common");
  const router = useRouter();
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    type: AIIncidentType | "";
    severity: AIIncidentSeverity | "";
    aiSystemId: string;
    notificationRequired: boolean;
    dpoCentralIncidentId: string;
  }>({
    title: "",
    description: "",
    type: "",
    severity: "",
    aiSystemId: "",
    notificationRequired: false,
    dpoCentralIncidentId: "",
  });

  const utils = trpc.useUtils();

  const { data: systemsPages } = trpc.aiSystem.list.useInfiniteQuery(
    {
      organizationId: organization?.id ?? "",
      limit: 50,
    },
    {
      enabled: !!organization?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const aiSystems = systemsPages?.pages.flatMap((p) => p.items) ?? [];

  const createIncident = trpc.incident.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("toastSuccess"));
      utils.incident.list.invalidate();
      utils.incident.getStats.invalidate();
      router.push(`/governance/incidents/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.title || !formData.description || !formData.type || !formData.severity) return;

    setIsSubmitting(true);

    createIncident.mutate({
      organizationId: organization.id,
      title: formData.title,
      description: formData.description,
      type: formData.type as AIIncidentType,
      severity: formData.severity as AIIncidentSeverity,
      aiSystemId: formData.aiSystemId || undefined,
      notificationRequired: formData.notificationRequired,
      dpoCentralIncidentId: formData.dpoCentralIncidentId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance/incidents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>
            {t("cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("titleLabel")} *</Label>
              <Input
                id="title"
                placeholder={t("titlePlaceholder")}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("descriptionLabel")} *</Label>
              <Textarea
                id="description"
                placeholder={t("descriptionPlaceholder")}
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Type & Severity */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">{t("typeLabel")} *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as AIIncidentType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypeValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ti(incidentTypeKeys[value])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">{t("severityLabel")} *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value as AIIncidentSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("severityPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {severityValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {tc(severityKeys[value])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI System */}
            <div className="space-y-2">
              <Label htmlFor="aiSystem">{t("aiSystemLabel")}</Label>
              <Select
                value={formData.aiSystemId}
                onValueChange={(value) => setFormData({ ...formData, aiSystemId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("aiSystemPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {aiSystems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this incident to a registered AI system
              </p>
            </div>

            {/* Notification Required */}
            <div className="flex items-center space-x-2">
              <Switch
                id="notificationRequired"
                checked={formData.notificationRequired}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notificationRequired: checked })
                }
              />
              <Label htmlFor="notificationRequired">
                {t("notificationRequiredLabel")}
              </Label>
            </div>
            {formData.notificationRequired && (
              <p className="text-xs text-muted-foreground ml-10">
                {t("notificationRequiredHint")}
              </p>
            )}

            {/* DPO Central Incident ID */}
            <div className="space-y-2">
              <Label htmlFor="dpoCentralIncidentId">{t("dpoCentralIdLabel")}</Label>
              <Input
                id="dpoCentralIncidentId"
                placeholder={t("dpoCentralIdPlaceholder")}
                value={formData.dpoCentralIncidentId}
                onChange={(e) =>
                  setFormData({ ...formData, dpoCentralIncidentId: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Link to a related incident in DPO Central for cross-platform traceability
              </p>
            </div>

            {/* Error */}
            {createIncident.error && (
              <div className="text-sm text-destructive">
                Error: {createIncident.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/incidents">
                <Button variant="outline" type="button">
                  {tc("cancel")}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !formData.title ||
                  !formData.description ||
                  !formData.type ||
                  !formData.severity
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("reporting")}
                  </>
                ) : (
                  t("reportButton")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
