"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The quick start's opening screen: what the path will ask for (places,
 * vendors, AI tools in use, AI systems, owners) and how to find them
 * (expense records, sign-in logs, a survey of colleagues), before the first
 * question. Nothing on it is required; "Begin" moves to the first question.
 */

import { useTranslations } from "next-intl";
import { ArrowRight, Bot, Brain, Building2, Globe, Search, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** In the order the path asks for them. Ids are i18n keys under `quickstart.intro.items`. */
export const INTRO_ITEMS = [
  { id: "places", icon: Globe },
  { id: "vendors", icon: Building2 },
  { id: "toolsInUse", icon: Bot },
  { id: "systems", icon: Brain },
  { id: "owners", icon: UserCheck },
] as const;

/** Ids are i18n keys under `quickstart.intro.how`. */
export const INTRO_HOW = ["expenses", "signIn", "survey"] as const;

export function PathIntro({ onBegin }: { onBegin: () => void }) {
  const t = useTranslations("quickstart");
  return (
    <div className="space-y-4" data-testid="path-intro">
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">{t("intro.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("intro.lead")}</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {INTRO_ITEMS.map(({ id, icon: Icon }) => (
              <li key={id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t(`intro.items.${id}.title`)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t(`intro.items.${id}.line`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardContent className="p-4 sm:p-6 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Search className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t("intro.howTitle")}
          </h3>
          <ul className="space-y-2">
            {INTRO_HOW.map((id) => (
              <li key={id} className="flex items-start gap-2 text-sm">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span>{t(`intro.how.${id}`)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onBegin} data-testid="path-intro-begin">
          {t("intro.begin")}
          <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
