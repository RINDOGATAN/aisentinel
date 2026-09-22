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
const { queryRaw, ledger } = vi.hoisted(() => {
  const ledger = { latest: "20260919140000_sample_records" as string | null };
  // The route issues two tagged-template queries: SELECT 1, then the ledger.
  const queryRaw = vi.fn(async (strings: TemplateStringsArray) =>
    strings.join("").includes("_prisma_migrations")
      ? ledger.latest
        ? [{ migration_name: ledger.latest }]
        : []
      : [{ "?column?": 1 }],
  );
  return { queryRaw, ledger };
});

vi.mock("@/lib/prisma", () => {
  const client = { $queryRaw: queryRaw };
  return { default: client, prisma: client };
});

import { GET, __resetHealthProbeCache } from "@/app/api/health/route";
import { __resetRateLimitStore } from "@/lib/rate-limit";

const ENV_KEYS = [
  "RATE_LIMIT_DISABLED",
  "RATE_LIMIT_HEALTH",
  "AISENTINEL_LATEST_MIGRATION",
  "AISENTINEL_BUILD_COMMIT",
];
const clearEnv = () => ENV_KEYS.forEach((k) => delete process.env[k]);

beforeEach(() => {
  __resetRateLimitStore();
  __resetHealthProbeCache();
  queryRaw.mockClear();
  clearEnv();
  ledger.latest = "20260919140000_sample_records";
  process.env.AISENTINEL_LATEST_MIGRATION = "20260919140000_sample_records";
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
    // One probe: SELECT 1 and the ledger read.
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  it("still probes again once the cached result goes stale", async () => {
    await GET(probe());
    expect(queryRaw).toHaveBeenCalledTimes(2);
    __resetHealthProbeCache();
    await GET(probe());
    expect(queryRaw).toHaveBeenCalledTimes(4);
  });

  it("answers 503 with the reason 'database' when the database is unreachable", async () => {
    queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(probe());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      reason: "database",
      services: { database: "unreachable" },
    });
    // No detail from the error reaches the caller.
    expect(JSON.stringify(body)).not.toContain("connection refused");

    errors.mockRestore();
  });

  it("answers 503 'database' when the database takes longer than 2 seconds", async () => {
    vi.useFakeTimers();
    queryRaw.mockImplementationOnce(() => new Promise(() => {}));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const pending = GET(probe());
    await vi.advanceTimersByTimeAsync(2001);
    const response = await pending;
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ reason: "database" });

    errors.mockRestore();
    vi.useRealTimers();
  });

  it("answers 503 'migrations' when the database is behind the build", async () => {
    ledger.latest = "20260919120000_pilot_disclosure_acknowledgements";
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(probe());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, reason: "migrations", services: { database: "ok" } });
    // The migration names stay in the server log.
    expect(JSON.stringify(body)).not.toContain("pilot_disclosure");

    errors.mockRestore();
  });

  it("answers 503 'migrations' when the ledger is empty or missing", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    ledger.latest = null;
    expect((await GET(probe())).status).toBe(503);

    __resetHealthProbeCache();
    queryRaw
      .mockResolvedValueOnce([{ "?column?": 1 }] as never)
      .mockRejectedValueOnce(new Error('relation "_prisma_migrations" does not exist'));
    const response = await GET(probe());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ reason: "migrations" });

    errors.mockRestore();
  });

  it("does not claim health when the build does not know its own migrations", async () => {
    delete process.env.AISENTINEL_LATEST_MIGRATION;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(probe());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ reason: "migrations" });
    errors.mockRestore();
  });

  it("carries the commit and the version, and no reason when healthy", async () => {
    process.env.AISENTINEL_BUILD_COMMIT = "b79f2c9";
    const body = await (await GET(probe())).json();
    expect(body.commit).toBe("b79f2c9");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body).not.toHaveProperty("reason");
  });

  it("reads nothing but the migrations ledger", async () => {
    await GET(probe());
    const sql = queryRaw.mock.calls.map(([strings]) => strings.join("?")).join("\n");
    const tables = [...sql.matchAll(/\bFROM\s+("?\w+"?)/gi)].map((m) => m[1]);
    expect(tables).toEqual(["_prisma_migrations"]);
  });

  it("limits per address, so a monitor is not starved by someone else's flood", async () => {
    process.env.RATE_LIMIT_HEALTH = "1/60";
    expect((await GET(probe("198.51.100.30"))).status).toBe(200);
    expect((await GET(probe("198.51.100.30"))).status).toBe(429);
    expect((await GET(probe("198.51.100.31"))).status).toBe(200);
  });
});
