"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The first-run choice, and the way back out of it.
 *
 * `WorkedExampleOffer` is the one-click choice a new organisation is given
 * before it faces an empty form: take the worked example, or start empty. It is
 * never forced. It appears only while the organisation has no AI systems and no
 * sample data, "Start empty" dismisses it for good, and the copy says exactly
 * what the example will add and what it will change, before it is clicked.
 *
 * `SampleDataCard` is the single action that removes all of it. It appears
 * wherever sample data exists, so a person who took the example is never left
 * hunting for how to get rid of it.
 *
 * All the wording comes from src/config/worked-example.ts, alongside the content
 * it describes, so the promise and the thing promised cannot drift.
 */

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { FlaskConical, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { WORKED_EXAMPLE_CHROME } from "@/config/worked-example";
import type { PilotLocale } from "@/config/pilot";

/** Per organisation, so declining for one client never hides it for the next. */
const dismissKey = (organizationId: string) => `ais.worked-example-declined.${organizationId}`;

function declined(organizationId: string): boolean {
  try {
    return localStorage.getItem(dismissKey(organizationId)) === "1";
  } catch {
    // Storage unavailable (private mode): the offer shows, which is the
    // harmless direction to fail in.
    return false;
  }
}

/** The badge every screen puts on a record the example created. */
export function SampleBadge() {
  const locale: PilotLocale = useLocale() === "es" ? "es" : "en";
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-border text-muted-foreground text-[10px] font-medium uppercase tracking-wide"
    >
      <FlaskConical className="mr-1 h-3 w-3" aria-hidden />
      {WORKED_EXAMPLE_CHROME[locale].badge}
    </Badge>
  );
}

/**
 * The ids of the records the worked example created, by model name. A screen
 * marks a row when its id is in the set for its model.
 */
export function useSampleIds(organizationId: string | undefined, entityType: string): Set<string> {
  const { data } = trpc.sample.ids.useQuery(
    { organizationId: organizationId ?? "" },
    { enabled: !!organizationId, staleTime: 60 * 1000 },
  );
  return new Set(data?.[entityType] ?? []);
}

export function WorkedExampleOffer({ organizationId }: { organizationId: string }) {
  const locale: PilotLocale = useLocale() === "es" ? "es" : "en";
  const copy = WORKED_EXAMPLE_CHROME[locale];
  const { canWrite } = useOrganization();
  const utils = trpc.useUtils();
  const [hidden, setHidden] = useState(() => declined(organizationId));

  const { data: sample } = trpc.sample.status.useQuery({ organizationId }, { staleTime: 30 * 1000 });
  const { data: stats } = trpc.organization.getDashboardStats.useQuery(
    { organizationId },
    { staleTime: 30 * 1000 },
  );

  const create = trpc.sample.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sample.status.invalidate(),
        utils.sample.ids.invalidate(),
        utils.organization.getDashboardStats.invalidate(),
        utils.organization.getById.invalidate(),
      ]);
      toast.success(copy.startExample);
    },
    onError: (err) => toast.error(err.message),
  });

  // The offer belongs to a first run only: no sample data, nothing in the
  // registry, and not already declined.
  if (hidden || !canWrite) return null;
  if (sample === undefined || stats === undefined) return null;
  if (sample.present || stats.totalSystems > 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.lead}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li>{copy.contents}</li>
          <li>{copy.jurisdictionNote}</li>
          <li>{copy.markedNote}</li>
        </ul>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            disabled={create.isPending}
            onClick={() => create.mutate({ organizationId })}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {copy.startExample}
          </Button>
          <Button
            variant="outline"
            disabled={create.isPending}
            onClick={() => {
              try {
                localStorage.setItem(dismissKey(organizationId), "1");
              } catch {
                // Nothing to remember; the choice still applies to this visit.
              }
              setHidden(true);
            }}
          >
            {copy.startEmpty}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SampleDataCard({ organizationId }: { organizationId: string }) {
  const locale: PilotLocale = useLocale() === "es" ? "es" : "en";
  const copy = WORKED_EXAMPLE_CHROME[locale];
  const { canWrite } = useOrganization();
  const utils = trpc.useUtils();
  const { data: sample } = trpc.sample.status.useQuery({ organizationId }, { staleTime: 30 * 1000 });

  const remove = trpc.sample.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sample.status.invalidate(),
        utils.sample.ids.invalidate(),
        utils.organization.getDashboardStats.invalidate(),
        utils.organization.getById.invalidate(),
      ]);
      toast.success(copy.removed);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!sample?.present) return null;

  return (
    <Card data-testid="sample-data-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          {copy.removeTitle}
          <SampleBadge />
        </CardTitle>
        <CardDescription>{copy.removeLead}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          {Object.entries(sample.counts)
            .map(([type, count]) => `${count} ${type}`)
            .join(" · ")}
        </p>
        {canWrite && (
          <Button
            variant="outline"
            size="sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ organizationId })}
          >
            {remove.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            {copy.remove}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
