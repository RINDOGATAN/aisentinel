"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * California CCPA screening answers, recorded at the organization level.
 *
 * These five answers are what let the ADMT resolver leave
 * COVERED_BUSINESS_NOT_ASSESSED. Without them nothing could ever write
 * `settings.admt`, so every organization sat permanently unresolved and none of
 * the seeded California requirements could attach to anything.
 *
 * Every question is deliberately tri-state. "Not answered" is a distinct,
 * visible state — never silently read as "no" — because concluding that
 * California does not reach a business is an assertion, and we only make it
 * from answers a human actually gave.
 *
 * Shown only where the organization has declared a California nexus: asking a
 * purely European business about CCPA revenue thresholds is noise.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Screening = "NOT_ASSESSED" | "YES" | "NO";
type RevenueBand =
  | "NOT_ASSESSED"
  | "OVER_100M"
  | "BETWEEN_50M_AND_100M"
  | "UNDER_50M";

interface FormState {
  coveredBusiness: Screening;
  revenueBand: RevenueBand;
  sellShareRevenue50Plus: Screening;
  revenueOverCcpaThreshold: Screening;
  largeProcessingVolume: Screening;
}

export function CaliforniaScreeningCard({
  organizationId,
  canWrite,
}: {
  organizationId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("admt");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const [edits, setEdits] = useState<Partial<FormState>>({});

  const { data, isLoading } = trpc.admt.getOrgScope.useQuery({ organizationId });

  const save = trpc.admt.setOrgFacts.useMutation({
    onSuccess: () => {
      setEdits({});
      toast.success(t("screening.saved"));
      void utils.admt.getOrgScope.invalidate();
      void utils.admt.getScope.invalidate();
      void utils.compliance.getFrameworkCounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !data) return null;

  // Gate on the resolved jurisdictions, NOT on the scope state. Answering
  // "no" to the covered-business question resolves the org to
  // OUT_OF_SCOPE_NO_CA_NEXUS — the same state as having no Californian nexus
  // at all — so hiding on state would make this card vanish the moment someone
  // answered "no", with no way back to change it.
  if (!data.orgScope.effectiveJurisdictions.includes("US_CA")) return null;

  const saved: FormState = {
    coveredBusiness: data.coveredBusiness as Screening,
    revenueBand: data.revenueBand as RevenueBand,
    sellShareRevenue50Plus: data.sellShareRevenue50Plus as Screening,
    revenueOverCcpaThreshold: data.revenueOverCcpaThreshold as Screening,
    largeProcessingVolume: data.largeProcessingVolume as Screening,
  };
  const value: FormState = { ...saved, ...edits };
  const dirty = Object.keys(edits).length > 0;

  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    setEdits((prev) => ({ ...prev, [key]: v }));

  const TRI: Screening[] = ["YES", "NO", "NOT_ASSESSED"];
  const BANDS: RevenueBand[] = [
    "OVER_100M",
    "BETWEEN_50M_AND_100M",
    "UNDER_50M",
    "NOT_ASSESSED",
  ];

  function Choice<T extends string>({
    options,
    current,
    onPick,
    labelFor,
  }: {
    options: T[];
    current: T;
    onPick: (v: T) => void;
    labelFor: (v: T) => string;
  }) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={!canWrite || save.isPending}
            onClick={() => onPick(opt)}
            className={[
              "rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
              current === opt
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:border-primary/40",
            ].join(" ")}
          >
            {labelFor(opt)}
          </button>
        ))}
      </div>
    );
  }

  const question = (
    key: keyof FormState,
    citation: string,
    options: readonly string[],
    labelFor: (v: string) => string,
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <p className="text-sm">{t(`screening.${key}.label`)}</p>
        <code className="text-[11px] text-muted-foreground shrink-0">{citation}</code>
      </div>
      <p className="text-xs text-muted-foreground">{t(`screening.${key}.help`)}</p>
      <Choice
        options={options as string[]}
        current={value[key]}
        onPick={(v) => set(key, v as never)}
        labelFor={labelFor}
      />
    </div>
  );

  const triLabel = (v: string) => t(`screening.answer.${v}`);
  const bandLabel = (v: string) => t(`screening.band.${v}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          {t("screening.title")}
        </CardTitle>
        <CardDescription>{t("screening.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {question("coveredBusiness", "Civ. Code § 1798.140(d)", TRI, triLabel)}

        <div className="border-t border-border pt-4 space-y-5">
          <p className="text-xs text-muted-foreground">
            {t("screening.auditIntro")}
          </p>
          {question("sellShareRevenue50Plus", "§ 7120(b)(1)", TRI, triLabel)}
          {question("revenueOverCcpaThreshold", "§ 7120(b)(2)", TRI, triLabel)}
          {question("largeProcessingVolume", "§ 7120(b)(2)", TRI, triLabel)}
          {question("revenueBand", "§ 7121(a)", BANDS, bandLabel)}
        </div>

        {canWrite && (
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate({ organizationId, ...value })}
            >
              {save.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              {tc("save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
