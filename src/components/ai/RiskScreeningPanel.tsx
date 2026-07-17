"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * RiskScreeningPanel — deterministic Annex III screening + optional AI
 * rationale for the classification wizard.
 *
 * The screening block is pure rules (config/annex-iii-rules.ts via
 * riskClassification.screen) and renders with the AI posture OFF — it is
 * the ground truth. The AiDraftPanel below it only drafts the written
 * rationale, grounded in those rule hits; the user still picks the level
 * and the draft only lands in the editable rationale field via Insert.
 */

import { Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { AiDraftPanel } from "@/components/ai/AiDraftPanel";

interface RiskScreeningPanelProps {
  organizationId: string;
  aiSystemId: string;
  /** The level currently selected in the wizard form ("" = none yet). */
  chosenLevel: string;
  chosenCategory?: string;
  onInsertRationale: (content: string) => void;
}

export function RiskScreeningPanel({
  organizationId,
  aiSystemId,
  chosenLevel,
  chosenCategory,
  onInsertRationale,
}: RiskScreeningPanelProps) {
  const t = useTranslations("ai");

  const { data: screening } = trpc.riskClassification.screen.useQuery(
    { organizationId, aiSystemId },
    { enabled: !!organizationId && !!aiSystemId, staleTime: 60_000 }
  );

  const generateRationale = trpc.riskClassification.generateAiRationale.useMutation();

  if (!screening) return null;

  const hasHits =
    screening.prohibited.length > 0 ||
    screening.highRisk.length > 0 ||
    screening.transparency.length > 0 ||
    screening.carveOuts.length > 0;

  return (
    <div className="space-y-3">
      {/* Deterministic rule screening — works with AI off */}
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-primary" />
          {t("screening.title")}
        </p>
        <p className="text-xs">{t("screening.suggested", { level: screening.suggestedLevel })}</p>
        {hasHits ? (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {screening.prohibited.map((hit) => (
              <li key={hit.ruleId}>
                {t("screening.prohibitedHit", { article: hit.article, matched: hit.matched })}
              </li>
            ))}
            {screening.highRisk.map((hit) => (
              <li key={hit.ruleId}>
                {t("screening.highRiskHit", { article: hit.article, matched: hit.matched })}
              </li>
            ))}
            {screening.transparency.map((hit) => (
              <li key={hit.ruleId}>
                {t("screening.transparencyHit", { article: hit.article, matched: hit.matched })}
              </li>
            ))}
            {screening.carveOuts.map((hit) => (
              <li key={hit.ruleId}>{t("screening.carveOutHit", { article: hit.article })}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">{t("screening.none")}</p>
        )}
        <p className="text-[11px] text-muted-foreground/80 italic">{t("screening.disclaimer")}</p>
      </div>

      {/* Optional AI-drafted rationale, grounded in the rule hits above.
          Disabled until a level is picked — the classification is the user's. */}
      <AiDraftPanel
        organizationId={organizationId}
        disabled={!chosenLevel}
        onGenerate={() =>
          generateRationale.mutateAsync({
            organizationId,
            aiSystemId,
            chosenLevel: chosenLevel as "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL",
            chosenCategory: chosenCategory || undefined,
          })
        }
        onInsert={onInsertRationale}
      />
    </div>
  );
}
