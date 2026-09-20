"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The disclosure screen: what the hosted pilot is, before anything is entered.
 *
 * Shown once per person per wording version, ahead of every other onboarding
 * step, and recorded with its date. The five points come from
 * src/config/pilot-disclosure.ts, which is also what /docs/pilot renders, so the
 * screen someone acknowledged and the page they can go back to cannot drift.
 *
 * There is exactly one action. No dismiss, no "remind me later": the point of
 * the statement is that it was read before the work started. The acknowledgement
 * is a single mutation, and if it fails the person is told and can try again
 * rather than being let through silently.
 */

import { useLocale } from "next-intl";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  DISCLOSURE_CHROME,
  DISCLOSURE_DOCS_PATH,
  DISCLOSURE_POINTS,
} from "@/config/pilot-disclosure";
import type { PilotLocale } from "@/config/pilot";

/** The five points as a list. Shared by this screen and the documentation page. */
export function DisclosureList({ locale }: { locale: PilotLocale }) {
  return (
    <ul className="space-y-3">
      {DISCLOSURE_POINTS.map((point, i) => (
        <li key={point.id} className="flex gap-3 text-sm leading-relaxed">
          <span
            aria-hidden
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground"
          >
            {i + 1}
          </span>
          <span>{point.text[locale]}</span>
        </li>
      ))}
    </ul>
  );
}

export function PilotDisclosureScreen() {
  const locale: PilotLocale = useLocale() === "es" ? "es" : "en";
  const chrome = DISCLOSURE_CHROME[locale];
  const utils = trpc.useUtils();

  const acknowledge = trpc.pilot.acknowledgeDisclosure.useMutation({
    onSuccess: () => {
      void utils.pilot.disclosure.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-4 flex items-center gap-2">
            <img src="/logo-negative.svg" alt="TODO.LAW" style={{ height: "24px", width: "auto" }} />
            <span
              className="text-base tracking-tight text-muted-foreground"
              style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}
            >
              AI SENTINEL
            </span>
          </div>
          <CardTitle>{chrome.title}</CardTitle>
          <CardDescription>{chrome.lead}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DisclosureList locale={locale} />
          <p className="text-xs text-muted-foreground">
            <Link href={DISCLOSURE_DOCS_PATH} className="underline hover:text-foreground">
              {chrome.docsLink}
            </Link>
          </p>
          <Button
            className="w-full"
            disabled={acknowledge.isPending}
            onClick={() => acknowledge.mutate({ locale })}
          >
            {acknowledge.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {chrome.acknowledge}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
