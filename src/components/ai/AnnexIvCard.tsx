"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AnnexIvCard — AI-drafted Annex IV technical-documentation skeleton for one
 * registered AI system (AI-registry detail page).
 *
 * The draft is a sectioned markdown document built from registry facts, shown
 * in the standard AiDraftPanel; "Insert" here copies the markdown to the
 * clipboard (there is no stored Annex IV document — the owner completes it in
 * their own documentation workflow). Nothing is written to the DB.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { features } from "@/config/features";
import { AiDraftPanel } from "@/components/ai/AiDraftPanel";

interface AnnexIvCardProps {
  organizationId: string;
  aiSystemId: string;
  canWrite: boolean;
}

export function AnnexIvCard({ organizationId, aiSystemId, canWrite }: AnnexIvCardProps) {
  const t = useTranslations("ai");
  const generateAnnexIv = trpc.aiSystem.generateAnnexIv.useMutation();

  if (!features.aiAssistEnabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" /> {t("annexIv.title")}
        </CardTitle>
        <CardDescription>{t("annexIv.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <AiDraftPanel
          organizationId={organizationId}
          disabled={!canWrite}
          onGenerate={() =>
            generateAnnexIv.mutateAsync({ organizationId, id: aiSystemId })
          }
          onInsert={(content) => {
            void navigator.clipboard.writeText(content);
          }}
          insertKey="annexIv.copy"
          insertedKey="annexIv.copied"
        />
        <p className="text-[11px] text-muted-foreground/80 italic">{t("annexIv.disclaimer")}</p>
      </CardContent>
    </Card>
  );
}
