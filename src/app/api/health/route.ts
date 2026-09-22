// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Health check.
 *
 * GET /api/health — small JSON snapshot for uptime monitors, the sovereign
 * bundle's Docker healthcheck, the storefront's digest and quick smoke tests.
 * Shape mirrors the Dealroom health endpoint so estate monitoring can treat
 * them uniformly:
 *
 *   {
 *     ok: boolean,
 *     reason?: "database" | "migrations",   (only when ok is false)
 *     time: ISO timestamp,
 *     commit: short git sha | null,
 *     version: package.json version,
 *     services: { database: "ok" | "unreachable", databaseLatencyMs?: number }
 *   }
 *
 * 200 only when BOTH hold:
 *   - the database answers a trivial query within 2 seconds;
 *   - the last migration recorded in the database is the last one this build
 *     ships. A deploy whose migrations did not run (or ran against another
 *     database) serves code that expects columns that are not there; that is
 *     not healthy, whatever the database connection says.
 * Otherwise 503 with the reason word and nothing more.
 *
 * Public endpoint, no auth. It reads the migrations ledger and nothing else:
 * no tenant table, no secret, no personal data.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enforce } from "@/lib/rate-limit";
import { builtCommit, builtLatestMigration } from "@/lib/build-info";
import { version } from "../../../../package.json";

export const dynamic = "force-dynamic";

/** The database must answer inside this, or the check fails. */
const DB_PROBE_TIMEOUT_MS = 2000;

/**
 * How long a probe result may be reused.
 *
 * Unauthenticated callers were previously able to make this route open a
 * database round trip each time, which made a public endpoint into a way of
 * putting load on the database. Reusing the last probe for a couple of seconds
 * keeps monitors accurate (they poll far slower than this) while decoupling
 * request volume from database load entirely.
 */
const PROBE_CACHE_MS = 2000;

type Reason = "database" | "migrations";

interface CachedProbe {
  at: number;
  ok: boolean;
  reason?: Reason;
  latencyMs?: number;
}

let cachedProbe: CachedProbe | null = null;

/** Test helper. Never call this from application code. */
export function __resetHealthProbeCache(): void {
  cachedProbe = null;
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("health probe timeout")), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

async function probe(): Promise<CachedProbe> {
  const now = Date.now();
  if (cachedProbe && now - cachedProbe.at < PROBE_CACHE_MS) return cachedProbe;

  const start = Date.now();
  try {
    // SELECT 1 is one packet round-trip and touches no table.
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_PROBE_TIMEOUT_MS);
  } catch (e) {
    // Detail goes to the server log; the public response stays minimal.
    console.error("[health] database probe failed:", e);
    cachedProbe = { at: now, ok: false, reason: "database" };
    return cachedProbe;
  }
  const latencyMs = Date.now() - start;

  try {
    const expected = builtLatestMigration();
    const rows = await withTimeout(
      prisma.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        ORDER BY migration_name DESC
        LIMIT 1`,
      DB_PROBE_TIMEOUT_MS,
    );
    const applied = rows[0]?.migration_name ?? null;
    if (!expected || applied !== expected) {
      console.error(
        `[health] migrations mismatch: database has ${applied ?? "none"}, build ships ${expected ?? "unknown"}`,
      );
      cachedProbe = { at: now, ok: false, reason: "migrations", latencyMs };
      return cachedProbe;
    }
  } catch (e) {
    console.error("[health] migrations probe failed:", e);
    cachedProbe = { at: now, ok: false, reason: "migrations", latencyMs };
    return cachedProbe;
  }

  cachedProbe = { at: now, ok: true, latencyMs };
  return cachedProbe;
}

interface HealthSnapshot {
  ok: boolean;
  reason?: Reason;
  time: string;
  commit: string | null;
  version: string;
  services: {
    database: "ok" | "unreachable";
    databaseLatencyMs?: number;
  };
}

export async function GET(request: Request) {
  const limited = enforce(request, "health");
  if (limited) return limited;

  const result = await probe();
  const databaseOk = result.reason !== "database";
  const snapshot: HealthSnapshot = {
    ok: result.ok,
    ...(result.reason ? { reason: result.reason } : {}),
    time: new Date().toISOString(),
    commit: builtCommit() ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    version,
    services: {
      database: databaseOk ? "ok" : "unreachable",
      ...(result.latencyMs === undefined ? {} : { databaseLatencyMs: result.latencyMs }),
    },
  };

  return NextResponse.json(snapshot, {
    status: snapshot.ok ? 200 : 503,
    // Defeat CDN caching — monitors need a fresh read every time.
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
