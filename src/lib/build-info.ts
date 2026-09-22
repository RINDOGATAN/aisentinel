// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What the build knows about itself, fixed at build time by next.config.ts.
 *
 * The self-hosted runtime image carries neither the migrations folder nor the
 * git history, so the health route cannot look either up when it runs: the
 * name of the last migration and the commit are read once, at build, and
 * inlined through `env` in next.config.ts.
 */

/**
 * The last migration in a `prisma/migrations` listing. Migration folders are
 * named `<timestamp>_<name>` (plus the `0_init` baseline), so the last one in
 * sorted order is the newest. Files such as `migration_lock.toml` and the
 * README are not migrations.
 */
export function latestMigrationName(entries: readonly string[]): string | null {
  const migrations = entries.filter((e) => /^\d+_[A-Za-z0-9_]+$/.test(e)).sort();
  return migrations.at(-1) ?? null;
}

/** The short commit, from whichever build system provided one. */
export function buildCommit(env: Record<string, string | undefined>): string | null {
  const sha = env.VERCEL_GIT_COMMIT_SHA || env.SOURCE_COMMIT || env.GITHUB_SHA;
  return sha ? sha.slice(0, 7) : null;
}

/** Inlined at build by next.config.ts. Null when run outside a Next build. */
export function builtLatestMigration(): string | null {
  return process.env.AISENTINEL_LATEST_MIGRATION || null;
}

export function builtCommit(): string | null {
  return process.env.AISENTINEL_BUILD_COMMIT || null;
}
