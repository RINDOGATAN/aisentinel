// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// Runs one command with the smoke environment (e2e/env.ts):
//   npx tsx e2e/with-env.ts npx next build
import { spawnSync } from "node:child_process";
import { withSmokeEnv } from "./env";

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("usage: npx tsx e2e/with-env.ts <command...>");
  process.exit(2);
}
const result = spawnSync(cmd, args, {
  stdio: "inherit",
  // APP_DIR: where deploy/sovereign/migrate.sh finds the checkout.
  env: { ...withSmokeEnv(), APP_DIR: process.cwd() } as unknown as NodeJS.ProcessEnv,
});
process.exit(result.status ?? 1);
