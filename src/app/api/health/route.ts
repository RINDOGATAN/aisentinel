// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Health check.
 *
 * GET /api/health — small JSON snapshot for uptime monitors, the sovereign
 * bundle's Docker healthcheck, and quick smoke tests. Shape mirrors the
 * Dealroom health endpoint so estate monitoring can treat them uniformly:
 *
 *   {
 *     ok: boolean,
 *     time: ISO timestamp,
 *     commit: short git sha (Vercel deploys only) | null,
 *     version: package.json version,
 *     services: { database: "ok" | "unreachable", databaseLatencyMs?: number }
 *   }
 *
 * HTTP status: 200 healthy, 503 when the database probe fails (body still
 * says which service broke so the monitor can alert with context).
 *
 * Public endpoint, no auth. Body contains only operational metadata — no
 * secrets, no PII, no tenant data.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enforce } from "@/lib/rate-limit";
import { version } from "../../../../package.json";

export const dynamic = "force-dynamic";

/** Give the DB probe a short leash so a hung pool cannot hang the check. */
const DB_PROBE_TIMEOUT_MS = 3000;

/**
 * How long a database probe result may be reused.
 *
 * Unauthenticated callers were previously able to make this route open a
 * database round trip each time, which made a public endpoint into a way of
 * putting load on the database. Reusing the last probe for a couple of seconds
 * keeps monitors accurate (they poll far slower than this) while decoupling
 * request volume from database load entirely.
 */
const PROBE_CACHE_MS = 2000;

interface CachedProbe {
  at: number;
  ok: boolean;
  latencyMs?: number;
}

let cachedProbe: CachedProbe | null = null;

/** Test helper. Never call this from application code. */
export function __resetHealthProbeCache(): void {
  cachedProbe = null;
}

async function probeDatabase(): Promise<CachedProbe> {
  const now = Date.now();
  if (cachedProbe && now - cachedProbe.at < PROBE_CACHE_MS) return cachedProbe;

  const start = Date.now();
  try {
    // SELECT 1 is one packet round-trip and touches no table.
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db probe timeout")), DB_PROBE_TIMEOUT_MS),
      ),
    ]);
    cachedProbe = { at: now, ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    // Detail goes to the server log; the public response stays minimal.
    console.error("[health] database probe failed:", e);
    cachedProbe = { at: now, ok: false };
  }
  return cachedProbe;
}

interface HealthSnapshot {
  ok: boolean;
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

  const probe = await probeDatabase();
  const snapshot: HealthSnapshot = {
    ok: probe.ok,
    time: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    version,
    services: {
      database: probe.ok ? "ok" : "unreachable",
      ...(probe.latencyMs === undefined ? {} : { databaseLatencyMs: probe.latencyMs }),
    },
  };

  return NextResponse.json(snapshot, {
    status: snapshot.ok ? 200 : 503,
    // Defeat CDN caching — monitors need a fresh read every time.
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
