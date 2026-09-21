// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { ACTIVITY_LABELS, collectCounts, safeErrorText } from "./count-accounts.mjs";

/**
 * The database client, mocked. It knows `count` and nothing else: any other
 * method (findMany, create, $queryRaw ...) throws, which is how "read-only by
 * construction" is proved rather than asserted. Every call is kept so the
 * filters can be checked.
 */

type Where = Record<string, unknown> | undefined;
type Call = { model: string; where: Where };

// Strings a careless query would drag out of a row. None may reach the output.
const ROW_STRINGS = ["Jane Doe", "jane@client.example", "client.example", "Hiring screener", "acme-ai"];

function mockClient(answer: (model: string, where: Where) => number) {
  const calls: Call[] = [];
  const client = new Proxy(
    {},
    {
      get: (_target, model: string) =>
        new Proxy(
          {},
          {
            get: (_t, method: string) => {
              if (method !== "count") {
                return () => {
                  throw new Error(`${model}.${method} is not a COUNT: ${ROW_STRINGS.join(" ")}`);
                };
              }
              return async (args?: { where?: Where }) => {
                calls.push({ model, where: args?.where });
                return answer(model, args?.where);
              };
            },
          },
        ),
    },
  );
  return { client: client as never, calls };
}

const NOW = new Date("2026-09-20T12:00:00.000Z");
const SINCE = new Date("2026-08-21T12:00:00.000Z");

describe("count-accounts", () => {
  it("prints the cycle 11 fields plus activity and its labels, in a fixed shape", async () => {
    const { client } = mockClient(() => 7);
    const result = await collectCounts(client, NOW);

    expect(Object.keys(result)).toEqual([
      "product",
      "users",
      "organizations",
      "paying",
      "installs",
      "activity",
      "activity_labels",
      "as_of",
      "source",
    ]);
    expect(result.product).toBe("AI SENTINEL");
    expect(result.as_of).toBe("2026-09-20T12:00:00.000Z");
    expect(result.users).toBe(7);
    expect(result.organizations).toBe(7);
    expect(result.paying).toBe(7);
  });

  it("keeps null (not applicable) apart from 0 (a measured zero)", async () => {
    const { client } = mockClient(() => 0);
    const result = await collectCounts(client, NOW);

    expect(result.installs).toBeNull();
    expect(result.users).toBe(0);
    expect(result.paying).toBe(0);
    for (const value of Object.values(result.activity)) expect(value).toBe(0);
  });

  it("gives 4 to 12 activity figures, each an integer or null, each key well formed and labelled", async () => {
    const { client } = mockClient(() => 3);
    const result = await collectCounts(client, NOW);
    const keys = Object.keys(result.activity);

    expect(keys.length).toBeGreaterThanOrEqual(4);
    expect(keys.length).toBeLessThanOrEqual(12);
    for (const [key, value] of Object.entries(result.activity)) {
      expect(key).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*_(total|30d)$/);
      expect(value === null || Number.isInteger(value)).toBe(true);
    }
    expect(Object.keys(result.activity_labels)).toEqual(keys);
    for (const label of Object.values(result.activity_labels)) {
      // Six words at most: "At a pilot limit, 30 days" is the owner's own label.
      expect(label.trim().split(/\s+/).length).toBeLessThanOrEqual(6);
    }
    expect(result.activity_labels).toBe(ACTIVITY_LABELS);
  });

  it("only ever calls count", async () => {
    const { client, calls } = mockClient(() => 1);
    await collectCounts(client, NOW);
    expect(calls.length).toBeGreaterThan(0);

    // And the mock really does refuse anything else.
    expect(() => (client as { user: { findMany: () => unknown } }).user.findMany()).toThrow();
  });

  it("leaves the demo organization out of every activity query", async () => {
    const { client, calls } = mockClient(() => 1);
    await collectCounts(client, NOW);

    const activityCalls = calls.filter((c) => !["organization", "customer"].includes(c.model) && c.where);
    expect(activityCalls.length).toBeGreaterThanOrEqual(10);
    for (const call of activityCalls) expect(JSON.stringify(call.where)).toContain('"not":"acme-ai"');
  });

  it("subtracts worked-example rows, in the same window, and never goes below zero", async () => {
    const { client, calls } = mockClient((model, where) => {
      if (model === "aISystem") return where?.createdAt ? 4 : 10;
      if (model === "sampleRecord") {
        if (where?.entityType === "AISystem") return where?.createdAt ? 3 : 6;
        if (where?.entityType === "AIIncident") return 99; // more samples than rows
        return 0;
      }
      return 5;
    });
    const result = await collectCounts(client, NOW);

    expect(result.activity.systems_registered_total).toBe(4);
    expect(result.activity.systems_registered_30d).toBe(1);
    expect(result.activity.assessments_started_total).toBe(5);
    expect(result.activity.incidents_reported_total).toBe(0);

    const windowed = calls.find((c) => c.model === "sampleRecord" && c.where?.createdAt);
    expect(windowed?.where?.createdAt).toEqual({ gte: SINCE });
  });

  it("counts outcomes by their own date, thirty days back", async () => {
    const { client, calls } = mockClient(() => 2);
    await collectCounts(client, NOW);

    const approved = calls.filter((c) => c.model === "aIAssessment" && c.where?.status === "APPROVED");
    expect(approved).toHaveLength(2);
    expect(approved.some((c) => JSON.stringify(c.where?.approvedAt) === JSON.stringify({ gte: SINCE }))).toBe(true);
    expect(calls.some((c) => c.model === "aIPolicy" && c.where?.status === "PUBLISHED")).toBe(true);
    expect(calls.some((c) => c.model === "oversightDecision" && c.where?.decidedAt)).toBe(true);
  });

  it("counts distinct organisations at a pilot limit, all time and 30 days, as labelled integers", async () => {
    const { client, calls } = mockClient((model, where) =>
      model === "organization" && where ? (JSON.stringify(where).includes("createdAt") ? 2 : 5) : 9,
    );
    const result = await collectCounts(client, NOW);

    expect(result.activity.organisations_at_limit_total).toBe(5);
    expect(result.activity.organisations_at_limit_30d).toBe(2);
    expect(Number.isInteger(result.activity.organisations_at_limit_total)).toBe(true);
    expect(Number.isInteger(result.activity.organisations_at_limit_30d)).toBe(true);
    expect(result.activity_labels.organisations_at_limit_total).toBe("Organisations at a pilot limit");
    expect(result.activity_labels.organisations_at_limit_30d).toBe("At a pilot limit, 30 days");

    const atLimit = calls.filter((c) => c.model === "organization" && c.where);
    expect(atLimit).toHaveLength(2);
    for (const call of atLimit) {
      expect(call.where?.slug).toEqual({ not: "acme-ai" });
      expect(JSON.stringify(call.where)).toContain('"action":"PILOT_LIMIT_REACHED"');
    }
    expect(atLimit.some((c) => JSON.stringify(c.where).includes(JSON.stringify({ gte: SINCE })))).toBe(true);
  });

  it("excludes the seed customer from paying and the seed users from active users", async () => {
    const { client, calls } = mockClient(() => 1);
    await collectCounts(client, NOW);

    const paying = calls.find((c) => c.model === "customer");
    expect(paying?.where?.id).toEqual({ not: "demo-customer" });
    expect(JSON.stringify(paying?.where)).toContain('"status":"ACTIVE"');

    const active = calls.find((c) => c.model === "user" && c.where);
    expect(JSON.stringify(active?.where?.email)).toContain("demo@aisentinel.example");
    expect(JSON.stringify(active?.where)).toContain("auditLogs");
  });

  it("lets no string from a row reach the output", async () => {
    // A client that misbehaves and answers with row-like text is still a
    // count as far as the script knows; the fixed strings are all it adds.
    const { client } = mockClient(() => 1);
    const result = await collectCounts(client, NOW);
    const printed = JSON.stringify(result);

    for (const text of ROW_STRINGS) expect(printed).not.toContain(text);
    const strings = Object.entries(result).filter(([, v]) => typeof v === "string").map(([k]) => k);
    expect(strings).toEqual(["product", "as_of", "source"]);
    expect(result.source).toMatch(/excludes the seeded demo organization/);
    expect(result.source).toMatch(/cannot be told apart/);
  });

  it("prints the class of an unexpected error and nothing from its message", () => {
    class PrismaClientInitializationError extends Error {}
    const error = new PrismaClientInitializationError(
      "Can't reach database server at db.client.example:5432 for jane@client.example",
    );
    expect(safeErrorText(error)).toBe("PrismaClientInitializationError");
    expect(safeErrorText("postgres://user:secret@host/db")).toBe("Error");
    expect(safeErrorText(null)).toBe("Error");
  });
});
