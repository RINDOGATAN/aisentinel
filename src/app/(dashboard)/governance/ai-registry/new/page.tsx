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
import { ArrowLeft, Check, Loader2, Plus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import type { PrefillField, Suggestion } from "@/lib/system-prefill";
import { StatusNote } from "@/components/ui/status-note";

type AITechnique = "MACHINE_LEARNING" | "DEEP_LEARNING" | "GENERATIVE_AI" | "AGENTIC_AI" | "NLP" | "COMPUTER_VISION" | "SPEECH_RECOGNITION" | "ROBOTICS" | "RULE_BASED" | "EXPERT_SYSTEM" | "STATISTICAL" | "OTHER";
type AISystemRole = "PROVIDER" | "DEPLOYER" | "IMPORTER" | "DISTRIBUTOR" | "USER";
type AISystemStatus = "DRAFT" | "DEVELOPMENT" | "TESTING" | "DEPLOYED" | "RETIRED";

const techniques = [
  { value: "MACHINE_LEARNING", label: "Machine Learning" },
  { value: "DEEP_LEARNING", label: "Deep Learning" },
  { value: "GENERATIVE_AI", label: "Generative AI" },
  { value: "AGENTIC_AI", label: "Agentic AI" },
  { value: "NLP", label: "Natural Language Processing" },
  { value: "COMPUTER_VISION", label: "Computer Vision" },
  { value: "SPEECH_RECOGNITION", label: "Speech Recognition" },
  { value: "ROBOTICS", label: "Robotics" },
  { value: "RULE_BASED", label: "Rule-Based" },
  { value: "EXPERT_SYSTEM", label: "Expert System" },
  { value: "STATISTICAL", label: "Statistical" },
  { value: "OTHER", label: "Other" },
];

const roles = [
  { value: "PROVIDER", label: "Provider" },
  { value: "DEPLOYER", label: "Deployer" },
  { value: "IMPORTER", label: "Importer" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "USER", label: "User" },
];

const statuses = [
  { value: "DRAFT", label: "Draft" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "TESTING", label: "Testing" },
  { value: "DEPLOYED", label: "Deployed" },
  { value: "RETIRED", label: "Retired" },
];

/**
 * One suggestion, beside the field it is for: the value, where it came from, and
 * one action to take it. Once taken it says so, and the marking goes as soon as
 * the field is edited by hand. Nothing here writes to the form itself.
 */
function SuggestionLine({
  field,
  suggestion,
  applied,
  onApply,
  valueLabel,
}: {
  field: PrefillField;
  suggestion: Suggestion | undefined;
  applied: boolean;
  onApply: (field: PrefillField) => void;
  valueLabel?: (value: string) => string;
}) {
  const t = useTranslations("aiRegistryNew");
  if (!suggestion) return null;
  const shown = valueLabel ? valueLabel(suggestion.value) : suggestion.value;
  const basis = t(`suggestionBasis.${suggestion.basis}`, {
    subject: suggestion.subject ?? "",
  });

  if (applied) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="w-3 h-3 text-primary shrink-0" aria-hidden />
        {t("suggestionApplied", { basis })}
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{t("suggestionOffer", { value: shown, basis })}</span>
      <button
        type="button"
        onClick={() => onApply(field)}
        className="text-primary underline hover:no-underline"
      >
        {t("suggestionUse")}
      </button>
    </p>
  );
}

export default function NewAISystemPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const t = useTranslations("aiRegistryNew");
  const tc = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    technique: AITechnique | "";
    role: AISystemRole | "";
    status: AISystemStatus;
    purpose: string;
    businessOwner: string;
    technicalOwner: string;
    processesPersonalData: boolean;
    vendorId: string;
  }>({
    name: "",
    description: "",
    technique: "",
    role: "",
    status: "DRAFT",
    purpose: "",
    businessOwner: "",
    technicalOwner: "",
    processesPersonalData: false,
    vendorId: "",
  });

  const { data: vendorsData } = trpc.vendor.list.useQuery(
    { organizationId: organization?.id ?? "", limit: 100 },
    { enabled: !!organization?.id }
  );
  const vendors = vendorsData?.items ?? [];

  const utils = trpc.useUtils();

  // ── Suggestions, and the record of which fields a person accepted ────────
  // A suggestion never enters the payload on its own: it is shown beside its
  // field with the basis it was derived from, and applied only on a click. A
  // pre-filled box that is submitted without being read is worse than an empty
  // one. `applied` drives the "suggested" marker, and the marker goes as soon as
  // the person edits the field.
  const { data: prefill } = trpc.aiSystem.prefillSuggestions.useQuery(
    { organizationId: organization?.id ?? "", vendorId: formData.vendorId || undefined },
    { enabled: !!organization?.id }
  );
  const suggestions = prefill?.suggestions ?? [];
  const [applied, setApplied] = useState<Partial<Record<PrefillField, boolean>>>({});

  const suggestionFor = (field: PrefillField) => suggestions.find((s) => s.field === field);

  const apply = (field: PrefillField) => {
    const suggestion = suggestionFor(field);
    if (!suggestion) return;
    setFormData((prev) => ({
      ...prev,
      [field]:
        field === "processesPersonalData" ? suggestion.value === "true" : suggestion.value,
    }));
    setApplied((prev) => ({ ...prev, [field]: true }));
  };

  const applyAll = () => {
    setFormData((prev) => {
      const next = { ...prev };
      for (const s of suggestions) {
        if (s.field === "processesPersonalData") next.processesPersonalData = s.value === "true";
        else if (s.field === "role") next.role = s.value as AISystemRole;
        else if (s.field === "businessOwner") next.businessOwner = s.value;
        else if (s.field === "technicalOwner") next.technicalOwner = s.value;
      }
      return next;
    });
    setApplied(Object.fromEntries(suggestions.map((s) => [s.field, true])));
  };

  /** Editing a field by hand ends its "suggested" marking. */
  const edit = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field in applied) setApplied((prev) => ({ ...prev, [field as PrefillField]: false }));
  };

  // ── No step is a dead end ───────────────────────────────────────────────
  // The vendor list is the one place this form can strand someone: an account
  // with no vendors yet gets an empty menu and no way on. So the vendor can be
  // created here, from the name typed in, and is selected straight away.
  const [newVendorName, setNewVendorName] = useState("");
  const createVendor = trpc.vendor.create.useMutation({
    onSuccess: async (vendor) => {
      await utils.vendor.list.invalidate();
      setFormData((prev) => ({ ...prev, vendorId: vendor.id }));
      setNewVendorName("");
      toast.success(t("vendorCreated", { name: vendor.name }));
    },
    onError: (error) => toast.error(error.message),
  });

  const createSystem = trpc.aiSystem.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("toastSuccess"));
      utils.aiSystem.list.invalidate();
      utils.aiSystem.getStats.invalidate();
      router.push(`/governance/ai-registry/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || t("toastError"));
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !formData.name || !formData.technique || !formData.role) return;

    setIsSubmitting(true);

    createSystem.mutate({
      organizationId: organization.id,
      name: formData.name,
      description: formData.description || undefined,
      technique: formData.technique as AITechnique,
      role: formData.role as AISystemRole,
      status: formData.status,
      purpose: formData.purpose || undefined,
      businessOwner: formData.businessOwner || undefined,
      technicalOwner: formData.technicalOwner || undefined,
      processesPersonalData: formData.processesPersonalData,
      vendorId: formData.vendorId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/governance/ai-registry">
          <Button variant="ghost" size="icon" className="-ml-2">
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
          <CardTitle>{t("systemDetails")}</CardTitle>
          <CardDescription>
            {t("systemDetailsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Everything this account can honestly fill in for you, with where
              each value came from. Nothing is entered until it is accepted. */}
          {suggestions.length > 0 && (
            <div className="mb-6 rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                {t("suggestionsLead", { count: suggestions.length })}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={applyAll}>
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                {t("suggestionsApplyAll")}
              </Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name & Technique */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("systemNameLabel")} *</Label>
                <Input
                  id="name"
                  placeholder={t("systemNamePlaceholder")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technique">{t("techniqueLabel")} *</Label>
                <Select
                  value={formData.technique}
                  onValueChange={(value) => setFormData({ ...formData, technique: value as AITechnique })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("techniquePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {techniques.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
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

            {/* Role & Status */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">{t("roleLabel")} *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as AISystemRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("rolePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("roleHelp")}
                </p>
                <SuggestionLine
                  field="role"
                  suggestion={suggestionFor("role")}
                  applied={!!applied.role}
                  onApply={apply}
                  valueLabel={(v) => roles.find((r) => r.value === v)?.label ?? v}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t("statusLabel")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as AISystemStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("statusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <Label htmlFor="vendor">{t("vendorLabel")}</Label>
              <Select
                value={formData.vendorId}
                onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("vendorPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("vendorHelp")}
              </p>
              {/* The way out of an empty list, or of a list without the vendor
                  you need: create it here and it is selected. */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Input
                  value={newVendorName}
                  placeholder={
                    vendors.length === 0 ? t("vendorEmptyPlaceholder") : t("vendorAddPlaceholder")
                  }
                  aria-label={t("vendorAddLabel")}
                  onChange={(e) => setNewVendorName(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newVendorName.trim() || createVendor.isPending || !organization?.id}
                  onClick={() =>
                    organization?.id &&
                    createVendor.mutate({
                      organizationId: organization.id,
                      name: newVendorName.trim(),
                      status: "UNDER_REVIEW",
                    })
                  }
                >
                  {createVendor.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1.5" />
                  )}
                  {t("vendorAddAction")}
                </Button>
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">{t("purposeLabel")}</Label>
              <Textarea
                id="purpose"
                placeholder={t("purposePlaceholder")}
                rows={3}
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {t("purposeHelp")}
              </p>
            </div>

            {/* Owners */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessOwner">{t("businessOwnerLabel")}</Label>
                <Input
                  id="businessOwner"
                  placeholder={t("businessOwnerPlaceholder")}
                  value={formData.businessOwner}
                  onChange={(e) => edit("businessOwner", e.target.value)}
                />
                <SuggestionLine
                  field="businessOwner"
                  suggestion={suggestionFor("businessOwner")}
                  applied={!!applied.businessOwner}
                  onApply={apply}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technicalOwner">{t("technicalOwnerLabel")}</Label>
                <Input
                  id="technicalOwner"
                  placeholder={t("technicalOwnerPlaceholder")}
                  value={formData.technicalOwner}
                  onChange={(e) => edit("technicalOwner", e.target.value)}
                />
                <SuggestionLine
                  field="technicalOwner"
                  suggestion={suggestionFor("technicalOwner")}
                  applied={!!applied.technicalOwner}
                  onApply={apply}
                />
              </div>
            </div>

            {/* Personal Data */}
            <div className="flex items-center space-x-2">
              <Switch
                id="processesPersonalData"
                checked={formData.processesPersonalData}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, processesPersonalData: checked })
                }
              />
              <Label htmlFor="processesPersonalData">
                {t("processesPersonalDataLabel")}
              </Label>
            </div>
            <SuggestionLine
              field="processesPersonalData"
              suggestion={suggestionFor("processesPersonalData")}
              applied={!!applied.processesPersonalData}
              onApply={apply}
              valueLabel={() => t("processesPersonalDataLabel")}
            />
            {formData.processesPersonalData && (
              <p className="text-xs text-muted-foreground ml-10">
                {t("personalDataWarning")}
              </p>
            )}

            {/* Error */}
            {createSystem.error && (
              <StatusNote status="danger">
                {tc("error", { message: createSystem.error.message })}
              </StatusNote>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/governance/ai-registry">
                <Button variant="outline" type="button">
                  {tc("cancel")}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.technique || !formData.role}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("registering")}
                  </>
                ) : (
                  t("registerSystem")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
