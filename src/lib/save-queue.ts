// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Saves a value as soon as it is chosen, one request at a time.
 *
 * - Requests never overlap: a value chosen while one is being saved waits, so
 *   the server always ends on the last choice (two quick clicks cannot land in
 *   the wrong order).
 * - Only the latest waiting value is sent: three clicks during one request
 *   produce one more request, not three.
 * - An optional delay groups a quick run of changes (ticking several boxes)
 *   into one request.
 * - A failed save is kept, so "Try again" resends exactly what failed.
 *
 * Pure (no React), so the rules are tested directly; `useAutoSave` wraps it.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface SaveQueueOptions {
  /** Wait this long after the last change before saving. 0 saves at once. */
  delayMs?: number;
  /** Injected for tests; default `setTimeout` / `clearTimeout`. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface SaveQueue<T> {
  /** Queue a value to save (replaces any value still waiting). */
  push(value: T): void;
  /** Save a waiting value now instead of after the delay. */
  flush(): void;
  /** Resend the value whose save failed. No-op when nothing failed. */
  retry(): void;
  /** True while a value is waiting or being saved. */
  busy(): boolean;
}

export function createSaveQueue<T>(
  save: (value: T) => Promise<unknown>,
  onStatus: (status: SaveStatus, error?: unknown) => void,
  options: SaveQueueOptions = {},
): SaveQueue<T> {
  const delayMs = options.delayMs ?? 0;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer =
    options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let waiting: { value: T } | null = null;
  let failed: { value: T } | null = null;
  let inFlight = false;
  let timer: unknown = null;

  const cancelTimer = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  const run = () => {
    cancelTimer();
    if (inFlight || !waiting) return;
    const { value } = waiting;
    waiting = null;
    inFlight = true;
    onStatus("saving");
    save(value).then(
      () => {
        inFlight = false;
        failed = null;
        if (waiting) run();
        else onStatus("saved");
      },
      (error: unknown) => {
        inFlight = false;
        failed = { value };
        // A newer choice supersedes the one that failed: try that instead.
        if (waiting) run();
        else onStatus("error", error);
      },
    );
  };

  return {
    push(value) {
      waiting = { value };
      if (delayMs > 0 && !inFlight) {
        cancelTimer();
        timer = setTimer(run, delayMs);
      } else {
        run();
      }
    },
    flush() {
      if (timer !== null) run();
    },
    retry() {
      if (!failed || waiting) return;
      waiting = failed;
      run();
    },
    busy() {
      return inFlight || waiting !== null;
    },
  };
}
