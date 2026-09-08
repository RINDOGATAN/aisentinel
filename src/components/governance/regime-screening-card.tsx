"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Organisation-level screening for the cross-border regimes.
 *
 * Five facts that let the GDPR, Colorado, Texas and Washington resolvers leave
 * UNDETERMINED. Every question is tri-state, for the same reason the
 * California card is: concluding that a regime does not reach a business is an
 * assertion, and we only make it from an answer a person actually gave.
 *
 * Each question is shown only where a jurisdiction that turns on it has been
 * declared, so a purely European organisation is never asked whether it is a
 * Washington health carrier.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Answer = "NOT_ASSESSED" | "YES" | "NO";

type OrgFactKey =
  | "isPublicAgency"
  | "isHealthCarrier"
  | "isHealthcareProvider"
  | "isCoveredGenAiProvider"
  | "processesConsumerHealthData";

/** Which declared jurisdictions make a question worth asking. */
const RELEVANT_TO: Record<OrgFactKey, string[]> = {
  isPublicAgency: ["US_TX", "US_WA"],
  isHealthCarrier: ["US_WA"],
  isHealthcareProvider: ["US_TX"],
  isCoveredGenAiProvider: ["US_WA"],
  processesConsumerHealthData: ["US_WA"],
};

const CITATIONS: Record<OrgFactKey, string> = {
  isPublicAgency: "TRAIGA § 552.051(a) · RCW 43.105",
  isHealthCarrier: "RCW 48.43.830",
  isHealthcareProvider: "TRAIGA § 552.051(b)",
  isCoveredGenAiProvider: "HB 1170 (2026 c 167)",
  processesConsumerHealthData: "RCW 19.373",
};

const ORDER: OrgFactKey[] = [
  "isPublicAgency",
  "isHealthcareProvider",
  "isHealthCarrier",
  "isCoveredGenAiProvider",
  "processesConsumerHealthData",
];

export function RegimeScreeningCard({
  organizationId,
  canWrite,
}: {
  organizationId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("regimes");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const [edits, setEdits] = useState<Partial<Record<OrgFactKey, Answer>>>({});

  // Read the declared jurisdictions here rather than take them as a prop: the
  // card decides for itself which questions are worth asking.
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });
  const jurisdictions = (org?.operatingJurisdictions ?? []) as string[];

  const { data: systems } = trpc.aiSystem.list.useQuery(
    { organizationId, limit: 1 },
    { enabled: !!organizationId },
  );
  const firstSystemId = systems?.items?.[0]?.id;

  // The organisation's answers live on the scope query, which needs a system
  // to resolve against. With no systems registered there is nothing to screen.
  const { data } = trpc.regimes.getScope.useQuery(
    { organizationId, aiSystemId: firstSystemId ?? "" },
    { enabled: !!organizationId && !!firstSystemId },
  );

  const save = trpc.regimes.setOrgFacts.useMutation({
    onSuccess: () => {
      setEdits({});
      toast.success(t("saved"));
      void utils.regimes.getScope.invalidate();
      void utils.unified.getTemplate.invalidate();
      void utils.compliance.getFrameworkCounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const relevant = ORDER.filter((key) =>
    RELEVANT_TO[key].some((j) => jurisdictions.includes(j)),
  );
  if (relevant.length === 0) return null;

  const saved = (data?.orgFacts ?? {}) as Record<OrgFactKey, Answer>;
  const value = (key: OrgFactKey): Answer => edits[key] ?? saved[key] ?? "NOT_ASSESSED";
  const dirty = Object.keys(edits).length > 0;
  const options: Answer[] = ["YES", "NO", "NOT_ASSESSED"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-primary" />
          {t("orgTitle")}
        </CardTitle>
        <CardDescription>{t("orgDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {relevant.map((key) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <p className="text-sm">{t(`org.${key}.label`)}</p>
              <code className="text-[11px] text-muted-foreground shrink-0">{CITATIONS[key]}</code>
            </div>
            <p className="text-xs text-muted-foreground">{t(`org.${key}.help`)}</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={!canWrite || save.isPending}
                  onClick={() => setEdits((prev) => ({ ...prev, [key]: opt }))}
                  className={[
                    "rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
                    value(key) === opt
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  ].join(" ")}
                >
                  {t(`answer.${opt}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          {t("reviewMarkerNote")}
        </p>
        {canWrite && (
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() =>
                save.mutate({
                  organizationId,
                  ...Object.fromEntries(relevant.map((k) => [k, value(k)])),
                })
              }
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
