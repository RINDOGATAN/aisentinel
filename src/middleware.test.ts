// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import middleware from "./middleware";

function run(url: string, cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  const response = middleware(new NextRequest(url, { headers }));
  return response.headers.getSetCookie().filter((c) => c.startsWith("locale="));
}

describe("middleware layout switch (?skin=)", () => {
  const go = (url: string) => middleware(new NextRequest(url));

  it("keeps ?skin=guided in the cookie and comes back without the parameter", () => {
    const response = go("http://localhost:3003/governance/vendors?skin=guided&tab=all");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3003/governance/vendors?tab=all");
    const cookie = response.headers.getSetCookie().find((c) => c.startsWith("ais_skin="));
    expect(cookie).toMatch(/^ais_skin=guided;/);
    expect(cookie).toMatch(/Path=\//);
  });

  it("switches back with ?skin=classic", () => {
    const response = go("http://localhost:3003/governance?skin=classic");
    expect(response.headers.get("location")).toBe("http://localhost:3003/governance");
    expect(response.headers.getSetCookie().some((c) => c.startsWith("ais_skin=classic;"))).toBe(true);
  });

  it("writes no layout cookie for a new visitor: the layout reads no cookie as Guided", () => {
    const response = go("http://localhost:3003/governance");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.getSetCookie().some((c) => c.startsWith("ais_skin="))).toBe(false);
  });

  it("ignores an unknown value and any page outside the dashboard", () => {
    for (const url of [
      "http://localhost:3003/governance?skin=dark",
      "http://localhost:3003/docs?skin=guided",
    ]) {
      const response = go(url);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.getSetCookie().some((c) => c.startsWith("ais_skin="))).toBe(false);
    }
  });
});

describe("middleware locale handling", () => {
  it("never writes a default locale cookie", () => {
    expect(run("https://aisentinel.todo.law/docs")).toEqual([]);
    expect(run("http://localhost:3003/docs")).toEqual([]);
  });

  it("writes nothing when one locale value arrives", () => {
    expect(run("https://aisentinel.todo.law/docs", "currency=EUR; locale=es")).toEqual([]);
  });

  it("expires the host-only duplicate and re-writes the last value when two arrive", () => {
    // No currency cookie, so the currency write runs too and must not drop these.
    const cookies = run("https://aisentinel.todo.law/docs", "locale=es; locale=en");
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatch(/^locale=;/);
    expect(cookies[0]).toMatch(/Max-Age=0/);
    expect(cookies[0]).not.toMatch(/Domain/i);
    expect(cookies[1]).toMatch(/^locale=en;/);
    expect(cookies[1]).toMatch(/Domain=\.todo\.law/);
  });
});
