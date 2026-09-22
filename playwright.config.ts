// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The smoke walk: a production build, a seeded local database, and the paths
 * a pilot user takes, at desktop and phone width. See e2e/smoke.spec.ts.
 *
 * Before it runs: the database migrated and seeded, and the app built, both
 * with the smoke environment (e2e/env.ts). CI does this in the `smoke` job;
 * locally:
 *
 *   npx tsx e2e/with-env.ts sh deploy/sovereign/migrate.sh
 *   npx tsx e2e/with-env.ts npx next build
 *   npx playwright test
 */
import { defineConfig, devices } from "@playwright/test";
import { SMOKE_BASE_URL, SMOKE_PORT, withSmokeEnv } from "./e2e/env";

export default defineConfig({
  testDir: "e2e",
  // One database, one walk at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: SMOKE_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-1280",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "phone-390",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npx next start --port ${SMOKE_PORT}`,
    url: `${SMOKE_BASE_URL}/api/health`,
    env: withSmokeEnv(),
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
