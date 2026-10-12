// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { afterEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((to: string) => {
  throw new Error(`redirect:${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

async function load(stripeEnabled: boolean) {
  vi.resetModules();
  vi.doMock("@/config/features", () => ({ features: { stripeEnabled } }));
  return (await import("./layout")).default;
}

describe("the billing page while payments are off", () => {
  afterEach(() => {
    redirect.mockClear();
    vi.doUnmock("@/config/features");
  });

  it("sends the address to Settings", async () => {
    const Layout = await load(false);
    expect(() => Layout({ children: null })).toThrow("redirect:/governance/settings");
  });

  it("renders the page when payments are on", async () => {
    const Layout = await load(true);
    expect(Layout({ children: "page" })).toBe("page");
    expect(redirect).not.toHaveBeenCalled();
  });
});
