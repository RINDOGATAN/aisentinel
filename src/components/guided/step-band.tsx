"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Guided only, top of every page reached from the path: a band that says
 * what to do here, in one sentence ("Step 3.2 · Register each AI system..."),
 * the step's rule in one plain line ("Done when: ..."), and a tick list of
 * what the rule needs (path.ts, StepCheck). On its right "Next step →" to the
 * following step once this one is done. While it is not, the band says what
 * is left ("Left here: approve an acceptable-use policy") and offers "Finish
 * this step" first and "Continue anyway" second, so moving on never hides
 * that the step is unfinished.
 *
 * The first time a stage is seen done, the band says so instead, once and
 * quietly ("Stage 3 complete. Next: Classify and assess."). No sound, no
 * confetti; the fade is skipped when reduced motion is asked for.
 *
 * Mounted by the Guided layout with a key per address, so the message lasts
 * for the page on which it was shown.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, Circle } from "lucide-react";
import { useOrganization } from "@/lib/organization-context";
import { AI_SENTINEL_PATH } from "./path-config";
import { stageToCelebrate, stepAndFollowing, type PathStatuses, type StepCheck } from "./path";
import { useProgramPathQuery } from "./use-program-path";
import { stepText } from "./step-why";

const SEEN_KEY = "ais_stages_done";

function readSeen(key: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(key: string, ids: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Private browsing or a full store: the message may show again. Harmless.
  }
}

export function StepBand({
  stepId,
  statuses,
}: {
  stepId: string | null;
  statuses: PathStatuses | null;
}) {
  const t = useTranslations("guided");
  const { organization } = useOrganization();
  const { checks: allChecks, disclosureLaws } = useProgramPathQuery();
  const locale = useLocale();
  const pathname = usePathname();
  const place = stepAndFollowing(AI_SENTINEL_PATH, stepId, statuses);
  const orgId = organization?.id;
  const storageKey = orgId ? `${SEEN_KEY}:${orgId}` : null;

  // What was already known to be done when this page opened. Read once: the
  // band is mounted afresh for each address (and organisation), so a message
  // stays for the page on which it appeared even after it is remembered.
  // Undefined on the server and while the organisation is not yet known.
  const [seen] = useState<string[] | null | undefined>(() =>
    storageKey && typeof window !== "undefined" ? readSeen(storageKey) : undefined,
  );
  const result =
    place && statuses && seen !== undefined
      ? stageToCelebrate(AI_SENTINEL_PATH, statuses, seen)
      : null;
  const celebrate = result?.celebrate ?? null;
  const remember = result ? result.remember.join(",") : null;

  useEffect(() => {
    if (storageKey && remember !== null) {
      writeSeen(storageKey, remember ? remember.split(",") : []);
    }
  }, [storageKey, remember]);

  if (!place) return null;
  const { current, following } = place;
  const stages = AI_SENTINEL_PATH.stages;
  const status = statuses?.[current.step.id];
  const checks = allChecks?.[current.step.id] ?? [];
  const open = checks.filter((c) => !c.met);
  // Not done, and the rule says what is left: say so, and offer to finish
  // this step before moving on. Optional steps (a proceeding, the audit
  // trail) are never "unfinished".
  const unfinished =
    celebrate === null && !!statuses && status !== "done" && !current.step.optional && open.length > 0;
  const label = (c: StepCheck) =>
    c.total !== undefined
      ? t("checks.progress", { label: t(`checks.${c.id}`), done: c.done ?? 0, total: c.total })
      : t(`checks.${c.id}`);
  const finishHref = open[0]?.href ?? current.step.href ?? "/governance";
  // "Finish this step" only where it leads somewhere: not to the page the
  // person is already on.
  const finishElsewhere = finishHref.includes("#") || finishHref.split("?")[0] !== pathname;
  const continueHref = following?.step.href ?? "/governance";
  const continueLabel = following?.step.href ? t("band.continueAnyway") : t("band.finish");

  return (
    <div
      className="mb-4 sm:mb-6 flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
      role="status"
      data-testid="step-band"
      data-unfinished={unfinished ? "true" : undefined}
    >
      <div className="flex min-h-9 items-center gap-3">
        {celebrate !== null ? (
          <p className="flex min-w-0 flex-1 items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              {celebrate + 1 < stages.length
                ? t("band.stageDone", {
                    number: celebrate + 1,
                    next: t(`stages.${stages[celebrate + 1].id}`),
                  })
                : t("band.lastStageDone", { number: celebrate + 1 })}
            </span>
          </p>
        ) : (
          <p className="min-w-0 flex-1">
            <span className="font-semibold text-primary tabular-nums">
              {current.number ? t("band.step", { number: current.number }) : t("band.beforeSteps")}
            </span>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">: </span>
            {stepText(t, current.step.id, "do", disclosureLaws, locale)}
          </p>
        )}
        {!unfinished &&
          (following?.step.href ? (
            <Link
              href={following.step.href}
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 font-medium text-primary hover:bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={t(`steps.${following.step.id}.label`)}
            >
              {t("band.next")}
              <ArrowRight className="size-4" aria-hidden="true" />
              <span className="sr-only">: {t(`steps.${following.step.id}.label`)}</span>
            </Link>
          ) : (
            <Link
              href="/governance"
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 font-medium text-primary hover:bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("band.finish")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ))}
      </div>

      {/* The step's rule in one plain line, then what is met and what is left.
          An optional step has no tick list, but still says what completes it
          and that it never counts toward the program figure. */}
      {celebrate === null && (checks.length > 0 || current.step.optional) && (
        <>
          <p className="text-xs text-muted-foreground" data-testid="step-band-rule">
            {t("band.doneWhen", { rule: t(`steps.${current.step.id}.doneWhen`) })}
          </p>
          {current.step.optional && (
            <p className="text-xs text-muted-foreground" data-testid="step-band-optional">
              {t(`band.optional.${current.step.id}`)}
            </p>
          )}
          {status !== "done" && checks.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label={t("band.checksLabel")}>
              {checks.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5" data-met={c.met ? "true" : "false"}>
                  {c.met ? (
                    <Check className="size-3.5 shrink-0 text-primary" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className={c.met ? "text-foreground" : "text-muted-foreground"}>
                    {sentence(label(c))}
                  </span>
                  <span className="sr-only">: {c.met ? t("band.checkMet") : t("band.checkOpen")}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {unfinished && (
        <div className="flex flex-col gap-2 border-t border-primary/20 pt-2 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 font-medium" data-testid="step-band-left">
            {t("band.leftHere", { items: open.map(label).join("; ") })}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {finishElsewhere && (
            <Link
              href={finishHref}
              className="inline-flex min-h-9 items-center rounded-md bg-primary px-3 font-medium text-primary-foreground hover:bg-primary/90 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("band.finishStep")}
            </Link>
            )}
            <Link
              href={continueHref}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-muted-foreground hover:bg-primary/10 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={following ? t(`steps.${following.step.id}.label`) : undefined}
            >
              {continueLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
              {following && <span className="sr-only">: {t(`steps.${following.step.id}.label`)}</span>}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** "approve a policy" as a list item: "Approve a policy". */
function sentence(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
