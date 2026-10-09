"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "All clients": the consultant's firm view (the clarity work carried from
 * DPO Central, owner's decision d10, 9 October 2026). One row per
 * organisation the person belongs to:
 *
 *   client | confirmed figure | the six areas in words | documents ready |
 *   next deadline | next action
 *
 * sorted by the nearest deadline (the soonest or most overdue first; clients
 * with no deadline after them, by name). On a phone the table becomes one
 * card per client with the same fields. Reached from "All clients" in the
 * Guided menu.
 *
 * Every reading is the client's own dashboard's: the figure from the path
 * (`figureFor`), the areas and the next action from
 * src/lib/programme-overview.ts, the documents from the register, the
 * deadlines from the same server query (programPath.portfolio), so a row
 * never disagrees with the client's dashboard. "Add a client" sits beside the
 * title; "Copy into a new client" stays on each row's menu.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Copy, Loader2, MoreHorizontal, Plus } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import { PageHeader } from "@/components/governance/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddOrganizationDialog } from "@/components/governance/add-organization-dialog";
import { CopyFromClientDialog } from "@/components/governance/copy-from-client-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canUseForTemplate } from "@/config/client-template";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server/routers";
import { useOrganization } from "@/lib/organization-context";
import { PORTFOLIO_HREF } from "@/lib/account-mode";
import { cn } from "@/lib/utils";
import { AI_SENTINEL_PATH, PLAN_WINDOWS, type PathCounts } from "@/components/guided/path-config";
import { planState } from "@/components/guided/plan";
import type { PathStatuses } from "@/components/guided/path";
import { figureFor, ProgramFigureLine } from "@/components/guided/program-figure";
import { formatDeadlineDate, nextActionHref } from "@/components/guided/guided-dashboard";
import {
  documentsReady,
  nearestDeadline,
  nextActions,
  planMilestone,
  programmeAreas,
  sortByNearestDeadline,
  type Area,
  type ClientDeadline,
  type NextAction,
} from "@/lib/programme-overview";

type Client = inferRouterOutputs<AppRouter>["programPath"]["portfolio"][number];

interface Row {
  client: Client;
  name: string;
  /** The client could not be read: shown as unknown, the rest still load. */
  unknown: boolean;
  limited: boolean;
  statuses: PathStatuses | null;
  areas: Area<PathCounts>[];
  docs: { ready: number; total: number };
  deadline: ClientDeadline | null;
  action: NextAction | null;
}

/** One client's row, read the way its own dashboard reads it. */
function toRow(client: Client, now: Date): Row {
  const statuses = client.steps as PathStatuses | null;
  const open = !!statuses && !client.limited;
  const plan = statuses ? planState(AI_SENTINEL_PATH, PLAN_WINDOWS, statuses, client.planStart, now) : null;
  return {
    client,
    name: client.organizationName,
    unknown: !statuses,
    limited: client.limited,
    statuses,
    areas: open ? programmeAreas(AI_SENTINEL_PATH, statuses, client.needsAction) : [],
    docs: documentsReady(client.documents),
    deadline: open ? nearestDeadline(client.deadlines, planMilestone(PLAN_WINDOWS, client.planStart, plan)) : null,
    action: open ? (nextActions(AI_SENTINEL_PATH, statuses, client.needsAction, 1)[0] ?? null) : null,
  };
}

export default function PortfolioPage() {
  const t = useTranslations("guided.portfolio");
  const router = useRouter();
  const locale = useLocale();
  const contentLocale = locale === "es" ? "es" : "en";
  // The client chosen with "Copy into a new client" in a row's menu.
  const [copySource, setCopySource] = useState<{ id: string; name: string } | null>(null);
  const { setOrganization } = useOrganization();
  const { data: clients, isLoading } = trpc.programPath.portfolio.useQuery(
    { locale: contentLocale },
    { staleTime: 30_000 },
  );

  // "Add a client" opens the dialog here; the Guided menu's entry arrives
  // with ?add=1. After creation the dialog moves to the new client's quick start.
  // Derived from the address as well as the state, so the menu entry also
  // works while the page is already open.
  const searchParams = useSearchParams();
  const [addOpenState, setAddOpenState] = useState(false);
  const addOpen = addOpenState || searchParams.get("add") === "1";
  const setAddOpen = (next: boolean) => {
    setAddOpenState(next);
    if (!next && searchParams.get("add")) router.replace(PORTFOLIO_HREF);
  };

  const now = new Date();
  const rows = sortByNearestDeadline((clients ?? []).map((c) => toRow(c, now)), locale);
  const attentionCount = rows.filter((r) => r.areas.some((a) => a.word === "action")).length;

  const open = (client: Client, href = "/governance") => {
    setOrganization({ id: client.organizationId, name: client.organizationName, slug: client.organizationSlug });
    router.push(href);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("title")}
        description={
          <span data-testid="clients-summary">
            {t("count", { count: clients?.length ?? 0 })}
            {attentionCount > 0 && ` · ${t("needAttention", { count: attentionCount })}`}
          </span>
        }
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            {t("addClient")}
          </Button>
        }
      />

      <AddOrganizationDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => setAddOpenState(false)} />

      {copySource && (
        <CopyFromClientDialog
          open
          onOpenChange={(next) => !next && setCopySource(null)}
          mode={{ kind: "new", source: copySource }}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
            <p>{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Wide screens: the table. */}
          <Card className="hidden lg:block py-0">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm" data-testid="clients-table">
                <caption className="sr-only">{t("sortNote")}</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">{t("columns.client")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("columns.confirmed")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("columns.areas")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("columns.documents")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("columns.deadline")}</th>
                    <th scope="col" className="px-3 py-3 font-medium">{t("columns.action")}</th>
                    <th scope="col" className="w-10 px-2 py-3">
                      <span className="sr-only">{t("columns.menu")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr
                      key={row.client.organizationId}
                      className="align-top hover:bg-secondary/40"
                      data-testid="client-row"
                      data-client={row.name}
                      data-deadline={row.deadline?.at ?? ""}
                    >
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        <ClientName row={row} onOpen={() => open(row.client)} />
                      </th>
                      {row.unknown || row.limited ? (
                        <td colSpan={5} className="px-3 py-3 text-muted-foreground">
                          {row.unknown ? t("unknown") : t("limited")}
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-3 min-w-[8rem]">
                            <Confirmed row={row} />
                          </td>
                          <td className="px-3 py-3 min-w-[13rem]">
                            <AreasInWords row={row} />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap" data-testid="client-docs">
                            {t("docsReady", { ready: row.docs.ready, total: row.docs.total })}
                          </td>
                          <td className="px-3 py-3 min-w-[10rem]">
                            <DeadlineText deadline={row.deadline} now={now} onOpen={(href) => open(row.client, href)} />
                          </td>
                          <td className="px-3 py-3 min-w-[9rem]">
                            <ActionText row={row} onOpen={(href) => open(row.client, href)} />
                          </td>
                        </>
                      )}
                      <td className="w-10 px-2 py-2">
                        <RowMenu row={row} onCopy={setCopySource} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Phones and narrow windows: one card per client, the same fields. */}
          <ul className="flex flex-col gap-3 lg:hidden" data-testid="clients-cards">
            {rows.map((row) => (
              <li key={row.client.organizationId} data-testid="client-card" data-client={row.name}>
                <Card className="py-0">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <ClientName row={row} onOpen={() => open(row.client)} />
                      <RowMenu row={row} onCopy={setCopySource} />
                    </div>
                    {row.unknown || row.limited ? (
                      <p className="text-sm text-muted-foreground">{row.unknown ? t("unknown") : t("limited")}</p>
                    ) : (
                      <dl className="grid grid-cols-1 gap-2 text-sm">
                        <Field label={t("columns.confirmed")}>
                          <Confirmed row={row} />
                        </Field>
                        <Field label={t("columns.areas")}>
                          <AreasInWords row={row} />
                        </Field>
                        <Field label={t("columns.documents")}>
                          <span data-testid="client-docs">
                            {t("docsReady", { ready: row.docs.ready, total: row.docs.total })}
                          </span>
                        </Field>
                        <Field label={t("columns.deadline")}>
                          <DeadlineText deadline={row.deadline} now={now} onOpen={(href) => open(row.client, href)} />
                        </Field>
                        <Field label={t("columns.action")}>
                          <ActionText row={row} onOpen={(href) => open(row.client, href)} />
                        </Field>
                      </dl>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground" aria-hidden="true">
            {t("sortNote")}
          </p>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 items-start">
      <dt className="text-xs text-muted-foreground pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function ClientName({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const t = useTranslations("guided.portfolio");
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("open", { client: row.name })}
      className="text-left font-semibold text-primary hover:underline underline-offset-4 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      data-testid="client-open"
    >
      {row.name}
    </button>
  );
}

function Confirmed({ row }: { row: Row }) {
  const t = useTranslations("guided.portfolio");
  const figure = figureFor(row.statuses);
  if (!figure) return <span className="text-muted-foreground">{t("unknown")}</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <ProgramFigureLine figure={figure} className="font-medium" />
      {row.client.drafts > 0 && (
        <span className="text-xs text-muted-foreground">{t("draftsToConfirm", { count: row.client.drafts })}</span>
      )}
    </span>
  );
}

/** The six areas with their state words, as the dashboard's tiles say them. */
function AreasInWords({ row }: { row: Row }) {
  const tg = useTranslations("guided");
  if (row.areas.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5 text-xs" data-testid="client-areas">
      {row.areas.map((area) => (
        <li key={area.stage.id} className="flex flex-wrap items-baseline gap-x-1.5" data-word={area.word}>
          <span className="text-muted-foreground">{tg(`stages.${area.stage.id}`)}:</span>
          <span className={cn("font-medium", area.word === "action" && "text-destructive")}>
            {tg(`stageState.${area.word}`)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DeadlineText({
  deadline,
  now,
  onOpen,
}: {
  deadline: ClientDeadline | null;
  now: Date;
  onOpen: (href: string) => void;
}) {
  const t = useTranslations("guided.portfolio");
  const tg = useTranslations("guided");
  const locale = useLocale();
  if (!deadline) {
    return (
      <span className="text-muted-foreground" data-testid="client-deadline">
        {t("noDeadline")}
      </span>
    );
  }
  const at = new Date(deadline.at);
  const when = formatDeadlineDate(at, locale);
  if (deadline.kind === "plan") {
    return (
      <span className="flex flex-col gap-0.5" data-testid="client-deadline">
        <span>{tg("deadlines.plan", { day: deadline.day })}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{when}</span>
      </span>
    );
  }
  const overdue = at.getTime() < now.getTime();
  return (
    <span className="flex flex-col gap-0.5" data-testid="client-deadline">
      <button
        type="button"
        onClick={() => onOpen(deadline.href)}
        className="text-left hover:underline underline-offset-4 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        {tg(`deadlines.${deadline.kind}`, { label: deadline.label })}
      </button>
      <span className={cn("text-xs tabular-nums", overdue ? "font-medium text-foreground" : "text-muted-foreground")}>
        {overdue ? tg("deadlines.overdue", { date: when }) : when}
      </span>
    </span>
  );
}

function ActionText({ row, onOpen }: { row: Row; onOpen: (href: string) => void }) {
  const tg = useTranslations("guided");
  const tv = useTranslations("views");
  const action = row.action;
  if (!action) return <span className="text-muted-foreground">{tg("areas.done")}</span>;
  const label =
    action.kind === "needsAction"
      ? `${tv(`needsAction.kind.${action.item.kind}`)} (${action.item.count})`
      : action.toConfirm
        ? tg("areas.confirm")
        : tg(`steps.${action.step.id}.label`);
  return (
    <button
      type="button"
      onClick={() => onOpen(nextActionHref(action))}
      className="text-left text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      data-testid="client-action"
    >
      {label}
    </button>
  );
}

/**
 * The row menu: "Copy into a new client". Only where the person is an owner
 * or an admin of the row's client; the server checks again.
 */
function RowMenu({ row, onCopy }: { row: Row; onCopy: (source: { id: string; name: string }) => void }) {
  const tt = useTranslations("clientTemplate");
  if (!canUseForTemplate(row.client.role)) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={tt("rowMenu", { client: row.name })}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onCopy({ id: row.client.organizationId, name: row.name })}>
          <Copy className="size-4" aria-hidden="true" />
          {tt("copyIntoNew")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
