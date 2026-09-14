// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The /api/import/* guard: rate limit, then a constant-time key check.
 *
 * All four import routes call the same guard, so the guard is tested directly
 * and a structural test asserts that none of the routes has quietly gone back
 * to checking the key itself.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guardImportRequest, validateImportApiKey } from "@/lib/import-auth";
import { __resetRateLimitStore } from "@/lib/rate-limit";

const ENV_KEYS = ["RATE_LIMIT_DISABLED", "RATE_LIMIT_IMPORT", "VW_IMPORT_API_KEYS"];
const clearEnv = () => ENV_KEYS.forEach((k) => delete process.env[k]);

beforeEach(() => {
  __resetRateLimitStore();
  clearEnv();
});
afterEach(clearEnv);

function request(key?: string, ip = "203.0.113.5"): Request {
  return new Request("https://example.test/api/import/check-account", {
    method: "POST",
    headers: {
      "x-forwarded-for": ip,
      ...(key === undefined ? {} : { "x-api-key": key }),
    },
  });
}

describe("validateImportApiKey", () => {
  it("accepts a configured key and refuses anything else", () => {
    process.env.VW_IMPORT_API_KEYS = "alpha-key,beta-key";
    expect(validateImportApiKey(request("alpha-key"))).toBe(true);
    expect(validateImportApiKey(request("beta-key"))).toBe(true);
    expect(validateImportApiKey(request("gamma-key"))).toBe(false);
    expect(validateImportApiKey(request())).toBe(false);
  });

  it("refuses everything when no key is configured", () => {
    // An instance that never set the variable must not accept the empty string
    // or any other value.
    expect(validateImportApiKey(request(""))).toBe(false);
    expect(validateImportApiKey(request("anything"))).toBe(false);
  });

  it("does not accept a prefix, a suffix or a differing case", () => {
    process.env.VW_IMPORT_API_KEYS = "alpha-key";
    for (const wrong of ["alpha", "alpha-key-extra", "ALPHA-KEY", "alpha_key"]) {
      expect(validateImportApiKey(request(wrong)), wrong).toBe(false);
    }
  });

  it("sees a whitespace-padded header as the key itself, per HTTP", () => {
    // Not a leniency in this code: HTTP treats the optional whitespace around
    // a field value as no part of the value, so the runtime has already
    // stripped it by the time the header is read. A client cannot send a key
    // that differs from a configured one only by surrounding space.
    process.env.VW_IMPORT_API_KEYS = "alpha-key";
    expect(validateImportApiKey(request(" alpha-key "))).toBe(true);
  });

  it("tolerates whitespace around configured keys", () => {
    process.env.VW_IMPORT_API_KEYS = " alpha-key , beta-key ";
    expect(validateImportApiKey(request("alpha-key"))).toBe(true);
    expect(validateImportApiKey(request("beta-key"))).toBe(true);
  });
});

describe("guardImportRequest", () => {
  it("lets a correctly keyed request through", () => {
    process.env.VW_IMPORT_API_KEYS = "alpha-key";
    expect(guardImportRequest(request("alpha-key"))).toBeNull();
  });

  it("answers 401 for a bad key", async () => {
    process.env.VW_IMPORT_API_KEYS = "alpha-key";
    const blocked = guardImportRequest(request("wrong"))!;
    expect(blocked.status).toBe(401);
    await expect(blocked.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("stops unlimited key guessing", async () => {
    process.env.VW_IMPORT_API_KEYS = "alpha-key";
    process.env.RATE_LIMIT_IMPORT = "3/60";

    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push(guardImportRequest(request(`guess-${i}`))!.status);
    }
    // Three guesses are answered, then the guesser is cut off rather than
    // being allowed to keep trying.
    expect(statuses).toEqual([401, 401, 401, 429, 429]);
  });

  it("counts the request before checking the key", () => {
    // Rate limiting must not be reachable only by authenticated callers, or an
    // attacker without a key would face no limit at all.
    process.env.VW_IMPORT_API_KEYS = "alpha-key";
    process.env.RATE_LIMIT_IMPORT = "1/60";
    expect(guardImportRequest(request("wrong"))!.status).toBe(401);
    // The valid key is now refused too: the budget was spent by the bad guess.
    expect(guardImportRequest(request("alpha-key"))!.status).toBe(429);
  });

  it("limits per address", () => {
    process.env.VW_IMPORT_API_KEYS = "alpha-key";
    process.env.RATE_LIMIT_IMPORT = "1/60";
    guardImportRequest(request("wrong", "198.51.100.10"));
    expect(guardImportRequest(request("wrong", "198.51.100.10"))!.status).toBe(429);
    expect(guardImportRequest(request("wrong", "198.51.100.11"))!.status).toBe(401);
  });
});

describe("every import route uses the guard", () => {
  const routes = [
    "ai-system-status",
    "check-account",
    "dpc-ai-systems",
    "portfolio-vendors",
  ];

  it.each(routes)("/api/import/%s calls guardImportRequest", (route) => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/import", route, "route.ts"),
      "utf8",
    );
    expect(source).toContain("guardImportRequest(request)");
    // The old unguarded check took the key without counting the request.
    expect(source).not.toContain("validateImportApiKey(request)");
  });
});
