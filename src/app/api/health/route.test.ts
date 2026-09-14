// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The public health route.
 *
 * Two properties are worth pinning, and both are about an unauthenticated
 * caller's ability to spend the server's resources: the route is rate limited,
 * and a burst of requests no longer turns into a burst of database queries.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above the file's own statements, so the spy has to be
// created inside vi.hoisted or it does not exist yet when the factory runs.
const { queryRaw } = vi.hoisted(() => ({
  queryRaw: vi.fn(async () => [{ "?column?": 1 }]),
}));

vi.mock("@/lib/prisma", () => {
  const client = { $queryRaw: queryRaw };
  return { default: client, prisma: client };
});

import { GET, __resetHealthProbeCache } from "@/app/api/health/route";
import { __resetRateLimitStore } from "@/lib/rate-limit";

const ENV_KEYS = ["RATE_LIMIT_DISABLED", "RATE_LIMIT_HEALTH"];
const clearEnv = () => ENV_KEYS.forEach((k) => delete process.env[k]);

beforeEach(() => {
  __resetRateLimitStore();
  __resetHealthProbeCache();
  queryRaw.mockClear();
  clearEnv();
});
afterEach(clearEnv);

function probe(ip = "203.0.113.20"): Request {
  return new Request("https://example.test/api/health", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("GET /api/health", () => {
  it("reports the snapshot a monitor expects", async () => {
    const response = await GET(probe());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, services: { database: "ok" } });
    expect(typeof body.time).toBe("string");
    expect(typeof body.version).toBe("string");
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("refuses once the allowance is spent", async () => {
    process.env.RATE_LIMIT_HEALTH = "2/60";
    expect((await GET(probe())).status).toBe(200);
    expect((await GET(probe())).status).toBe(200);

    const blocked = await GET(probe());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not let a burst of requests become a burst of database queries", async () => {
    // This was the point of the change: the route was public, uncached and hit
    // the database on every call, so anyone could use it to put load on the
    // database for free.
    for (let i = 0; i < 25; i++) await GET(probe());
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("still probes again once the cached result goes stale", async () => {
    await GET(probe());
    expect(queryRaw).toHaveBeenCalledTimes(1);
    __resetHealthProbeCache();
    await GET(probe());
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  it("answers 503 when the database is unreachable", async () => {
    queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(probe());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      services: { database: "unreachable" },
    });

    errors.mockRestore();
  });

  it("limits per address, so a monitor is not starved by someone else's flood", async () => {
    process.env.RATE_LIMIT_HEALTH = "1/60";
    expect((await GET(probe("198.51.100.30"))).status).toBe(200);
    expect((await GET(probe("198.51.100.30"))).status).toBe(429);
    expect((await GET(probe("198.51.100.31"))).status).toBe(200);
  });
});
