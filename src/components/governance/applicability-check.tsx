"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The applicability check (src/config/applicability.ts) on screen.
 *
 * - `ApplicabilityQuestions`: the plain questions, three answers each ("Yes",
 *   "No", "Not sure yet"), only those that matter for the declared places, and
 *   the frameworks the organisation chooses to shape its program. Controlled: the caller
 *   keeps the answers and saves them (the quick start on its way past, the
 *   settings card as each answer is chosen).
 * - `ApplicabilityResult`: "These apply to you", one line each with its why,
 *   then "Worth checking" for what may apply.
 * - `ApplicabilityCard`: both, for Settings, where the answers stay editable.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, CircleHelp, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CARD_HEADER_WITH_STATUS, CardSaveStatus } from "@/components/ui/save-status";
import { Instruction } from "@/components/ui/instruction";
import { useAutoSave } from "@/lib/use-auto-save";
import { trpc } from "@/lib/trpc";
import { refreshAfterScopeChange } from "@/lib/scope-refresh";
import { SCREENING_ANCHOR } from "@/lib/settings-anchors";
import { useProgramPath } from "@/components/guided/use-program-path";
import { cn } from "@/lib/utils";
import {
  CHOOSABLE_FRAMEWORKS,
  LEGAL_FRAMEWORKS,
  ROLE_QUESTIONS,
  STANDARD_FRAMEWORKS,
  applicabilityQuestionsFor,
  evaluateApplicability,
  frameworkHint,
  likelyLegalNotChosen,
  type ChoosableFramework,
  type ApplicabilityAnswer,
  type ApplicabilityAnswers,
  type ApplicabilityItem,
  type ApplicabilityQuestion,
} from "@/config/applicability";
import type { JurisdictionId } from "@/config/jurisdictions";
import { euAiActRuleOutReason } from "@/config/framework-scope";

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

/**
 * "Choose your frameworks": one box per framework, legal and standard-based
 * alike, none ticked for a new organisation. A plain hint says when the
 * declared places or the answers point to one; nothing is ticked for the
 * organisation. A legal framework pointed to and not chosen gets one neutral
 * line: it may apply by law, and counsel can confirm.
 */
export function FrameworksQuestion({
  answers,
  jurisdictions,
  frameworks,
  onChange,
  disabled,
  idPrefix,
}: {
  answers: ApplicabilityAnswers;
  jurisdictions: readonly string[];
  frameworks: readonly ChoosableFramework[];
  onChange: (next: ChoosableFramework[]) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const t = useTranslations("applicability");
  const name = `${idPrefix}-frameworks`;
  const toggle = (code: ChoosableFramework, on: boolean) =>
    onChange(CHOOSABLE_FRAMEWORKS.filter((c) => (c === code ? on : frameworks.includes(c))));
  const likely = likelyLegalNotChosen(frameworks, jurisdictions, answers);
  const euReason = euAiActRuleOutReason(jurisdictions, answers);
  const group = (codes: readonly ChoosableFramework[], title: string) => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {codes.map((code) => {
        const id = `${name}-${code}`;
        const checked = frameworks.includes(code);
        const hint = frameworkHint(code, jurisdictions, answers);
        const ruledOut = checked && code === "EU_AI_ACT" && euReason;
        return (
          <div key={code} className="flex items-start gap-2.5">
            <Checkbox
              id={id}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(v) => toggle(code, v === true)}
              className="mt-0.5"
              aria-describedby={`${id}-note`}
            />
            <label htmlFor={id} className="min-w-0 cursor-pointer">
              <span className="block text-sm">{t(`frameworks.options.${code}.label`)}</span>
              <span className="block text-xs text-muted-foreground" id={`${id}-note`}>
                {ruledOut
                  ? t(`frameworks.ruledOut.${euReason}`)
                  : hint
                    ? t(`frameworks.options.${code}.hint`)
                    : t(`frameworks.options.${code}.note`)}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
  return (
    <fieldset id="frameworks" className="space-y-3 scroll-mt-24" disabled={disabled} data-testid="frameworks-question">
      <legend className="text-sm font-medium">{t("frameworks.label")}</legend>
      <p className="text-xs text-muted-foreground" id={`${name}-hint`}>
        {t("frameworks.hint")}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-describedby={`${name}-hint`}>
        {group(LEGAL_FRAMEWORKS, t("frameworks.legalTitle"))}
        {group(STANDARD_FRAMEWORKS, t("frameworks.standardTitle"))}
      </div>
      {frameworks.length === 0 && (
        <p className="text-xs text-primary" role="status">
          {t("frameworks.required")}
        </p>
      )}
      {likely.length > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="frameworks-may-apply">
          {t("frameworks.mayApply", {
            names: likely.map((code) => t(`frameworks.options.${code}.label`)).join(", "),
          })}
        </p>
      )}
    </fieldset>
  );
}

export function ApplicabilityQuestions({
  answers,
  onChange,
  disabled,
  idPrefix = "applicability",
  jurisdictions = [],
  frameworks,
  onFrameworksChange,
}: {
  answers: ApplicabilityAnswers;
  onChange: (next: ApplicabilityAnswers) => void;
  disabled?: boolean;
  /** Keeps radio names apart when the questions appear twice on a page. */
  idPrefix?: string;
  /**
   * The declared places: a question that matters only for places not
   * declared is not asked. Empty (not declared yet) asks every question.
   */
  jurisdictions?: readonly string[];
  /** The frameworks chosen; with `onFrameworksChange`, the frameworks question is shown. */
  frameworks?: readonly ChoosableFramework[];
  onFrameworksChange?: (next: ChoosableFramework[]) => void;
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
  const asked = applicabilityQuestionsFor(jurisdictions);
  const roles = ROLE_QUESTIONS.filter((q) => asked.includes(q));
  const others = asked.filter((q) => !ROLE_QUESTIONS.includes(q));
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <p className="text-sm font-medium">{t("roleTitle")}</p>
        {roles.map((q) => (
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
      {frameworks && onFrameworksChange && (
        <div className="border-t border-border pt-4">
          <FrameworksQuestion
            answers={answers}
            jurisdictions={jurisdictions}
            frameworks={frameworks}
            onChange={onFrameworksChange}
            disabled={disabled}
            idPrefix={idPrefix}
          />
        </div>
      )}
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
  frameworks = null,
  screeningInNewTab = false,
  screeningBelow = false,
}: {
  jurisdictions: readonly JurisdictionId[];
  answers: ApplicabilityAnswers;
  /** The frameworks chosen: one not chosen is not listed. Null lists what the answers point to. */
  frameworks?: readonly string[] | null;
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
  const items = evaluateApplicability(jurisdictions, answers, frameworks);
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
  const [frameworkEdits, setFrameworkEdits] = useState<ChoosableFramework[] | null>(null);

  // Each answer saves as it is chosen. The edits stay as an overlay after
  // saving (the server then holds the same answers), so an answer picked
  // while the previous one is on its way is never shown undone.
  const save = trpc.regimes.setApplicability.useMutation({
    onSuccess: () => refreshAfterScopeChange(utils),
  });
  const autosave = useAutoSave<{ answers: ApplicabilityAnswers; frameworks: ChoosableFramework[] }>(
    (next) => save.mutateAsync({ organizationId, answers: next.answers, frameworks: next.frameworks }),
    { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) },
  );

  if (!data) return null;
  const answers = edits ?? data.answers;
  const frameworks = frameworkEdits ?? data.frameworks;
  const jurisdictions =
    (org?.operatingJurisdictions as JurisdictionId[] | undefined) ?? data.jurisdictions;

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
            autosave.push({ answers: next, frameworks });
          }}
          frameworks={frameworks}
          onFrameworksChange={(next) => {
            setFrameworkEdits(next);
            autosave.push({ answers, frameworks: next });
          }}
          jurisdictions={jurisdictions}
          disabled={!canWrite}
          idPrefix={idPrefix}
        />
        {showResult && (
          <div className="rounded-lg border border-border p-4">
            <ApplicabilityResult
              jurisdictions={jurisdictions}
              answers={answers}
              frameworks={frameworks}
              screeningBelow
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The frameworks question on its own, for the path's first step: the answers
 * stay as they are and only the choice is saved, as each box is ticked.
 */
export function FrameworksCard({ organizationId, canWrite }: { organizationId: string; canWrite: boolean }) {
  const t = useTranslations("applicability");
  const utils = trpc.useUtils();
  const { data } = trpc.regimes.getApplicability.useQuery({ organizationId });
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });
  const [edits, setEdits] = useState<ChoosableFramework[] | null>(null);
  const save = trpc.regimes.setApplicability.useMutation({
    onSuccess: () => refreshAfterScopeChange(utils),
  });
  const autosave = useAutoSave<{ answers: ApplicabilityAnswers; frameworks: ChoosableFramework[] }>(
    (next) => save.mutateAsync({ organizationId, answers: next.answers, frameworks: next.frameworks }),
    { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) },
  );
  if (!data) return null;
  const jurisdictions = (org?.operatingJurisdictions as JurisdictionId[] | undefined) ?? data.jurisdictions;
  return (
    <Card>
      <CardHeader className={CARD_HEADER_WITH_STATUS}>
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" aria-hidden="true" />
          {t("frameworks.label")}
        </CardTitle>
        {canWrite && (
          <CardSaveStatus status={autosave.status} onRetry={autosave.retry} testId="frameworks-save-status" />
        )}
      </CardHeader>
      <CardContent>
        <FrameworksQuestion
          answers={data.answers}
          jurisdictions={jurisdictions}
          frameworks={edits ?? data.frameworks}
          onChange={(next) => {
            setEdits(next);
            autosave.push({ answers: data.answers, frameworks: next });
          }}
          disabled={!canWrite}
          idPrefix="frameworks-step"
        />
      </CardContent>
    </Card>
  );
}
