// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_POLICIES,
  __resetRateLimitStore,
  clientIp,
  consume,
  enforce,
  parsePolicy,
  policyFor,
} from "@/lib/rate-limit";

const ENV_KEYS = [
  "RATE_LIMIT_DISABLED",
  "RATE_LIMIT_SIGNIN",
  "RATE_LIMIT_MAGIC_LINK",
  "RATE_LIMIT_HEALTH",
  "RATE_LIMIT_IMPORT",
];

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

beforeEach(() => {
  __resetRateLimitStore();
  clearEnv();
});

afterEach(clearEnv);

function requestFrom(ip: string, url = "https://example.test/api/health"): Request {
  return new Request(url, { headers: { "x-forwarded-for": ip } });
}

describe("parsePolicy", () => {
  it("reads count over seconds", () => {
    expect(parsePolicy("10/900")).toEqual({ limit: 10, windowMs: 900_000 });
    expect(parsePolicy("  5 / 60 ")).toEqual({ limit: 5, windowMs: 60_000 });
  });

  it("rejects anything it cannot use, rather than guessing", () => {
    for (const bad of [undefined, "", "abc", "10", "10/", "/60", "0/60", "10/0", "-1/60", "1.5/60"]) {
      expect(parsePolicy(bad), `expected ${String(bad)} to be rejected`).toBeNull();
    }
  });

  it("falls back to the built-in default when the environment is nonsense", () => {
    process.env.RATE_LIMIT_SIGNIN = "not-a-policy";
    // A typo in an operator's .env must not take the site down or, worse,
    // silently remove the limit.
    expect(policyFor("signin")).toEqual(DEFAULT_POLICIES.signin);
  });

  it("lets an operator tighten or loosen a policy per instance", () => {
    process.env.RATE_LIMIT_MAGIC_LINK = "2/60";
    expect(policyFor("magicLink")).toEqual({ limit: 2, windowMs: 60_000 });
  });
});

describe("consume", () => {
  const policy = { limit: 3, windowMs: 1000 };

  it("allows up to the limit and then refuses", () => {
    const results = [1, 2, 3, 4].map(() => consume("k", policy, 0));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[2].remaining).toBe(0);
    expect(results[3].retryAfterSeconds).toBe(1);
  });

  it("starts a fresh window once the old one expires", () => {
    for (let i = 0; i < 4; i++) consume("k", policy, 0);
    expect(consume("k", policy, 999).ok).toBe(false);
    expect(consume("k", policy, 1000).ok).toBe(true);
  });

  it("counts each key separately, so one caller cannot lock out another", () => {
    for (let i = 0; i < 4; i++) consume("a", policy, 0);
    expect(consume("a", policy, 0).ok).toBe(false);
    expect(consume("b", policy, 0).ok).toBe(true);
  });

  it("is a no-op when an operator has turned it off", () => {
    process.env.RATE_LIMIT_DISABLED = "true";
    const results = [1, 2, 3, 4, 5].map(() => consume("k", policy, 0));
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("bounds its own memory, so spoofed addresses cannot exhaust the process", () => {
    // Far more distinct keys than the cap. The limiter must not grow without
    // end: its own store would otherwise be the denial of service.
    for (let i = 0; i < 12_000; i++) consume(`ip-${i}`, policy, 0);
    // Still enforcing for a live key after the flood.
    const fresh = [1, 2, 3, 4].map(() => consume("still-limited", policy, 0));
    expect(fresh.map((r) => r.ok)).toEqual([true, true, true, false]);
  });
});

describe("clientIp", () => {
  it("takes the leftmost forwarded hop", () => {
    const request = new Request("https://example.test/", {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" },
    });
    expect(clientIp(request)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a constant", () => {
    expect(clientIp(new Request("https://e.test/", { headers: { "x-real-ip": "198.51.100.4" } })))
      .toBe("198.51.100.4");
    expect(clientIp(new Request("https://e.test/"))).toBe("unknown");
  });
});

describe("enforce", () => {
  it("returns null while under the limit and a 429 once over", async () => {
    process.env.RATE_LIMIT_HEALTH = "2/60";
    expect(enforce(requestFrom("1.1.1.1"), "health")).toBeNull();
    expect(enforce(requestFrom("1.1.1.1"), "health")).toBeNull();

    const blocked = enforce(requestFrom("1.1.1.1"), "health");
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
    expect(blocked!.headers.get("Cache-Control")).toBe("no-store");
    await expect(blocked!.json()).resolves.toMatchObject({ error: "Too many requests" });
  });

  it("keeps one policy's budget separate from another's", () => {
    process.env.RATE_LIMIT_MAGIC_LINK = "1/60";
    process.env.RATE_LIMIT_SIGNIN = "1/60";
    expect(enforce(requestFrom("2.2.2.2"), "magicLink")).toBeNull();
    expect(enforce(requestFrom("2.2.2.2"), "magicLink")).not.toBeNull();
    // Exhausting magic links must not lock the same person out of signing in.
    expect(enforce(requestFrom("2.2.2.2"), "signin")).toBeNull();
  });
});
