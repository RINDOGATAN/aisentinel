"use client";

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
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

type PolicyType = "AI_USAGE" | "AI_GOVERNANCE" | "AI_ETHICS" | "AI_RISK_MANAGEMENT" | "AI_DATA_GOVERNANCE" | "AI_PROCUREMENT" | "AI_INCIDENT_RESPONSE" | "AI_TRANSPARENCY" | "CUSTOM";

const policyTypes = [
  { value: "AI_USAGE", label: "AI Usage" },
  { value: "AI_GOVERNANCE", label: "AI Governance" },
  { value: "AI_ETHICS", label: "AI Ethics" },
  { value: "AI_RISK_MANAGEMENT", label: "Risk Management" },
  { value: "AI_DATA_GOVERNANCE", label: "Data Governance" },
  { value: "AI_PROCUREMENT", label: "Procurement" },
  { value: "AI_INCIDENT_RESPONSE", label: "Incident Response" },
  { value: "AI_TRANSPARENCY", label: "Transparency" },
  { value: "CUSTOM", label: "Custom" },
];

export default function NewPolicyPage() {
  const t = useTranslations("policiesNew");
  const tc = useTranslations("common");
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
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  {policyTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
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
                placeholder="Briefly describe the purpose and scope of this policy..."
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
                placeholder="Write your policy content here..."
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
