"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useEffect, useId, useRef, useState } from "react";
import { createSaveQueue, type SaveQueue, type SaveStatus } from "@/lib/save-queue";
import { installUnsavedListeners, setUnsaved } from "@/lib/unsaved-changes";

/**
 * Save each answer as it is chosen. Returns the status for `<SaveStatus>`,
 * `push(value)` to call from the choice's change handler, and `retry`.
 *
 * While a value waits for its delay or is on its way, the page counts as
 * holding unsaved changes, so closing the tab in that moment still warns. A
 * value still waiting when the card unmounts (the reader followed a link) is
 * sent at once rather than dropped.
 */
export function useAutoSave<T>(
  save: (value: T) => Promise<unknown>,
  options: { delayMs?: number; onError?: (error: unknown) => void } = {},
) {
  const id = useId();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveRef = useRef(save);
  const onErrorRef = useRef(options.onError);
  useEffect(() => {
    saveRef.current = save;
    onErrorRef.current = options.onError;
  });

  const queueRef = useRef<SaveQueue<T> | null>(null);
  const getQueue = () => {
    if (!queueRef.current) {
      queueRef.current = createSaveQueue<T>(
        (value) => saveRef.current(value),
        (next, error) => {
          setStatus(next);
          setUnsaved(id, queueRef.current?.busy() ?? false);
          if (next === "error") onErrorRef.current?.(error);
        },
        { delayMs: options.delayMs },
      );
    }
    return queueRef.current;
  };

  useEffect(() => {
    installUnsavedListeners();
    return () => {
      queueRef.current?.flush();
      setUnsaved(id, false);
    };
  }, [id]);

  return {
    status,
    push: (value: T) => {
      const queue = getQueue();
      queue.push(value);
      setUnsaved(id, queue.busy());
    },
    retry: () => getQueue().retry(),
  };
}
