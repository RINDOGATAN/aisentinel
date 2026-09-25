"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The consultant's portfolio (Guided layout): one row per organisation the
 * person belongs to, the six stages with their progress, and each client's
 * next step. Choosing a client switches to it and opens that next step.
 * Reached from "All clients" in the Guided menu.
 *
 * Progress comes from the same rules as the menu (programPath.portfolio).
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddOrganizationDialog } from "@/components/governance/add-organization-dialog";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { PORTFOLIO_HREF } from "@/lib/account-mode";
import { AI_SENTINEL_PATH } from "@/components/guided/path-config";
import { nextStep, stageProgress, type PathStatuses } from "@/components/guided/path";
import { ProgressRing } from "@/components/guided/progress-ring";

const STAGES = AI_SENTINEL_PATH.stages;

export default function PortfolioPage() {
  const t = useTranslations("guided");
  const tp = useTranslations("guided.portfolio");
  const router = useRouter();
  const { setOrganization } = useOrganization();
  const { data: rows, isLoading } = trpc.programPath.portfolio.useQuery(undefined, {
    staleTime: 30_000,
  });

  // "Add organization" opens the dialog here; the Guided menu's entry arrives
  // with ?add=1. After creation the dialog moves to the new client's quick start.
  // Derived from the address as well as the state, so the menu entry also
  // works while the portfolio is already open.
  const searchParams = useSearchParams();
  const [addOpenState, setAddOpenState] = useState(false);
  const addOpen = addOpenState || searchParams.get("add") === "1";
  const setAddOpen = (next: boolean) => {
    setAddOpenState(next);
    if (!next && searchParams.get("add")) router.replace(PORTFOLIO_HREF);
  };

  const open = (row: NonNullable<typeof rows>[number]) => {
    setOrganization({ id: row.organizationId, name: row.organizationName, slug: row.organizationSlug });
    const next = row.steps ? nextStep(AI_SENTINEL_PATH, row.steps) : null;
    router.push(next?.step.href ?? "/governance");
  };

  const nextLabel = (steps: PathStatuses | null) => {
    if (!steps) return tp("unknown");
    const next = nextStep(AI_SENTINEL_PATH, steps);
    return next ? t(`steps.${next.step.id}.label`) : tp("allDone");
  };

  const stageCell = (steps: PathStatuses | null, index: number) => {
    const stage = STAGES[index];
    const p = steps ? stageProgress(stage, steps) : null;
    const text = p
      ? tp("stageCell", { stage: t(`stages.${stage.id}`), done: p.done, total: p.total })
      : `${t(`stages.${stage.id}`)}: ${tp("unknown")}`;
    return { p, text };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">{tp("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tp("subtitle")}
            {rows && <> · {tp("count", { count: rows.length })}</>}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("addOrganization")}
        </Button>
      </div>

      <AddOrganizationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => setAddOpenState(false)}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !rows || rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{tp("empty")}</CardContent>
        </Card>
      ) : (
        <>
          {/* From md: a table. It scrolls inside its own box if it must. */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">{tp("columnClient")}</th>
                    {STAGES.map((stage, i) => (
                      <th key={stage.id} scope="col" className="px-2 py-3 font-medium text-center">
                        <span className="block tabular-nums">{i + 1}</span>
                        <span className="block font-normal">{t(`stages.${stage.id}`)}</span>
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3 font-medium">{tp("columnNext")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.organizationId}
                      onClick={() => open(row)}
                      className="border-b border-border last:border-0 cursor-pointer hover:bg-secondary/60 motion-safe:transition-colors"
                    >
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            open(row);
                          }}
                          aria-label={tp("open", { client: row.organizationName })}
                          className="rounded-sm text-left hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {row.organizationName}
                        </button>
                      </th>
                      {STAGES.map((stage, i) => {
                        const { p, text } = stageCell(row.steps, i);
                        return (
                          <td key={stage.id} className="px-2 py-3">
                            <span className="flex flex-col items-center gap-1" title={text}>
                              <ProgressRing value={p?.done ?? null} total={p?.total ?? 0} size={24} />
                              <span className="text-xs text-muted-foreground tabular-nums" aria-hidden="true">
                                {p ? `${p.done}/${p.total}` : "–"}
                              </span>
                              <span className="sr-only">{text}</span>
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span className="min-w-0">{nextLabel(row.steps)}</span>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* On a phone: one card per client. */}
          <ul className="md:hidden flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.organizationId}>
                <button
                  type="button"
                  onClick={() => open(row)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary/60 motion-safe:transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{row.organizationName}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="mt-3 flex items-start justify-between gap-1">
                    {STAGES.map((stage, i) => {
                      const { p, text } = stageCell(row.steps, i);
                      return (
                        <span key={stage.id} className="flex flex-col items-center gap-0.5" title={text}>
                          <ProgressRing value={p?.done ?? null} total={p?.total ?? 0} size={24}>
                            {i + 1}
                          </ProgressRing>
                          <span className="sr-only">{text}</span>
                        </span>
                      );
                    })}
                  </span>
                  <span className="mt-3 block text-xs text-muted-foreground">{tp("columnNext")}</span>
                  <span className="block text-sm">{nextLabel(row.steps)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
