"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useTranslations, useLocale } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type AnswerQuestion, localizedText } from "@/lib/assessment-answers";

/**
 * The input for one assessment question. Understands both the v1 shapes (a
 * textarea, or a select whose options are plain strings) and the v2 structured
 * shapes (single/multi choice, scale, yes/no, date). A structured question may
 * carry a free-text note. The follow-up of a yes/no question is a question in
 * its own right and is rendered by the caller, not here.
 */
export function AssessmentQuestionField({
  question,
  value,
  note,
  onChange,
  onNoteChange,
  disabled,
}: {
  question: AnswerQuestion;
  value: unknown;
  note: string;
  onChange: (value: unknown) => void;
  onNoteChange: (note: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("assessmentDetail");
  const locale = useLocale() === "es" ? "es" : "en";

  const options = (question.options ?? []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: localizedText(o.label, locale) },
  );

  const showNote = question.type === "single_choice"
    || question.type === "multi_choice"
    || question.type === "scale"
    || question.type === "yes_no"
    || question.type === "date";

  return (
    <div className="space-y-2">
      {renderInput()}
      {showNote && question.allowNote && (
        <div className="pt-1">
          <label className="text-xs text-muted-foreground">
            {question.noteLabel ? localizedText(question.noteLabel, locale) : t("noteLabel")}
          </label>
          <Textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            disabled={disabled}
            placeholder={t("notePlaceholder")}
            rows={2}
          />
        </div>
      )}
    </div>
  );

  function renderInput() {
    switch (question.type) {
      case "single_choice":
        return (
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(v) => onChange(v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_choice": {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        const toggle = (optValue: string, checked: boolean) => {
          const next = checked
            ? [...selected, optValue]
            : selected.filter((v) => v !== optValue);
          onChange(next);
        };
        return (
          <div className="space-y-2">
            {options.map((o) => (
              <label key={o.value} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(o.value)}
                  onCheckedChange={(c) => toggle(o.value, c === true)}
                  disabled={disabled}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case "scale": {
        const scale = question.scale ?? { min: 1, max: 5 };
        const current = typeof value === "number" ? value : Number(value);
        const points: number[] = [];
        for (let i = scale.min; i <= scale.max; i++) points.push(i);
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1.5">
              {points.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={current === p ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => onChange(p)}
                  className="w-9"
                >
                  {p}
                </Button>
              ))}
            </div>
            {(scale.minLabel || scale.maxLabel) && (
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{localizedText(scale.minLabel, locale)}</span>
                <span>{localizedText(scale.maxLabel, locale)}</span>
              </div>
            )}
          </div>
        );
      }

      case "yes_no":
        return (
          <div className="flex gap-2">
            {(["yes", "no"] as const).map((v) => (
              <Button
                key={v}
                type="button"
                size="sm"
                variant={value === v ? "default" : "outline"}
                disabled={disabled}
                onClick={() => onChange(v)}
              >
                {v === "yes" ? t("yes") : t("no")}
              </Button>
            ))}
          </div>
        );

      case "date":
        return (
          <Input
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="max-w-xs"
          />
        );

      // v1 "select" (options are plain strings, value === label).
      case "select":
        return (
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(v) => onChange(v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      // text / textarea / anything else falls through to free text.
      default:
        return (
          <Textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={t("textareaPlaceholder")}
            rows={3}
          />
        );
    }
  }
}
