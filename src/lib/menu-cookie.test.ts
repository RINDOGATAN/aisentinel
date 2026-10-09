// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import {
  cookieAssignment,
  isDashboardPath,
  parseMenuCollapsed,
  retiredClassicRedirect,
} from "./menu-cookie";

describe("the left menu", () => {
  it("collapses only when asked", () => {
    expect(parseMenuCollapsed("collapsed")).toBe(true);
    expect(parseMenuCollapsed("open")).toBe(false);
    expect(parseMenuCollapsed(undefined)).toBe(false);
  });

  it("knows the dashboard addresses", () => {
    expect(isDashboardPath("/governance")).toBe(true);
    expect(isDashboardPath("/governance/ai-registry/abc")).toBe(true);
    expect(isDashboardPath("/governance-x")).toBe(false);
    expect(isDashboardPath("/docs")).toBe(false);
    expect(isDashboardPath("/sign-in")).toBe(false);
  });

  it("writes a host-only cookie for a year", () => {
    const c = cookieAssignment("ais_menu", "collapsed");
    expect(c).toMatch(/^ais_menu=collapsed;/);
    expect(c).toMatch(/Path=\//);
    expect(c).toMatch(/Max-Age=31536000/);
    expect(c).toMatch(/SameSite=Lax/);
    expect(c).not.toMatch(/Domain/i);
  });
});

describe("retired Classic addresses", () => {
  it("send the Classic client cards to All clients, keeping the add flow", () => {
    expect(retiredClassicRedirect("/governance/clients", "")).toBe("/governance/portfolio");
    expect(retiredClassicRedirect("/governance/clients/", "")).toBe("/governance/portfolio");
    expect(retiredClassicRedirect("/governance/clients", "?add=1")).toBe("/governance/portfolio?add=1");
  });

  it("drop the old layout parameter and keep the rest", () => {
    expect(retiredClassicRedirect("/governance", "?skin=classic")).toBe("/governance");
    expect(retiredClassicRedirect("/governance/vendors", "?skin=guided&tab=all")).toBe(
      "/governance/vendors?tab=all",
    );
    expect(retiredClassicRedirect("/governance/clients", "?skin=classic&add=1")).toBe(
      "/governance/portfolio?add=1",
    );
  });

  it("leave current addresses and pages outside the dashboard alone", () => {
    expect(retiredClassicRedirect("/governance", "")).toBeNull();
    expect(retiredClassicRedirect("/governance/portfolio", "?add=1")).toBeNull();
    expect(retiredClassicRedirect("/docs", "?skin=classic")).toBeNull();
    expect(retiredClassicRedirect("/governance/clients-x", "")).toBeNull();
  });
});
