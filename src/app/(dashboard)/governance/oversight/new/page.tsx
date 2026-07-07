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

type OversightGateType = "PRE_DEPLOYMENT" | "POST_DEPLOYMENT" | "PERIODIC_REVIEW" | "INCIDENT_TRIGGERED" | "MATERIAL_CHANGE";

const gateTypeValues: OversightGateType[] = [
  "PRE_DEPLOYMENT",
  "POST_DEPLOYMENT",
  "PERIODIC_REVIEW",
  "INCIDENT_TRIGGERED",
  "MATERIAL_CHANGE",
];

const gateTypeKeys: Record<string, string> = {
  PRE_DEPLOYMENT: "gateTypePreDeployment",
  POST_DEPLOYMENT: "gateTypePostDeployment",
  PERIODIC_REVIEW: "gateTypePeriodicReview",
  INCIDENT_TRIGGERED: "gateTypeIncidentTriggered",
  MATERIAL_CHANGE: "gateTypeMaterialChange",
};

export default function NewOversightGatePage() {
  const t = useTranslations("oversightNew");
  const to = useTranslations("oversight");
  const tc = useTranslations("common");
  const router = useRouter();
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    aiSystemId: string;
    gateType: OversightGateType | "";
    description: string;
    reviewCadence: string;
    nextReviewDate: string;
    assignedTo: string;
  }>({
    aiSystemId: "",
    gateType: "",
    description: "",
    reviewCadence: "",
    nextReviewDate: "",
    assignedTo: "",
  });

  const { data: systemsData } = trpc.aiSystem.list.useQuery(
    { organizationId: organization?.id ?? "", limit: 50 },
    { enabled: !!organization?.id }
  );

  const systems = systemsData?.items ?? [];

  const utils = trpc.useUtils();

  const createGate = trpc.oversight.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("toastSuccess"));
      utils.oversight.list.invalidate();
      utils.oversight.getStats.invalidate();
      router.push(`/governance/oversight/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.aiSystemId || !formData.gateType) return;

    setIsSubmitting(true);

    createGate.mutate({
      organizationId: organization.id,
      aiSystemId: formData.aiSystemId,
      gateType: formData.gateType as OversightGateType,
      description: formData.description || undefined,
      reviewCadence: formData.reviewCadence || undefined,
      nextReviewDate: formData.nextReviewDate || undefined,
      assignedTo: formData.assignedTo || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance/oversight">
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
            {/* AI System & Gate Type */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="aiSystemId">{t("aiSystemLabel")} *</Label>
                <Select
                  value={formData.aiSystemId}
                  onValueChange={(value) => setFormData({ ...formData, aiSystemId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("aiSystemPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {systems.map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {systems.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No AI systems registered.{" "}
                    <Link href="/governance/ai-registry/new" className="text-primary hover:underline">
                      Register one first
                    </Link>.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gateType">{t("gateTypeLabel")} *</Label>
                <Select
                  value={formData.gateType}
                  onValueChange={(value) => setFormData({ ...formData, gateType: value as OversightGateType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("gateTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {gateTypeValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {to(gateTypeKeys[value])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("descriptionLabel")}</Label>
              <Textarea
                id="description"
                placeholder={t("descriptionPlaceholder")}
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Review Cadence & Next Review Date */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reviewCadence">{t("reviewCadenceLabel")}</Label>
                <Input
                  id="reviewCadence"
                  placeholder={t("reviewCadencePlaceholder")}
                  value={formData.reviewCadence}
                  onChange={(e) => setFormData({ ...formData, reviewCadence: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  How frequently should this gate be reviewed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextReviewDate">{t("nextReviewDateLabel")}</Label>
                <Input
                  id="nextReviewDate"
                  type="date"
                  value={formData.nextReviewDate}
                  onChange={(e) => setFormData({ ...formData, nextReviewDate: e.target.value })}
                />
              </div>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo">{t("assignedToLabel")}</Label>
              <Input
                id="assignedTo"
                placeholder={t("assignedToPlaceholder")}
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Person or role responsible for this oversight gate
              </p>
            </div>

            {/* Error */}
            {createGate.error && (
              <div className="text-sm text-destructive">
                Error: {createGate.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/oversight">
                <Button variant="outline" type="button">
                  {tc("cancel")}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.aiSystemId || !formData.gateType}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  t("createButton")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
