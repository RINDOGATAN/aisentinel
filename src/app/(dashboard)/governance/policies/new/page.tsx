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
import { useLocale, useTranslations } from "next-intl";
import { CORE_POLICY_PACK, localizeCorePolicy } from "@/config/core-policy-pack";
import { LAWFIRM_POLICY_PACK } from "@/config/lawfirm-ai-toolkit";
import { AI_GOVERNANCE_TEMPLATES } from "@/config/ai-governance-templates";
import { localizeTemplate } from "@/config/ai-governance-templates.es";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

type PolicyType = "AI_USAGE" | "AI_GOVERNANCE" | "AI_ETHICS" | "AI_RISK_MANAGEMENT" | "AI_DATA_GOVERNANCE" | "AI_PROCUREMENT" | "AI_INCIDENT_RESPONSE" | "AI_TRANSPARENCY" | "CUSTOM";

const policyTypes = [
  { value: "AI_USAGE", labelKey: "policyTypeAiUsage" },
  { value: "AI_GOVERNANCE", labelKey: "policyTypeAiGovernance" },
  { value: "AI_ETHICS", labelKey: "policyTypeAiEthics" },
  { value: "AI_RISK_MANAGEMENT", labelKey: "policyTypeRiskManagement" },
  { value: "AI_DATA_GOVERNANCE", labelKey: "policyTypeDataGovernance" },
  { value: "AI_PROCUREMENT", labelKey: "policyTypeProcurement" },
  { value: "AI_INCIDENT_RESPONSE", labelKey: "policyTypeIncidentResponse" },
  { value: "AI_TRANSPARENCY", labelKey: "policyTypeTransparency" },
  { value: "CUSTOM", labelKey: "policyTypeCustom" },
] as const;

interface PolicyTemplateOption {
  id: string;
  group: "core" | "lawfirm" | "industry";
  title: string;
  type: PolicyType;
  description: string;
  content: string;
}

/**
 * Every policy text the product ships, as starting points, in the reader's
 * language: the sector-neutral core pack, the law-firm pack and the industry
 * templates' policies.
 */
function policyTemplateOptions(locale: "en" | "es"): PolicyTemplateOption[] {
  return [
    ...CORE_POLICY_PACK.map((p) => ({ id: p.id, group: "core" as const, ...localizeCorePolicy(p, locale), type: p.type as PolicyType })),
    ...LAWFIRM_POLICY_PACK.map((p) => ({
      id: p.id,
      group: "lawfirm" as const,
      title: p.title[locale],
      type: p.type as PolicyType,
      description: p.description[locale],
      content: p.content[locale],
    })),
    ...AI_GOVERNANCE_TEMPLATES.map((source) => localizeTemplate(source, locale)).flatMap((tpl) =>
      tpl.policies.map((p, i) => ({
        id: `${tpl.id}-${i}`,
        group: "industry" as const,
        title: p.title,
        type: p.type as PolicyType,
        description: p.description,
        content: p.content,
      })),
    ),
  ];
}

export default function NewPolicyPage() {
  const t = useTranslations("policiesNew");
  const tp = useTranslations("policies");
  const tc = useTranslations("common");
  const locale = useLocale() === "es" ? "es" : "en";
  const templates = policyTemplateOptions(locale);
  const router = useRouter();
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    type: PolicyType | "";
    description: string;
    content: string;
    effectiveDate: string;
    reviewDate: string;
  }>({
    title: "",
    type: "",
    description: "",
    content: "",
    effectiveDate: "",
    reviewDate: "",
  });

  const utils = trpc.useUtils();

  const createPolicy = trpc.policy.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("toastSuccess"));
      utils.policy.list.invalidate();
      utils.policy.getStats.invalidate();
      router.push(`/governance/policies/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.title || !formData.type) return;

    setIsSubmitting(true);

    createPolicy.mutate({
      organizationId: organization.id,
      title: formData.title,
      type: formData.type as PolicyType,
      description: formData.description || undefined,
      content: formData.content || undefined,
      effectiveDate: formData.effectiveDate || undefined,
      reviewDate: formData.reviewDate || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance/policies">
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
          <CardTitle>{t("formTitle")}</CardTitle>
          <CardDescription>
            {t("formDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Start from a shipped policy text (optional) */}
            <div className="space-y-2">
              <Label>{t("labelTemplate")}</Label>
              <Select
                onValueChange={(id) => {
                  const tpl = templates.find((x) => x.id === id);
                  if (!tpl) return;
                  setFormData((prev) => ({
                    ...prev,
                    title: tpl.title,
                    type: tpl.type,
                    description: tpl.description,
                    content: tpl.content,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholderTemplate")} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.title}
                      <span className="text-muted-foreground"> · {t(`templateGroup.${tpl.group}`)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("templateHint")}</p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("labelTitle")} *</Label>
              <Input
                id="title"
                placeholder={t("placeholderTitle")}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">{t("labelPolicyType")} *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as PolicyType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholderType")} />
                </SelectTrigger>
                <SelectContent>
                  {policyTypes.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {tp(pt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("labelDescription")}</Label>
              <Textarea
                id="description"
                placeholder={t("placeholderDescription")}
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">{t("labelContent")}</Label>
              <Textarea
                id="content"
                placeholder={t("placeholderContent")}
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            {/* Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">{t("labelEffectiveDate")}</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewDate">{t("labelReviewDate")}</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={formData.reviewDate}
                  onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                />
              </div>
            </div>

            {/* Error */}
            {createPolicy.error && (
              <div className="text-sm text-destructive">
                Error: {createPolicy.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/policies">
                <Button variant="outline" type="button">
                  {tc("cancel")}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.title || !formData.type}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  t("submitCreatePolicy")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
