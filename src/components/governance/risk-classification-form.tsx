"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The risk classification form for one AI system. It lives on the system's
 * own page (the Risk Classification tab); the risk-level step lists the
 * systems and links there. Level, Annex III category, rationale, and the
 * deterministic Annex III screening with an optional drafted rationale.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskScreeningPanel } from "@/components/ai/RiskScreeningPanel";
import { TierMarker } from "@/components/governance/risk-tier-badge";
import { annexIIILabel } from "@/lib/annex-iii-label";
import { trpc } from "@/lib/trpc";

const ANNEX_III_CATEGORIES = [
  "biometrics",
  "critical_infrastructure",
  "education",
  "employment",
  "essential_services",
  "law_enforcement",
  "migration",
  "justice",
] as const;

type Level = "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL";

export function RiskClassificationForm({
  organizationId,
  aiSystemId,
  current,
  onDone,
  onCancel,
}: {
  organizationId: string;
  aiSystemId: string;
  /** The classification in force, if any: the form starts empty either way. */
  current: { riskLevel: string } | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("riskClassification");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const annexLabel = (value: string) => annexIIILabel(value, locale, (k) => t(`annexIII.${k}`));
  const [form, setForm] = useState({ riskLevel: "", rationale: "", annexIIICategory: "" });
  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const classify = trpc.riskClassification.classify.useMutation({
    onSuccess: (data) => {
      toast.success(
        t("toastClassified", {
          name: data.aiSystem.name,
          level: t(`levelPhrase.${data.riskLevel}`),
          count: data.complianceMappingsCreated ?? 0,
        }),
        {
          action: {
            label: t("viewCompliance"),
            onClick: () => router.push(`/governance/ai-registry/${data.aiSystemId}?tab=evidence`),
          },
        },
      );
      void utils.riskClassification.list.invalidate();
      void utils.riskClassification.getStats.invalidate();
      void utils.aiSystem.getById.invalidate();
      void utils.compliance.getSystemScorecard.invalidate();
      setForm({ riskLevel: "", rationale: "", annexIIICategory: "" });
      onDone();
    },
    onError: (error) => {
      toast.error(error.message || t("classifyFailed"));
    },
  });

  const submit = () => {
    if (!form.riskLevel || !form.rationale || classify.isPending) return;
    classify.mutate({
      organizationId,
      aiSystemId,
      riskLevel: form.riskLevel as Level,
      rationale: form.rationale,
      annexIIICategory: form.annexIIICategory || undefined,
    });
  };

  return (
    <div className="space-y-4" data-testid="risk-classification-form">
      <div className="space-y-2">
        <Label>{t("riskLevelLabel")} *</Label>
        <Select
          value={form.riskLevel}
          onValueChange={(value) =>
            update({ riskLevel: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("riskLevelPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNACCEPTABLE">
              <div className="flex items-center gap-2">
                <TierMarker level="UNACCEPTABLE" />
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                {tc("riskUnacceptable")}
              </div>
            </SelectItem>
            <SelectItem value="HIGH">
              <div className="flex items-center gap-2">
                <TierMarker level="HIGH" />
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                {tc("riskHigh")}
              </div>
            </SelectItem>
            <SelectItem value="LIMITED">
              <div className="flex items-center gap-2">
                <TierMarker level="LIMITED" />
                <ShieldQuestion className="w-4 h-4 text-muted-foreground" />
                {tc("riskLimited")}
              </div>
            </SelectItem>
            <SelectItem value="MINIMAL">
              <div className="flex items-center gap-2">
                <TierMarker level="MINIMAL" />
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
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
              update({ annexIIICategory: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("annexIIICategoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {ANNEX_III_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {annexLabel(value)}
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
            update({ rationale: e.target.value })
          }
        />
      </div>

      {/* Deterministic Annex III screening + optional AI-drafted
          rationale (grounded in the rule hits; Insert fills the
          editable rationale field — the user picks the level). */}
      <RiskScreeningPanel
        organizationId={organizationId}
        aiSystemId={aiSystemId}
        chosenLevel={form.riskLevel}
        chosenCategory={form.annexIIICategory}
        onInsertRationale={(content) =>
          update({ rationale: content })
        }
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          {tc("cancel")}
        </Button>
        <Button
          size="sm"
          disabled={
            !form.riskLevel ||
            !form.rationale ||
            classify.isPending
          }
          onClick={submit}
        >
          {classify.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("classifying")}
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              {current ? t("reclassify") : t("classify")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
