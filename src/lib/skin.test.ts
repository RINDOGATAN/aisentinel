// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import {
  cookieAssignment,
  isDashboardPath,
  parseMenuCollapsed,
  parseSkin,
  skinFromQuery,
} from "./skin";

describe("the layout choice", () => {
  it("is Classic unless the cookie says exactly guided", () => {
    expect(parseSkin(undefined)).toBe("classic");
    expect(parseSkin(null)).toBe("classic");
    expect(parseSkin("")).toBe("classic");
    expect(parseSkin("Guided")).toBe("classic");
    expect(parseSkin("classic")).toBe("classic");
    expect(parseSkin("guided")).toBe("guided");
  });

  it("reads ?skin= only for the two known values", () => {
    expect(skinFromQuery("guided")).toBe("guided");
    expect(skinFromQuery("classic")).toBe("classic");
    expect(skinFromQuery("dark")).toBeNull();
    expect(skinFromQuery(null)).toBeNull();
  });

  it("collapses the menu only when asked", () => {
    expect(parseMenuCollapsed("collapsed")).toBe(true);
    expect(parseMenuCollapsed("open")).toBe(false);
    expect(parseMenuCollapsed(undefined)).toBe(false);
  });

  it("honours ?skin= on dashboard addresses only", () => {
    expect(isDashboardPath("/governance")).toBe(true);
    expect(isDashboardPath("/governance/ai-registry/abc")).toBe(true);
    expect(isDashboardPath("/governance-x")).toBe(false);
    expect(isDashboardPath("/docs")).toBe(false);
    expect(isDashboardPath("/sign-in")).toBe(false);
  });

  it("writes a host-only cookie for a year", () => {
    const c = cookieAssignment("ais_skin", "guided");
    expect(c).toMatch(/^ais_skin=guided;/);
    expect(c).toMatch(/Path=\//);
    expect(c).toMatch(/Max-Age=31536000/);
    expect(c).toMatch(/SameSite=Lax/);
    expect(c).not.toMatch(/Domain/i);
  });
});
