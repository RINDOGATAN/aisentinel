"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Loader2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function NewAssessmentPage() {
  const t = useTranslations("assessmentsNew");
  const tc = useTranslations("common");
  const router = useRouter();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";

  const [step, setStep] = useState(1);
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [title, setTitle] = useState("");

  const { data: systemsData } = trpc.aiSystem.list.useQuery(
    { organizationId: orgId, limit: 50 },
    { enabled: !!orgId }
  );

  const { data: templates } = trpc.assessment.listTemplates.useQuery(
    { organizationId: orgId },
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
      <div className="flex items-center gap-4">
        <Link href="/governance/assessments">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("stepIndicator", { step })}</p>
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
                  onClick={() => { setSelectedSystemId(system.id); setStep(2); }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedSystemId === system.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="font-medium">{system.name}</div>
                  <div className="text-sm text-muted-foreground">{system.status} &middot; {system.technique}</div>
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
                    setTitle(`${template.name} - ${systems.find(s => s.id === selectedSystemId)?.name ?? ""}`);
                    setStep(3);
                  }}
                  disabled={!isEntitled}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    !isEntitled ? "opacity-50 cursor-not-allowed border-border" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground">{template.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{template.type}</Badge>
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
            <div className="space-y-2">
              <Label>{t("titleLabel")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(2)}>{tc("back")}</Button>
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
