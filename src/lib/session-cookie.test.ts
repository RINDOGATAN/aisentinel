// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("session cookie name", () => {
  const original = process.env.NEXTAUTH_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NEXTAUTH_URL = original;
  });

  it("uses the __Secure- prefix only on https origins", async () => {
    process.env.NEXTAUTH_URL = "https://aisentinel.todo.law";
    const mod = await import("./session-cookie");
    expect(mod.useSecureCookies).toBe(true);
    expect(mod.SESSION_COOKIE_NAME).toBe("__Secure-aisentinel.session-token");
  });

  it("drops the prefix on plain http, so self-hosted sessions survive", async () => {
    // The sovereign image runs NODE_ENV=production on http://localhost, where
    // browsers silently drop `__Secure-` cookies.
    process.env.NEXTAUTH_URL = "http://localhost:3003";
    const mod = await import("./session-cookie");
    expect(mod.useSecureCookies).toBe(false);
    expect(mod.SESSION_COOKIE_NAME).toBe("aisentinel.session-token");
  });
});

describe("getToken() call sites", () => {
  // Regression guard for the bug that made every PDF export 401: this app
  // overrides NextAuth's cookie names, so any getToken() caller that does not
  // pass `cookieName` looks for `next-auth.session-token`, never finds it, and
  // rejects a perfectly valid session.
  const exportDir = join(process.cwd(), "src/app/api/export");

  const routeFiles = readdirSync(exportDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(exportDir, e.name, "route.ts"));

  it("finds the export routes", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(4);
  });

  it.each(routeFiles)("%s passes an explicit cookieName to getToken", (file) => {
    const src = readFileSync(file, "utf8");
    if (!src.includes("getToken(")) return;
    expect(src).toContain("cookieName: SESSION_COOKIE_NAME");
    expect(src).toContain("secureCookie: useSecureCookies");
    expect(src).not.toMatch(/getToken\(\{\s*req:\s*request\s*\}\)/);
  });
});
