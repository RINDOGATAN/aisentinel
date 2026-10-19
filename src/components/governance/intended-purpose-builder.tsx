"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The intended-purpose help: what the field means under the Act, and five
 * short questions that the product assembles into one statement
 * (src/lib/intended-purpose.ts). The statement replaces the field only when
 * the person asks, and stays editable there.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PURPOSE_PARTS,
  assemblePurpose,
  hasPurposeAnswers,
  type PurposeParts,
} from "@/lib/intended-purpose";

export function IntendedPurposeBuilder({
  idPrefix,
  onUse,
}: {
  idPrefix: string;
  onUse: (statement: string) => void;
}) {
  const t = useTranslations("aiRegistryNew");
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<PurposeParts>({});
  const statement = assemblePurpose(parts, {
    who: (value) => t("purposeBuilder.frame.who", { value }),
    where: (value) => t("purposeBuilder.frame.where", { value }),
    decisions: (value) => t("purposeBuilder.frame.decisions", { value }),
    notFor: (value) => t("purposeBuilder.frame.notFor", { value }),
  });

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("purposeHelp")}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <ListChecks className="w-3.5 h-3.5 mr-1.5" aria-hidden />
        {open ? t("purposeBuilder.close") : t("purposeBuilder.open")}
      </Button>
      {open && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3" data-testid="purpose-builder">
          <p className="text-sm text-muted-foreground">{t("purposeBuilder.example")}</p>
          {PURPOSE_PARTS.map((part) => (
            <div key={part} className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-purpose-${part}`}>{t(`purposeBuilder.${part}.label`)}</Label>
              <Input
                id={`${idPrefix}-purpose-${part}`}
                value={parts[part] ?? ""}
                placeholder={t(`purposeBuilder.${part}.placeholder`)}
                onChange={(e) => setParts((prev) => ({ ...prev, [part]: e.target.value }))}
              />
            </div>
          ))}
          {hasPurposeAnswers(parts) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("purposeBuilder.preview")}</p>
              <p className="text-sm rounded-md border border-border bg-background p-2">{statement}</p>
              <p className="text-sm text-muted-foreground">{t("purposeBuilder.replaces")}</p>
              <Button type="button" size="sm" onClick={() => onUse(statement)}>
                {t("purposeBuilder.use")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
