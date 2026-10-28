// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Payment links open in a new tab, and the pilot status is read again when
 * the person comes back to the application's tab (src/lib/pay-return.ts):
 * only after a payment link was clicked in that tab, and never once the plan
 * shows the purchase. The test environment has no DOM: the links are checked
 * on the rendered markup, and the watcher runs against a stand-in window and
 * document.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/organization-context", () => ({
  useOrganization: () => ({ organization: { id: "org1", name: "Org", slug: "org", plan: "PILOT", role: "OWNER" } }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    pilot: {
      status: {
        useQuery: () => ({
          data: {
            active: true,
            endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            readOnly: true,
            startedAt: new Date(),
            daysLeft: 0,
            exportUrl: "/api/export/org1",
            ceilings: [{ key: "systems", used: 1, max: 5 }],
          },
          refetch: () => undefined,
        }),
      },
    },
  },
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

import { OrganizationPilotEndBar } from "@/components/pilot/pilot-banner";
import { PilotStatusCard } from "@/components/governance/pilot-status-card";
import { PILOT_PRICING_URL } from "@/config/pilot";
import {
  armPayReturn,
  isPayReturnArmed,
  payLinkProps,
  resetPayReturn,
  watchPayReturn,
  ARM_WINDOW_MS,
  POLL_INTERVAL_MS,
  POLL_WINDOW_MS,
  type PayReturnHost,
} from "./pay-return";

/** The opening tag of the element carrying `marker`. */
function tagWith(html: string, marker: string): string {
  const at = html.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<a", at), html.indexOf(">", at) + 1);
}

describe("payment links open in a new tab", () => {
  it("the pilot bar's monthly, yearly and pricing links", () => {
    const html = renderToStaticMarkup(<OrganizationPilotEndBar locale="en" upgrade upgradeMonthly />);
    for (const marker of ['data-testid="pilot-upgrade-monthly-link"', 'data-testid="pilot-upgrade-link"']) {
      const tag = tagWith(html, marker);
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
    }
    const pricing = html.slice(html.indexOf("<a"), html.indexOf(">", html.indexOf("<a")) + 1);
    expect(pricing).toContain('target="_blank"');
    expect(pricing).toContain('rel="noopener noreferrer"');
  });

  it("the single 'Move to the paid plan' link", () => {
    const html = renderToStaticMarkup(<OrganizationPilotEndBar locale="en" upgrade />);
    const tag = tagWith(html, 'data-testid="pilot-upgrade-link"');
    expect(tag).toContain('href="/api/plan/checkout?org=org1"');
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer"');
  });

  it("the Settings card's paid plan link", () => {
    const html = renderToStaticMarkup(<PilotStatusCard organizationId="org1" />);
    const tag = tagWith(html, `href="${PILOT_PRICING_URL.en}"`);
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer"');
  });

  it("a click arms the refetch for this tab", () => {
    resetPayReturn();
    const props = payLinkProps("plan");
    expect(props.target).toBe("_blank");
    expect(props.rel).toBe("noopener noreferrer");
    expect(isPayReturnArmed("plan")).toBe(false);
    props.onClick();
    expect(isPayReturnArmed("plan")).toBe(true);
  });
});

/** A stand-in window and document with a hand-driven clock. */
function fakeHost() {
  const win = new EventTarget();
  const doc = new EventTarget();
  let now = 1_000_000;
  let visibility: DocumentVisibilityState = "visible";
  const timers: Array<{ fn: () => void; every: number; next: number }> = [];
  const host: PayReturnHost = {
    win: {
      addEventListener: win.addEventListener.bind(win),
      removeEventListener: win.removeEventListener.bind(win),
      setInterval: ((fn: () => void, every: number) => timers.push({ fn, every, next: now + every })) as never,
      clearInterval: ((id: number) => {
        timers[id - 1] = { fn: () => undefined, every: Infinity, next: Infinity };
      }) as never,
    },
    doc: {
      addEventListener: doc.addEventListener.bind(doc),
      removeEventListener: doc.removeEventListener.bind(doc),
      get visibilityState() {
        return visibility;
      },
    } as PayReturnHost["doc"],
    now: () => now,
  };
  return {
    host,
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const due = timers.filter((t) => t.next <= end).sort((a, b) => a.next - b.next)[0];
        if (!due) break;
        now = due.next;
        due.next += due.every;
        due.fn();
      }
      now = end;
    },
    leave() {
      visibility = "hidden";
      doc.dispatchEvent(new Event("visibilitychange"));
    },
    back() {
      visibility = "visible";
      doc.dispatchEvent(new Event("visibilitychange"));
      win.dispatchEvent(new Event("focus"));
    },
    get now() {
      return now;
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("watchPayReturn", () => {
  beforeEach(() => resetPayReturn());

  it("does nothing on return when no payment link was clicked", async () => {
    const t = fakeHost();
    const refetch = vi.fn();
    const stop = watchPayReturn("plan", refetch, t.host);
    t.leave();
    t.back();
    t.advance(POLL_INTERVAL_MS * 3);
    await flush();
    expect(refetch).not.toHaveBeenCalled();
    stop();
  });

  it("reads once per return (focus and visibility together), then every 10 s for 3 minutes while visible", async () => {
    const t = fakeHost();
    const refetch = vi.fn();
    armPayReturn("plan", t.now);
    const stop = watchPayReturn("plan", refetch, t.host);
    t.leave();
    t.advance(POLL_INTERVAL_MS * 3);
    await flush();
    expect(refetch).not.toHaveBeenCalled();
    t.back();
    await flush();
    expect(refetch).toHaveBeenCalledTimes(1);
    t.advance(POLL_INTERVAL_MS);
    await flush();
    expect(refetch).toHaveBeenCalledTimes(2);
    t.advance(POLL_WINDOW_MS);
    await flush();
    const atEnd = refetch.mock.calls.length;
    expect(atEnd).toBeGreaterThan(2);
    expect(atEnd).toBeLessThanOrEqual(2 + POLL_WINDOW_MS / POLL_INTERVAL_MS);
    t.advance(POLL_INTERVAL_MS * 6);
    await flush();
    expect(refetch.mock.calls.length).toBe(atEnd);
    stop();
  });

  it("does not poll while the tab is hidden", async () => {
    const t = fakeHost();
    const refetch = vi.fn();
    armPayReturn("plan", t.now);
    const stop = watchPayReturn("plan", refetch, t.host);
    t.leave();
    t.back();
    await flush();
    t.leave();
    t.advance(POLL_INTERVAL_MS * 4);
    await flush();
    expect(refetch).toHaveBeenCalledTimes(1);
    stop();
  });

  it("forgets a click after the arm window", async () => {
    const t = fakeHost();
    const refetch = vi.fn();
    armPayReturn("plan", t.now);
    const stop = watchPayReturn("plan", refetch, t.host);
    t.leave();
    t.advance(ARM_WINDOW_MS + 1);
    t.back();
    await flush();
    expect(refetch).not.toHaveBeenCalled();
    expect(isPayReturnArmed("plan", t.now)).toBe(false);
    stop();
  });

  it("stops listening once cleaned up", async () => {
    const t = fakeHost();
    const refetch = vi.fn();
    armPayReturn("plan", t.now);
    const stop = watchPayReturn("plan", refetch, t.host);
    stop();
    t.leave();
    t.back();
    t.advance(POLL_INTERVAL_MS * 3);
    await flush();
    expect(refetch).not.toHaveBeenCalled();
  });

  it("swallows a failed read and tries again on the next tick", async () => {
    const t = fakeHost();
    const refetch = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    armPayReturn("plan", t.now);
    const stop = watchPayReturn("plan", refetch, t.host);
    t.leave();
    t.back();
    await flush();
    t.advance(POLL_INTERVAL_MS);
    await flush();
    expect(refetch).toHaveBeenCalledTimes(2);
    stop();
  });
});
