"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The Guided dashboard: the program at one glance (the clarity work carried
 * from DPO Central, owner's decision d10, 9 October 2026). Subtract before
 * adding: what it shows replaces the next-step card, the expert banner (it
 * stays in Settings), the deadline strip (now a line among the deadlines),
 * the two list cards, the six counters and the five summary cards, and the
 * Recent activity card (folded into "Next three actions").
 *
 * From the top: the first-run card (until "Got it"), the one program figure,
 * the six areas with their state word and next action, the documents you can
 * produce today (with the program pack), the next three actions (with the
 * way to Needs action), the deadlines at risk, and what is missing.
 *
 * Every reading comes from src/lib/programme-overview.ts over the document
 * register (src/config/document-register.ts) and the path, the same readings
 * the Guided menu and All clients make, so they cannot disagree. It is the
 * only dashboard since the Classic layout was retired (9 October 2026).
 */

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Download, FileText, ListChecks, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_CHIP } from "@/components/ui/status-note";
import type { StatusKey } from "@/config/status-palette";
import { FirstRunCard } from "@/components/help/first-run-card";
import { PageHeader } from "@/components/governance/page-header";
import { LicenceNote, useShowcaseLocks } from "@/components/governance/premium-deliverable";
import { useExportDownload } from "@/components/governance/use-export-download";
import { useOrganization } from "@/lib/organization-context";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import { needsActionTotal } from "@/lib/needs-action";
import { packCounts } from "@/lib/document-pack";
import {
  nextActions,
  panelRows,
  planMilestone,
  programmeAreas,
  type Area,
  type NextAction,
  type RegisterRow,
} from "@/lib/programme-overview";
import { INPUTS, type DocumentState } from "@/config/document-register";
import { AI_SENTINEL_PATH, PLAN_WINDOWS, type PathCounts } from "./path-config";
import { isCounted, isShown, type PathStatuses, type StageWord } from "./path";
import { ProgramFigureCard } from "./program-figure";
import { planSummaryText } from "./plan-text";
import { usePlanState, useProgramPathQuery } from "./use-program-path";
import { useProgrammeOverview, type ProgrammeOverview } from "./use-programme-overview";
import { documentName, documentStateText, gapsText } from "./document-words";

const DOC_TONE: Record<DocumentState, StatusKey | null> = {
  ready: "good",
  draft: "note",
  needsInput: "warning",
  notYet: null,
};

export const WORD_TONE: Record<StageWord, StatusKey | null> = {
  done: "good",
  toConfirm: "warning",
  started: "note",
  todo: null,
  action: "danger",
  coming: null,
};

/** A word in a chip: a status hue when it has one, a plain outline when it has none. */
export function Chip({
  tone,
  children,
  testId,
}: {
  tone: StatusKey | null;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs",
        tone ? STATUS_CHIP[tone] : "border border-border text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function GuidedDashboard() {
  const td = useTranslations("dashboard");
  const { organization } = useOrganization();
  const { steps: statuses } = useProgramPathQuery();
  const { overview: ready, limited } = useProgrammeOverview();

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="guided-dashboard">
      <PageHeader title={organization?.name || "AI Governance"} description={td("subtitle")} />

      {organization && <FirstRunCard />}

      {/* The organisation's own figures: not for a member limited to departments. */}
      {limited ? (
        <LimitedCard />
      ) : (
        <>
          <ProgramFigureCard />
          <AreasCard statuses={statuses} overview={ready} />
          <DocumentsPanel overview={ready} />
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <NextActionsCard statuses={statuses} overview={ready} />
            <DeadlinesCard overview={ready} />
          </div>
          <MissingCard statuses={statuses} overview={ready} />
        </>
      )}
    </div>
  );
}

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The six areas
// ---------------------------------------------------------------------------

function areaHref(area: Area<PathCounts>): string | null {
  const { action, stage } = area;
  if (action.kind === "needsAction") return action.item.href;
  if (action.kind === "confirm") return "/governance/review";
  if (action.kind === "step") return action.step.href;
  if (action.kind === "done") return stage.steps.find((s) => s.href && !s.coming)?.href ?? null;
  return null;
}

function AreasCard({ statuses, overview }: { statuses: PathStatuses | null; overview: ProgrammeOverview | null }) {
  const t = useTranslations("guided");
  const tv = useTranslations("views");
  const plan = usePlanState();
  const areas = statuses && overview ? programmeAreas(AI_SENTINEL_PATH, statuses, overview.needsAction) : null;

  return (
    <Card data-testid="area-tiles" aria-busy={!areas}>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <CardTitle className="text-base sm:text-lg">{t("areas.title")}</CardTitle>
          {plan && plan.kind !== "notStarted" && (
            <p className="text-xs text-muted-foreground tabular-nums">
              <span className="sr-only">{t("plan.label")}: </span>
              {planSummaryText(plan, t)}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {!areas ? (
          <CardSkeleton rows={2} />
        ) : (
          <ul className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {areas.map((area) => {
              const href = areaHref(area);
              const actionText =
                area.action.kind === "needsAction"
                  ? tv(`needsAction.kind.${area.action.item.kind}`)
                  : area.action.kind === "step"
                    ? t("areas.step", { step: t(`steps.${area.action.step.id}.label`) })
                    : t(`areas.${area.action.kind}`);
              const body = (
                <>
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 font-medium text-sm break-words">
                      <span className="tabular-nums text-muted-foreground mr-1.5">{area.number}</span>
                      {t(`stages.${area.stage.id}`)}
                    </span>
                    <Chip tone={WORD_TONE[area.word]}>{t(`stageState.${area.word}`)}</Chip>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="min-w-0 break-words">{actionText}</span>
                    {href && <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />}
                  </span>
                </>
              );
              return (
                <li key={area.stage.id} data-testid={`area-${area.stage.id}`} data-word={area.word}>
                  {href ? (
                    <Link
                      href={href}
                      className="flex h-full flex-col rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-secondary/40 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex h-full flex-col rounded-lg border border-dashed border-border p-3">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Documents you can produce today
// ---------------------------------------------------------------------------

function DocumentsPanel({ overview }: { overview: ProgrammeOverview | null }) {
  const t = useTranslations("documentRegister");
  const { organization } = useOrganization();
  const rows = overview ? panelRows(overview.documents) : null;

  return (
    <Card data-testid="documents-panel" aria-busy={!rows}>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 flex flex-col md:flex-row md:items-start md:justify-between gap-3 space-y-0">
        <div className="min-w-0 flex flex-col gap-1.5">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="size-4 text-primary shrink-0" aria-hidden="true" />
            {t("title")}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t("subtitle")}</CardDescription>
        </div>
        {overview && organization && <PackDownload overview={overview} organizationId={organization.id} />}
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {!rows ? (
          <CardSkeleton rows={4} />
        ) : (
          <>
            {organization && (
              <LicenceNote
                organizationId={organization.id}
                features={["program-pack", "program-report", "impact-assessment-document"]}
              />
            )}
            <ul className="divide-y divide-border">
              {rows.produced.map((row) => (
                <DocumentRow key={row.entry.id} row={row} />
              ))}
              {rows.notYet.length > 0 && (
                <li className="py-3 text-sm text-muted-foreground" data-testid="doc-not-yet">
                  {t("notYetLine", { names: rows.notYet.map((r) => documentName(t, r.entry.id)).join(" · ") })}
                </li>
              )}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground" data-testid="documents-legend">
              {(["ready", "draft", "needsInput", "notYet"] as const).map((s, i) => (
                <span key={s}>
                  {i > 0 && " · "}
                  {t(`legend.${s}`)}
                </span>
              ))}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * "Download ready documents": the program pack (/api/export/program-pack),
 * holding every ready document with an index and an integrity manifest. With
 * "Include the drafts too" the drafts go in as well, marked DRAFT in their
 * file names, their gaps on their first page. Where the deployment keeps the
 * pack behind the licence, the button keeps its place with a lock and the
 * panel says once what unlocks it.
 */
function PackDownload({ overview, organizationId }: { overview: ProgrammeOverview; organizationId: string }) {
  const t = useTranslations("documentRegister");
  const locale = useLocale() === "es" ? "es" : "en";
  const { download, isPending } = useExportDownload();
  const { isLocked } = useShowcaseLocks(organizationId);
  const [withDrafts, setWithDrafts] = useState(false);
  const counts = packCounts(overview.documents);
  const count = counts.ready + (withDrafts ? counts.drafts : 0);
  const locked = isLocked("program-pack");
  const href = `/api/export/program-pack?organizationId=${encodeURIComponent(organizationId)}&locale=${locale}&drafts=${withDrafts ? "1" : "0"}`;
  const busy = isPending(href);

  return (
    <div className="flex flex-col gap-1.5 md:items-end shrink-0" data-testid="pack-download">
      <Button
        size="sm"
        className="gap-1.5 h-auto min-h-8 py-1 whitespace-normal self-start md:self-end"
        variant={locked ? "outline" : "default"}
        disabled={count === 0 || locked || busy}
        onClick={() => void download(href)}
        data-testid="pack-button"
      >
        {busy ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
        ) : locked ? (
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Download className="size-3.5 shrink-0" aria-hidden="true" />
        )}
        {t("pack.button")}
      </Button>
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <Checkbox
          checked={withDrafts}
          onCheckedChange={(v) => setWithDrafts(v === true)}
          disabled={counts.drafts === 0 || locked}
          data-testid="pack-drafts"
        />
        {t("pack.includeDrafts", { count: counts.drafts })}
      </label>
      <p className="text-xs text-muted-foreground tabular-nums" data-testid="pack-count">
        {count === 0 ? t("pack.none") : t("pack.count", { count })}
      </p>
    </div>
  );
}

function DocumentRow({ row }: { row: RegisterRow }) {
  const t = useTranslations("documentRegister");
  const { organization } = useOrganization();
  const { download, isPending } = useExportDownload();
  const { entry, doc } = row;
  const status = doc.status;
  const name = documentName(t, entry.id);
  const detail =
    status.state === "draft"
      ? gapsText(t, status.gaps)
      : status.state === "needsInput"
        ? documentStateText(t, status)
        : status.state === "ready"
          ? t("readyLine")
          : "";
  const producible = status.state === "ready" || status.state === "draft";
  const orgId = organization?.id ?? "";
  const downloads = Object.entries(entry.downloads ?? {}) as ["pdf" | "csv", string][];

  let actions: React.ReactNode = null;
  if (status.state === "needsInput") {
    const label = t.has(`inputAction.${status.input}`) ? t(`inputAction.${status.input}`) : t("inputAction.default");
    actions = (
      <Link href={INPUTS[status.input].href} data-testid={`doc-input-${entry.id}`}>
        <Button size="sm" variant="outline" className="h-auto min-h-8 py-1 whitespace-normal">
          {label}
        </Button>
      </Link>
    );
  } else if (producible && downloads.length > 0 && orgId) {
    actions = (
      <span className="flex flex-wrap gap-1.5">
        {downloads.map(([format, base]) => {
          const href = `${base}?organizationId=${encodeURIComponent(orgId)}`;
          return (
            <Button
              key={format}
              size="sm"
              variant="outline"
              className="gap-1.5 h-8"
              disabled={isPending(href)}
              onClick={() => void download(href)}
              aria-label={t("downloadLabel", { name, format: t(`format.${format}`) })}
              data-testid={`doc-download-${entry.id}-${format}`}
            >
              <Download className="size-3.5" aria-hidden="true" />
              {t(`format.${format}`)}
            </Button>
          );
        })}
      </span>
    );
  } else if (producible && entry.href) {
    actions = (
      <Link href={entry.href} data-testid={`doc-open-${entry.id}`}>
        <Button size="sm" variant="outline" className="h-8">
          {t("open")}
        </Button>
      </Link>
    );
  }

  return (
    <li
      className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
      data-testid={`doc-${entry.id}`}
      data-state={status.state}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words">
          {entry.href ? (
            <Link href={entry.href} className="hover:underline underline-offset-4">
              {name}
            </Link>
          ) : (
            name
          )}
        </p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5 break-words">{detail}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Chip tone={DOC_TONE[status.state]} testId={`doc-state-${entry.id}`}>
          {status.state === "needsInput" ? t("state.needsInput") : documentStateText(t, status)}
        </Chip>
        {actions}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Next three actions
// ---------------------------------------------------------------------------

function NextActionsCard({ statuses, overview }: { statuses: PathStatuses | null; overview: ProgrammeOverview | null }) {
  const t = useTranslations("guided");
  const tv = useTranslations("views");
  const actions = statuses && overview ? nextActions(AI_SENTINEL_PATH, statuses, overview.needsAction) : null;
  const waiting = overview ? needsActionTotal(overview.needsAction) : 0;

  return (
    <Card data-testid="next-actions" aria-busy={!actions}>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">{t("nextActions.title")}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 flex flex-col gap-3">
        {!actions ? (
          <CardSkeleton rows={3} />
        ) : actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("nextActions.empty")}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {actions.map((action, index) => (
              <NextActionRow key={actionKey(action)} action={action} index={index} t={t} tv={tv} />
            ))}
          </ol>
        )}
        {waiting > 0 && (
          <Link
            href="/governance/needs-action"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
            data-testid="next-actions-needs-action"
          >
            <ListChecks className="size-4 shrink-0" aria-hidden="true" />
            {t("nextActions.allNeedsAction", { count: waiting })}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function actionKey(action: NextAction): string {
  return action.kind === "needsAction" ? `n-${action.item.kind}` : `s-${action.step.id}`;
}

type T = ReturnType<typeof useTranslations>;

/** Where a next action leads: the waiting list, the review queue, or the step's page. */
export function nextActionHref(action: NextAction): string {
  return action.kind === "needsAction" ? action.item.href : action.toConfirm ? "/governance/review" : action.step.href!;
}

function NextActionRow({ action, index, t, tv }: { action: NextAction; index: number; t: T; tv: T }) {
  const title =
    action.kind === "needsAction"
      ? `${tv(`needsAction.kind.${action.item.kind}`)} (${action.item.count})`
      : t(`steps.${action.step.id}.label`);
  const hint =
    action.kind === "needsAction"
      ? tv(`needsAction.hint.${action.item.kind}`)
      : action.toConfirm
        ? t("nextActions.toConfirm")
        : t(`steps.${action.step.id}.why`);
  const button =
    action.kind === "needsAction"
      ? action.item.kind === "review-queue"
        ? t("nextActions.review")
        : t("nextActions.open")
      : action.toConfirm
        ? t("nextActions.review")
        : t("nextActions.continue");
  return (
    <li className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3" data-testid="next-action">
      <span className="hidden sm:flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words">
          <span className="sm:hidden tabular-nums">{index + 1}. </span>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 break-words">{hint}</p>
      </div>
      <Link href={nextActionHref(action)} className="shrink-0">
        <Button size="sm" variant="outline" className="w-full sm:w-auto gap-1.5 h-8">
          {button}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Deadlines at risk
// ---------------------------------------------------------------------------

export function formatDeadlineDate(at: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(at);
}

function DeadlinesCard({ overview }: { overview: ProgrammeOverview | null }) {
  const t = useTranslations("guided");
  const locale = useLocale();
  const { planStart } = useProgramPathQuery();
  const plan = usePlanState();
  // Read after mount: until then a date is shown without "overdue".
  const now = useNow()?.getTime() ?? null;

  // The plan's next milestone (day 30, 60 or 90), while the plan runs.
  const milestone = planMilestone(PLAN_WINDOWS, planStart, plan);

  return (
    <Card data-testid="deadlines" aria-busy={!overview}>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">{t("deadlines.title")}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {!overview ? (
          <CardSkeleton rows={2} />
        ) : overview.deadlines.length === 0 && !milestone ? (
          <p className="text-sm text-muted-foreground">{t("deadlines.empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.deadlines.map((d) => {
              const at = new Date(d.at);
              const overdue = now !== null && at.getTime() < now;
              const when = formatDeadlineDate(at, locale);
              return (
                <li key={`${d.kind}-${d.href}-${d.at}`} data-testid="deadline">
                  <Link
                    href={d.href}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 py-2.5 hover:bg-secondary/40 rounded-md -mx-2 px-2"
                  >
                    <span className="text-sm min-w-0 break-words">{t(`deadlines.${d.kind}`, { label: d.label })}</span>
                    <span
                      className={cn(
                        "text-xs tabular-nums shrink-0",
                        overdue ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {overdue ? t("deadlines.overdue", { date: when }) : when}
                    </span>
                  </Link>
                </li>
              );
            })}
            {milestone && (
              <li
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 py-2.5"
                data-testid="deadline-plan"
              >
                <span className="text-sm">{t("deadlines.plan", { day: milestone.day })}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDeadlineDate(milestone.at, locale)}
                </span>
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// What is missing
// ---------------------------------------------------------------------------

function MissingCard({ statuses, overview }: { statuses: PathStatuses | null; overview: ProgrammeOverview | null }) {
  const t = useTranslations("guided");
  const td = useTranslations("documentRegister");
  if (!statuses || !overview) return null;
  const notStarted = AI_SENTINEL_PATH.stages.flatMap((stage) =>
    stage.steps.filter((s) => isCounted(s) && isShown(s, statuses) && statuses[s.id] === "todo"),
  );
  const notYet = panelRows(overview.documents).notYet;
  return (
    <Card data-testid="missing">
      <CardContent className="p-4 sm:p-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{td("missing.title")}</p>
        {notStarted.length === 0 && notYet.length === 0 ? (
          <p className="text-sm text-muted-foreground">{td("missing.none")}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {notStarted.length > 0 &&
              td("missing.notStarted", { steps: notStarted.map((s) => t(`steps.${s.id}.label`)).join(", ") })}
            {notStarted.length > 0 && notYet.length > 0 && " "}
            {notYet.length > 0 &&
              td("missing.notYet", { names: notYet.map((r) => documentName(td, r.entry.id)).join(", ") })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// A member limited to departments
// ---------------------------------------------------------------------------

function LimitedCard() {
  const tv = useTranslations("views");
  return (
    <Card>
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{tv("needsAction.title")}</p>
          <p className="text-sm text-muted-foreground">{tv("needsAction.subtitle")}</p>
        </div>
        <Link href="/governance/needs-action" className="shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5">
            <ListChecks className="size-4" aria-hidden="true" />
            {tv("needsAction.title")}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
