"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The pilot bar. Mounted once, by the
 * server gate in hosted-pilot-banner.tsx, and only on the hosted pilot. For
 * the whole pilot, to every member: the free window, its end date and the
 * Cloud Plan's price in the reader's currency (euros in the EU and on a
 * Spanish page, dollars elsewhere; src/lib/currency.ts), with a link to the landing's
 * pricing block (closable for the session); in the last PILOT_END_BAR_DAYS
 * days the stronger end wording; once read-only, that the export stays open.
 * Never for a paid organisation. With the automatic upgrade on (decided on
 * the server, hosted-pilot-banner.tsx), an owner or administrator of the
 * selected organisation also sees "Move to the paid plan", which opens
 * GET /api/plan/checkout for that organisation; other members never see it.
 *
 * PilotEndBar draws the bar from its state and needs no app shell, so a test
 * can render it on its own; OrganizationPilotEndBar feeds it the selected
 * organisation's status, the same query as the Settings card.
 */

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useOrganization } from "@/lib/organization-context";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/use-currency";
import {
  PILOT_BAR_DISMISS_KEY,
  PILOT_BAR_PRICING_URL,
  PILOT_EDIT_DAYS,
  PILOT_END_BAR_COPY,
  isPaidPlanValue,
  isTransitionPilot,
  pilotEndBarDate,
  pilotEndBarState,
  type PilotEndBarState,
  type PilotLocale,
} from "@/config/pilot";

/** The trial bar's "closed for this session" flag, read without a render-time mismatch. */
const dismissListeners = new Set<() => void>();
function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(PILOT_BAR_DISMISS_KEY) === "1";
  } catch {
    // No session storage (private mode, blocked): the bar simply stays.
    return false;
  }
}
function subscribeDismissed(listener: () => void): () => void {
  dismissListeners.add(listener);
  return () => {
    dismissListeners.delete(listener);
  };
}
function dismissForSession(): void {
  try {
    window.sessionStorage.setItem(PILOT_BAR_DISMISS_KEY, "1");
  } catch {
    // Not stored: the bar comes back on the next page.
  }
  dismissListeners.forEach((l) => l());
}

export interface PilotEndBarProps {
  locale: PilotLocale;
  state: PilotEndBarState;
  /** The end of the editing window; needed in the "trial" and "ending" states. */
  endsAt: Date | string | null;
  /** A pilot begun before the window was shortened: "Free until {date}". */
  transition?: boolean;
  /** The checkout route for "Move to the paid plan"; only for an owner or admin, with the switch on. */
  upgradeHref?: string | null;
}

export function PilotEndBar({ locale, state, endsAt, transition = false, upgradeHref = null }: PilotEndBarProps) {
  // The trial bar may be closed for the session; the ending and read-only bars stay.
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => false);
  // The visitor's currency; a Spanish bar is always in euros (src/lib/currency.ts).
  const currency = useCurrency(locale);
  if (state === "hidden") return null;
  if ((state === "trial" || state === "ending") && !endsAt) return null;
  if (state === "trial" && dismissed) return null;
  const copy = PILOT_END_BAR_COPY[locale];
  const date = endsAt ? pilotEndBarDate(endsAt, locale) : "";
  const text =
    state === "trial"
      ? transition
        ? copy.trialTransition(date, currency)
        : copy.trial(PILOT_EDIT_DAYS, date, currency)
      : state === "ending"
        ? copy.ending(date)
        : copy.readOnly;
  return (
    <div
      role="status"
      data-testid="pilot-end-bar"
      data-state={state}
      className="relative z-[60] w-full border-b border-border bg-muted/60 text-[13px] leading-snug text-foreground"
    >
      {/* min-w-0 and the wrapping rule keep the sentence inside the viewport
          on a phone: the words wrap, the page does not widen. */}
      <p
        className={`max-w-[1600px] mx-auto min-w-0 py-1.5 text-center break-words ${state === "trial" ? "px-10" : "px-4 sm:px-6"}`}
      >
        {text}{" "}
        <a
          href={PILOT_BAR_PRICING_URL[locale]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-medium hover:text-primary"
        >
          {copy.pricing}
        </a>
        {upgradeHref && (
          <>
            {" "}
            <a
              href={upgradeHref}
              data-testid="pilot-upgrade-link"
              className="ml-1 inline-block rounded-full border border-primary px-2.5 py-0.5 font-medium text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {copy.upgrade}
            </a>
          </>
        )}
      </p>
      {state === "trial" && (
        <button
          type="button"
          onClick={dismissForSession}
          aria-label={copy.dismiss}
          data-testid="pilot-end-bar-dismiss"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function OrganizationPilotEndBar({
  locale,
  upgrade = false,
}: {
  locale: PilotLocale;
  /** The automatic upgrade is on and a payment link is set for this visitor's currency. */
  upgrade?: boolean;
}) {
  const { organization } = useOrganization();
  // A paid organisation is never asked about (and its status is inactive anyway).
  const paid = isPaidPlanValue(organization?.plan);
  const { data } = trpc.pilot.status.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id && !paid, staleTime: 60 * 1000 },
  );
  if (!organization || paid) return null;
  const endsAt = data?.active ? data.endsAt : null;
  const transition = data?.active ? isTransitionPilot(data.startedAt) : false;
  const state = pilotEndBarState(data ? { ...data, paid } : null);
  const canUpgrade = upgrade && (organization.role === "OWNER" || organization.role === "ADMIN");
  return (
    <PilotEndBar
      locale={locale}
      state={state}
      endsAt={endsAt}
      transition={transition}
      upgradeHref={canUpgrade ? `/api/plan/checkout?org=${encodeURIComponent(organization.id)}` : null}
    />
  );
}
