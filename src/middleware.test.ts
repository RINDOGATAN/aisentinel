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
