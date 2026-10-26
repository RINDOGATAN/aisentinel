// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Applies pending migrations during `npm run build` (the hosted lane), with
 * retries for a database that is asleep or briefly unreachable.
 *
 * 1. Wakes the database with `SELECT 1` (via `prisma db execute`), retrying
 *    while it reports an unreachable or sleeping server.
 * 2. Runs `prisma migrate deploy`, retrying only on P1001 (cannot reach the
 *    server), P1002 (server reached but timed out) and "timed out trying to
 *    acquire a postgres advisory lock". Any other failure exits non-zero at
 *    once, so a broken migration still fails the build.
 *
 * Retries back off exponentially (5 s doubling, capped at 60 s) inside a total
 * budget of 7 minutes (BUILD_MIGRATE_BUDGET_MS overrides it).
 *
 * Connection: the wake query uses the direct (unpooled) URL when the schema's
 * `directUrl` variable is set, else the pooled one; `migrate deploy` already
 * uses `directUrl` on its own. Prisma's output is printed with connection
 * strings and host names redacted.
 *
 * The self-hosted Docker image does not run `npm run build` (it calls
 * `prisma generate` and `next build` directly and migrates in its own migrator
 * service), so this script only affects builds that run `npm run build`.
 */

import { spawnSync } from "node:child_process";

const BUDGET_MS = Number(process.env.BUILD_MIGRATE_BUDGET_MS) || 7 * 60 * 1000;
const FIRST_DELAY_MS = 5_000;
const MAX_DELAY_MS = 60_000;
const SCHEMA = "prisma/schema.prisma";

const RETRYABLE = [
  /\bP1001\b/,
  /\bP1002\b/,
  /timed out trying to acquire a postgres advisory lock/i,
  /timed out acquiring advisory lock/i,
];

const started = Date.now();

function redact(text) {
  return text
    .replace(/postgres(ql)?:\/\/[^\s"'`]+/gi, "postgresql://[redacted]")
    .replace(/(server (?:is running )?at )`[^`]*`/gi, "$1`[redacted]`");
}

function run(args, input) {
  const res = spawnSync("npx", ["--no-install", "prisma", ...args], {
    input,
    encoding: "utf8",
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  return { ok: res.status === 0, output };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetries(label, attempt) {
  let delay = FIRST_DELAY_MS;
  for (let n = 1; ; n++) {
    const { ok, output } = attempt();
    if (output.trim()) process.stdout.write(`${redact(output.trimEnd())}\n`);
    if (ok) return;
    const retryable = RETRYABLE.some((re) => re.test(output));
    const remaining = BUDGET_MS - (Date.now() - started);
    if (!retryable) {
      console.error(`[build-migrate] ${label} failed with a non-retryable error.`);
      process.exit(1);
    }
    if (remaining <= delay) {
      console.error(`[build-migrate] ${label} still failing after ${n} attempts; retry budget spent.`);
      process.exit(1);
    }
    console.log(`[build-migrate] ${label}: attempt ${n} hit a retryable error; retrying in ${delay / 1000} s.`);
    await sleep(delay);
    delay = Math.min(delay * 2, MAX_DELAY_MS);
  }
}

const url = process.env.ais_DATABASE_URL_UNPOOLED || process.env.ais_DATABASE_URL;
if (!url) {
  console.error("[build-migrate] No database URL is set (ais_DATABASE_URL_UNPOOLED or ais_DATABASE_URL).");
  process.exit(1);
}

console.log("[build-migrate] Waking the database.");
await withRetries("wake query", () => run(["db", "execute", "--stdin", "--url", url], "SELECT 1;"));

console.log("[build-migrate] Applying migrations.");
await withRetries("migrate deploy", () => run(["migrate", "deploy", "--schema", SCHEMA]));

console.log(`[build-migrate] Done in ${Math.round((Date.now() - started) / 1000)} s.`);
