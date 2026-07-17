"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Assessment template management (DPO Central parity, upgraded: the create
 * and clone actions actually work and are i18n'd).
 *
 * System templates come from the seed scripts; org templates are created
 * here — either cloned from a system template or authored with the simple
 * builder (one section, one question per line). This page is what turns an
 * un-seeded instance from a silent dead-end into a workable one.
 */

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Search, FileText, ClipboardCheck, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

const ASSESSMENT_TYPES = ["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"] as const;
type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

interface TemplateRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isSystem: boolean;
  sections: unknown;
}

export default function AssessmentTemplatesPage() {
  const t = useTranslations("assessmentTemplates");
  const tc = useTranslations("common");
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");

  // Clone dialog
  const [cloneSource, setCloneSource] = useState<TemplateRow | null>(null);
  const [cloneName, setCloneName] = useState("");

  // Create dialog (simple builder: one section, one question per line)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "CUSTOM" as AssessmentType,
    description: "",
    sectionTitle: "",
    questions: "",
  });

  const { data: templates, isLoading } = trpc.assessment.listTemplates.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId }
  );

  const cloneTemplate = trpc.assessment.cloneTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("cloned"));
      utils.assessment.listTemplates.invalidate();
      setCloneSource(null);
      setCloneName("");
    },
    onError: (e) => toast.error(e.message),
  });

  const createTemplate = trpc.assessment.createTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("created"));
      utils.assessment.listTemplates.invalidate();
      setCreateOpen(false);
      setCreateForm({ name: "", type: "CUSTOM", description: "", sectionTitle: "", questions: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const all = (templates ?? []) as TemplateRow[];
  const matches = (row: TemplateRow) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.type.toLowerCase().includes(searchQuery.toLowerCase());
  const systemTemplates = all.filter((row) => row.isSystem).filter(matches);
  const customTemplates = all.filter((row) => !row.isSystem).filter(matches);

  const submitCreate = () => {
    const questionLines = createForm.questions
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!createForm.name || !createForm.sectionTitle || questionLines.length === 0) return;
    const slug = Date.now().toString(36);
    createTemplate.mutate({
      organizationId: orgId,
      name: createForm.name,
      type: createForm.type,
      description: createForm.description || undefined,
      sections: [
        {
          id: `s1_${slug}`,
          title: createForm.sectionTitle,
          questions: questionLines.map((text, i) => ({
            id: `q${i + 1}_${slug}`,
            text,
            type: "textarea" as const,
            required: true,
          })),
        },
      ],
    });
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      FRIA: t("typeFria"),
      CONFORMITY: t("typeConformity"),
      AI_RISK: t("typeAiRisk"),
      BIAS_FAIRNESS: t("typeBiasFairness"),
      CUSTOM: t("typeCustom"),
    };
    return map[type] ?? type;
  };

  const sectionCount = (row: TemplateRow) =>
    Array.isArray(row.sections) ? row.sections.length : 0;

  const renderCard = (template: TemplateRow) => (
    <Card key={template.id} className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{template.type}</Badge>
            {template.isSystem && <Badge variant="secondary">{t("systemBadge")}</Badge>}
          </div>
        </div>
        <CardTitle className="mt-3 text-base">{template.name}</CardTitle>
        {template.description && (
          <CardDescription className="line-clamp-2">{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("sectionCount", { count: sectionCount(template) })}
          </span>
          <div className="flex gap-2">
            {canWrite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCloneSource(template);
                  setCloneName(t("cloneDefaultName", { name: template.name }));
                }}
                disabled={cloneTemplate.isPending}
              >
                <Copy className="w-4 h-4 mr-1" />
                {t("clone")}
              </Button>
            )}
            <Link href="/governance/assessments/new">
              <Button variant="outline" size="sm">
                {t("use")}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/governance/assessments">
            <Button variant="ghost" size="icon" aria-label={tc("back")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        {canWrite && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("createButton")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">{t("systemTab", { count: systemTemplates.length })}</TabsTrigger>
          <TabsTrigger value="custom">{t("customTab", { count: customTemplates.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : systemTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {systemTemplates.map(renderCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t("systemEmpty")}</p>
                <p className="text-sm">{t("systemEmptyHint")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : customTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customTemplates.map(renderCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t("customEmpty")}</p>
                <p className="text-sm mb-4">{t("customEmptyHint")}</p>
                {canWrite && (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("createButton")}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Clone dialog */}
      <Dialog open={!!cloneSource} onOpenChange={(open) => !open && setCloneSource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cloneTitle")}</DialogTitle>
            <DialogDescription>
              {cloneSource && t("cloneDescription", { name: cloneSource.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="clone-name">{t("nameLabel")}</Label>
            <Input
              id="clone-name"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneSource(null)}>
              {tc("cancel")}
            </Button>
            <Button
              disabled={!cloneName.trim() || cloneTemplate.isPending}
              onClick={() =>
                cloneSource &&
                cloneTemplate.mutate({
                  organizationId: orgId,
                  templateId: cloneSource.id,
                  name: cloneName.trim(),
                })
              }
            >
              {cloneTemplate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("clone")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog (simple builder) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">{t("nameLabel")} *</Label>
              <Input
                id="tpl-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("typeLabel")} *</Label>
              <Select
                value={createForm.type}
                onValueChange={(v) => setCreateForm({ ...createForm, type: v as AssessmentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {typeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-desc">{t("descriptionLabel")}</Label>
              <Textarea
                id="tpl-desc"
                rows={2}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-section">{t("sectionTitleLabel")} *</Label>
              <Input
                id="tpl-section"
                value={createForm.sectionTitle}
                onChange={(e) => setCreateForm({ ...createForm, sectionTitle: e.target.value })}
                placeholder={t("sectionTitlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-questions">{t("questionsLabel")} *</Label>
              <Textarea
                id="tpl-questions"
                rows={6}
                value={createForm.questions}
                onChange={(e) => setCreateForm({ ...createForm, questions: e.target.value })}
                placeholder={t("questionsPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("questionsHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              disabled={
                !createForm.name.trim() ||
                !createForm.sectionTitle.trim() ||
                !createForm.questions.trim() ||
                createTemplate.isPending
              }
              onClick={submitCreate}
            >
              {createTemplate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("createButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
