// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { createSaveQueue, type SaveStatus } from "./save-queue";

/** A save whose requests the test resolves or rejects by hand. */
function harness(delayMs = 0) {
  const sent: string[] = [];
  const pending: { resolve: () => void; reject: (e: unknown) => void }[] = [];
  const statuses: SaveStatus[] = [];
  const timers: (() => void)[] = [];
  const queue = createSaveQueue<string>(
    (v) =>
      new Promise<void>((resolve, reject) => {
        sent.push(v);
        pending.push({ resolve, reject });
      }),
    (s) => statuses.push(s),
    {
      delayMs,
      setTimer: (fn) => {
        timers.push(fn);
        return timers.length - 1;
      },
      clearTimer: (h) => {
        timers[h as number] = () => {};
      },
    },
  );
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const fireTimers = () => {
    const due = timers.splice(0);
    due.forEach((fn) => fn());
  };
  return { queue, sent, pending, statuses, settle, fireTimers };
}

describe("createSaveQueue", () => {
  it("saves a choice at once and reports saving then saved", async () => {
    const h = harness();
    h.queue.push("YES");
    expect(h.sent).toEqual(["YES"]);
    expect(h.statuses).toEqual(["saving"]);
    h.pending[0].resolve();
    await h.settle();
    expect(h.statuses).toEqual(["saving", "saved"]);
    expect(h.queue.busy()).toBe(false);
  });

  it("never sends two requests at once and ends on the last choice", async () => {
    const h = harness();
    h.queue.push("YES");
    h.queue.push("NO");
    h.queue.push("NOT_ASSESSED");
    // Only the first is in flight; the later two collapse into one.
    expect(h.sent).toEqual(["YES"]);
    expect(h.queue.busy()).toBe(true);
    h.pending[0].resolve();
    await h.settle();
    expect(h.sent).toEqual(["YES", "NOT_ASSESSED"]);
    h.pending[1].resolve();
    await h.settle();
    expect(h.statuses.at(-1)).toBe("saved");
    // "saved" is reported once, after the last request, not after each.
    expect(h.statuses.filter((s) => s === "saved")).toHaveLength(1);
  });

  it("reports an error and resends exactly the failed value on retry", async () => {
    const h = harness();
    h.queue.push("YES");
    h.pending[0].reject(new Error("offline"));
    await h.settle();
    expect(h.statuses.at(-1)).toBe("error");
    h.queue.retry();
    expect(h.sent).toEqual(["YES", "YES"]);
    h.pending[1].resolve();
    await h.settle();
    expect(h.statuses.at(-1)).toBe("saved");
  });

  it("a newer choice made while a save fails is sent instead of reporting the error", async () => {
    const h = harness();
    h.queue.push("YES");
    h.queue.push("NO");
    h.pending[0].reject(new Error("offline"));
    await h.settle();
    expect(h.sent).toEqual(["YES", "NO"]);
    expect(h.statuses).not.toContain("error");
  });

  it("retry does nothing when nothing failed", () => {
    const h = harness();
    h.queue.retry();
    expect(h.sent).toEqual([]);
  });

  it("with a delay, groups a quick run of changes into one request", async () => {
    const h = harness(400);
    h.queue.push("CA");
    h.queue.push("CA,TX");
    h.queue.push("CA,TX,WA");
    expect(h.sent).toEqual([]);
    expect(h.queue.busy()).toBe(true);
    h.fireTimers();
    expect(h.sent).toEqual(["CA,TX,WA"]);
  });

  it("flush saves a delayed value at once", () => {
    const h = harness(400);
    h.queue.push("CA");
    h.queue.flush();
    expect(h.sent).toEqual(["CA"]);
  });
});
