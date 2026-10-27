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
import { refreshAfterScopeChange } from "@/lib/scope-refresh";
import { useAutoSave } from "@/lib/use-auto-save";
import { CARD_HEADER_WITH_STATUS, CardSaveStatus } from "@/components/ui/save-status";
import { Instruction } from "@/components/ui/instruction";
import { hasTemplateCopyMark } from "@/config/client-template";
// Which questions are shown, and the rule of step 1.2 that reads the answers,
// come from one place (src/config/obligation-screenings.ts).
import { regimeQuestionsFor, type RegimeOrgQuestion } from "@/config/obligation-screenings";

type Answer = "NOT_ASSESSED" | "YES" | "NO";

type OrgFactKey = RegimeOrgQuestion;

const CITATIONS: Record<OrgFactKey, string> = {
  isPublicAgency: "TRAIGA § 552.051(b) · RCW 43.105",
  isHealthCarrier: "RCW 48.43.830",
  isHealthcareProvider: "TRAIGA § 552.051(f)",
  isCoveredGenAiProvider: "HB 1170 (2026 c 167)",
  processesConsumerHealthData: "RCW 19.373",
};

export function RegimeScreeningCard({
  organizationId,
  canWrite,
}: {
  organizationId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("regimes");
  const utils = trpc.useUtils();
  const [edits, setEdits] = useState<Partial<Record<OrgFactKey, Answer>>>({});

  // Read the declared jurisdictions here rather than take them as a prop: the
  // card decides for itself which questions are worth asking.
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });
  const jurisdictions = (org?.operatingJurisdictions ?? []) as string[];

  // The organisation's own answers: no system is needed to read them.
  const { data: orgFacts } = trpc.regimes.getOrgFacts.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const invalidate = () => refreshAfterScopeChange(utils);

  // Each answer saves as it is chosen, and only the answers changed here are
  // sent: the server merges them into what it holds, so an answer this card
  // has not loaded yet is never overwritten.
  const save = trpc.regimes.setOrgFacts.useMutation({ onSuccess: invalidate });
  const autosave = useAutoSave<Partial<Record<OrgFactKey, Answer>>>(
    (facts) => save.mutateAsync({ organizationId, ...facts }),
    { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) },
  );

  // The explicit confirmation of answers copied from another client's template.
  const confirm = trpc.regimes.setOrgFacts.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const relevant = regimeQuestionsFor(jurisdictions);
  if (relevant.length === 0) return null;

  const saved = (orgFacts ?? {}) as Record<OrgFactKey, Answer>;
  const value = (key: OrgFactKey): Answer => edits[key] ?? saved[key] ?? "NOT_ASSESSED";
  // Answers copied from another client's template: saving them, changed or
  // not, is what confirms them for this client.
  // Only once the saved answers are loaded, so confirming never sends blanks.
  const copied = hasTemplateCopyMark(org?.settings) && !!orgFacts;
  const options: Answer[] = ["YES", "NO", "NOT_ASSESSED"];

  return (
    <Card>
      <CardHeader className={CARD_HEADER_WITH_STATUS}>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-primary" />
          {t("orgTitle")}
        </CardTitle>
        {canWrite && (
          <CardSaveStatus status={autosave.status} onRetry={autosave.retry} testId="regime-save-status" />
        )}
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
                  disabled={!canWrite}
                  aria-pressed={value(key) === opt}
                  onClick={() => {
                    const next = { ...edits, [key]: opt };
                    setEdits(next);
                    autosave.push(next);
                  }}
                  className={[
                    "rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
                    value(key) === opt
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-input text-foreground hover:border-primary/60",
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
        {copied && (
          <Instruction tone="box" role="status">
            {t("copiedFromTemplate")}
          </Instruction>
        )}
        {canWrite && copied && (
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={confirm.isPending}
              onClick={() =>
                confirm.mutate({
                  organizationId,
                  ...Object.fromEntries(relevant.map((k) => [k, value(k)])),
                })
              }
            >
              {confirm.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              {t("confirmCopied")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
