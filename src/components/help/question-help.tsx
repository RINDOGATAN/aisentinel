"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The help shown under an assessment question: what it means, an example
 * answer, and the legal reference where there is one. A disclosure, so the
 * screen stays readable and the reader opens it only when they want it. Keyed
 * by the question's stable id (src/config/help/question-help.ts); a question
 * with no entry renders nothing.
 */

import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import { questionHelp } from "@/config/help/question-help";
import { useContentLocale } from "@/lib/content-locale";

export function QuestionHelp({ questionId }: { questionId: string }) {
  const t = useTranslations("help");
  const locale = useContentLocale();
  const help = questionHelp(questionId);

  if (!help) return null;

  return (
    <details className="group mt-1 rounded-md border border-border/70 bg-secondary/30 text-xs">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-md">
        <HelpCircle className="size-3.5 shrink-0" aria-hidden="true" />
        {t("question.toggle")}
      </summary>
      <div className="space-y-1.5 px-2.5 pb-2.5 pt-0.5 text-muted-foreground">
        <p className="leading-relaxed">{help.meaning[locale]}</p>
        <p className="leading-relaxed">
          <span className="font-medium text-foreground">{t("question.example")}:</span>{" "}
          {help.example[locale]}
        </p>
        {help.reference && (
          <p className="leading-relaxed">
            <span className="font-medium text-foreground">{t("question.reference")}:</span>{" "}
            {help.reference[locale]}
          </p>
        )}
      </div>
    </details>
  );
}
