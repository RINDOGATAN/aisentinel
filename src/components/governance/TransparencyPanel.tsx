"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * TransparencyPanel — EU AI Act Art. 50 transparency profile for one
 * registered AI system (Transparency tab of the AI-registry detail page).
 *
 * The suggestion chips come from the deterministic rules layer
 * (config/transparency-rules.ts via transparency.get) and render with the AI
 * posture OFF — they are the ground truth. The user sets each obligation's
 * status; the panel never writes a status the user did not pick.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const OBLIGATION_STATUSES = ["NOT_APPLICABLE", "REQUIRED", "IMPLEMENTED"] as const;
type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

const MARKING_METHOD_KEYS = {
  c2pa_manifest: "methodC2pa",
  invisible_watermark: "methodWatermark",
  visible_label: "methodVisibleLabel",
  metadata_tagging: "methodMetadata",
  generation_logging: "methodLogging",
} as const;
type MarkingMethodValue = keyof typeof MARKING_METHOD_KEYS;

const OBLIGATION_FIELDS = [
  { field: "art50InteractionStatus", obligation: "art50_interaction", labelKey: "obligationInteraction" },
  { field: "art50MarkingStatus", obligation: "art50_marking", labelKey: "obligationMarking" },
  { field: "art50EmotionStatus", obligation: "art50_emotion", labelKey: "obligationEmotion" },
  { field: "art50DeepfakeStatus", obligation: "art50_deepfake", labelKey: "obligationDeepfake" },
] as const;

type ObligationField = (typeof OBLIGATION_FIELDS)[number]["field"];

interface FormState {
  art50InteractionStatus: ObligationStatus;
  art50MarkingStatus: ObligationStatus;
  art50EmotionStatus: ObligationStatus;
  art50DeepfakeStatus: ObligationStatus;
  markingMethods: MarkingMethodValue[];
  placedOnMarketBefore2Aug2026: boolean;
  notes: string;
}

interface TransparencyPanelProps {
  organizationId: string;
  aiSystemId: string;
  canWrite: boolean;
}

export function TransparencyPanel({
  organizationId,
  aiSystemId,
  canWrite,
}: TransparencyPanelProps) {
  const t = useTranslations("transparency");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.transparency.get.useQuery(
    { organizationId, aiSystemId },
    { enabled: !!organizationId && !!aiSystemId }
  );

  // The form is the server state (stored profile, else the deterministic
  // suggestions pre-filled as REQUIRED) overlaid with the user's edits —
  // no effect, no state mirroring the query.
  const [edits, setEdits] = useState<Partial<FormState>>({});

  const defaults = useMemo<FormState | null>(() => {
    if (!data) return null;
    if (data.profile) {
      return {
        art50InteractionStatus: data.profile.art50InteractionStatus,
        art50MarkingStatus: data.profile.art50MarkingStatus,
        art50EmotionStatus: data.profile.art50EmotionStatus,
        art50DeepfakeStatus: data.profile.art50DeepfakeStatus,
        markingMethods: data.profile.markingMethods as MarkingMethodValue[],
        placedOnMarketBefore2Aug2026:
          data.profile.placedOnMarketBefore2Aug2026 === true,
        notes: data.profile.notes ?? "",
      };
    }
    const suggested = (obligation: string): ObligationStatus =>
      data.suggestions.find((s) => s.obligation === obligation)?.suggested
        ? "REQUIRED"
        : "NOT_APPLICABLE";
    return {
      art50InteractionStatus: suggested("art50_interaction"),
      art50MarkingStatus: suggested("art50_marking"),
      art50EmotionStatus: suggested("art50_emotion"),
      art50DeepfakeStatus: suggested("art50_deepfake"),
      markingMethods: [],
      placedOnMarketBefore2Aug2026: false,
      notes: "",
    };
  }, [data]);

  const form: FormState | null = defaults ? { ...defaults, ...edits } : null;

  const upsert = trpc.transparency.upsert.useMutation({
    onSuccess: () => {
      toast.success(t("toastSaved"));
      setEdits({});
      void utils.transparency.get.invalidate({ organizationId, aiSystemId });
      void utils.aiSystem.getById.invalidate({ organizationId, id: aiSystemId });
      void utils.organization.getDashboardStats.invalidate({ organizationId });
    },
    onError: () => toast.error(t("toastError")),
  });

  if (isLoading || !data || !form) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  const prohibitedOverlap = data.suggestions.some((s) => s.prohibitedOverlap);
  const markingRelevant = form.art50MarkingStatus !== "NOT_APPLICABLE";

  // Live deadline preview from the current form state (the saved value comes
  // back via transparency.get after save).
  const deadline =
    markingRelevant && data.markingDeadline
      ? data.markingDeadline
      : null;

  const statusLabel = (status: ObligationStatus) =>
    status === "NOT_APPLICABLE"
      ? t("statusNotApplicable")
      : status === "REQUIRED"
        ? t("statusRequired")
        : t("statusImplemented");

  const setStatus = (field: ObligationField, value: ObligationStatus) =>
    setEdits((prev) => ({ ...prev, [field]: value }));

  const toggleMethod = (method: MarkingMethodValue, checked: boolean) =>
    setEdits((prev) => ({
      ...prev,
      markingMethods: checked
        ? [...form.markingMethods, method]
        : form.markingMethods.filter((m) => m !== method),
    }));

  const handleSave = () => {
    upsert.mutate({
      organizationId,
      aiSystemId,
      art50InteractionStatus: form.art50InteractionStatus,
      art50MarkingStatus: form.art50MarkingStatus,
      art50EmotionStatus: form.art50EmotionStatus,
      art50DeepfakeStatus: form.art50DeepfakeStatus,
      markingMethods: form.markingMethods,
      placedOnMarketBefore2Aug2026: form.placedOnMarketBefore2Aug2026,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </div>

      {prohibitedOverlap && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs">{t("prohibitedWarning")}</p>
        </div>
      )}

      {/* Obligation rows */}
      <div className="space-y-3">
        {OBLIGATION_FIELDS.map(({ field, obligation, labelKey }) => {
          const suggestion = data.suggestions.find(
            (s) => s.obligation === obligation
          );
          return (
            <div
              key={field}
              className="rounded-md border border-border p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{suggestion?.article}</Badge>
                <Badge variant="secondary" className="text-xs">
                  {suggestion?.actor === "provider"
                    ? t("actorProvider")
                    : t("actorDeployer")}
                </Badge>
                <span className="text-sm">{t(labelKey)}</span>
              </div>
              {suggestion?.suggested && suggestion.matched && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  {t("suggestedByRules", { matched: suggestion.matched })}
                </p>
              )}
              {canWrite ? (
                <Select
                  value={form[field]}
                  onValueChange={(v) => setStatus(field, v as ObligationStatus)}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBLIGATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">{statusLabel(form[field])}</Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Marking sub-section (Art. 50(2)) */}
      {markingRelevant && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="placed-before"
              checked={form.placedOnMarketBefore2Aug2026}
              disabled={!canWrite}
              onCheckedChange={(checked) =>
                setEdits((prev) => ({
                  ...prev,
                  placedOnMarketBefore2Aug2026: checked === true,
                }))
              }
            />
            <Label htmlFor="placed-before" className="text-xs font-normal">
              {t("placedBeforeLabel")}
            </Label>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("placedBeforeHelp")}</p>

          {deadline && (
            <p className="text-xs">
              {deadline.overdue ? (
                <span className="bg-destructive/20 text-foreground px-1.5 py-0.5">
                  {t("deadlineOverdue", { date: formatDate(deadline.deadline) })}
                </span>
              ) : (
                t("deadlineDue", { date: formatDate(deadline.deadline) })
              )}
            </p>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-medium">{t("markingMethodsTitle")}</p>
            {(Object.keys(MARKING_METHOD_KEYS) as MarkingMethodValue[]).map(
              (method) => (
                <div key={method} className="flex items-center gap-2">
                  <Checkbox
                    id={`method-${method}`}
                    checked={form.markingMethods.includes(method)}
                    disabled={!canWrite}
                    onCheckedChange={(checked) =>
                      toggleMethod(method, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`method-${method}`}
                    className="text-xs font-normal"
                  >
                    {t(MARKING_METHOD_KEYS[method])}
                  </Label>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="transparency-notes" className="text-xs">
          {t("notesLabel")}
        </Label>
        <Textarea
          id="transparency-notes"
          value={form.notes}
          disabled={!canWrite}
          rows={3}
          onChange={(e) =>
            setEdits((prev) => ({ ...prev, notes: e.target.value }))
          }
        />
      </div>

      <p className="text-[11px] text-muted-foreground/80 italic">
        {t("guidelinesHint")}
      </p>

      {canWrite && (
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? t("saving") : t("save")}
        </Button>
      )}
    </div>
  );
}
