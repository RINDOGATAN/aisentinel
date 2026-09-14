// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The sign-in and magic-link limits.
 *
 * NextAuth is not booted here: the limit lives in the wrapper around its
 * handler, so the wrapper is what needs pinning. The tests assert both halves
 * of the contract, that the abusable paths are counted and that ordinary auth
 * traffic is not.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { policyForAuthRequest, withAuthRateLimit } from "@/lib/auth-rate-limit";
import { __resetRateLimitStore } from "@/lib/rate-limit";

const ENV_KEYS = ["RATE_LIMIT_DISABLED", "RATE_LIMIT_SIGNIN", "RATE_LIMIT_MAGIC_LINK"];
const clearEnv = () => ENV_KEYS.forEach((k) => delete process.env[k]);

beforeEach(() => {
  __resetRateLimitStore();
  clearEnv();
});
afterEach(clearEnv);

function post(path: string, ip = "203.0.113.9"): Request {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("policyForAuthRequest", () => {
  it("counts the two paths an unauthenticated caller can abuse", () => {
    expect(policyForAuthRequest("POST", "/api/auth/signin/email")).toBe("magicLink");
    expect(policyForAuthRequest("POST", "/api/auth/callback/email")).toBe("magicLink");
    expect(policyForAuthRequest("POST", "/api/auth/callback/credentials")).toBe("signin");
    expect(policyForAuthRequest("POST", "/api/auth/callback/dev-credentials")).toBe("signin");
  });

  it("leaves ordinary auth traffic alone", () => {
    // These are polled by every open tab. Limiting them would break the app
    // long before it inconvenienced an attacker.
    for (const path of [
      "/api/auth/session",
      "/api/auth/csrf",
      "/api/auth/providers",
      "/api/auth/callback/google",
      "/api/auth/signout",
    ]) {
      expect(policyForAuthRequest("POST", path), path).toBeNull();
    }
  });

  it("ignores GET, which cannot send mail or present a credential", () => {
    expect(policyForAuthRequest("GET", "/api/auth/signin/email")).toBeNull();
  });
});

describe("withAuthRateLimit", () => {
  it("stops the magic-link route once the allowance is spent", async () => {
    process.env.RATE_LIMIT_MAGIC_LINK = "2/3600";
    const inner = vi.fn(async () => new Response("sent"));
    const handler = withAuthRateLimit(inner);

    expect((await handler(post("/api/auth/signin/email"))) instanceof Response).toBe(true);
    await handler(post("/api/auth/signin/email"));
    const third = (await handler(post("/api/auth/signin/email"))) as Response;

    expect(third.status).toBe(429);
    // The third request never reached NextAuth, so no mail was sent.
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it("stops credential sign-in once the allowance is spent", async () => {
    process.env.RATE_LIMIT_SIGNIN = "1/900";
    const inner = vi.fn(async () => new Response("ok"));
    const handler = withAuthRateLimit(inner);

    await handler(post("/api/auth/callback/credentials"));
    const blocked = (await handler(post("/api/auth/callback/credentials"))) as Response;

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("limits per address, so one attacker cannot lock everyone out", async () => {
    process.env.RATE_LIMIT_MAGIC_LINK = "1/3600";
    const inner = vi.fn(async () => new Response("sent"));
    const handler = withAuthRateLimit(inner);

    await handler(post("/api/auth/signin/email", "198.51.100.1"));
    const attacker = (await handler(post("/api/auth/signin/email", "198.51.100.1"))) as Response;
    const bystander = (await handler(post("/api/auth/signin/email", "198.51.100.2"))) as Response;

    expect(attacker.status).toBe(429);
    expect(bystander.status).toBe(200);
  });

  it("passes unlimited paths straight through", async () => {
    process.env.RATE_LIMIT_MAGIC_LINK = "1/3600";
    const inner = vi.fn(async () => new Response("ok"));
    const handler = withAuthRateLimit(inner);

    for (let i = 0; i < 20; i++) await handler(post("/api/auth/session"));
    expect(inner).toHaveBeenCalledTimes(20);
  });
});
