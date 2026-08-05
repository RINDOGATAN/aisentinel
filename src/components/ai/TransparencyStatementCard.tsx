"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * TransparencyStatementCard — AI-drafted Art. 50 transparency statement for
 * one registered AI system (Transparency tab of the AI-registry detail page).
 *
 * The draft is a sectioned markdown statement built from registry facts, the
 * recorded transparency profile, and the deterministic Art. 50 screening
 * (which is its ground truth). "Insert" copies the markdown to the clipboard;
 * nothing is written to the DB.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { features } from "@/config/features";
import { AiDraftPanel } from "@/components/ai/AiDraftPanel";

interface TransparencyStatementCardProps {
  organizationId: string;
  aiSystemId: string;
  canWrite: boolean;
}

export function TransparencyStatementCard({
  organizationId,
  aiSystemId,
  canWrite,
}: TransparencyStatementCardProps) {
  const t = useTranslations("ai");
  const generateStatement = trpc.transparency.generateStatement.useMutation();

  if (!features.aiAssistEnabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="w-4 h-4" /> {t("transparencyStatement.title")}
        </CardTitle>
        <CardDescription>{t("transparencyStatement.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <AiDraftPanel
          organizationId={organizationId}
          disabled={!canWrite}
          onGenerate={() =>
            generateStatement.mutateAsync({ organizationId, aiSystemId })
          }
          onInsert={(content) => {
            void navigator.clipboard.writeText(content);
          }}
          insertKey="transparencyStatement.copy"
          insertedKey="transparencyStatement.copied"
        />
        <p className="text-[11px] text-muted-foreground/80 italic">
          {t("transparencyStatement.disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
