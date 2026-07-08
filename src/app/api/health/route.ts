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
import { version } from "../../../../package.json";

export const dynamic = "force-dynamic";

/** Give the DB probe a short leash so a hung pool cannot hang the check. */
const DB_PROBE_TIMEOUT_MS = 3000;

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

export async function GET() {
  const start = Date.now();
  const snapshot: HealthSnapshot = {
    ok: true,
    time: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    version,
    services: { database: "ok" },
  };

  try {
    // SELECT 1 is one packet round-trip and touches no table.
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db probe timeout")), DB_PROBE_TIMEOUT_MS)
      ),
    ]);
    snapshot.services.databaseLatencyMs = Date.now() - start;
  } catch (e) {
    // Detail goes to the server log; the public response stays minimal.
    console.error("[health] database probe failed:", e);
    snapshot.ok = false;
    snapshot.services.database = "unreachable";
  }

  return NextResponse.json(snapshot, {
    status: snapshot.ok ? 200 : 503,
    // Defeat CDN caching — monitors need a fresh read every time.
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
