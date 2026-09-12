"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The current time, read once after mount rather than during render.
 *
 * Reading the clock while rendering makes a component impure: the server and
 * the client disagree, and React may render twice with different answers. A
 * deadline that is "overdue" in one render and "open" in the next is exactly
 * the kind of detail nobody notices until it matters.
 *
 * Returns null on the first render (and on the server), so callers show the
 * date without a judgement about it until the clock is known.
 */

import { useEffect, useState } from "react";

export function useNow(refreshMs?: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Scheduled rather than set synchronously in the effect body: a synchronous
    // setState here would force a second render pass before paint.
    const first = setTimeout(() => setNow(new Date()), 0);
    const timer = refreshMs ? setInterval(() => setNow(new Date()), refreshMs) : undefined;
    return () => {
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, [refreshMs]);

  return now;
}
