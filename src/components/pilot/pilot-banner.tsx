"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one-line banner of the hosted pilot. Rendered by the server component
 * in hosted-pilot-banner.tsx only when the pilot is active and the banner has
 * not been dismissed this session, so it never flashes in and out.
 *
 * Plain anchors and no translation hook: the server passes the words in, so
 * this renders anywhere, including in a test without the app shell.
 */

import { useState } from "react";
import { X } from "lucide-react";
import { PILOT_BANNER_COOKIE, PILOT_BANNER_DISMISSED, type PilotLocale } from "@/config/pilot";

export const PILOT_BANNER_BODY_CLASS = "has-pilot-banner";

export interface PilotBannerProps {
  locale: PilotLocale;
  sentence: { before: string; link: string; after: string };
  runUrl: string;
  dismissLabel: string;
}

export function PilotBanner({ sentence, runUrl, dismissLabel }: PilotBannerProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  function dismiss() {
    // A session cookie: no max-age, so the browser drops it when it closes.
    document.cookie = `${PILOT_BANNER_COOKIE}=${PILOT_BANNER_DISMISSED}; path=/; SameSite=Lax`;
    document.body.classList.remove(PILOT_BANNER_BODY_CLASS);
    setVisible(false);
  }

  return (
    <div
      role="status"
      data-testid="pilot-banner"
      className="relative z-[60] w-full min-h-10 bg-primary/10 border-b border-primary/30 text-[13px] leading-snug text-foreground"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 pr-12 sm:pr-14 flex items-center justify-center text-center">
        <p>
          {sentence.before}
          <a
            href={runUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 font-medium hover:text-primary"
          >
            {sentence.link}
          </a>
          {sentence.after}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={dismissLabel}
          title={dismissLabel}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
