"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { policyLibrary } from "@/config/policy-library";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { StatusNote } from "@/components/ui/status-note";
import { useSubmitLock } from "@/lib/use-submit-lock";
import {
  DEFAULT_REVIEW_INTERVAL,
  POLICY_TYPES,
  reviewDateAfter,
  type PolicyTypeValue,
} from "@/lib/policy-meta";
import {
  PolicyAssignmentFields,
  PolicyLifecycle,
  PolicyTypeSelect,
  ReviewIntervalSelect,
  assignmentPayload,
  type PolicyAssignmentValue,
} from "@/components/governance/policy/policy-fields";

const IMPORT_ACCEPT = ".docx,.pdf,.txt,.md,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export default function NewPolicyPage() {
  const t = useTranslations("policiesNew");
  const tf = useTranslations("policyFields");
  const tc = useTranslations("common");
  const locale = useLocale() === "es" ? "es" : "en";
  const templates = useMemo(() => policyLibrary(locale), [locale]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const startType = searchParams.get("type");
  const initialType = (POLICY_TYPES as readonly string[]).includes(startType ?? "") ? (startType as PolicyTypeValue) : "";
  const defaultDescription = (type: PolicyTypeValue | "") => (type ? tf(`defaultDescription.${type}`) : "");

  const [formData, setFormData] = useState<{
    title: string;
    type: PolicyTypeValue | "";
    description: string;
    content: string;
    effectiveDate: string;
    reviewDate: string;
    reviewIntervalMonths: number | null;
  }>({
    title: "",
    type: initialType,
    description: defaultDescription(initialType),
    content: "",
    effectiveDate: "",
    reviewDate: "",
    reviewIntervalMonths: DEFAULT_REVIEW_INTERVAL,
  });
  const [assignment, setAssignment] = useState<PolicyAssignmentValue>({ ownerMemberId: "", ownerName: "", departmentId: "" });
  // The review date follows the interval until a person types a date of their own.
  const [reviewDateTouched, setReviewDateTouched] = useState(false);

  const suggestedReviewDate = (effective: string, months: number | null) =>
    months ? reviewDateAfter(effective ? new Date(`${effective}T00:00:00Z`) : new Date(), months) : "";

  const utils = trpc.useUtils();

  const createPolicy = trpc.policy.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("toastSuccess"));
      void utils.policy.invalidate();
      router.push(`/governance/policies/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
      setIsSubmitting(false);
    },
  });

  const importFile = trpc.policy.importFile.useMutation({
    onSuccess: (res, vars) => {
      setImportedFrom(vars.fileName);
      setTemplateId(null);
      setFormData((prev) => ({ ...prev, title: prev.title || res.title, content: res.content }));
      toast.success(res.truncated ? t("importTruncated") : t("importDone"));
    },
    onError: (err) => {
      const code = err.message.startsWith("import_") ? err.message.slice(7) : "unreadable";
      toast.error(t(`importError.${["too_large", "unsupported", "empty", "unreadable"].includes(code) ? code : "unreadable"}`));
    },
  });

  const onImportChosen = async (file: File | undefined) => {
    if (!file || !organization?.id) return;
    if (file.size > IMPORT_MAX_BYTES) {
      toast.error(t("importError.too_large"));
      return;
    }
    const dataBase64 = toBase64(await file.arrayBuffer());
    importFile.mutate({ organizationId: organization.id, fileName: file.name, dataBase64 });
  };

  const setType = (type: PolicyTypeValue) =>
    setFormData((prev) => ({
      ...prev,
      type,
      // The description follows the type while it is empty or still the previous type's default.
      description:
        !prev.description.trim() || prev.description === defaultDescription(prev.type)
          ? defaultDescription(type)
          : prev.description,
    }));

  const lock = useSubmitLock();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.title || !formData.type) return;

    // One record per submission, even for two submits in the same instant.
    if (!lock.acquire()) return;
    setIsSubmitting(true);

    const reviewDate = reviewDateTouched
      ? formData.reviewDate
      : formData.reviewDate || suggestedReviewDate(formData.effectiveDate, formData.reviewIntervalMonths);

    createPolicy.mutate(
      {
        organizationId: organization.id,
        title: formData.title,
        type: formData.type as PolicyTypeValue,
        description: formData.description || undefined,
        content: formData.content || undefined,
        effectiveDate: formData.effectiveDate || undefined,
        reviewDate: reviewDate || undefined,
        reviewIntervalMonths: formData.reviewIntervalMonths,
        importedFrom: importedFrom ?? undefined,
        templateId: templateId ?? undefined,
        ...assignmentPayload(assignment),
      },
      { onSettled: lock.release },
    );
  };

  const shownReviewDate = reviewDateTouched
    ? formData.reviewDate
    : formData.reviewDate || suggestedReviewDate(formData.effectiveDate, formData.reviewIntervalMonths);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/governance/policies">
          <Button variant="ghost" size="icon" className="-ml-2" title={tc("back")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PolicyLifecycle status="DRAFT" />
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Start from a shipped policy text, or import one (both optional) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="policy-template">{t("labelTemplate")}</Label>
                <Select
                  onValueChange={(id) => {
                    const tpl = templates.find((x) => x.id === id);
                    if (!tpl) return;
                    setImportedFrom(null);
                    setTemplateId(tpl.id);
                    setFormData((prev) => ({
                      ...prev,
                      title: tpl.title,
                      type: tpl.type,
                      description: tpl.description,
                      content: tpl.content,
                    }));
                  }}
                >
                  <SelectTrigger id="policy-template" className="w-full max-w-full">
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
                <p className="text-xs text-muted-foreground">
                  {t("templateHint")}{" "}
                  <Link href="/governance/policies?tab=templates" className="underline underline-offset-2 hover:text-primary">
                    {t("browseTemplates")}
                  </Link>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy-import">{t("labelImport")}</Label>
                <input
                  ref={fileInput}
                  id="policy-import"
                  type="file"
                  accept={IMPORT_ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    void onImportChosen(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  disabled={importFile.isPending}
                  onClick={() => fileInput.current?.click()}
                >
                  {importFile.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileUp className="w-4 h-4 mr-2" />
                  )}
                  {importedFrom ? t("importChosen", { name: importedFrom }) : t("importButton")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("importHint")}</p>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("labelTitle")} *</Label>
              <Input
                id="title"
                maxLength={300}
                placeholder={t("placeholderTitle")}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Type, with a definition under each choice */}
            <div className="space-y-2">
              <Label htmlFor="type">{t("labelPolicyType")} *</Label>
              <PolicyTypeSelect id="type" value={formData.type} onChange={setType} />
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
              {formData.type && formData.description === defaultDescription(formData.type) && (
                <p className="text-xs text-muted-foreground">{t("descriptionDefaultHint")}</p>
              )}
            </div>

            {/* Owner and department */}
            {organization?.id && (
              <PolicyAssignmentFields organizationId={organization.id} value={assignment} onChange={setAssignment} />
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">{t("labelContent")}</Label>
              <Textarea
                id="content"
                placeholder={t("placeholderContent")}
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            {/* Dates and review interval */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                <Label htmlFor="reviewInterval">{tf("intervalLabel")}</Label>
                <ReviewIntervalSelect
                  id="reviewInterval"
                  value={formData.reviewIntervalMonths}
                  onChange={(months) => setFormData({ ...formData, reviewIntervalMonths: months })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewDate">{t("labelReviewDate")}</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={shownReviewDate}
                  onChange={(e) => {
                    setReviewDateTouched(true);
                    setFormData({ ...formData, reviewDate: e.target.value });
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-3">{tf("intervalHint")}</p>

            {/* Error */}
            {createPolicy.error && (
              <StatusNote status="danger">
                {createPolicy.error.message}
              </StatusNote>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/policies">
                <Button variant="outline" type="button">
                  {tc("cancel")}
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting || !formData.title || !formData.type}>
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
