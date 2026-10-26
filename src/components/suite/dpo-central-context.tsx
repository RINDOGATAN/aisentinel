// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

"use client";

/**
 * On an AI system brought in from DPO Central: the processing that uses it
 * there (activities, data, people, legal bases) and where its DPIA stands,
 * as DPO Central sent them (src/server/services/suite/dpc-link.ts). Codes come
 * with both languages' labels, so the reader sees their own.
 */
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { useFormatDate } from "@/lib/use-format-date";

type Labelled = { code: string; en: string; es: string };
type Block = {
  activities?: { id: string; name: string }[];
  dataCategories?: Labelled[];
  dataSubjects?: string[];
  legalBases?: Labelled[];
  dpia?: { state?: "approved" | "in_progress" | "due" | "none"; url?: string | null };
};

export function readDpoCentralBlock(metadata: unknown): { block: Block | null; removedAt: string | null } {
  const meta = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  const block = meta.dpoCentral && typeof meta.dpoCentral === "object" ? (meta.dpoCentral as Block) : null;
  const note = meta.suiteNote && typeof meta.suiteNote === "object" ? (meta.suiteNote as { kind?: string; at?: string }) : null;
  return { block, removedAt: note?.kind === "removedInDpoCentral" ? note.at ?? null : null };
}

export function DpoCentralContext({ metadata }: { metadata: unknown }) {
  const t = useTranslations("suiteLink");
  const locale = useLocale() === "es" ? "es" : "en";
  const { formatDate } = useFormatDate();
  const { block, removedAt } = readDpoCentralBlock(metadata);
  if (!block && !removedAt) return null;
  const label = (l: Labelled) => (locale === "es" ? l.es || l.en : l.en || l.code);
  const list = (items: string[]) => (items.length ? items.join(", ") : t("contextNone"));
  const state = block?.dpia?.state ?? "none";

  return (
    <div className="p-3 bg-muted/50 space-y-2 text-sm" data-testid="dpc-context">
      <p className="font-medium">{t("contextTitle")}</p>
      {removedAt && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{t("noteRemoved", { date: formatDate(removedAt) })}</p>
      )}
      {block && (
        <dl className="grid grid-cols-1 gap-1 sm:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">{t("contextActivities")}</dt>
          <dd>{list((block.activities ?? []).map((a) => a.name))}</dd>
          <dt className="text-muted-foreground">{t("contextCategories")}</dt>
          <dd>{list((block.dataCategories ?? []).map(label))}</dd>
          <dt className="text-muted-foreground">{t("contextSubjects")}</dt>
          <dd>{list(block.dataSubjects ?? [])}</dd>
          <dt className="text-muted-foreground">{t("contextLegalBases")}</dt>
          <dd>{list((block.legalBases ?? []).map(label))}</dd>
          <dt className="text-muted-foreground">{t("dpiaLabel")}</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span>{t(`dpia_${state}`)}</span>
            {block.dpia?.url && (
              <a className="inline-flex items-center gap-1 underline" href={block.dpia.url} target="_blank" rel="noopener noreferrer">
                {t("openDpia")}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </dd>
        </dl>
      )}
    </div>
  );
}
