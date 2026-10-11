"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The end-of-pilot bar (owner, 11 Oct 2026), which replaced the warning
 * banner. Mounted once, by the server gate in hosted-pilot-banner.tsx, and
 * only on the hosted pilot. Nothing for most of the pilot; in the last
 * PILOT_END_BAR_DAYS days the end date and a link to the prices; once
 * read-only, that the export stays open. Never for a paid organisation.
 *
 * PilotEndBar draws the bar from its state and needs no app shell, so a test
 * can render it on its own; OrganizationPilotEndBar feeds it the selected
 * organisation's status, the same query as the Settings card.
 */

import { useOrganization } from "@/lib/organization-context";
import { trpc } from "@/lib/trpc";
import {
  PILOT_END_BAR_COPY,
  PILOT_PRICING_URL,
  isPaidPlanValue,
  pilotEndBarDate,
  pilotEndBarState,
  type PilotEndBarState,
  type PilotLocale,
} from "@/config/pilot";

export interface PilotEndBarProps {
  locale: PilotLocale;
  state: PilotEndBarState;
  /** The end of the editing window; needed in the "ending" state. */
  endsAt: Date | string | null;
}

export function PilotEndBar({ locale, state, endsAt }: PilotEndBarProps) {
  if (state === "hidden") return null;
  if (state === "ending" && !endsAt) return null;
  const copy = PILOT_END_BAR_COPY[locale];
  const text = state === "ending" ? copy.ending(pilotEndBarDate(endsAt!, locale)) : copy.readOnly;
  return (
    <div
      role="status"
      data-testid="pilot-end-bar"
      data-state={state}
      className="relative z-[60] w-full border-b border-border bg-muted/60 text-[13px] leading-snug text-foreground"
    >
      {/* min-w-0 and the wrapping rule keep the sentence inside the viewport
          on a phone: the words wrap, the page does not widen. */}
      <p className="max-w-[1600px] mx-auto min-w-0 px-4 sm:px-6 py-1.5 text-center break-words">
        {text}{" "}
        <a
          href={PILOT_PRICING_URL[locale]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-medium hover:text-primary"
        >
          {copy.pricing}
        </a>
      </p>
    </div>
  );
}

export function OrganizationPilotEndBar({ locale }: { locale: PilotLocale }) {
  const { organization } = useOrganization();
  // The organisation record carries no plan yet; once it does, a paid one is never asked about.
  const paid = isPaidPlanValue((organization as { plan?: string | null } | null)?.plan);
  const { data } = trpc.pilot.status.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id && !paid, staleTime: 60 * 1000 },
  );
  if (!organization || paid) return null;
  const endsAt = data?.active ? data.endsAt : null;
  const state = pilotEndBarState(data ? { ...data, paid } : null);
  return <PilotEndBar locale={locale} state={state} endsAt={endsAt} />;
}
