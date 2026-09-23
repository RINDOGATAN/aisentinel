// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The environment the smoke walk builds and runs under: the self-hosted
 * posture (local sign-in, no Stripe, every module free) against a throwaway
 * local database.
 *
 * A developer's `.env.local` may point at a hosted database and carry live
 * keys for mail and the model gateway. Next.js still reads that file, but it
 * never overrides a variable that is already set, even to the empty string;
 * so every setting that matters is set here, and the hosted-only ones are set
 * to empty (BLANKED below). In CI there is no such file.
 *
 * `npx tsx e2e/with-env.ts <command...>` runs a command with this environment
 * (the build, the migrations, the seed). The Playwright config uses
 * `withSmokeEnv` for the server it starts.
 */

export const SMOKE_PORT = Number(process.env.SMOKE_PORT ?? 3100);
export const SMOKE_BASE_URL = `http://localhost:${SMOKE_PORT}`;

export const smokeEnv: Record<string, string> = {
  ais_DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? "postgresql://aisentinel:e2e@localhost:55432/aisentinel",
  NEXTAUTH_URL: SMOKE_BASE_URL,
  NEXTAUTH_SECRET: "smoke-walk-secret-for-a-throwaway-database-only",
  NEXT_PUBLIC_APP_URL: SMOKE_BASE_URL,
  NEXT_PUBLIC_LOCAL_AUTH_ENABLED: "true",
  NEXT_PUBLIC_EMAIL_AUTH_ENABLED: "false",
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "false",
  NEXT_PUBLIC_STRIPE_ENABLED: "false",
  NEXT_PUBLIC_ALL_SKILLS_FREE: "true",
  NEXT_PUBLIC_HOSTED_PILOT: "false",
  AUTH_COOKIE_DOMAIN: "",
  CROSS_LOGIN_ENABLED: "false",
  AISENTINEL_INSTANCE_ID: "smoke-walk",
  // The walk signs in and out many times from one address.
  RATE_LIMIT_DISABLED: "true",
  // Lets the smoke walk reach the deliberately failing procedure.
  AISENTINEL_TEST_FAILURES: "true",
};
// The seed tests that read a real database run only when this is set, and only
// against localhost (src/config/aiuc1-seed.db.test.ts).
smokeEnv.SEED_TEST_DATABASE_URL = smokeEnv.ais_DATABASE_URL;

/**
 * Hosted-only settings a developer's shell or env file may carry. They are set
 * to the empty string, not deleted: Next.js fills a variable from an env file
 * only when it is undefined, so an empty value is what keeps the file's out.
 */
const BLANKED = [
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_TARGET_ENV",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_OIDC_TOKEN",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "LLM_GATEWAY_KEY",
  "LLM_GATEWAY_URL",
  "LLM_MODEL_ALIAS",
  "VENDORWATCH_CATALOG_API_KEY",
  "VENDORWATCH_CATALOG_API_URL",
  "VW_IMPORT_API_KEYS",
  "DEALROOM_API_KEY",
  "DEALROOM_API_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SKILL_SIGNING_PUBLIC_KEY",
];

export function withSmokeEnv(base: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) if (value !== undefined) env[key] = value;
  for (const key of BLANKED) env[key] = "";
  return { ...env, ...smokeEnv };
}
