"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AiPostureCard — the per-organization AI switch (org settings page).
 * Ported from DPO Central; lane pills and i18n key names mirror Dealroom's
 * `ai` namespace (postureCard.laneNames.*, postureCard.laneNoEngine).
 *
 * Posture defaults to off: no AI calls ever happen until an OWNER/ADMIN
 * picks a posture AND ticks the acknowledgment sentence. The acknowledgment
 * is recorded as acknowledgedById/At. Non-admins see the card read-only.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { features } from "@/config/features";

type Posture = "off" | "local_gateway" | "cloud_eu" | "cloud_us";

// Product decision (2026-07-17): the picker offers a SIMPLE choice — Off,
// Cloud LLM, or Local gateway (the latter only meaningful on self-host).
// "Cloud LLM" is stored as `cloud_us` (the enum keeps all four values —
// append-only DB discipline and canonical-door parity — and with a single
// base engine every lane routes identically, so the recorded posture and
// the physical traffic stay the same fact). `cloud_eu` remains valid for
// any org that already saved it and is shown only in that legacy case.
const OFFERED_POSTURES: readonly Posture[] = ["off", "cloud_us", "local_gateway"];

interface AiPostureCardProps {
  organizationId: string;
  isAdmin: boolean;
}

export function AiPostureCard({ organizationId, isAdmin }: AiPostureCardProps) {
  const t = useTranslations("ai");
  const utils = trpc.useUtils();

  const { data: status } = trpc.ai.getStatus.useQuery(
    { organizationId },
    { enabled: features.aiAssistEnabled && !!organizationId }
  );

  // null = follow the server value; a Posture = the admin's unsaved selection.
  // Derived instead of effect-synced (no setState-in-effect).
  const [selected, setSelected] = useState<Posture | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const posture: Posture = selected ?? ((status?.posture ?? "off") as Posture);
  const dirty = selected !== null;

  const setPostureMutation = trpc.ai.setPosture.useMutation({
    onSuccess: () => {
      toast.success(t("postureCard.saved"));
      utils.ai.getStatus.invalidate();
      setSelected(null);
      setAcknowledged(false);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!features.aiAssistEnabled || !status) return null;

  // Lane-aware: warn about the lane the admin is ABOUT to save (the selector
  // value), not the one already saved — each posture may have its own engine.
  const selectedLaneStatus = posture === "off" ? null : status.lanes[posture];
  const showNotConfiguredWarning = posture !== "off" && !selectedLaneStatus?.configured;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> {t("postureCard.title")}
        </CardTitle>
        <CardDescription>{t("postureCard.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t("postureCard.postureLabel")}</Label>
          <Select
            value={posture}
            onValueChange={(v) => setSelected(v as Posture)}
            disabled={!isAdmin || setPostureMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(OFFERED_POSTURES.includes(posture)
                ? OFFERED_POSTURES
                : [...OFFERED_POSTURES, posture]
              ).map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`posture.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {status.configured
              ? t("postureCard.engineConfigured", { provider: status.providerName ?? "—" })
              : t("postureCard.engineNotConfigured")}
          </p>
          {/* Engine availability for the two offered lanes (suffixed env
              triples fall back to the base one) */}
          <div className="flex flex-wrap gap-1.5">
            {(["cloud_us", "local_gateway"] as const).map((lane) => {
              const laneStatus = status.lanes[lane];
              return (
                <span
                  key={lane}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                    laneStatus.configured
                      ? "border-primary/40 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {t(`postureCard.laneNames.${lane}`)}
                  {": "}
                  {laneStatus.configured
                    ? laneStatus.providerName ?? "—"
                    : t("postureCard.laneNoEngine")}
                </span>
              );
            })}
          </div>
        </div>

        {showNotConfiguredWarning && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 text-sm">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <span>{t("postureCard.notConfiguredWarning")}</span>
          </div>
        )}

        {status.acknowledgedAt && status.acknowledgedBy && (
          <p className="text-xs text-muted-foreground">
            {t("postureCard.acknowledgedBy", {
              name: status.acknowledgedBy.name || status.acknowledgedBy.email || "—",
              date: new Date(status.acknowledgedAt).toLocaleDateString(),
            })}
          </p>
        )}

        {isAdmin && dirty && (
          <>
            <div className="flex items-start gap-2">
              <Checkbox
                id="ai-posture-ack"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="ai-posture-ack"
                  className="text-xs font-medium leading-relaxed cursor-pointer"
                >
                  {t("postureCard.ackLabel")}
                </Label>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  <li>{t("postureCard.ackBullets.data")}</li>
                  <li>{t("postureCard.ackBullets.review")}</li>
                  <li>{t("postureCard.ackBullets.off")}</li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                className="disabled:opacity-40"
                disabled={!acknowledged || setPostureMutation.isPending}
                onClick={() =>
                  setPostureMutation.mutate({
                    organizationId,
                    posture,
                    acknowledged: true,
                  })
                }
              >
                {setPostureMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {t("postureCard.save")}
              </Button>
              {!acknowledged && (
                <p className="text-xs text-muted-foreground">
                  {t("postureCard.ackRequiredHint")}
                </p>
              )}
            </div>
          </>
        )}

        {!isAdmin && (
          <p className="text-xs text-muted-foreground">{t("postureCard.adminOnly")}</p>
        )}
      </CardContent>
    </Card>
  );
}
