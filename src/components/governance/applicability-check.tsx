"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The applicability check (src/config/applicability.ts) on screen.
 *
 * - `ApplicabilityQuestions`: the plain questions, three answers each ("Yes",
 *   "No", "Not sure yet"). Controlled: the caller keeps the answers and saves
 *   them (the quick start on its way past, the settings card with a button).
 * - `ApplicabilityResult`: "These apply to you", one line each with its why,
 *   then "Worth checking" for what may apply.
 * - `ApplicabilityCard`: both, for Settings, where the answers stay editable.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, CircleHelp, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CARD_HEADER_WITH_STATUS, CardSaveStatus } from "@/components/ui/save-status";
import { Instruction } from "@/components/ui/instruction";
import { useAutoSave } from "@/lib/use-auto-save";
import { trpc } from "@/lib/trpc";
import { SCREENING_ANCHOR } from "@/lib/settings-anchors";
import { useProgramPath } from "@/components/guided/use-program-path";
import { cn } from "@/lib/utils";
import {
  APPLICABILITY_QUESTIONS,
  ROLE_QUESTIONS,
  evaluateApplicability,
  type ApplicabilityAnswer,
  type ApplicabilityAnswers,
  type ApplicabilityItem,
  type ApplicabilityQuestion,
} from "@/config/applicability";
import type { JurisdictionId } from "@/config/jurisdictions";

const OPTIONS: ApplicabilityAnswer[] = ["YES", "NO", "UNSURE"];

function QuestionRow({
  question,
  value,
  onChange,
  disabled,
  idPrefix,
  unsurePicked = false,
}: {
  question: ApplicabilityQuestion;
  value: ApplicabilityAnswer;
  onChange: (answer: ApplicabilityAnswer) => void;
  disabled?: boolean;
  idPrefix: string;
  /** "Not sure yet" was picked on this screen. Stored, it is the same as no answer, so it only looks chosen once picked. */
  unsurePicked?: boolean;
}) {
  const t = useTranslations("applicability");
  const name = `${idPrefix}-${question}`;
  const shows = (option: ApplicabilityAnswer) => value === option && (option !== "UNSURE" || unsurePicked);
  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="text-sm">{t(`questions.${question}.label`)}</legend>
      <p className="text-xs text-muted-foreground" id={`${name}-hint`}>
        {t(`questions.${question}.hint`)}
      </p>
      <div className="flex flex-wrap gap-1.5" aria-describedby={`${name}-hint`}>
        {OPTIONS.map((option) => (
          <label key={option} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={shows(option)}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "inline-flex min-h-11 sm:min-h-8 items-center rounded-md border px-3 text-xs motion-safe:transition-colors",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                "peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
                shows(option)
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-input text-foreground hover:border-primary/60",
              )}
            >
              {t(`answer.${option}`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ApplicabilityQuestions({
  answers,
  onChange,
  disabled,
  idPrefix = "applicability",
}: {
  answers: ApplicabilityAnswers;
  onChange: (next: ApplicabilityAnswers) => void;
  disabled?: boolean;
  /** Keeps radio names apart when the questions appear twice on a page. */
  idPrefix?: string;
}) {
  const t = useTranslations("applicability");
  // An unanswered question is stored as "Not sure yet"; it looks chosen only after someone picks it here.
  const [unsurePicked, setUnsurePicked] = useState<ReadonlySet<ApplicabilityQuestion>>(new Set());
  const set = (q: ApplicabilityQuestion) => (a: ApplicabilityAnswer) => {
    setUnsurePicked((prev) => {
      const next = new Set(prev);
      if (a === "UNSURE") next.add(q);
      else next.delete(q);
      return next;
    });
    onChange({ ...answers, [q]: a });
  };
  const others = APPLICABILITY_QUESTIONS.filter((q) => !ROLE_QUESTIONS.includes(q));
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <p className="text-sm font-medium">{t("roleTitle")}</p>
        {ROLE_QUESTIONS.map((q) => (
          <QuestionRow
            key={q}
            question={q}
            value={answers[q]}
            onChange={set(q)}
            disabled={disabled}
            idPrefix={idPrefix}
            unsurePicked={unsurePicked.has(q)}
          />
        ))}
      </div>
      <div className="space-y-4 border-t border-border pt-4">
        {others.map((q) => (
          <QuestionRow
            key={q}
            question={q}
            value={answers[q]}
            onChange={set(q)}
            disabled={disabled}
            idPrefix={idPrefix}
            unsurePicked={unsurePicked.has(q)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The laws whose requirements reach the register only once the screening in
 * Settings is answered (an unanswered question never adds obligations).
 */
const SCREENING_GATED: ReadonlySet<ApplicabilityItem["id"]> = new Set([
  "colorado",
  "californiaAdmt",
  "washington",
]);

function ItemLine({
  item,
  screeningLink,
  screeningBelow = false,
}: {
  item: ApplicabilityItem;
  /** Where the screening is, when it is still to answer; null hides the line. */
  screeningLink: { href: string; newTab: boolean } | null;
  /** The California screening is further down the same page (Settings). */
  screeningBelow?: boolean;
}) {
  const t = useTranslations("applicability");
  const Icon = item.state === "applies" ? CheckCircle2 : CircleHelp;
  return (
    <li className="flex items-start gap-2.5">
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          item.state === "applies" ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 break-words">
        <span className="block text-sm font-medium">{t(`items.${item.id}`)}</span>
        <span className="block text-xs text-muted-foreground">
          <span className="sr-only">{t("whyLabel")}: </span>
          {item.reasons
            .map((r) => (screeningBelow && t.has(`reasonsBelow.${r}`) ? t(`reasonsBelow.${r}`) : t(`reasons.${r}`)))
            .join(" ")}
        </span>
        {screeningLink && SCREENING_GATED.has(item.id) && (
          <a
            href={screeningLink.href}
            {...(screeningLink.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="block text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {t(screeningBelow ? "answerScreeningBelow" : "answerScreening")}
          </a>
        )}
      </span>
    </li>
  );
}

export function ApplicabilityResult({
  jurisdictions,
  answers,
  screeningInNewTab = false,
  screeningBelow = false,
}: {
  jurisdictions: readonly JurisdictionId[];
  answers: ApplicabilityAnswers;
  /** Open the screening link in a new tab (the quick start keeps its place). */
  screeningInNewTab?: boolean;
  /** The California screening is further down the same page (Settings): the lines say "below". */
  screeningBelow?: boolean;
}) {
  const t = useTranslations("applicability");
  // The obligations step is "done" once the screening has an answer; until
  // then the laws it gates say where to answer it.
  const pathSteps = useProgramPath();
  const screeningLink =
    pathSteps?.obligations === "done"
      ? null
      : screeningBelow
        ? { href: `#${SCREENING_ANCHOR}`, newTab: false }
        : { href: `/governance/settings#${SCREENING_ANCHOR}`, newTab: screeningInNewTab };
  const items = evaluateApplicability(jurisdictions, answers);
  const applies = items.filter((i) => i.state === "applies");
  const check = items.filter((i) => i.state === "check");

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ListChecks className="size-4 text-primary" aria-hidden="true" />
          {t("appliesTitle")}
        </h3>
        {applies.length > 0 ? (
          <ul className="space-y-2.5">
            {applies.map((item) => (
              <ItemLine key={item.id} item={item} screeningLink={screeningLink} screeningBelow={screeningBelow} />
            ))}
          </ul>
        ) : (
          <Instruction>{t("appliesEmpty")}</Instruction>
        )}
      </div>
      {check.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("checkTitle")}</h3>
          <ul className="space-y-2.5">
            {check.map((item) => (
              <ItemLine key={item.id} item={item} screeningLink={screeningLink} screeningBelow={screeningBelow} />
            ))}
          </ul>
        </div>
      )}
      {jurisdictions.length === 0 && (
        <Instruction>{t("noJurisdictions")}</Instruction>
      )}
      <p className="text-xs text-muted-foreground border-t border-border pt-3">{t("editableNote")}</p>
    </div>
  );
}

/** Settings: the same questions, editable at any time, and the result. */
export function ApplicabilityCard({
  organizationId,
  canWrite,
  showResult = true,
  idPrefix = "applicability-settings",
}: {
  organizationId: string;
  canWrite: boolean;
  /** False on step 1.2's page, which shows the result in its own panel. */
  showResult?: boolean;
  /** Keeps radio names apart when the card appears on another page. */
  idPrefix?: string;
}) {
  const t = useTranslations("applicability");
  const utils = trpc.useUtils();
  const { data } = trpc.regimes.getApplicability.useQuery({ organizationId });
  // The jurisdictions from the organisation itself, so a change saved in the
  // jurisdiction card above shows here at once.
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });
  const [edits, setEdits] = useState<ApplicabilityAnswers | null>(null);

  // Each answer saves as it is chosen. The edits stay as an overlay after
  // saving (the server then holds the same answers), so an answer picked
  // while the previous one is on its way is never shown undone.
  const save = trpc.regimes.setApplicability.useMutation({
    onSuccess: () => {
      void utils.regimes.getApplicability.invalidate();
      void utils.programPath.status.invalidate();
    },
  });
  const autosave = useAutoSave<ApplicabilityAnswers>(
    (answers) => save.mutateAsync({ organizationId, answers }),
    { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) },
  );

  if (!data) return null;
  const answers = edits ?? data.answers;

  return (
    <Card>
      <CardHeader className={CARD_HEADER_WITH_STATUS}>
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" aria-hidden="true" />
          {t("cardTitle")}
        </CardTitle>
        {canWrite && (
          <CardSaveStatus status={autosave.status} onRetry={autosave.retry} testId="applicability-save-status" />
        )}
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ApplicabilityQuestions
          answers={answers}
          onChange={(next) => {
            setEdits(next);
            autosave.push(next);
          }}
          disabled={!canWrite}
          idPrefix={idPrefix}
        />
        {showResult && (
          <div className="rounded-lg border border-border p-4">
            <ApplicabilityResult
              jurisdictions={
                (org?.operatingJurisdictions as JurisdictionId[] | undefined) ?? data.jurisdictions
              }
              answers={answers}
              screeningBelow
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
