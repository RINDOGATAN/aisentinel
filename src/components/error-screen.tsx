// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

"use client";

/**
 * What every error page shows: a plain sentence, the reference, a way back,
 * and where to report the problem. Never the error's own message or stack.
 *
 * Depends on nothing that could itself have failed: no message provider, no
 * session, no data. The copy and the locale come from src/config/error-copy.ts.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ERROR_PAGE_COPY,
  SUPPORT_DOC_PATH,
  errorLocaleFromCookie,
  type ErrorLocale,
} from "@/config/error-copy";
import { errorPageReference } from "@/lib/error-reference";

export interface ErrorScreenProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the failed segment. */
  retry?: () => void;
  /** Where "back" goes: the dashboard inside the app, the start elsewhere. */
  back: "dashboard" | "home";
}

const noSubscription = () => () => {};

export function ErrorScreen({ error, retry, back }: ErrorScreenProps) {
  const [reference] = useState(() => errorPageReference(error));
  // English on the server render, the cookie's language once in the browser.
  const locale = useSyncExternalStore<ErrorLocale>(
    noSubscription,
    () => errorLocaleFromCookie(document.cookie),
    () => "en",
  );

  useEffect(() => {
    // The reference in the log line is the one on the screen.
    console.error(`[error ${reference}]`, error);
  }, [reference, error]);

  const copy = ERROR_PAGE_COPY[locale];
  const backHref = back === "dashboard" ? "/governance" : "/";

  return (
    <main
      role="alert"
      className="min-h-[60vh] flex items-center justify-center px-4 py-16"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-xl font-semibold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{copy.body}</p>
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{copy.reference}: </span>
          <code data-testid="error-reference" className="font-mono break-all select-all">
            {reference}
          </code>
          <p className="text-xs text-muted-foreground mt-1">{copy.referenceHelp}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {retry && (
            <button
              type="button"
              onClick={retry}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {copy.retry}
            </button>
          )}
          {/* A full navigation, not a client transition: the app state that
              failed is left behind. */}
          <a
            href={backHref}
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted/50"
          >
            {back === "dashboard" ? copy.back : copy.home}
          </a>
        </div>
        <a
          href={SUPPORT_DOC_PATH}
          className="block text-sm text-primary underline hover:text-primary/80"
        >
          {copy.support}
        </a>
      </div>
    </main>
  );
}
