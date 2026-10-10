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

describe("middleware: the retired Classic layout", () => {
  const go = (url: string) => middleware(new NextRequest(url));

  it("drops the old ?skin= parameter and writes no layout cookie", () => {
    for (const value of ["classic", "guided"]) {
      const response = go(`http://localhost:3003/governance/vendors?skin=${value}&tab=all`);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3003/governance/vendors?tab=all");
      expect(response.headers.getSetCookie().some((c) => c.startsWith("ais_skin="))).toBe(false);
    }
  });

  it("sends the Classic client cards to All clients, add flow included", () => {
    expect(go("http://localhost:3003/governance/clients").headers.get("location")).toBe(
      "http://localhost:3003/governance/portfolio",
    );
    expect(go("http://localhost:3003/governance/clients?add=1").headers.get("location")).toBe(
      "http://localhost:3003/governance/portfolio?add=1",
    );
  });

  it("ignores a stored Classic choice", () => {
    const headers = new Headers({ cookie: "ais_skin=classic" });
    const response = middleware(new NextRequest("http://localhost:3003/governance", { headers }));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.getSetCookie().some((c) => c.startsWith("ais_skin="))).toBe(false);
  });

  it("leaves pages outside the dashboard alone", () => {
    const response = go("http://localhost:3003/docs?skin=guided");
    expect(response.headers.get("location")).toBeNull();
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

describe("middleware: the landing language for <html lang>", () => {
  const forwarded = (url: string, cookie?: string) => {
    const headers = new Headers(cookie ? { cookie } : {});
    return middleware(new NextRequest(url, { headers })).headers.get("x-middleware-request-x-landing-lang");
  };

  it("forwards ?lang= on the landing so the layout can say it", () => {
    expect(forwarded("http://localhost:3003/?lang=es", "locale=en")).toBe("es");
    expect(forwarded("http://localhost:3003/?lang=en", "locale=es")).toBe("en");
  });

  it("forwards nothing without a valid ?lang= or away from the landing", () => {
    expect(forwarded("http://localhost:3003/")).toBeNull();
    expect(forwarded("http://localhost:3003/?lang=fr")).toBeNull();
    expect(forwarded("http://localhost:3003/governance?lang=es")).toBeNull();
  });
});
