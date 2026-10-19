"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The role field's help: a plain explanation, and "Help me decide" with three
 * yes or no questions (src/lib/role-decider.ts). The suggestion enters the
 * field only when the person takes it.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_QUESTIONS, suggestRole, type RoleAnswers, type YesNo } from "@/lib/role-decider";

export function RoleDecider({ onUse }: { onUse: (role: "PROVIDER" | "DEPLOYER") => void }) {
  const t = useTranslations("aiRegistryNew");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<RoleAnswers>({});
  const suggestion = suggestRole(answers);

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("roleHelp")}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <HelpCircle className="w-3.5 h-3.5 mr-1.5" aria-hidden />
        {open ? t("roleDecide.close") : t("roleDecide.open")}
      </Button>
      {open && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3" data-testid="role-decider">
          {ROLE_QUESTIONS.map((q) => (
            <fieldset key={q} className="space-y-1.5">
              <legend className="text-sm">{t(`roleDecide.q.${q}`)}</legend>
              <div className="flex gap-2">
                {(["yes", "no"] as YesNo[]).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={answers[q] === value ? "default" : "outline"}
                    aria-pressed={answers[q] === value}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q]: value }))}
                  >
                    {value === "yes" ? tc("yes") : tc("no")}
                  </Button>
                ))}
              </div>
            </fieldset>
          ))}
          <p className="text-sm font-medium" aria-live="polite">
            {t(`roleDecide.outcome.${suggestion.outcome}`)}
          </p>
          {suggestion.role && (
            <Button type="button" size="sm" onClick={() => suggestion.role && onUse(suggestion.role)}>
              {t("roleDecide.use")}
            </Button>
          )}
          <p className="text-sm text-muted-foreground">{t("roleDecide.note")}</p>
        </div>
      )}
    </div>
  );
}
