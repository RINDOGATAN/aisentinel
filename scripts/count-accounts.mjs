// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Print one JSON object of account and activity counts for this instance.
 *
 * Reads a production database: do not run without the owner's go-ahead.
 *
 * Read-only by construction: the only database call this script ever makes is
 * Prisma `count`. No row is selected, nothing is written. The unit test hands
 * it a client on which every other method throws.
 *
 * No name, address, domain, title or free text ever leaves this script, in the
 * output or in an error. Only integers, nulls and the fixed strings below. An
 * unexpected error prints its class and nothing else.
 *
 * Definitions, because the words are ambiguous:
 *   users          every row in User, including people who joined an
 *                  organization by e-mail domain and never returned.
 *   organizations  every row in Organization.
 *   paying         distinct Customers holding at least one entitlement that is
 *                  ACTIVE and not past its expiry. Stripe is switched off on
 *                  the hosted instance, so in practice this counts offline
 *                  licence holders. It is the honest answer to "who has bought
 *                  something", not a recurring-revenue figure.
 *   installs       null, always. Self-hosted installs are not tracked by
 *                  design: the published images report to nobody, and this
 *                  script has no way of counting them. The field exists so a
 *                  reader knows the absence is deliberate, not an oversight.
 *   activity       what people do with the product, outcomes before rows. A
 *                  key ending in `_total` is all time; `_30d` is the last 30
 *                  days by the date named beside it below. null = not
 *                  applicable, 0 = a measured zero.
 *
 * What the activity figures leave out:
 *   - everything in the seeded demo organization (fixed slug);
 *   - the worked example a person can load into their own organization. Those
 *     rows are listed in SampleRecord by type, so they are subtracted by count.
 *     A sample row the person later deleted by hand still has its SampleRecord,
 *     so the subtraction can understate by that many; it never goes below 0.
 *     The figures filtered by an outcome (approved, published, decided) need no
 *     subtraction: the worked example creates none in those states;
 *   - the two seeded demo users, from `active_users_30d` only.
 * The owner's own test accounts and test organizations look like any other and
 * cannot be told apart.
 *
 * Usage: node --env-file=.env.local scripts/count-accounts.mjs [--out=DIR]
 *        With --out=DIR the same object is also written to DIR/aisentinel.json.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRODUCT = "AI SENTINEL";
const OUT_FILE = "aisentinel.json";
const DAY_MS = 24 * 60 * 60 * 1000;

// Fixed seed identifiers (prisma/seed.ts, scripts/seed-demo-entitlements.ts).
// They filter queries and never reach the output.
const DEMO_ORG_SLUG = "acme-ai";
const DEMO_CUSTOMER_ID = "demo-customer";
const DEMO_USER_EMAILS = ["demo@aisentinel.example", "admin@acme-demo.example"];

export const ACTIVITY_LABELS = {
  systems_registered_total: "AI systems registered",
  systems_registered_30d: "AI systems registered, 30 days",
  assessments_started_total: "Assessments started",
  assessments_approved_total: "Assessments approved",
  assessments_approved_30d: "Assessments approved, 30 days",
  policies_published_total: "Policies published",
  oversight_decisions_total: "Oversight decisions recorded",
  oversight_decisions_30d: "Oversight decisions, 30 days",
  incidents_reported_total: "Incidents reported",
  active_users_30d: "Active users, 30 days",
};

const SOURCE =
  "Hosted DB, read-only, COUNT queries only. users and organizations are every row; " +
  "paying is distinct customers with an active, unexpired entitlement (offline licence holders), " +
  "the seed customer excluded by id; installs are not tracked. Activity excludes the seeded demo " +
  "organization, and subtracts worked-example rows by count where a figure could include them " +
  "(a sample row deleted by hand can understate it); active users are people with an audit entry " +
  "in 30 days, the seeded demo users excluded. The owner's own test accounts cannot be told apart.";

/** A message this script wrote itself, so it is safe to print in full. */
class SafeError extends Error {}

/**
 * @typedef {{ count: (args?: { where?: object }) => Promise<number> }} Countable
 * @typedef {Record<
 *   | "user" | "organization" | "customer" | "sampleRecord" | "aISystem"
 *   | "aIAssessment" | "aIPolicy" | "oversightDecision" | "aIIncident",
 *   Countable
 * >} CountClient
 */

/**
 * Every figure, from `count` calls alone.
 *
 * @param {CountClient} prisma
 * @param {Date} [now]
 */
export async function collectCounts(prisma, now = new Date()) {
  const since = new Date(now.getTime() - 30 * DAY_MS);
  const notDemoOrg = { organization: { slug: { not: DEMO_ORG_SLUG } } };

  /** Rows of one type, less the worked-example rows of that type. */
  const lessSamples = async (model, entityType, window = {}) => {
    const [rows, samples] = await Promise.all([
      model.count({ where: { ...notDemoOrg, ...window } }),
      prisma.sampleRecord.count({ where: { ...notDemoOrg, entityType, ...window } }),
    ]);
    return Math.max(0, rows - samples);
  };
  const last30 = { createdAt: { gte: since } };

  const [
    users,
    organizations,
    paying,
    systemsTotal,
    systems30d,
    assessmentsStarted,
    assessmentsApproved,
    assessmentsApproved30d,
    policiesPublished,
    decisionsTotal,
    decisions30d,
    incidentsReported,
    activeUsers30d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    // Distinct customers with a live entitlement. scripts/seed-demo-entitlements.ts
    // upserts one fixed id and hands it every package: a seed artefact, never a
    // buyer, so counting it would overstate the figure on any seeded instance.
    prisma.customer.count({
      where: {
        id: { not: DEMO_CUSTOMER_ID },
        entitlements: {
          some: {
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
    }),
    lessSamples(prisma.aISystem, "AISystem"),
    lessSamples(prisma.aISystem, "AISystem", last30),
    lessSamples(prisma.aIAssessment, "AIAssessment"),
    prisma.aIAssessment.count({ where: { ...notDemoOrg, status: "APPROVED" } }),
    prisma.aIAssessment.count({
      where: { ...notDemoOrg, status: "APPROVED", approvedAt: { gte: since } },
    }),
    prisma.aIPolicy.count({ where: { ...notDemoOrg, status: "PUBLISHED" } }),
    prisma.oversightDecision.count({ where: notDemoOrg }),
    prisma.oversightDecision.count({ where: { ...notDemoOrg, decidedAt: { gte: since } } }),
    lessSamples(prisma.aIIncident, "AIIncident"),
    // Sessions are JWTs, so the audit trail is the only record of someone doing
    // something. An entry with no organization (one since deleted) still counts.
    prisma.user.count({
      where: {
        email: { notIn: DEMO_USER_EMAILS },
        auditLogs: {
          some: {
            createdAt: { gte: since },
            OR: [{ organizationId: null }, notDemoOrg],
          },
        },
      },
    }),
  ]);

  return {
    product: PRODUCT,
    users,
    organizations,
    paying,
    installs: null,
    activity: {
      systems_registered_total: systemsTotal,
      systems_registered_30d: systems30d,
      assessments_started_total: assessmentsStarted,
      assessments_approved_total: assessmentsApproved,
      assessments_approved_30d: assessmentsApproved30d,
      policies_published_total: policiesPublished,
      oversight_decisions_total: decisionsTotal,
      oversight_decisions_30d: decisions30d,
      incidents_reported_total: incidentsReported,
      active_users_30d: activeUsers30d,
    },
    activity_labels: ACTIVITY_LABELS,
    as_of: now.toISOString(),
    source: SOURCE,
  };
}

/** What may be printed about a failure: our own words, else the class only. */
export function safeErrorText(error) {
  if (error instanceof SafeError) return error.message;
  const name = error && typeof error === "object" ? error.constructor?.name : null;
  return typeof name === "string" && /^[A-Za-z]+$/.test(name) ? name : "Error";
}

async function main(argv) {
  if (!process.env.ais_DATABASE_URL) {
    throw new SafeError(
      "ais_DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/count-accounts.mjs",
    );
  }
  const outArg = argv.find((arg) => arg.startsWith("--out="));
  const outDir = outArg ? outArg.slice("--out=".length) : null;
  if (outArg && !outDir) throw new SafeError("--out needs a directory: --out=DIR");

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const result = await collectCounts(prisma);
    const json = JSON.stringify(result, null, 2) + "\n";
    if (outDir) {
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, OUT_FILE), json);
    }
    process.stdout.write(json);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${safeErrorText(error)}\n`);
    process.exitCode = 1;
  });
}
