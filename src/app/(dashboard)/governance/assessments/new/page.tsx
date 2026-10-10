"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Loader2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEnumLabels } from "@/lib/enum-labels";
import { templateDescription, templateName } from "@/lib/assessment-template-display";

const ASSESSMENT_TYPES = ["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"] as const;
type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

const typeNameKeys: Record<AssessmentType, string> = {
  FRIA: "typeFria",
  CONFORMITY: "typeConformity",
  AI_RISK: "typeAiRisk",
  BIAS_FAIRNESS: "typeBiasFairness",
  CUSTOM: "typeCustom",
};

const typeDescKeys: Record<AssessmentType, string> = {
  FRIA: "typeDescFria",
  CONFORMITY: "typeDescConformity",
  AI_RISK: "typeDescAiRisk",
  BIAS_FAIRNESS: "typeDescBiasFairness",
  CUSTOM: "typeDescCustom",
};

export default function NewAssessmentPage() {
  const t = useTranslations("assessmentsNew");
  const locale = useLocale();
  const tt = useTranslations("assessments");
  const { statusLabel, techniqueLabel, assessmentTypeLabel } = useEnumLabels();
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";

  // A type chosen on the list ("Bias and Fairness" then "New assessment") is
  // carried here so the wizard never asks for it again. Templates are then
  // shown for that type only.
  const rawType = (searchParams.get("type") ?? "").toUpperCase();
  const presetType = (ASSESSMENT_TYPES as readonly string[]).includes(rawType)
    ? (rawType as AssessmentType)
    : null;

  const [step, setStep] = useState(1);
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedType, setSelectedType] = useState<string>(presetType ?? "");
  const [title, setTitle] = useState("");

  const { data: systemsData } = trpc.aiSystem.list.useQuery(
    { organizationId: orgId, limit: 50 },
    { enabled: !!orgId }
  );

  const { data: templates } = trpc.assessment.listTemplates.useQuery(
    { organizationId: orgId, type: presetType ?? undefined },
    { enabled: !!orgId }
  );

  const { data: entitledTypes } = trpc.assessment.getEntitledTypes.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId }
  );

  const createMutation = trpc.assessment.create.useMutation({
    onSuccess: (data) => {
      router.push(`/governance/assessments/${data.id}`);
    },
  });

  const systems = systemsData?.items ?? [];
  const entitled = entitledTypes ?? [];

  // "No choice with one option": when the type is fixed and exactly one
  // entitled template applies, there is nothing to choose. Select it and skip
  // the template step, so the person sees two steps, not three. A locked
  // template is not auto-selected — the person could not proceed past it.
  const currentTemplates = templates ?? [];
  const soleTemplate =
    presetType && currentTemplates.length === 1 && entitled.includes(currentTemplates[0].type)
      ? currentTemplates[0]
      : null;
  const skipTemplateStep = !!soleTemplate;
  // Only offer a way back to the picker when the organisation has authored its
  // own templates; against a single system template there is nothing to swap to.
  const orgHasOwnTemplates = currentTemplates.some((tpl) => !tpl.isSystem);
  const selectedTemplate = currentTemplates.find((tpl) => tpl.id === selectedTemplateId) ?? null;
  const totalSteps = skipTemplateStep ? 2 : 3;
  const displayStep = skipTemplateStep ? (step >= 3 ? 2 : 1) : step;

  const chooseSystem = (system: { id: string; name: string }) => {
    setSelectedSystemId(system.id);
    if (soleTemplate) {
      setSelectedTemplateId(soleTemplate.id);
      setSelectedType(soleTemplate.type);
      setTitle(`${soleTemplate.name} - ${system.name}`);
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleCreate = () => {
    if (!selectedSystemId || !selectedTemplateId || !title || !selectedType) return;
    createMutation.mutate({
      organizationId: orgId,
      aiSystemId: selectedSystemId,
      templateId: selectedTemplateId,
      title,
      type: selectedType as "FRIA" | "CONFORMITY" | "AI_RISK" | "BIAS_FAIRNESS" | "CUSTOM",
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/governance/assessments">
          <Button variant="ghost" size="icon" className="-ml-2"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {presetType ? t("titleForType", { type: tt(typeNameKeys[presetType]) }) : t("title")}
          </h1>
          <p className="text-muted-foreground">{t("stepIndicator", { step: displayStep, total: totalSteps })}</p>
          {presetType && (
            <>
              <p className="text-sm text-foreground">{tt(typeDescKeys[presetType])}</p>
              <p className="text-sm text-muted-foreground">{t("typeChosen", { type: tt(typeNameKeys[presetType]) })}</p>
            </>
          )}
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step1Title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {systems.length === 0 ? (
              <p className="text-muted-foreground">{t("step1Empty")} <Link href="/governance/ai-registry/new" className="text-primary hover:underline">{t("step1EmptyLink")}</Link>.</p>
            ) : (
              systems.map((system) => (
                <button
                  key={system.id}
                  onClick={() => chooseSystem(system)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedSystemId === system.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="font-medium">{system.name}</div>
                  <div className="text-sm text-muted-foreground">{statusLabel(system.status)} &middot; {techniqueLabel(system.technique)}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step2Title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {presetType && (
              <p className="text-sm text-muted-foreground">{t("step2ForType", { type: tt(typeNameKeys[presetType]) })}</p>
            )}
            {templates && templates.length === 0 && (
              <p className="text-muted-foreground">
                {t("step2Empty")}{" "}
                <Link href="/governance/assessments/templates" className="text-primary hover:underline">
                  {t("step2EmptyLink")}
                </Link>
                .
              </p>
            )}
            {(templates ?? []).map((template) => {
              const isEntitled = entitled.includes(template.type);
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    if (!isEntitled) return;
                    setSelectedTemplateId(template.id);
                    setSelectedType(template.type);
                    setTitle(`${templateName(template, locale)}: ${systems.find(s => s.id === selectedSystemId)?.name ?? ""}`);
                    setStep(3);
                  }}
                  disabled={!isEntitled}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    !isEntitled ? "opacity-50 cursor-not-allowed border-border" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{templateName(template, locale)}</div>
                      <div className="text-sm text-muted-foreground">{templateDescription(template, locale)}</div>
                      {typeDescKeys[template.type as AssessmentType] && (
                        <div className="text-xs text-muted-foreground mt-1">{tt(typeDescKeys[template.type as AssessmentType])}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{assessmentTypeLabel(template.type)}</Badge>
                      {!isEntitled && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>
              );
            })}
            <Button variant="ghost" onClick={() => setStep(1)}>{tc("back")}</Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step3Title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplate && (
              <p className="text-sm text-muted-foreground">
                {t("usingTemplate", { name: selectedTemplate.name })}
                {skipTemplateStep && orgHasOwnTemplates && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-primary hover:underline"
                    >
                      {t("changeTemplate")}
                    </button>
                  </>
                )}
              </p>
            )}
            <div className="space-y-2">
              <Label>{t("titleLabel")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(skipTemplateStep ? 1 : 2)}>{tc("back")}</Button>
              <Button onClick={handleCreate} disabled={!title || createMutation.isPending}>
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("creating")}</>
                ) : (
                  <><ClipboardCheck className="w-4 h-4 mr-2" />{t("createButton")}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
