"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One five-factor analysis.
 *
 * Each factor gets a rating and, more importantly, the reasoning behind it.
 * The rule derives a band from the ratings; the organisation records the band
 * it stands behind, and says why if it differs. Nothing can be completed until
 * every factor is reasoned, a band is recorded and a decision is written down.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import {
  BAND_GUIDANCE,
  RATINGS,
  SENSITIVE_FACTORS,
  SENSITIVE_FACTORS_REVIEW_MARKER,
  bandFor,
  type Band,
  type FactorId,
  type Rating,
} from "@/config/sensitive-data-factors";

type FactorState = Record<string, { rating?: Rating; reasoning?: string }>;

const BAND_STYLE: Record<string, string> = {
  LOW: "border-success/50 text-success",
  MEDIUM: "border-warning/50 text-warning",
  HIGH: "border-destructive/50 text-destructive",
};

export default function SensitiveDataAnalysisPage() {
  const t = useTranslations("sensitiveData");
  const locale = useLocale();
  const lang = locale === "es" ? "es" : "en";
  const params = useParams();
  const id = params.id as string;
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";

  const { data, isLoading, refetch } = trpc.sensitiveData.getById.useQuery(
    { organizationId: orgId, id },
    { enabled: !!orgId && !!id },
  );

  const [factors, setFactors] = useState<FactorState>({});
  const [band, setBand] = useState<Band | "">("");
  const [bandRationale, setBandRationale] = useState("");
  const [decision, setDecision] = useState("");
  const [owner, setOwner] = useState("");
  const [nextReview, setNextReview] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Seed the form from the saved analysis the first time it arrives. Done
  // during render rather than in an effect (the same pattern as the assessment
  // page): an effect here would render an empty form first and then replace it.
  if (data && !loaded) {
    setFactors((data.factors as FactorState) ?? {});
    setBand((data.band as Band) ?? "");
    setBandRationale(data.bandRationale ?? "");
    setDecision(data.decision ?? "");
    setOwner(data.owner ?? "");
    setNextReview(
      data.nextReviewDate ? new Date(data.nextReviewDate).toISOString().slice(0, 10) : "",
    );
    setLoaded(true);
  }

  const derived = useMemo(() => {
    const ratings = Object.fromEntries(
      Object.entries(factors).map(([k, v]) => [k, v?.rating]),
    ) as Partial<Record<FactorId, Rating>>;
    return bandFor(ratings);
  }, [factors]);

  const save = trpc.sensitiveData.update.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const complete = trpc.sensitiveData.complete.useMutation({
    onSuccess: () => {
      toast.success(t("completed"));
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const payload = {
    organizationId: orgId,
    id,
    factors,
    band: band || undefined,
    bandRationale: bandRationale || undefined,
    decision: decision || undefined,
    owner: owner || undefined,
    nextReviewDate: nextReview ? new Date(nextReview) : null,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/governance/sensitive-data">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold truncate">{data.subject}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t(`category.${data.category}`)}
            {data.aiSystem ? ` · ${data.aiSystem.name}` : ""}
            {data.completedAt
              ? ` · ${t("completedOn", { date: new Date(data.completedAt).toLocaleDateString() })}`
              : ""}
          </p>
        </div>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm">{t("ruleSays")}</span>
          <Badge variant="outline" className={BAND_STYLE[derived.band]}>
            {t(`band.${derived.band}`)}
          </Badge>
          <span className="text-xs text-muted-foreground">{derived.because[lang]}</span>
          {derived.incomplete && (
            <span className="text-xs text-warning">{t("incomplete")}</span>
          )}
        </CardContent>
      </Card>

      {SENSITIVE_FACTORS.map((f) => (
        <Card key={f.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{f.label[lang]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{f.question[lang]}</p>
            <p className="text-xs text-muted-foreground">{f.guidance[lang]}</p>

            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs">{t("ratingLabel")}</Label>
              <Select
                value={factors[f.id]?.rating ?? ""}
                onValueChange={(v) =>
                  setFactors((prev) => ({
                    ...prev,
                    [f.id]: { ...prev[f.id], rating: v as Rating },
                  }))
                }
                disabled={!canWrite}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("ratingPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {RATINGS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`ratingValue.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                {f.weight === "primary" ? t("primaryFactor") : t("modifierFactor")}
              </span>
            </div>

            <Textarea
              placeholder={t("reasoningPlaceholder")}
              value={factors[f.id]?.reasoning ?? ""}
              disabled={!canWrite}
              onChange={(e) =>
                setFactors((prev) => ({
                  ...prev,
                  [f.id]: { ...prev[f.id], reasoning: e.target.value },
                }))
              }
              rows={3}
            />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("outcomeTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("bandLabel")}</Label>
              <Select
                value={band}
                onValueChange={(v) => setBand(v as Band)}
                disabled={!canWrite}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("bandPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(["LOW", "MEDIUM", "HIGH"] as const).map((b) => (
                    <SelectItem key={b} value={b}>
                      {t(`band.${b}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="owner">
                {t("ownerLabel")}
              </Label>
              <Input
                id="owner"
                value={owner}
                disabled={!canWrite}
                onChange={(e) => setOwner(e.target.value)}
                placeholder={t("ownerPlaceholder")}
              />
            </div>
          </div>

          {band && (
            <p className="text-xs text-muted-foreground">{BAND_GUIDANCE[band][lang]}</p>
          )}

          {band && band !== derived.band && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t("departureLabel")}</Label>
              <Textarea
                value={bandRationale}
                disabled={!canWrite}
                onChange={(e) => setBandRationale(e.target.value)}
                placeholder={t("departurePlaceholder")}
                rows={2}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t("decisionLabel")}</Label>
            <Textarea
              value={decision}
              disabled={!canWrite}
              onChange={(e) => setDecision(e.target.value)}
              placeholder={t("decisionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs" htmlFor="next-review">
              {t("nextReviewLabel")}
            </Label>
            <Input
              id="next-review"
              type="date"
              value={nextReview}
              disabled={!canWrite}
              onChange={(e) => setNextReview(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">{t("nextReviewHint")}</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">{SENSITIVE_FACTORS_REVIEW_MARKER[lang]}</p>

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate(payload)} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            {t("save")}
          </Button>
          <Button
            variant="outline"
            disabled={complete.isPending || !!data.completedAt}
            onClick={async () => {
              await save.mutateAsync(payload);
              complete.mutate({ organizationId: orgId, id });
            }}
          >
            {complete.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
            )}
            {data.completedAt ? t("statusComplete") : t("markComplete")}
          </Button>
        </div>
      )}
    </div>
  );
}
